/**
 * shiplog:costs tool registration.
 *
 * Returns cost breakdown by project and model from Claude Code JSONL files.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { runEngine } from "../../index.js";

// ---------------------------------------------------------------------------
// Shared date filter schema
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

export function registerCostsTool(server: McpServer): void {
  server.registerTool(
    "shiplog:costs",
    {
      title: "ShipLog Costs",
      description:
        "Returns cost breakdown by project and model from Claude Code JSONL files",
      inputSchema: z.object(dateFilterSchema),
    },
    async ({ since, until }) => {
      const result = await runEngine({ since, until });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { byProject: result.byProject, byModel: result.byModel },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
