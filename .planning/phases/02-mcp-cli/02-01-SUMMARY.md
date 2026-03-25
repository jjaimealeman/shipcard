---
phase: 02-mcp-cli
plan: "01"
subsystem: cli
tags: [typescript, node, cli, args-parser, utf8, box-drawing, terminal]

# Dependency graph
requires:
  - phase: 01-parser-engine
    provides: runEngine(), AnalyticsResult, Node16 ESM module resolution, engine types

provides:
  - parseCliArgs() — typed flag parser wrapping node:util.parseArgs
  - loadConfig() — ~/.shiplog.json config loader with safe defaults
  - renderTable() — generic UTF-8 box-drawing table renderer
  - formatSummary() / formatCosts() — domain-specific AnalyticsResult formatters
  - shiplog summary — terminal table with sessions, tokens, models, projects, cost, tool calls
  - shiplog costs — cost breakdown by project and by model
  - shiplog card — raw analytics JSON (Phase 2 scope)
  - --json, --since, --until, --color flags for all commands
  - Onboarding message for empty state (no JSONL files found)

affects:
  - 02-02 (MCP server may share formatting patterns)
  - 05-publish (package.json bin entry will point to dist/cli/index.js)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CLI flag parsing via node:util.parseArgs with strict: false
    - UTF-8 box-drawing tables via string constants (no deps)
    - Exit code contract: 0=success, 1=no data, 2=parse errors
    - Process stdout/stderr separation (warnings to stderr only)
    - shouldUseColor() guards ANSI output behind isTTY check

key-files:
  created:
    - shiplog/src/cli/args.ts
    - shiplog/src/cli/config.ts
    - shiplog/src/cli/format.ts
    - shiplog/src/cli/commands/summary.ts
    - shiplog/src/cli/commands/costs.ts
    - shiplog/src/cli/commands/card.ts
    - shiplog/src/cli/index.ts
  modified: []

key-decisions:
  - "node:util.parseArgs with strict: false — avoids unknown flag crashes, simpler than yargs/commander"
  - "Onboarding message for zero JSONL files — friendlier than raw error for new installs"
  - "shiplog card always outputs JSON in Phase 2 — SVG generation deferred to Phase 3"
  - "shouldUseColor() checks isTTY first — prevents garbled ANSI in piped output"
  - "Column alignment via padRight() with truncation — handles long project names cleanly"

patterns-established:
  - "All CLI output via process.stdout.write/process.stderr.write — no console.log"
  - "All imports use .js extensions — Node16 ESM resolution"
  - "Flags type defined per-command handler — avoids passing full ParsedCliArgs to internals"

# Metrics
duration: 4min
completed: 2026-03-25
---

# Phase 2 Plan 01: CLI Interface Summary

**Seven-file CLI layer wired to Phase 1 engine: args parser with date flags, UTF-8 box-drawing tables, and shiplog summary/costs/card commands dispatched from a shebang entry point.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-25T23:17:42Z
- **Completed:** 2026-03-25T23:21:26Z
- **Tasks:** 2
- **Files created:** 7

## Accomplishments

- Full CLI with subcommand dispatch, --help, and friendly onboarding messages for empty state
- UTF-8 box-drawing table renderer with dynamic column widths and truncation for long values
- All three commands (summary, costs, card) wired to the Phase 1 runEngine() API
- --json flag for machine-readable output, --since/--until for date filtering, --color gated on isTTY

## Task Commits

Each task was committed atomically:

1. **Task 1: CLI foundation — args parser, config loader, and table formatter** - `d52c9a3` (feat)
2. **Task 2: CLI entry point and three command handlers** - `692a772` (feat)

**Plan metadata:** (pending — this commit)

## Files Created/Modified

- `shiplog/src/cli/args.ts` — parseCliArgs() wrapping node:util.parseArgs with typed flags
- `shiplog/src/cli/config.ts` — loadConfig() reading ~/.shiplog.json, returns {} on missing/invalid
- `shiplog/src/cli/format.ts` — renderTable(), formatSummary(), formatCosts() with UTF-8 box-drawing
- `shiplog/src/cli/commands/summary.ts` — runSummary() with table/JSON output and empty state handling
- `shiplog/src/cli/commands/costs.ts` — runCosts() with by-project and by-model breakdown
- `shiplog/src/cli/commands/card.ts` — runCard() outputting raw JSON, Phase 3 note to stderr
- `shiplog/src/cli/index.ts` — shebang entry point, help text, subcommand dispatch, config merge

## Decisions Made

- **node:util.parseArgs over yargs/commander** — zero-dep approach fits the zero-runtime-deps constraint from Phase 1; strict: false avoids crashes on unknown flags
- **Card always JSON in Phase 2** — SVG generation is Phase 3 work; outputting JSON with a stderr note is clear and actionable for users today
- **shouldUseColor() checks isTTY** — ANSI escape codes in piped output (CI logs, jq processing) would corrupt data; gate on TTY detection
- **Onboarding message on empty state** — new users get guidance instead of a cryptic "0 sessions" table

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TokenCounts field name: cacheCreation → cacheCreate**

- **Found during:** Task 1 (format.ts implementation)
- **Issue:** Plan mentioned `cacheCreation` but the actual schema.ts interface uses `cacheCreate`
- **Fix:** Used the correct field name `tokens.cacheCreate` in formatSummary()
- **Files modified:** `shiplog/src/cli/format.ts`
- **Verification:** `npx tsc --noEmit` returned zero errors after fix
- **Committed in:** `d52c9a3` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug, field name mismatch)
**Impact on plan:** Fix was essential for type safety. No scope creep.

## Issues Encountered

None beyond the field name mismatch (documented above as deviation).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CLI is fully functional and verified against real JSONL data (444 sessions, 55 recent)
- `dist/cli/index.js` has correct shebang for bin entry in package.json
- Phase 2 Plan 02 (MCP server) can proceed — runEngine() is the shared dependency

---
*Phase: 02-mcp-cli*
*Completed: 2026-03-25*
