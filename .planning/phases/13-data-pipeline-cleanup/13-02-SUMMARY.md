---
phase: 13
plan: "02"
subsystem: data-pipeline
tags: [privacy-layer, timeseries, dashboard, chart, per-project]

dependency-graph:
  requires: ["13-01"]
  provides: ["byProject in SafeDailyStats CLI+Worker", "project chart real metrics", "dashboard cleanup labels"]
  affects: ["14-peak-day", "15-chart-toggles"]

tech-stack:
  added: []
  patterns: ["dual-package type mirroring", "graceful degradation for old data", "metric-based chart rendering"]

key-files:
  created: []
  modified:
    - shiplog/src/cli/safestats.ts
    - shiplog-worker/src/types.ts
    - shiplog-worker/src/routes/dashboard.ts

decisions:
  - id: "mirror-not-import"
    summary: "Worker defines its own PerProjectDailyStats copy, does not import from shiplog"
    rationale: "Packages are independently deployable; cross-package imports would break Worker build"
  - id: "validator-unchanged"
    summary: "isValidSyncV2Body left unchanged -- optional byProject passes through silently"
    rationale: "Validator checks envelope shape only (username, version, days array), not per-day field contents. Recommended approach from RESEARCH.md."
  - id: "fallback-days-active"
    summary: "buildProjectsChart falls back to days-active count when byProject absent"
    rationale: "Existing synced data has no byProject field. Graceful degradation prevents regression on old data (DATA-05)."
  - id: "peak-day-comment"
    summary: "Phase 14 Peak Day card documented via HTML comment near hero grid"
    rationale: "Neither Slowest Day nor Most Messages existed in the codebase -- CLEAN-01 and CLEAN-02 confirmed no removals needed. Peak Day comment prepares Phase 14."

metrics:
  duration: "2 minutes"
  completed: "2026-03-27"
  tasks-completed: 2
  tasks-total: 2
---

# Phase 13 Plan 02: Data Pipeline + Dashboard Cleanup Summary

**One-liner:** byProject added to SafeDailyStats on both CLI and Worker; Project Activity chart upgraded to real message counts per project with days-active fallback for old data.

## What Was Built

### Task 1: SafeDailyStats byProject Extension (CLI + Worker)

**shiplog/src/cli/safestats.ts:**
- Imported `PerProjectDailyStats` from `dailyAggregator.js`
- Added optional `byProject?: Record<string, PerProjectDailyStats>` to `SafeDailyStats`
- `toSafeTimeSeries()` now includes `byProject` inside the `if (showProjects)` block when `day.byProject` exists

**shiplog-worker/src/types.ts:**
- Added `PerProjectDailyStats` interface as a Worker-local copy (mirrors CLI shape exactly)
- Added optional `byProject?: Record<string, PerProjectDailyStats>` to Worker's `SafeDailyStats`
- `isValidSyncV2Body()` unchanged -- optional field passes through the envelope validator silently
- Privacy validator `containsPrivacyViolation()` unchanged -- project name keys are bare directory names, not file paths

### Task 2: Dashboard Project Chart Metrics + Cleanup

**shiplog-worker/src/routes/dashboard.ts:**

CLEAN-01 (Slowest Day): Confirmed absent -- never existed in codebase. No removal needed.

CLEAN-02 (Most Messages): Confirmed absent -- never existed. Added HTML comment near hero grid documenting that Phase 14 will add a "Peak Day" card.

Project chart upgrade:
- `hasProjects` getter extended to detect `byProject` data (not just `projects` arrays)
- Added `projectSortMetric: 'messages'` state property for Phase 15 sort toggles
- `buildProjectsChart()` rewritten with two paths:
  - **Real metrics path** (when any day has `byProject`): aggregates messages, sessions, tokens, costCents per project across all filtered days
  - **Fallback path** (legacy data): counts days-active as before
- Dataset label: `'Messages'` when real data, `'Days active'` when fallback
- Both `updateAllCharts()` and the range-change `$watch` handler updated with matching `hasProjects` logic

## Deviations from Plan

None -- plan executed exactly as written. Both CLEAN items were confirmed absent as expected. No additional work was required.

## Verification

All verification criteria confirmed passing:

1. `cd shiplog && npx tsc --noEmit` -- zero errors
2. `cd shiplog-worker && npx tsc --noEmit` -- zero errors
3. `byProject` present in `SafeDailyStats` on both CLI (`safestats.ts`) and Worker (`types.ts`)
4. `PerProjectDailyStats` defined in Worker `types.ts`
5. No "Slowest Day" or "Most Messages" in dashboard code
6. Dashboard `buildProjectsChart` references `byProject` for real metrics
7. Old data fallback (days-active) preserved for graceful degradation

## Commits

| Hash | Message |
|------|---------|
| f6e688a | feat(13-02): extend SafeDailyStats with byProject on CLI and Worker |
| 2ccec9c | feat(13-02): dashboard project chart uses real metrics from byProject data |

## Next Phase Readiness

Phase 13 plan 02 of 2 complete. Phase 13 is now fully complete.

Ready for Phase 14 (Peak Day card) and Phase 15 (chart sort toggles).

No blockers. `projectSortMetric` state property is already in the Alpine store for Phase 15 to wire up.
