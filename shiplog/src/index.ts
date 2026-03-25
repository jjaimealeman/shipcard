/**
 * ShipLog public API entry point.
 *
 * `runEngine(options?)` is the single entry point for all consumers:
 * CLI, MCP tools, and the card endpoint all call this function.
 *
 * Output (AnalyticsResult) is fully JSON-serializable — no Maps, Sets,
 * Dates, or class instances. Suitable for JSON.stringify() without a replacer.
 */

import * as os from "node:os";

import { parseAllFiles } from "./parser/deduplicator.js";
import { filterByDateRange } from "./engine/filter.js";
import { getPricing } from "./engine/cost.js";
import { aggregate } from "./engine/aggregator.js";
import type { ParseResult } from "./parser/deduplicator.js";

// ---------------------------------------------------------------------------
// Re-exports for consumers (Phase 2: CLI and MCP tools)
// ---------------------------------------------------------------------------

export type {
  AnalyticsResult,
  EngineOptions,
  ProjectStats,
  ModelStats,
} from "./engine/types.js";

export type { TokenCounts } from "./parser/schema.js";

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run the ShipLog analytics engine.
 *
 * Steps:
 *   1. Resolve projects directory (option or ~/.claude/projects)
 *   2. Parse all JSONL files (deduplicating across sessions)
 *   3. Apply date filter (if since/until provided) — before aggregation
 *   4. Rebuild sessions map from filtered messages
 *   5. Fetch pricing data (3-layer cache: runtime → disk → network → snapshot)
 *   6. Aggregate into AnalyticsResult
 *   7. Attach dateRange to meta if filtering was applied
 *
 * @param options  Optional engine configuration.
 * @returns        JSON-serializable AnalyticsResult.
 */
export async function runEngine(
  options?: import("./engine/types.js").EngineOptions
): Promise<import("./engine/types.js").AnalyticsResult> {
  // Step 1: Resolve projects directory.
  const projectsDir =
    options?.projectsDir ?? `${os.homedir()}/.claude/projects`;

  // Step 2: Parse all JSONL files.
  const parseResult = await parseAllFiles(projectsDir);

  // Step 3: Apply date filtering before aggregation.
  const { since, until } = options ?? {};
  const hasDateFilter = since !== undefined || until !== undefined;

  let filteredParseResult: ParseResult;

  if (!hasDateFilter) {
    filteredParseResult = parseResult;
  } else {
    const filteredMessages = filterByDateRange(
      parseResult.messages,
      since,
      until
    );

    // Step 4: Rebuild sessions map from filtered messages.
    // Sessions with no messages remaining in the window are dropped.
    const filteredSessions = new Map<
      string,
      { cwd: string; firstTimestamp: string; lastTimestamp: string }
    >();

    for (const msg of filteredMessages) {
      const existing = filteredSessions.get(msg.sessionId);
      if (existing === undefined) {
        filteredSessions.set(msg.sessionId, {
          cwd: msg.cwd,
          firstTimestamp: msg.timestamp,
          lastTimestamp: msg.timestamp,
        });
      } else {
        if (msg.timestamp < existing.firstTimestamp) {
          existing.firstTimestamp = msg.timestamp;
        }
        if (msg.timestamp > existing.lastTimestamp) {
          existing.lastTimestamp = msg.timestamp;
        }
      }
    }

    filteredParseResult = {
      messages: filteredMessages,
      sessions: filteredSessions,
      stats: parseResult.stats, // filesRead/linesSkipped reflect the full parse, not the filter
    };
  }

  // Step 5: Fetch pricing.
  const pricing = await getPricing();

  // Step 6: Aggregate.
  const result = aggregate(filteredParseResult, pricing);

  // Step 7: Attach dateRange to meta if filtering was applied.
  if (hasDateFilter) {
    result.meta.dateRange = {};
    if (since !== undefined) {
      result.meta.dateRange.since = since;
    }
    if (until !== undefined) {
      result.meta.dateRange.until = until;
    }
  }

  return result;
}
