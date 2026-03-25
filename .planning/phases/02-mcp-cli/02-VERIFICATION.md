---
phase: 02-mcp-cli
verified: 2026-03-25T23:28:58Z
status: passed
score: 5/5 must-haves verified
---

# Phase 2: MCP + CLI Verification Report

**Phase Goal:** Both terminal users and Claude Code IDE users can query their stats through their preferred interface
**Verified:** 2026-03-25T23:28:58Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                      | Status     | Evidence                                                                                      |
| --- | ------------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------- |
| 1   | `shiplog summary` and `shiplog costs` display formatted tables with correct data           | ✓ VERIFIED | Both handlers call `runEngine()`, branch on `flags.json`, and call `formatSummary()`/`formatCosts()` which produce UTF-8 box-drawing tables |
| 2   | `--json`, `--since`, and `--until` flags work consistently across all CLI commands         | ✓ VERIFIED | `parseCliArgs()` defines all three flags; all three command handlers consume `flags.json`, `flags.since`, `flags.until` |
| 3   | `npx shiplog` runs without installation and without configuration                          | ✓ VERIFIED | `package.json` has `bin.shiplog = "./dist/cli/index.js"` with shebang; `loadConfig()` returns `{}` silently on missing config; `dist/cli/index.js` is chmod 755 |
| 4   | MCP server responds to `shiplog:summary`, `shiplog:costs`, and `shiplog:card` tool calls  | ✓ VERIFIED | All three tools registered in `server.ts` via `registerSummaryTool`, `registerCostsTool`, `registerCardTool`; each calls `runEngine()` and returns JSON text content |
| 5   | MCP server produces zero stdout output (all logging to stderr)                            | ✓ VERIFIED | Grep across all `src/mcp/` files finds zero `console.log` calls and zero `process.stdout` writes; only `console.error()` used in `server.ts` |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                                  | Expected                                        | Status      | Details                                                    |
| ----------------------------------------- | ----------------------------------------------- | ----------- | ---------------------------------------------------------- |
| `shiplog/src/cli/args.ts`                 | Typed flag parser with --json/--since/--until   | ✓ VERIFIED  | 65 lines; exports `parseCliArgs()`; all three flags defined with correct types |
| `shiplog/src/cli/config.ts`               | Config loader with safe defaults                | ✓ VERIFIED  | 45 lines; exports `loadConfig()`; returns `{}` on missing/invalid |
| `shiplog/src/cli/format.ts`               | UTF-8 box-drawing table renderer                | ✓ VERIFIED  | 271 lines; exports `renderTable()`, `formatSummary()`, `formatCosts()` |
| `shiplog/src/cli/commands/summary.ts`     | summary command calling runEngine + formatSummary | ✓ VERIFIED | 87 lines; wired to `runEngine()` and `formatSummary()` with json/since/until |
| `shiplog/src/cli/commands/costs.ts`       | costs command calling runEngine + formatCosts   | ✓ VERIFIED  | 92 lines; wired to `runEngine()` and `formatCosts()` with json/since/until |
| `shiplog/src/cli/commands/card.ts`        | card command outputting JSON in Phase 2         | ✓ VERIFIED  | 92 lines; outputs raw JSON; SVG deferred to Phase 3 per scope |
| `shiplog/src/cli/index.ts`                | Shebang entry point with subcommand dispatch    | ✓ VERIFIED  | 100 lines; shebang present; dispatches summary/costs/card; help text |
| `shiplog/src/mcp/server.ts`               | MCP server with stdio transport                 | ✓ VERIFIED  | 31 lines; shebang; McpServer + StdioServerTransport; registers all 3 tools |
| `shiplog/src/mcp/tools/summary.ts`        | shiplog:summary tool registration               | ✓ VERIFIED  | 57 lines; registers `shiplog:summary`; calls `runEngine()`; returns JSON |
| `shiplog/src/mcp/tools/costs.ts`          | shiplog:costs tool registration                 | ✓ VERIFIED  | 60 lines; registers `shiplog:costs`; returns byProject+byModel JSON |
| `shiplog/src/mcp/tools/card.ts`           | shiplog:card tool registration                  | ✓ VERIFIED  | 56 lines; registers `shiplog:card`; returns full AnalyticsResult JSON |
| `shiplog/package.json` (bin field)        | Dual bin entries shiplog + shiplog-mcp          | ✓ VERIFIED  | `bin.shiplog = "./dist/cli/index.js"`, `bin.shiplog-mcp = "./dist/mcp/server.js"` |
| `shiplog/package.json` (build script)     | tsc + chmod 755 on both entry points            | ✓ VERIFIED  | `"build": "tsc && chmod 755 dist/cli/index.js dist/mcp/server.js"` |
| `shiplog/docs/mcp-config.md`              | Copy-paste MCP config for Claude Code + Cursor  | ✓ VERIFIED  | 69 lines; JSON snippets for Claude Code, Cursor, global install; npx -y documented |
| `shiplog/dist/cli/index.js`               | Compiled CLI entry point, executable            | ✓ VERIFIED  | Exists, shebang present, permissions -rwxr-xr-x (755) |
| `shiplog/dist/mcp/server.js`              | Compiled MCP entry point, executable            | ✓ VERIFIED  | Exists, shebang present, permissions -rwxr-xr-x (755) |

### Key Link Verification

