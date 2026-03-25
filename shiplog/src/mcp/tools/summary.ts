/**
 * shiplog:summary tool registration.
 *
 * Returns sessions, tool calls, models used, projects touched, and estimated
 * cost from Claude Code JSONL files.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { runEngine } from "../../index.js";

// ---------------------------------------------------------------------------
// Shared date filter schema (reused across tools)
// ---------------------------------------------------------------------------

const dateFilterSchema = {
  since: z
    .string()
    .optional()
    .describe(
      'Start of date range (inclusive). Accepts ISO 8601 date (e.g. "2025-01-01") or relative value (e.g. "7d", "30d", "today").'
    ),
  until: z
    .string()
    .optional()
    .describe(
      'End of date range (exclusive). Accepts ISO 8601 date (e.g. "2025-02-01") or relative value.'
    ),
};

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerSummaryTool(server: McpServer): void {
  server.registerTool(
    "shiplog:summary",
    {
      title: "ShipLog Summary",
      description:
        "Returns sessions, tool calls, models used, projects touched, and estimated cost from Claude Code JSONL files",
      inputSchema: z.object(dateFilterSchema),
    },
    async ({ since, until }) => {
      const result = await runEngine({ since, until });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result.summary, null, 2),
          },
        ],
      };
    }
  );
}
