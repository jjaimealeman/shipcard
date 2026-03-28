/**
 * `shipcard sync` command handler.
 *
 * Syncs local analytics stats to the ShipCard cloud card endpoint.
 *
 * Modes:
 *   shipcard sync           — preview payload + open browser configurator
 *   shipcard sync --confirm — non-interactive POST to /sync/v2 (with v1 fallback) + print embed snippets
 *   shipcard sync --delete  — DELETE /sync to wipe all user data from cloud
 *
 * v2 sync sends { safeStats, timeSeries } to /sync/v2. If the Worker returns
 * 404 (Worker not yet upgraded), falls back gracefully to POST /sync with
 * SafeStats only. Non-404 errors do NOT trigger fallback — they exit with error.
 */

import { runEngineFull } from "../../index.js";
import { toSafeStats, toSafeTimeSeries } from "../safestats.js";
import { aggregateDaily } from "../../engine/dailyAggregator.js";
import { getPricing } from "../../engine/cost.js";
import { loadAuthConfig, getWorkerUrl } from "../config.js";
import { spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncFlags {
  since: string | undefined;
  until: string | undefined;
  confirm: boolean;
  delete: boolean;
  showProjects: boolean;
}

// ---------------------------------------------------------------------------
// Browser open helper
// ---------------------------------------------------------------------------

function openUrl(url: string): void {
  const platform = process.platform;
  let child;

  try {
    if (platform === "darwin") {
      child = spawn("open", [url], { detached: true, stdio: "ignore" });
    } else if (platform === "win32") {
      child = spawn("cmd", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
        shell: true,
      });
    } else {
      child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
    }
    child.unref();
  } catch {
    // Best-effort — ignore failures
  }
}

// ---------------------------------------------------------------------------
// Number formatting helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// Sync command
// ---------------------------------------------------------------------------

/**
 * Run the `shipcard sync` command.
 *
 * Exit codes:
 *   0 — success
 *   1 — not authenticated or request failed
 */
