---
phase: 02-mcp-cli
plan: 02
subsystem: api
tags: [mcp, stdio, zod, json-rpc, typescript, node]

# Dependency graph
requires:
  - phase: 01-parser-engine
    provides: runEngine() function and AnalyticsResult type from shiplog/src/index.ts
provides:
  - MCP server entry point (shiplog/src/mcp/server.ts) with stdio transport
  - shiplog:summary tool returning sessions/tokens/models/projects/cost as JSON
  - shiplog:costs tool returning byProject and byModel cost breakdown as JSON
  - shiplog:card tool returning full AnalyticsResult as JSON
  - Shared Zod date filter schema (since/until optional string params)
affects: [02-mcp-cli/02-03-cli, 03-card-endpoint, package.json bin field for npm publish]

# Tech tracking
tech-stack:
  added: ["@modelcontextprotocol/sdk@1.28.0", "zod@4.3.6"]
  patterns: ["tool-per-file registration pattern", "type-only McpServer import in tool modules", "as const assertion on content type literal"]

key-files:
  created:
    - shiplog/src/mcp/server.ts
    - shiplog/src/mcp/tools/summary.ts
    - shiplog/src/mcp/tools/costs.ts
    - shiplog/src/mcp/tools/card.ts
  modified:
    - shiplog/package.json
    - shiplog/package-lock.json

key-decisions:
  - "Tool-per-file pattern: each tool is a separate module exporting registerXxxTool(server)"
  - "type-only McpServer import in tool files: import type { McpServer } avoids circular dep risk"
  - "as const on content type literal: enforces 'text' as MCP SDK expects, not inferred string"

patterns-established:
  - "MCP tool registration: server.registerTool(name, { title, description, inputSchema: z.object({...}) }, handler)"
  - "Zero console.log rule: all MCP files use console.error() only — stdout is JSON-RPC channel"
  - "Shared Zod schema inline per tool file: no shared module needed for 3-tool scope"

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 2 Plan 02: MCP Server Summary

**MCP server with 3 tools (summary, costs, card) over stdio transport using McpServer + Zod validation, zero stdout pollution verified**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-25T23:18:49Z
- **Completed:** 2026-03-25T23:20:23Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Installed @modelcontextprotocol/sdk@1.28.0 and zod@4.3.6 as runtime dependencies
- Created three tool registration modules (summary, costs, card) each in isolation
- Created server.ts entry point with shebang, stdio transport, and error-safe startup
- Verified MCP initialize handshake returns valid JSON-RPC response with all 3 tools listed
- Zero console.log anywhere in MCP code — verified by grep across all files

## Task Commits

Each task was committed atomically:

1. **Task 1: Install MCP SDK + Zod and create tool registration modules** - `7928dfd` (feat)
2. **Task 2: MCP server entry point with stdio transport** - `ff8acdd` (feat)

**Plan metadata:** (docs: complete plan — committed after this summary)

## Files Created/Modified

- `shiplog/src/mcp/server.ts` - Entry point: shebang, McpServer, StdioServerTransport, registers all 3 tools
- `shiplog/src/mcp/tools/summary.ts` - registerSummaryTool: returns result.summary as JSON text
- `shiplog/src/mcp/tools/costs.ts` - registerCostsTool: returns { byProject, byModel } as JSON text
- `shiplog/src/mcp/tools/card.ts` - registerCardTool: returns full AnalyticsResult as JSON text
- `shiplog/package.json` - Added @modelcontextprotocol/sdk and zod to dependencies
- `shiplog/package-lock.json` - Lockfile updated with 91 new packages

## Decisions Made

- **Tool-per-file pattern**: Each MCP tool lives in its own module exporting `registerXxxTool(server)`. Keeps server.ts clean and each tool independently testable.
- **`import type` for McpServer in tool files**: Tool modules only need the type for the parameter signature. Using `import type` makes the intent clear and avoids pulling in runtime code unnecessarily.
- **`as const` on content type literal**: `{ type: "text" as const }` ensures TypeScript infers the narrow `"text"` literal type that the MCP SDK expects, preventing a type-widening bug.
- **Shared date filter schema defined inline per file**: With only 3 tools, a shared module would add indirection with no benefit. If tools grow, extract to a shared schema file.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The grep for `console.log` matched comment text containing the string (the CRITICAL warning comment), not actual calls. Verified by checking line numbers — line 6 was a JSDoc comment, not executable code.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MCP server is complete and verified working via smoke test
- Three tools registered: summary, costs, card — all accept since/until date filters
- Ready for 02-03: CLI implementation (shiplog CLI commands wrapping the same runEngine() call)
- The server.ts bin field in package.json will need to point to `./dist/mcp/server.js` when npm publish is configured in Phase 5

---
*Phase: 02-mcp-cli*
*Completed: 2026-03-25*