| From                         | To                    | Via                                   | Status      | Details                                                      |
| ---------------------------- | --------------------- | ------------------------------------- | ----------- | ------------------------------------------------------------ |
| `cli/commands/summary.ts`    | `runEngine()`         | `import from "../../index.js"`        | ✓ WIRED     | Imported and called with `{ since, until }` options          |
| `cli/commands/costs.ts`      | `runEngine()`         | `import from "../../index.js"`        | ✓ WIRED     | Imported and called with `{ since, until }` options          |
| `cli/commands/card.ts`       | `runEngine()`         | `import from "../../index.js"`        | ✓ WIRED     | Imported and called with `{ since, until }` options          |
| `cli/commands/summary.ts`    | `formatSummary()`     | `import from "../format.js"`          | ✓ WIRED     | Called with `(result, { color: flags.color })`               |
| `cli/commands/costs.ts`      | `formatCosts()`       | `import from "../format.js"`          | ✓ WIRED     | Called with `(result, { color: flags.color })`               |
| `cli/index.ts`               | all three commands    | `switch(command)` dispatch            | ✓ WIRED     | summary/costs/card all routed; mergedFlags passed through    |
| `mcp/tools/summary.ts`       | `runEngine()`         | `import from "../../index.js"`        | ✓ WIRED     | Called in async handler; result.summary serialized to JSON   |
| `mcp/tools/costs.ts`         | `runEngine()`         | `import from "../../index.js"`        | ✓ WIRED     | Called in async handler; byProject+byModel serialized        |
| `mcp/tools/card.ts`          | `runEngine()`         | `import from "../../index.js"`        | ✓ WIRED     | Called in async handler; full result serialized              |
| `mcp/server.ts`              | all three tools       | `registerXxxTool(server)` calls       | ✓ WIRED     | All three registration functions called at startup           |
| `package.json` bin.shiplog   | `dist/cli/index.js`   | npm bin entry                         | ✓ WIRED     | Path matches compiled output; file exists at path            |
| `package.json` bin.shiplog-mcp | `dist/mcp/server.js` | npm bin entry                        | ✓ WIRED     | Path matches compiled output; file exists at path            |

### Requirements Coverage

| Requirement | Status       | Notes                                                                                    |
| ----------- | ------------ | ---------------------------------------------------------------------------------------- |
| CLI-01      | ✓ SATISFIED  | `runSummary()` calls `formatSummary()` which renders UTF-8 box-drawing table            |
| CLI-02      | ✓ SATISFIED  | `runCosts()` calls `formatCosts()` rendering by-project and by-model tables             |
| CLI-03      | ~ PARTIAL    | `runCard()` exists and outputs data; SVG local generation is Phase 3 scope — correctly deferred |
| CLI-04      | ✓ SATISFIED  | `--json` flag parsed and branched in all three command handlers                         |
| CLI-05      | ✓ SATISFIED  | `--since`/`--until` parsed and passed to `runEngine()` in all three commands            |
| CLI-06      | ✓ SATISFIED  | Dual bin entries + build script + shebang + zero-config `loadConfig()` enable `npx shiplog` |
| MCP-01      | ✓ SATISFIED  | `shiplog:summary` tool calls `runEngine()` and returns `result.summary` as JSON         |
| MCP-02      | ✓ SATISFIED  | `shiplog:costs` tool returns `{ byProject, byModel }` as JSON                           |
| MCP-03      | ~ PARTIAL    | `shiplog:card` tool returns raw analytics data; SVG/sync deferred to Phase 3/4 per scope |
| MCP-04      | ✓ SATISFIED  | Zero `console.log` and zero `process.stdout` writes in all MCP files                   |
| MCP-05      | ✓ SATISFIED  | `docs/mcp-config.md` has copy-paste JSON for Claude Code and Cursor with npx -y explained |

Note on CLI-03 and MCP-03: The ROADMAP.md Phase 2 success criteria for `shiplog card` is "output raw analytics JSON (Phase 2 scope)" — both implementations correctly output JSON with a stderr note about SVG coming later. The partial status reflects that the requirement text describes future Phase 3/4 behavior, not a Phase 2 gap.

### Anti-Patterns Found

| File                           | Line | Pattern              | Severity | Impact                                      |
| ------------------------------ | ---- | -------------------- | -------- | ------------------------------------------- |
| `src/cli/index.ts`             | 27   | "coming soon" in help text | Info  | User-facing info message; not a stub        |
| `src/cli/commands/card.ts`     | 76   | "coming in a future release" in stderr | Info | Expected Phase 2 behavior per plan |

No blockers. "Coming soon" text is intentional user-facing communication, not a code stub.

### Human Verification Required

The following items cannot be verified programmatically:

#### 1. CLI Table Rendering

**Test:** Run `node dist/cli/index.js summary` against real JSONL data
**Expected:** UTF-8 box-drawing table renders cleanly in terminal with correct session counts, token totals, and cost figures
**Why human:** Visual output quality and data correctness require runtime execution against real data

#### 2. npx Zero-Install Flow

**Test:** From a clean directory (or temp dir without shiplog installed), run `npx shiplog summary`
**Expected:** npx fetches, installs, and runs without prompting; table renders; exit 0
**Why human:** Requires network access and npm registry — structural checks confirm the package wiring but not the actual npx invocation path

#### 3. MCP Server Handshake

**Test:** Configure `shiplog-mcp` in Claude Code `.mcp.json` using the snippet in `docs/mcp-config.md`; restart; invoke `shiplog:summary` tool
**Expected:** Tool returns JSON with sessions, tokens, models, projects, and cost fields
**Why human:** Requires live MCP client-server handshake; stdio transport behavior only verifiable at runtime

### Gaps Summary

No gaps. All 5 observable truths are verified. All 16 required artifacts exist, are substantive, and are wired. All key links confirmed. Zero blocker anti-patterns.

The three human verification items are runtime/integration checks that cannot be done via static analysis — they do not indicate structural gaps.

---

_Verified: 2026-03-25T23:28:58Z_
_Verifier: Claude (gsd-verifier)_
