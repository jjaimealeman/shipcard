/**
 * shipcard:card tool registration.
 *
 * Returns an SVG stats card rendered from local analytics data.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { runEngine } from "../../index.js";
import { renderCard } from "../../card/index.js";
import type { LayoutName, StyleName, ThemeName } from "../../card/index.js";

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
    "shipcard:card",
    {
      title: "ShipCard Stats Card",
      description:
        "Generates an SVG stats card from local Claude Code analytics. Returns SVG markup ready to embed in a GitHub README or web page.",
      inputSchema: z.object({
        ...dateFilterSchema,
        layout: z
          .enum(["classic", "compact", "hero"])
          .optional()
          .describe("Card layout. Default: 'classic'."),
        style: z
          .enum(["github", "branded", "minimal"])
          .optional()
          .describe("Visual style. Default: 'github'."),
        theme: z
          .enum(["dark", "light"])
          .optional()
          .describe("Color theme. Default: 'dark'."),
        hide: z
          .array(z.enum(["sessions", "toolCalls", "models", "projects", "cost"]))
          .optional()
          .describe("Stat keys to hide from the card."),
        heroStat: z
          .enum(["sessions", "toolCalls", "models", "projects", "cost"])
          .optional()
          .describe("For hero layout: which stat to feature prominently."),
      }),
    },
    async ({ since, until, layout, style, theme, hide, heroStat }) => {
      const result = await runEngine({ since, until });
      const svg = renderCard(result, {
        layout: layout as LayoutName | undefined,
        style: style as StyleName | undefined,
        theme: theme as ThemeName | undefined,
        hide: hide ?? [],
        heroStat,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: svg,
          },
        ],
      };
    }
  );
}
