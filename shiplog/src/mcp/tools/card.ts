/**
 * shiplog:card tool registration.
 *
 * Returns raw analytics data for card generation (SVG rendering in future release).
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

export function registerCardTool(server: McpServer): void {
  server.registerTool(
    "shiplog:card",
    {
      title: "ShipLog Card Data",
      description:
        "Returns raw analytics data for card generation (SVG rendering in future release)",
      inputSchema: z.object(dateFilterSchema),
    },
    async ({ since, until }) => {
      const result = await runEngine({ since, until });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
