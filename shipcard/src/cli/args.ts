/**
 * CLI argument parser for ShipCard.
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
    version: boolean;
    local: boolean;
    // Card-specific flags
    layout: string | undefined;
    style: string | undefined;
    theme: string | undefined;
    hide: string[];
    heroStat: string | undefined;
    preview: boolean;
    output: string | undefined;
    // Sync-specific flags
    confirm: boolean;
    delete: boolean;
    showProjects: boolean;
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
      version: { type: "boolean", short: "v", default: false },
      local: { type: "boolean", default: false },
      // Card appearance flags
      layout: { type: "string" },
      style: { type: "string" },
      theme: { type: "string" },
      hide: { type: "string", multiple: true },
      "hero-stat": { type: "string" },
      preview: { type: "boolean", default: false },
      output: { type: "string", short: "o" },
      // Sync flags
      confirm: { type: "boolean", default: false },
      delete: { type: "boolean", default: false },
      "show-projects": { type: "boolean", default: false },
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
      version: (flags.version as boolean | undefined) ?? false,
      local: (flags.local as boolean | undefined) ?? false,
      // Card appearance flags
      layout: flags.layout as string | undefined,
      style: flags.style as string | undefined,
      theme: flags.theme as string | undefined,
      hide: (flags.hide as string[] | undefined) ?? [],
      heroStat: flags["hero-stat"] as string | undefined,
      preview: (flags.preview as boolean | undefined) ?? false,
      output: flags.output as string | undefined,
      // Sync flags
      confirm: (flags.confirm as boolean | undefined) ?? false,
      delete: (flags.delete as boolean | undefined) ?? false,
      showProjects: (flags["show-projects"] as boolean | undefined) ?? false,
    },
  };
}
