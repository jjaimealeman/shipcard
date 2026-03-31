---
phase: 13-data-pipeline-cleanup
plan: 01
subsystem: data-pipeline
tags: [typescript, jsonl, daily-aggregator, parser, deduplicator, per-project-stats, user-messages]

# Dependency graph
requires:
  - phase: 12-polish-community
    provides: stable sync pipeline and existing DailyStats shape
provides:
  - userMessagesByDate Map flowing from deduplicator through engine to aggregateDaily
  - PerProjectDailyStats interface with per-project breakdown per day
  - DailyStats.byProject optional field (sessions, messages, tokens, costCents, toolCalls, thinkingBlocks, models per project)
  - Real userMessages counts per day (was hardcoded 0)
affects: [14-dashboard-ui, 15-project-activity, SafeTimeSeries, sync command, Worker API]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Date extraction: timestamp.slice(0, 10) for JSONL UTC date keys"
    - "Get-or-init Map accumulator pattern for per-project bucketing"
    - "Optional parameter pass-through: userMessagesByDate optional in aggregateDaily so existing callers not broken"
    - "Additive Map merge: for-of loop over fileResult maps into combined map"

key-files:
  created: []
  modified:
    - shipcard/src/parser/deduplicator.ts
    - shipcard/src/engine/dailyAggregator.ts
    - shipcard/src/index.ts
    - shipcard/src/cli/commands/sync.ts

key-decisions:
  - "byProject is optional on DailyStats so all existing consumers (SafeTimeSeries, card render) continue without change"
  - "Per-project userMessages hardcoded to 0 — UserEntry JSONL entries have no project association, so per-project user message counts are architecturally unavailable"
  - "userMessagesByDate filter respects since/until date range bounds in runEngineFull"

patterns-established:
  - "projectNameFromCwd: last non-empty path segment of cwd — canonical project key across all accumulators"
  - "Separate data channel pattern: userMessagesByDate is a parallel Map alongside ParsedMessage[], not embedded in messages"

# Metrics
duration: 4min
completed: 2026-03-27
---

# Phase 13 Plan 01: Data Pipeline Cleanup Summary

**userMessagesByDate flows from JSONL parse through engine to DailyStats, fixing hardcoded-0 userMessages bug and adding per-project daily stat breakdowns (sessions, tokens, cost, tools, models) keyed by bare directory name**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-27T22:37:21Z
- **Completed:** 2026-03-27T22:40:34Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Deduplicator now tracks user messages per UTC date and returns a `userMessagesByDate: Map<string, number>` alongside existing fields — no changes to `ParsedMessage` schema
- `DailyStats.userMessages` is now populated from real UserEntry timestamp data instead of hardcoded `0`; removed the long-standing TODO comment
- `DailyStats.byProject` optional field provides per-project breakdown (sessions, messages, tokens, costCents, toolCalls, thinkingBlocks, models) ready for Phase 15's sort-by-metric feature

## Task Commits

1. **Task 1: Add userMessagesByDate to deduplicator** - `87c876d` (feat)
2. **Task 2: Add per-project breakdown and userMessages fix to dailyAggregator** - `59d07cf` (feat)
3. **Task 3: Wire userMessagesByDate through runEngineFull to sync command** - `40de9be` (feat)

## Files Created/Modified

- `shipcard/src/parser/deduplicator.ts` - Added `userMessagesByDate` Map to `processFile` return type and `ParseResult` interface; increment per-date count in UserEntry branch; merge per-file maps in `parseAllFiles`
- `shipcard/src/engine/dailyAggregator.ts` - Added `PerProjectDailyStats` exported interface; added optional `byProject` to `DailyStats`; added `ProjectDayAccumulator` internal type; per-project accumulation in message loop; `userMessagesByDate` optional param; removed hardcoded-0 TODO
- `shipcard/src/index.ts` - Added `userMessagesByDate` to `EngineFullResult`; filter map by date range in filtered path; return from `runEngineFull`
- `shipcard/src/cli/commands/sync.ts` - Destructure `userMessagesByDate` from `runEngineFull`; pass as third arg to `aggregateDaily`

## Decisions Made

- `byProject` is optional on `DailyStats` — all existing consumers (SafeTimeSeries serializer, card renderer, Worker API handler) continue working unchanged
- Per-project `userMessages` is hardcoded `0` because UserEntry JSONL records have no project association field; day-level user messages are correctly populated from the new map
- `userMessagesByDate` uses optional parameter pattern in `aggregateDaily` so callers that don't have the map (e.g. tests) still compile without changes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed ParseResult compile error in index.ts before Task 1 compile verification**

- **Found during:** Task 1 (TypeScript check after deduplicator changes)
- **Issue:** `index.ts` manually constructs a `ParseResult` in the date-filtered code path; adding `userMessagesByDate` to the interface made that construction fail type-checking
- **Fix:** Added filtered `userMessagesByDate` map construction (filter by since/until range) and included it in the filtered `ParseResult` literal — this is the correct Task 3 behavior, applied early to unblock Task 1 verification
- **Files modified:** `shipcard/src/index.ts`
- **Verification:** `npx tsc --noEmit` passed clean after fix
- **Committed in:** `87c876d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required fix — Task 3 work had to be partially applied early to unblock Task 1 compile check. No scope creep. Final state matches plan intent exactly.

## Issues Encountered

None beyond the blocking compile deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `DailyStats.byProject` is populated and ready for Phase 14 dashboard UI consumption
- `DailyStats.userMessages` is now accurate — Phase 14 can safely display user messages per day
- Phase 15 (Project Activity) can query `byProject` per day and sort/filter by any metric
- Both `shipcard/` and `shipcard-worker/` compile clean

---
*Phase: 13-data-pipeline-cleanup*
*Completed: 2026-03-27*
