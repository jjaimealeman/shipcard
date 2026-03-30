import type { SourceAdapter } from "./interface.js";
import { ClaudeCodeAdapter } from "./claude-code/index.js";

/**
 * Registry of available source adapters.
 * New adapters are added here — nothing else changes.
 */
const ADAPTERS: Record<string, SourceAdapter> = {
  "claude-code": ClaudeCodeAdapter,
};

/** Default adapter when none is specified. */
const DEFAULT_ADAPTER = "claude-code";

/**
 * Get an adapter by ID. Falls back to the default (Claude Code) when
 * no name is provided. Throws if the requested adapter doesn't exist.
 */
export function getAdapter(name?: string): SourceAdapter {
  const id = name ?? DEFAULT_ADAPTER;
  const adapter = ADAPTERS[id];
  if (adapter === undefined) {
    const available = Object.keys(ADAPTERS).join(", ");
    throw new Error(
      `Unknown adapter "${id}". Available adapters: ${available}`
    );
  }
  return adapter;
}

