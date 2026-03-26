/**
 * SafeStats conversion — the privacy boundary on the CLI side.
 *
 * toSafeStats() converts a local AnalyticsResult to a SafeStats payload that
 * is safe for cloud transmission. It strips all private information:
 *   - NO projectsTouched (project names)
 *   - NO byProject (per-project breakdown)
 *   - NO meta.dateRange, meta.filesRead, meta.linesSkipped
 *   - NO file paths, no project directories, no raw content
 *
 * Only numeric aggregates, model names, tool call counts, and cost strings
 * reach the cloud.
 */

import type { AnalyticsResult } from "../engine/types.js";

// ---------------------------------------------------------------------------
// SafeStats type (mirrors shiplog-worker/src/types.ts — do NOT import from Worker)
// ---------------------------------------------------------------------------

/**
 * Aggregated, anonymized stats that the CLI may upload to the Worker.
 *
 * All fields mirror the Worker's SafeStats type exactly so the Worker's
 * isValidSafeStats() validator accepts the payload.
 */
export interface SafeStats {
  /** GitHub username of the card owner. */
  username: string;
  /** Total number of Claude Code sessions analyzed. */
  totalSessions: number;
  /** Aggregated token counts across all sessions. */
  totalTokens: {
    input: number;
    output: number;
    cacheCreate: number;
    cacheRead: number;
  };
  /** Formatted total cost string, e.g. "~$12.34". */
  totalCost: string;
  /** Unique model identifiers seen (e.g. ["claude-opus-4-5", "claude-sonnet-4-5"]). */
  modelsUsed: string[];
  /** Number of distinct projects (directories) touched — NOT the project names. */
  projectCount: number;
  /** Tool call counts by tool name (e.g. { "Bash": 420, "Read": 311 }). */
  toolCallSummary: Record<string, number>;
  /** Describes the pricing data source, e.g. "LiteLLM snapshot 2026-03-25". */
  pricingVersion: string;
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

/**
 * Convert a local AnalyticsResult to a SafeStats payload for cloud upload.
 *
 * Privacy guarantees:
 *   - projectsTouched names are replaced with a count (projectCount)
 *   - byProject breakdown is dropped entirely
 *   - meta fields (filesRead, linesSkipped, dateRange) are dropped
 *   - Only numeric aggregates and non-identifying strings are included
 *
 * @param result  Full analytics result from the local engine.
 * @param username  GitHub username of the authenticated user.
 */
export function toSafeStats(result: AnalyticsResult, username: string): SafeStats {
  const { summary } = result;

  return {
    username,
    totalSessions: summary.totalSessions,
    totalTokens: {
      input: summary.totalTokens.input,
      output: summary.totalTokens.output,
      cacheCreate: summary.totalTokens.cacheCreate,
      cacheRead: summary.totalTokens.cacheRead,
    },
    totalCost: summary.totalCost,
    modelsUsed: summary.modelsUsed,
    // Count only — never include the names array
    projectCount: summary.projectsTouched.length,
    toolCallSummary: summary.toolCallSummary,
    pricingVersion: summary.pricingVersion,
  };
}
