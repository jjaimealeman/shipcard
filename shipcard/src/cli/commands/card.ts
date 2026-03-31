/**
 * `shipcard card` command handler.
 *
 * Phase 3 behavior:
 *   --local   Generate an SVG card file and print a markdown embed snippet.
 *   --json    Output raw analytics JSON (backward compatible with Phase 2).
 *   (default) Output raw JSON with a hint to use --local or --json.
 */

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runEngine } from "../../index.js";
import { renderCard } from "../../card/index.js";
import type { LayoutName, StyleName, ThemeName } from "../../card/index.js";
import { findGitRoot } from "../../card/git.js";
import { openInBrowser } from "../../card/preview.js";
import { intro, outro, isTTY } from "../clack.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardFlags {
  json: boolean;
  since: string | undefined;
  until: string | undefined;
  color: boolean;
  local: boolean;
  // Card appearance flags
  layout: string | undefined;
  style: string | undefined;
  theme: string | undefined;
  hide: string[];
  heroStat: string | undefined;
  preview: boolean;
  output: string | undefined;
}

// ---------------------------------------------------------------------------
// Onboarding / empty state messages
// ---------------------------------------------------------------------------

const ONBOARDING_MESSAGE = `No Claude Code session data found.

ShipCard looks for JSONL files in: ~/.claude/projects/

This directory is populated automatically when you use Claude Code.
If you've used Claude Code on this machine, check that the directory exists.`;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Run the card command.
 *
 * Behavior:
 *   --json    Output raw analytics JSON (backward compatible).
 *   --local   Generate SVG card, write to file, print markdown snippet.
 *   (default) Output raw JSON with stderr hint.
 *
 * Exit codes:
 *   0 — success
 *   1 — no JSONL files found (onboarding state)
 *   2 — partial parse errors (linesSkipped > 0)
 */
export async function runCard(flags: CardFlags): Promise<void> {
  if (isTTY() && !flags.json) {
    intro("ShipCard -- Card");
  }

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

  // --json: raw JSON output (backward compatible, unchanged from Phase 2).
  if (flags.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");

    if (result.meta.linesSkipped > 0) {
      process.stderr.write(
        `Warning: ${result.meta.linesSkipped} line(s) skipped due to parse errors.\n`
      );
      process.exit(2);
    }

    process.exit(0);
  }

  // --local: generate SVG card file.
  if (flags.local) {
    const svgString = renderCard(result, {
      layout: flags.layout as LayoutName | undefined,
      style: flags.style as StyleName | undefined,
      theme: flags.theme as ThemeName | undefined,
      hide: flags.hide,
      heroStat: flags.heroStat,
    });

    // Determine output path.
    const outputPath = flags.output ?? join(findGitRoot(), "shipcard-card.svg");

    await writeFile(outputPath, svgString, { encoding: "utf-8" });

    // Print confirmation.
    process.stdout.write(`Updated ${outputPath}\n`);

    // Print markdown embed snippet.
    const today = new Date().toISOString().split("T")[0];
    const cardFilename = flags.output
      ? flags.output.replace(/.*[\\/]/, "")  // basename of custom path
      : "shipcard-card.svg";
    process.stdout.write(
      `\nEmbed in your README:\n\n![ShipCard-${today}](./${cardFilename})\n`
    );

    // Optionally open in browser.
    if (flags.preview) {
      openInBrowser(outputPath);
    }

    if (result.meta.linesSkipped > 0) {
      process.stderr.write(
        `Warning: ${result.meta.linesSkipped} line(s) skipped due to parse errors.\n`
      );
      process.exit(2);
    }

    if (isTTY()) {
      outro("Card saved! Embed it in your README.");
    }

    process.exit(0);
  }

  // Default (no --json, no --local): Phase 2 fallback with updated hint.
  process.stderr.write(
    "Use --local to generate an SVG card, or --json for raw data.\n"
  );

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");

  if (result.meta.linesSkipped > 0) {
    process.stderr.write(
      `Warning: ${result.meta.linesSkipped} line(s) skipped due to parse errors.\n`
    );
    process.exit(2);
  }

  process.exit(0);
}
