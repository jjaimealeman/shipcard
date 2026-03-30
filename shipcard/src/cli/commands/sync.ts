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
import {
  isTTY,
  intro,
  outro,
  logSuccess,
  logError,
  note,
  confirm,
  createSpinner,
} from "../clack.js";

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
    if (isTTY()) {
      intro("ShipCard -- Delete Cloud Data");

      // Clack confirm prompt in TTY mode
      const shouldDelete = await confirm(
        `Delete all cloud data for ${username}? This cannot be undone.`
      );
      if (!shouldDelete) {
        outro("Cancelled.");
        return;
      }

      const s = createSpinner();
      s.start("Deleting cloud data...");
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
          s.stop("Delete failed");
          logError(`Delete failed: HTTP ${res.status}${detail}`);
          process.exit(1);
        }
        s.stop("Data deleted");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        s.stop("Delete failed");
        logError(`Delete request failed: ${message}`);
        process.exit(1);
      }

      outro(`All data removed for ${username}.`);
    } else {
      // Non-TTY: identical to original behavior (no confirm, plain stderr/stdout)
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
    }
    return;
  }

  // ---------------------------------------------------------------------------
  // Analysis phase — run engine and build preview
  // ---------------------------------------------------------------------------

  if (isTTY()) {
    intro("ShipCard -- Sync");
  }

  let result: Awaited<ReturnType<typeof runEngineFull>>["result"];
  let messages: Awaited<ReturnType<typeof runEngineFull>>["messages"];
  let userMessagesByDate: Awaited<ReturnType<typeof runEngineFull>>["userMessagesByDate"];

  if (isTTY()) {
    const s = createSpinner();
    s.start("Analyzing local stats...");
    const engineResult = await runEngineFull({
      since: flags.since,
      until: flags.until,
    });
    result = engineResult.result;
    messages = engineResult.messages;
    userMessagesByDate = engineResult.userMessagesByDate;
    s.stop("Stats analyzed");
  } else {
    process.stderr.write("Analyzing local stats...\n");
    const engineResult = await runEngineFull({
      since: flags.since,
      until: flags.until,
    });
    result = engineResult.result;
    messages = engineResult.messages;
    userMessagesByDate = engineResult.userMessagesByDate;
  }

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

  // Print sync preview (unchanged — data output stays as process.stdout.write)
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
    let syncedV2 = false;

    if (isTTY()) {
      // TTY: spinner for cloud sync
      const s = createSpinner();
      s.start("Syncing to cloud...");

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
        } else if (!v2res.ok) {
          // Real error — do NOT fall back, exit with error
          let detail = "";
          try {
            const body = (await v2res.json()) as { error?: string };
            if (body.error) detail = `: ${body.error}`;
          } catch {
            // ignore
          }
          s.stop("Sync failed");
          logError(`Sync failed: HTTP ${v2res.status}${detail}`);
          process.exit(1);
        } else {
          syncedV2 = true;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        s.stop("Sync failed");
        logError(`Sync request failed: ${message}`);
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
            s.stop("Sync failed");
            logError(`Sync failed: HTTP ${v1res.status}${detail}`);
            process.exit(1);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          s.stop("Sync failed");
          logError(`Sync request failed: ${message}`);
          process.exit(1);
        }
      }

      s.stop("Synced!");

      // Print success with embed snippets using Clack helpers
      const cardUrl = `${workerUrl}/u/${username}`;
      logSuccess(`Card synced: ${cardUrl}`);
      note(
        `Markdown:\n  ![ShipCard Stats](${cardUrl})\n\nHTML:\n  <img src="${cardUrl}" alt="ShipCard Stats" />\n\nCustomize:\n  ?theme=dark&layout=hero&style=branded`,
        "Embed snippets"
      );
      outro(`View your card at ${cardUrl}`);
    } else {
      // Non-TTY: identical to original behavior
      process.stderr.write("Syncing to cloud...\n");

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

      // Print success with embed snippets (unchanged)
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
    }
    return;
  }

  // Default: open browser configurator with stats hash fragment
  const statsBase64 = Buffer.from(JSON.stringify(safeStats)).toString("base64");
  const configuratorUrl = `${workerUrl}/configure#${statsBase64}`;

  if (isTTY()) {
    process.stdout.write("Opening browser configurator...\n");
    process.stdout.write(`  ${configuratorUrl}\n\n`);
    openUrl(configuratorUrl);
    outro("Configure your card in the browser, then sync with --confirm.");
  } else {
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
}
