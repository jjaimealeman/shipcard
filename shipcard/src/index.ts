/**
 * ShipCard public API entry point.
 *
 * `runEngine(options?)` is the single entry point for all consumers:
 * CLI, MCP tools, and the card endpoint all call this function.
 *
 * Output (AnalyticsResult) is fully JSON-serializable — no Maps, Sets,
 * Dates, or class instances. Suitable for JSON.stringify() without a replacer.
 */

import * as os from "node:os";

import { getAdapter } from "./adapters/registry.js";
import { filterByDateRange } from "./engine/filter.js";
import { getPricing } from "./engine/cost.js";
import { aggregate } from "./engine/aggregator.js";
import type { ParseResult } from "./adapters/interface.js";

// ---------------------------------------------------------------------------
// Re-exports for consumers (Phase 2: CLI and MCP tools)
// ---------------------------------------------------------------------------

export type {
  AnalyticsResult,
  EngineOptions,
  ProjectStats,
  ModelStats,
} from "./engine/types.js";

export type { TokenCounts, ParsedMessage } from "./parser/schema.js";

// ---------------------------------------------------------------------------
// EngineFullResult — returned by runEngineFull
// ---------------------------------------------------------------------------

/**
 * Extended engine result that includes both the AnalyticsResult and the
 * filtered ParsedMessage[] array.
 *
 * Callers that need raw messages for additional processing (e.g. daily
 * aggregation in the sync command) should use runEngineFull() to avoid
 * double-parsing the JSONL files.
 */
export interface EngineFullResult {
  result: import("./engine/types.js").AnalyticsResult;
  messages: import("./parser/schema.js").ParsedMessage[];
  userMessagesByDate: Map<string, number>;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run the ShipCard analytics engine, returning both the AnalyticsResult and
 * the filtered ParsedMessage[] for consumers that need raw messages.
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
 * @returns        EngineFullResult with AnalyticsResult + ParsedMessage[].
 */
export async function runEngineFull(
  options?: import("./engine/types.js").EngineOptions
): Promise<EngineFullResult> {
  // Step 1: Resolve projects directory.
  const projectsDir =
    options?.projectsDir ?? `${os.homedir()}/.claude/projects`;

  // Step 2: Parse all JSONL files via the adapter.
  const adapter = getAdapter(options?.adapter);
  const parseResult = await adapter.parse(projectsDir);

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

    // Filter userMessagesByDate to dates within the since/until range.
    const filteredUserMessagesByDate = new Map<string, number>();
    for (const [date, count] of parseResult.userMessagesByDate) {
      if (since !== undefined && date < since) continue;
      if (until !== undefined && date > until) continue;
      filteredUserMessagesByDate.set(date, count);
    }

    filteredParseResult = {
      messages: filteredMessages,
      sessions: filteredSessions,
      stats: parseResult.stats, // filesRead/linesSkipped reflect the full parse, not the filter
      userMessagesByDate: filteredUserMessagesByDate,
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

  return {
    result,
    messages: filteredParseResult.messages,
    userMessagesByDate: filteredParseResult.userMessagesByDate,
  };
}

/**
 * Run the ShipCard analytics engine.
 *
 * Delegates to runEngineFull() and returns just the AnalyticsResult.
 * Use runEngineFull() if you also need access to the ParsedMessage[].
 *
 * @param options  Optional engine configuration.
 * @returns        JSON-serializable AnalyticsResult.
 */
export async function runEngine(
  options?: import("./engine/types.js").EngineOptions
): Promise<import("./engine/types.js").AnalyticsResult> {
  const { result } = await runEngineFull(options);
  return result;
}
