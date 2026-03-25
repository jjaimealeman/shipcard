---
phase: 01-parser-engine
plan: 03
subsystem: parser
tags: [typescript, nodejs, jsonl, analytics, date-filtering, public-api]

# Dependency graph
requires:
  - phase: 01-01
    provides: ParsedMessage schema, JSONL reader, two-level deduplicator
  - phase: 01-02
    provides: AnalyticsResult types, LiteLLM pricing, aggregator
provides:
  - Date filtering with ISO/relative/today support (filterByDateRange, parseFilterDate)
  - Parser barrel export (src/parser/index.ts)
  - Engine barrel export (src/engine/index.ts)
  - Public runEngine(options?) entry point (src/index.ts) — JSON-serializable output
  - End-to-end validated against real JSONL data (441 sessions, 57 projects, 6 models)
affects:
  - 02-cli-mcp: imports runEngine() as sole entry point for all CLI and MCP tools
  - 03-card-endpoint: may call runEngine() or consume AnalyticsResult shape

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Filter before aggregate — date filtering applied to messages before aggregation so stats reflect the narrowed window only
    - Sessions map rebuild — after filtering messages, sessions map is rebuilt from filtered set to exclude empty sessions
    - Barrel exports — parser/index.ts and engine/index.ts centralize imports for consumers
    - JSON-serializable result — no Maps, Sets, Dates, or class instances in AnalyticsResult

key-files:
  created:
    - shiplog/src/engine/filter.ts
    - shiplog/src/engine/index.ts
    - shiplog/src/parser/index.ts
    - shiplog/src/index.ts
    - shiplog/.gitignore
  modified: []

key-decisions:
  - "parseFilterDate uses local time (not UTC) — ISO dates with T00:00:00 suffix, setHours(0,0,0,0) for relative/today"
  - "since is inclusive (>=), until is exclusive (<) — conventional date range semantics"
  - "Sessions map rebuilt from filtered messages — drop sessions with no messages in window"
  - "stats.filesRead/linesSkipped carry through from full parse — reflects I/O cost, not filter window"
  - "dist/ gitignored — compiled output not committed, build from source on install"

patterns-established:
  - "runEngine() is the single Phase 2 entry point — CLI and MCP tools never call internal modules directly"
  - "AnalyticsResult is JSON-serializable — all Records, arrays, strings, numbers (no Maps/Sets)"

# Metrics
duration: 3min
completed: 2026-03-25
---

# Phase 1 Plan 03: Date Filter and Public API Summary

**runEngine(options?) entry point wiring date filtering (ISO/relative/today) before aggregation, validated against 441 real Claude Code sessions producing sane non-zero analytics**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-25T22:17:43Z
- **Completed:** 2026-03-25T22:20:46Z
- **Tasks:** 2
- **Files modified:** 5 (4 created, 1 .gitignore)

## Accomplishments

- Date filtering with three input formats (ISO `2026-03-01`, relative `7d`/`30d`, `today`) that operates before aggregation
- Barrel exports for both parser and engine subsystems, reducing import surface area for Phase 2 consumers
- Single `runEngine(options?)` entry point that Phase 2 (CLI + MCP) will call — no direct access to internal modules needed
- End-to-end integration test confirmed: 441 sessions, 57 projects, 6 models, `~$3,351.45` total cost, JSON round-trip passes, date filter narrows correctly (52 sessions in last 7 days)

## Task Commits

Each task was committed atomically:

1. **Task 1: Date filter, barrel exports, and public runEngine() API** - `5868690` (feat)
2. **Task 2: Integration test and .gitignore** - `7762e10` (chore)

**Plan metadata:** (docs commit — this summary)

## Files Created/Modified

- `shiplog/src/engine/filter.ts` - `parseFilterDate()` and `filterByDateRange()` with ISO/relative/today support
- `shiplog/src/parser/index.ts` - Barrel re-export for parser subsystem (parseAllFiles, ParsedMessage, TokenCounts, reader)
- `shiplog/src/engine/index.ts` - Barrel re-export for engine subsystem (aggregate, cost functions, filter, types)
- `shiplog/src/index.ts` - `runEngine(options?)` public API: parse → filter → aggregate → return JSON-serializable result
- `shiplog/.gitignore` - Ignores `dist/` and `node_modules/`

## Decisions Made

- `parseFilterDate` uses local time throughout: ISO dates get `T00:00:00` suffix (not `Z`), relative/today use `setHours(0,0,0,0)` — consistent local timezone behavior
- `since` is inclusive (`>=`), `until` is exclusive (`<`) — standard date range convention used in analytics tools
- Sessions map is rebuilt from filtered messages after date filtering — ensures `totalSessions` reflects only sessions with activity in the window
- `stats.filesRead` and `linesSkipped` carry through from the full parse (not the filtered result) — accurately reflects actual I/O work performed
- `dist/` gitignored — compiled output is derived, not source-of-truth

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 1 (Parser + Engine) is complete. All 13 requirements satisfied:

- PARSE-01..07: JSONL discovery, streaming, deduplication (uuid + message.id), schema validation, session tracking, stats
- ANLYT-01..06: aggregation by project/model, LiteLLM pricing with 3-layer cache, cost calculation, date filtering, JSON output, `runEngine()` entry point

Phase 2 (CLI + MCP) can now import `runEngine` from `shiplog/src/index.ts` (or `dist/index.js` after build) and build the user-facing interface on top of it.

---
*Phase: 01-parser-engine*
*Completed: 2026-03-25*
