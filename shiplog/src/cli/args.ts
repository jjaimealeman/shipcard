/**
 * CLI argument parser for ShipLog.
 *
 * Wraps node:util.parseArgs with typed flag definitions.
 * Supports subcommand dispatch via positionals.
 */

import { parseArgs } from "node:util";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedCliArgs {
  command: string | undefined;
  flags: {
    json: boolean;
    since: string | undefined;
    until: string | undefined;
    color: boolean;
    help: boolean;
    local: boolean;
  };
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Parse process.argv into a typed command + flags object.
 *
 * Uses strict: false to avoid throwing on unknown flags — unknown flags are
 * ignored rather than crashing the CLI.
 */
export function parseCliArgs(): ParsedCliArgs {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      json: { type: "boolean", default: false },
      since: { type: "string" },
      until: { type: "string" },
      color: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
      local: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  // Spread from null-prototype object to avoid hasOwnProperty issues.
  const flags = { ...values };

  return {
    command: positionals[0],
    flags: {
      json: (flags.json as boolean | undefined) ?? false,
      since: flags.since as string | undefined,
      until: flags.until as string | undefined,
      color: (flags.color as boolean | undefined) ?? false,
      help: (flags.help as boolean | undefined) ?? false,
      local: (flags.local as boolean | undefined) ?? false,
    },
  };
}
