#!/usr/bin/env node
/**
 * ShipLog CLI entry point.
 *
 * Dispatches to subcommand handlers: summary, costs, card.
 * Prints help on bare invocation or --help flag.
 */

import { parseCliArgs } from "./args.js";
import { loadConfig } from "./config.js";
import { runSummary } from "./commands/summary.js";
import { runCosts } from "./commands/costs.js";
import { runCard } from "./commands/card.js";

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

const HELP_TEXT = `shiplog — analytics for Claude Code developers

Usage:
  shiplog <command> [flags]

Commands:
  summary    Show session overview: sessions, tokens, models, cost, tool calls
  costs      Show cost breakdown by project and by model
  card       Output raw analytics data (SVG card generation coming soon)

Flags:
  --json        Output raw JSON instead of formatted table
  --since       Filter by start date (ISO date, e.g. 2026-01-01, or relative: 7d, 30d, today)
  --until       Filter by end date (ISO date or relative)
  --color       Enable ANSI color output
  --help, -h    Show this help text

Examples:
  shiplog summary
  shiplog costs --json
  shiplog summary --since 30d
  shiplog summary --since 2026-01-01 --until 2026-02-01
  shiplog card --json
`;

// ---------------------------------------------------------------------------
// Color detection
// ---------------------------------------------------------------------------

function shouldUseColor(flagColor: boolean, configColor?: boolean): boolean {
  // Never color when not a TTY.
  if (!process.stdout.isTTY) return false;
  // CLI flag takes priority.
  if (flagColor) return true;
  // Fall back to config.
  return configColor ?? false;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { command, flags } = parseCliArgs();

  // No subcommand or explicit help flag → show help.
  if (command === undefined || flags.help) {
    process.stdout.write(HELP_TEXT);
    process.exit(0);
  }

  // Load config, merge with flags (flags override config).
  const config = await loadConfig();
  const color = shouldUseColor(flags.color, config.color);

  const mergedFlags = { ...flags, color };

  switch (command) {
    case "summary":
      await runSummary(mergedFlags);
      break;

    case "costs":
      await runCosts(mergedFlags);
      break;

    case "card":
      await runCard(mergedFlags);
      break;

    default:
      process.stderr.write(`Unknown command: ${command}\n\n`);
      process.stderr.write(HELP_TEXT);
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
});
