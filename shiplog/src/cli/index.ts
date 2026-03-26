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
import { runLogin } from "./commands/login.js";
import { runSync } from "./commands/sync.js";

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

const HELP_TEXT = `shiplog — analytics for Claude Code developers

Usage:
  shiplog <command> [flags]

Commands:
  summary    Show session overview: sessions, tokens, models, cost, tool calls
  costs      Show cost breakdown by project and by model
  card       Generate SVG stats card for your README
  login      Authenticate with GitHub to enable cloud sync
  sync       Sync your stats to the cloud and get an embeddable card URL

Flags:
  --json        Output raw JSON instead of formatted table
  --since       Filter by start date (ISO date, e.g. 2026-01-01, or relative: 7d, 30d, today)
  --until       Filter by end date (ISO date or relative)
  --color       Enable ANSI color output
  --help, -h    Show this help text

Card flags:
  --local           Generate SVG card file (default: show raw JSON)
  --layout <name>   Layout: classic (default), compact, hero
  --style <name>    Style: github (default), branded, minimal
  --theme <name>    Theme: dark (default), light
  --hide <stat>     Hide a stat (sessions, toolCalls, models, projects, cost)
  --hero-stat <key> Hero stat for hero layout (default: sessions)
  --preview         Open card in browser after generation
  -o, --output      Custom output path (default: repo root/shiplog-card.svg)

Sync flags:
  --confirm     Sync with current/default settings (non-interactive)
  --delete      Remove all your data from the cloud

Examples:
  shiplog summary
  shiplog costs --json
  shiplog summary --since 30d
  shiplog summary --since 2026-01-01 --until 2026-02-01
  shiplog card --local
  shiplog card --local --layout compact --style branded --theme light
  shiplog card --local --hide cost --preview
  shiplog login
  shiplog sync
  shiplog sync --confirm
  shiplog sync --delete
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

    case "login":
      await runLogin(mergedFlags);
      break;

    case "sync":
      await runSync(mergedFlags);
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
