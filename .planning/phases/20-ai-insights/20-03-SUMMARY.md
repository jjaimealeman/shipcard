---
phase: 20-ai-insights
plan: 03
subsystem: api
tags: [cloudflare-workers, kv, hono, workers-ai, insights, sync-pipeline]

# Dependency graph
requires:
  - phase: 20-01
    provides: computeAllInsights, callWorkersAI, InsightResult type, AI binding in Env
  - phase: 20-02
    provides: hourlyActivity in SafeDailyStats, time-series pipeline threaded through CLI
provides:
  - getInsights() and putInsights() KV helpers for InsightResult storage
  - Insight computation wired into POST /sync/v2 handler
  - PRO users get background AI narrative via ctx.waitUntil (non-blocking)
  - GET /:username/api/insights endpoint serving stored InsightResult JSON
affects: [20-04-dashboard-insights, future dashboard phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "KV helpers pattern: typed get/put functions with null-safe JSON parse"
    - "ctx.waitUntil for non-blocking background AI work after sync returns 200"
    - "Insights computed at sync time only, never on dashboard load"

key-files:
  created: []
  modified:
    - shipcard-worker/src/kv.ts
    - shipcard-worker/src/routes/syncV2.ts
    - shipcard-worker/src/routes/api.ts

key-decisions:
  - "Store base insights immediately (sync returns 200), then update KV again after AI narrative resolves in background"
  - "Reuse isPro variable already computed earlier in syncV2 handler — no second D1 call"
  - "Insights API endpoint is public and CORS-enabled (same access model as SVG card)"

patterns-established:
  - "Non-blocking AI: putInsights twice — first with stats only, second with narrative after waitUntil resolves"
  - "KV key user:{username}:insights for InsightResult JSON blob"

# Metrics
duration: 2min
completed: 2026-03-29
---

# Phase 20 Plan 03: Sync Pipeline Insights Summary

**Insight computation wired into POST /sync/v2 with non-blocking PRO AI narrative via ctx.waitUntil, plus public GET /u/:username/api/insights endpoint**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T01:51:15Z
- **Completed:** 2026-03-30T01:53:11Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `getInsights()` and `putInsights()` KV helpers to `kv.ts` with typed InsightResult and null-safe JSON parse
- Wired `computeAllInsights()` + `putInsights()` into the POST /sync/v2 handler — every sync now computes and stores insights before returning 200
- PRO users get Workers AI narrative generated in background via `c.executionCtx.waitUntil` — CLI gets 200 immediately, KV updated after AI resolves
- Added `GET /:username/api/insights` endpoint to `api.ts` serving stored InsightResult with CORS

## Task Commits

Each task was committed atomically:

1. **Task 1: Add KV helpers for insights storage** - `ac2333e` (feat)
2. **Task 2: Wire insight computation into syncV2 + add API endpoint** - `678ecbc` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `shipcard-worker/src/kv.ts` - Added `getInsights()`, `putInsights()`, `InsightResult` import, updated key scheme docs
- `shipcard-worker/src/routes/syncV2.ts` - Imports `computeAllInsights`, `callWorkersAI`, `putInsights`; computes insights post-sync; PRO waitUntil block
- `shipcard-worker/src/routes/api.ts` - Added `GET /:username/api/insights` endpoint, imported `getInsights`

## Decisions Made

- PRO narrative uses a two-write pattern: store stats immediately (sync returns 200), then overwrite with narrative in waitUntil background task — dashboard can show partial data while AI is generating
- Reused `isPro` variable already computed for slug pre-rendering (no extra D1 query)
- Insights API is public (no auth) — consistent with stats and timeseries endpoints

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Insights pipeline complete: every sync computes + stores InsightResult, PRO users get AI narrative async
- Dashboard (Plan 04) can fetch `GET /u/:username/api/insights` to render the insights panel
- narrativeError flag allows graceful degradation when AI call fails

---
*Phase: 20-ai-insights*
*Completed: 2026-03-29*
