/**
 * `shiplog card` command handler.
 *
 * Phase 2 behavior: returns raw analytics data as JSON.
 * SVG card generation will be added in Phase 3 (Cloudflare Worker).
 */

import { runEngine } from "../../index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardFlags {
  json: boolean;
  since: string | undefined;
  until: string | undefined;
  color: boolean;
  local: boolean;
}

// ---------------------------------------------------------------------------
// Onboarding / empty state messages
// ---------------------------------------------------------------------------

const ONBOARDING_MESSAGE = `No Claude Code session data found.

ShipLog looks for JSONL files in: ~/.claude/projects/

This directory is populated automatically when you use Claude Code.
If you've used Claude Code on this machine, check that the directory exists.`;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Run the card command.
 *
 * Phase 2: outputs raw analytics JSON. SVG generation coming in a future release.
 *
 * Exit codes:
 *   0 — success
 *   1 — no JSONL files found (onboarding state)
 *   2 — partial parse errors (linesSkipped > 0)
 */
export async function runCard(flags: CardFlags): Promise<void> {
  const result = await runEngine({
    since: flags.since,
    until: flags.until,
  });

  // Empty state: no files read at all.
  if (result.meta.filesRead === 0) {
    process.stderr.write(ONBOARDING_MESSAGE + "\n");
    process.exit(1);
  }

  // Empty range: sessions exist but none in the requested window.
  if (
    result.summary.totalSessions === 0 &&
    result.meta.dateRange !== undefined
  ) {
    const { since, until } = result.meta.dateRange;
    const rangeParts: string[] = [];
    if (since !== undefined) rangeParts.push(`since ${since}`);
    if (until !== undefined) rangeParts.push(`until ${until}`);
    process.stdout.write(
      `No sessions found in [${rangeParts.join(" → ")}]. Try widening your date range.\n`
    );
    process.exit(0);
  }

  // Card is always JSON in Phase 2 — note to stderr if not --json flag.
  if (!flags.json) {
    process.stderr.write(
      "Card SVG generation coming in a future release. Showing raw analytics data.\n"
    );
  }

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");

  // Warn on parse errors, exit 2.
  if (result.meta.linesSkipped > 0) {
    process.stderr.write(
      `Warning: ${result.meta.linesSkipped} line(s) skipped due to parse errors.\n`
    );
    process.exit(2);
  }

  process.exit(0);
}