export async function runSync(flags: SyncFlags): Promise<void> {
  const authConfig = await loadAuthConfig();
  const workerUrl = await getWorkerUrl();

  // Check authentication
  if (!authConfig.token || !authConfig.username) {
    process.stderr.write(
      "Not logged in. Run `shipcard login` first.\n"
    );
    process.exit(1);
  }

  const { username, token } = authConfig;

  // --delete: wipe all user data from cloud
  if (flags.delete) {
    process.stderr.write(`Deleting all data for ${username}...\n`);
    try {
      const res = await fetch(`${workerUrl}/sync`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "shipcard-cli/1.0",
        },
      });
      if (!res.ok) {
        let detail = "";
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) detail = `: ${body.error}`;
        } catch {
          // ignore
        }
        process.stderr.write(
          `Delete failed: HTTP ${res.status}${detail}\n`
        );
        process.exit(1);
      }
      process.stdout.write(`All data removed for ${username}\n`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Delete request failed: ${message}\n`);
      process.exit(1);
    }
    return;
  }

  // Run the analytics engine (full result for daily aggregation)
  process.stderr.write("Analyzing local stats...\n");
  const { result, messages, userMessagesByDate } = await runEngineFull({
    since: flags.since,
    until: flags.until,
  });

  if (result.meta.filesRead === 0) {
    process.stderr.write(
      "No Claude Code session data found.\n" +
      "ShipCard looks for JSONL files in: ~/.claude/projects/\n"
    );
    process.exit(1);
  }

  // Convert to safe payload (privacy boundary)
  const safeStats = toSafeStats(result, username);

  // Daily aggregation for v2 payload
  const pricing = await getPricing();
  const dailyStats = aggregateDaily(messages, pricing, userMessagesByDate);
  const safeTimeSeries = toSafeTimeSeries(dailyStats, username, flags.showProjects);

  // Print sync preview
  const totalTokens =
    safeStats.totalTokens.input +
    safeStats.totalTokens.output +
    safeStats.totalTokens.cacheCreate +
    safeStats.totalTokens.cacheRead;

  const topTools = Object.entries(safeStats.toolCallSummary)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, count]) => `${name}: ${formatNumber(count)}`)
    .join(", ");

  process.stdout.write("\nSync preview:\n");
  process.stdout.write(`  Sessions:   ${formatNumber(safeStats.totalSessions)}\n`);
  process.stdout.write(`  Tokens:     ${formatNumber(totalTokens)}\n`);
  process.stdout.write(`  Cost:       ${safeStats.totalCost}\n`);
  process.stdout.write(`  Models:     ${safeStats.modelsUsed.join(", ") || "(none)"}\n`);
  process.stdout.write(`  Days:       ${safeTimeSeries.days.length}\n`);
  if (flags.showProjects) {
    const allProjects = new Set(dailyStats.flatMap((d) => d.projects));
    process.stdout.write(`  Projects:   ${Array.from(allProjects).join(", ") || "(none)"}\n`);
  } else {
    process.stdout.write(`  Projects:   ${safeStats.projectCount} (names hidden)\n`);
  }
  process.stdout.write(`  Top tools:  ${topTools || "(none)"}\n`);
  process.stdout.write("\n");

  // --confirm: non-interactive POST — try v2 first, fall back to v1 on 404
  if (flags.confirm) {
    process.stderr.write("Syncing to cloud...\n");
    let syncedV2 = false;

    // Attempt v2 endpoint
    try {
      const v2res = await fetch(`${workerUrl}/sync/v2`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "shipcard-cli/2.0",
        },
        body: JSON.stringify({ safeStats, timeSeries: safeTimeSeries }),
      });
      if (v2res.status === 404) {
        // Worker doesn't have v2 yet — fall back to v1
        process.stderr.write("Worker v2 not available, using v1...\n");
      } else if (!v2res.ok) {
        // Real error — do NOT fall back, exit with error
        let detail = "";
        try {
          const body = (await v2res.json()) as { error?: string };
          if (body.error) detail = `: ${body.error}`;
        } catch {
          // ignore
        }
        process.stderr.write(`Sync failed: HTTP ${v2res.status}${detail}\n`);
        process.exit(1);
      } else {
        syncedV2 = true;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Sync request failed: ${message}\n`);
      process.exit(1);
    }

    // Fallback to v1 if v2 returned 404
    if (!syncedV2) {
      try {
        const v1res = await fetch(`${workerUrl}/sync`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "shipcard-cli/1.0",
          },
          body: JSON.stringify(safeStats),
        });
        if (!v1res.ok) {
          let detail = "";
          try {
            const body = (await v1res.json()) as { error?: string };
            if (body.error) detail = `: ${body.error}`;
          } catch {
            // ignore
          }
          process.stderr.write(`Sync failed: HTTP ${v1res.status}${detail}\n`);
          process.exit(1);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`Sync request failed: ${message}\n`);
        process.exit(1);
      }
    }

    // Print success with embed snippets
    const cardUrl = `${workerUrl}/u/${username}`;
    process.stdout.write("Card synced! View at:\n");
    process.stdout.write(`  ${cardUrl}\n\n`);
    process.stdout.write("Markdown:\n");
    process.stdout.write(`  ![ShipCard Stats](${cardUrl})\n\n`);
    process.stdout.write("HTML:\n");
    process.stdout.write(
      `  <img src="${cardUrl}" alt="ShipCard Stats" />\n\n`
    );
    process.stdout.write("Customize appearance with query params:\n");
    process.stdout.write(
      `  ?theme=dark&layout=hero&style=branded\n`
    );
    return;
  }

  // Default: open browser configurator with stats hash fragment
  const statsBase64 = Buffer.from(JSON.stringify(safeStats)).toString("base64");
  const configuratorUrl = `${workerUrl}/configure#${statsBase64}`;

  process.stdout.write("Opening browser configurator...\n");
  process.stdout.write(`  ${configuratorUrl}\n\n`);
  openUrl(configuratorUrl);

  process.stdout.write(
    "Configure your card in the browser, then run the command shown there.\n"
  );
  process.stdout.write(
    "Or sync with defaults: shipcard sync --confirm\n"
  );
}
