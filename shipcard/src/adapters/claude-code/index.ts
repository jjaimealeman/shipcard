import type { SourceAdapter } from "../interface.js";
import type { ParseResult } from "../interface.js";
import { discoverJsonlFiles } from "../../parser/reader.js";
import { parseAllFiles } from "../../parser/deduplicator.js";

/**
 * Claude Code adapter — wraps the existing parser as a SourceAdapter.
 *
 * This is a thin delegation layer. The actual parsing logic stays in
 * src/parser/ untouched. The adapter just satisfies the SourceAdapter
 * contract so the engine can work with any adapter interchangeably.
 */
export const ClaudeCodeAdapter: SourceAdapter = {
  name: "Claude Code",
  id: "claude-code",

  async *discoverFiles(sourceDir: string): AsyncGenerator<string> {
    yield* discoverJsonlFiles(sourceDir);
  },

  async parse(sourceDir: string): Promise<ParseResult> {
    return parseAllFiles(sourceDir);
  },
};
