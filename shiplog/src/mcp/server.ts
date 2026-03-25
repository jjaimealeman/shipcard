#!/usr/bin/env node
/**
 * ShipLog MCP server entry point.
 *
 * Runs over stdio transport. All three tools (summary, costs, card) are
 * registered here. CRITICAL: No console.log() — stdout is the JSON-RPC
 * transport channel. Use console.error() for any diagnostic output.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerSummaryTool } from "./tools/summary.js";
import { registerCostsTool } from "./tools/costs.js";
import { registerCardTool } from "./tools/card.js";

const server = new McpServer({ name: "shiplog", version: "0.1.0" });

registerSummaryTool(server);
registerCostsTool(server);
registerCardTool(server);

const transport = new StdioServerTransport();

try {
  await server.connect(transport);
  console.error("ShipLog MCP server started");
} catch (err) {
  console.error("ShipLog MCP server failed to start:", err);
  process.exit(1);
}
