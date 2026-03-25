/**
 * Output shapes for the ShipLog analytics engine.
 *
 * AnalyticsResult is the single canonical output type consumed by every
 * interface: CLI, MCP tools, and the card endpoint.
 */

import type { TokenCounts } from "../parser/schema.js";

// Re-export for consumers who only need to import from engine.
export type { TokenCounts };

// ---------------------------------------------------------------------------
// Per-project stats
// ---------------------------------------------------------------------------

export interface ProjectStats {
  /** Number of unique sessions that touched this project. */
  sessions: number;
  tokens: TokenCounts;
  /** Estimated cost, formatted as "~$X.XX". */
  cost: string;
  /** Unique model identifiers used in this project. */
  models: string[];
  /** Tool call counts by tool name, unsorted. */
  toolCalls: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Per-model stats
// ---------------------------------------------------------------------------

export interface ModelStats {
  tokens: TokenCounts;
  /** Estimated cost, formatted as "~$X.XX". */
  cost: string;
  /** Per-project breakdown for this model. */
  byProject: Record<
    string,
    {
      tokens: TokenCounts;
      /** Estimated cost, formatted as "~$X.XX". */
      cost: string;
    }
  >;
}

// ---------------------------------------------------------------------------
// Top-level result
// ---------------------------------------------------------------------------

export interface AnalyticsResult {
  summary: {
    totalSessions: number;
    totalTokens: TokenCounts;
    /** Estimated total cost, formatted as "~$X.XX". */
    totalCost: string;
    /** Unique model identifiers seen across all messages. */
    modelsUsed: string[];
    /** Unique project names (last cwd path segment) seen. */
    projectsTouched: string[];
    /**
     * Tool call counts by tool name, sorted by count descending.
     * e.g. { "Bash": 420, "Read": 311, ... }
     */
    toolCallSummary: Record<string, number>;
    /**
     * Describes the pricing data source used for cost estimation.
     * e.g. "LiteLLM live", "LiteLLM cached 2026-03-25", "LiteLLM snapshot 2026-03-25"
     */
    pricingVersion: string;
  };
  byProject: Record<string, ProjectStats>;
  byModel: Record<string, ModelStats>;
  meta: {
    filesRead: number;
    linesSkipped: number;
    dateRange?: {
      since?: string;
      until?: string;
    };
  };
}

// ---------------------------------------------------------------------------
// Engine options (passed by CLI / MCP tools)
// ---------------------------------------------------------------------------

export interface EngineOptions {
  /** Override default projects directory (~/.claude/projects). */
  projectsDir?: string;
  /** ISO date string — filter messages on or after this date. */
  since?: string;
  /** ISO date string — filter messages on or before this date. */
  until?: string;
  /** Emit JSON output instead of formatted text (for CLI --json flag). */
  json?: boolean;
}
