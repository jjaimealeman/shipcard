---
phase: 20-ai-insights
plan: 02
subsystem: api
tags: [typescript, aggregation, time-series, privacy, worker]

# Dependency graph
requires:
  - phase: 20-01
    provides: insights engine foundation and computePeakHours() in Worker
provides:
  - hourlyActivity: number[] in DailyStats (24 UTC-hour buckets from message timestamps)
  - hourlyActivity passthrough in CLI toSafeTimeSeries() pipeline
  - hourlyActivity?: number[] in both CLI and Worker SafeDailyStats (optional, backward-compat)
affects:
  - 20-03 (Worker insight compute reads hourlyActivity from SafeDailyStats)
  - 20-04 (dashboard chart displays peak coding hours from computed insights)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Array(24).fill(0) for UTC-hour bucket initialization"
    - "new Date(msg.timestamp).getUTCHours() for hour extraction"
    - "Optional field passthrough: if (day.hourlyActivity) safe.hourlyActivity = [...day.hourlyActivity]"

key-files:
  created: []
  modified:
    - shipcard/src/engine/dailyAggregator.ts
    - shipcard/src/cli/safestats.ts

key-decisions:
  - "hourlyActivity is optional in SafeDailyStats (both CLI and Worker) for backward compatibility with older CLI versions"
  - "Worker SafeDailyStats was already updated by 20-01 agent — no duplication needed"
  - "Spread copy [...day.hourlyActivity] used in toSafeTimeSeries() to prevent shared mutable reference"

patterns-established:
  - "Privacy boundary: hour-of-day is non-identifying, safe to include in sync payload"
  - "Hourly buckets always initialized to 24 zeros in DayAccumulator, always included in DailyStats"

# Metrics
duration: 4min
completed: 2026-03-29
---

# Phase 20 Plan 02: Hourly Activity Tracking Summary

**24-bucket UTC hourly activity field added to DailyStats, threaded through the CLI safe-payload pipeline, enabling peak coding hours insights in the Worker**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-30T01:43:39Z
- **Completed:** 2026-03-30T01:47:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `hourlyActivity: number[]` to `DailyStats` interface and `DayAccumulator` (initialized as 24 zeros)
- Message processing loop now extracts `new Date(msg.timestamp).getUTCHours()` and increments the right bucket
- `SafeDailyStats` (CLI) gains optional `hourlyActivity?: number[]` field
- `toSafeTimeSeries()` passes through `hourlyActivity` when present
- Worker's `SafeDailyStats` already had the field added by the parallel 20-01 agent

## Task Commits

Each task was committed atomically:

1. **Task 1: Add hourlyActivity to DailyStats and aggregation** - `b6db221` (feat)
2. **Task 2: Thread hourlyActivity through SafeTimeSeries CLI + Worker** - `c1dde38` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `shipcard/src/engine/dailyAggregator.ts` - hourlyActivity field in DailyStats/DayAccumulator, bucket init, hour extraction, result passthrough
- `shipcard/src/cli/safestats.ts` - hourlyActivity?: number[] in SafeDailyStats, conditional passthrough in toSafeTimeSeries()

## Decisions Made

- **hourlyActivity optional in SafeDailyStats:** Field is `?:` on both CLI and Worker for backward compatibility — older CLI versions without the compute simply omit the field; Worker insight compute handles missing data gracefully (returns undefined).
- **Worker already updated:** The parallel 20-01 agent had already added `hourlyActivity?: number[]` to the Worker's `SafeDailyStats`. Avoided duplication, only added the CLI side.
- **Spread copy in passthrough:** Used `[...day.hourlyActivity]` rather than direct reference assignment to avoid sharing a mutable array between DailyStats and the safe payload.

## Deviations from Plan

### Coordination Note

The plan noted that 20-01 (parallel agent) would also modify `shipcard-worker/src/types.ts`. On inspection, the 20-01 agent had already added `hourlyActivity?: number[]` to the Worker's `SafeDailyStats` before this plan executed. Task 2 correctly skipped re-adding the Worker field to avoid duplication, only applying the CLI `safestats.ts` changes.

This is correct behavior — the result is identical to the plan's intent. Both CLI and Worker have the field; the sync payload flows end-to-end.

**Total deviations:** 0 code deviations (coordination with parallel agent handled as designed)

## Issues Encountered

None.

## Next Phase Readiness

- `DailyStats.hourlyActivity` is populated during aggregation — ready for Worker consumption
- `toSafeTimeSeries()` passes hourlyActivity through — Worker will receive it in POST /sync/v2 payload
- Both packages compile with zero type errors
- 20-03 (Worker insight compute) can now implement `computePeakHours()` against real data

---
*Phase: 20-ai-insights*
*Completed: 2026-03-29*
