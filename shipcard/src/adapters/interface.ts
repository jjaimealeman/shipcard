// Re-export ParseResult from the parser so adapters and consumers
// can import it from the adapter layer without reaching into parser internals.
export type { ParseResult } from "../parser/deduplicator.js";

/**
 * Contract for agent-specific JSONL adapters.
 *
 * Each adapter knows how to discover and parse one agent's log format
 * into ShipCard's canonical ParseResult (ParsedMessage[] + session metadata).
 *
 * The engine ONLY sees ParseResult — it never touches raw JSONL or
 * agent-specific entry shapes.
 */
export interface SourceAdapter {
  /** Human-readable adapter name, e.g. "Claude Code". */
  readonly name: string;

  /** Unique identifier used in config/CLI, e.g. "claude-code". */
  readonly id: string;

  /**
   * Discover JSONL files for this agent under the given source directory.
   * Yields absolute file paths as they are discovered.
   */
  discoverFiles(sourceDir: string): AsyncGenerator<string>;

  /**
   * Parse all discovered files and return a canonical ParseResult.
   * Handles deduplication internally — callers receive clean data.
   */
  parse(sourceDir: string): Promise<import("../parser/deduplicator.js").ParseResult>;
}
