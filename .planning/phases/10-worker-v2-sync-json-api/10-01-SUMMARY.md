---
phase: 10-worker-v2-sync-json-api
plan: 01
subsystem: api
tags: [cloudflare-workers, hono, typescript, kv, timeseries, sync]

# Dependency graph
requires:
  - phase: 09-cli-timeseries
    provides: "SafeTimeSeries + SafeDailyStats types, v2 sync payload shape from CLI"
  - phase: 04-cloud-worker
    provides: "Worker auth, KV helpers, SafeStats validator, v1 sync route"
provides:
  - SafeTimeSeries + SafeDailyStats interfaces in worker types.ts
  - SyncV2Body interface and isValidSyncV2Body type guard
  - getTimeSeries / putTimeSeries KV helpers for user:{username}:timeseries key
  - deleteAllUserData now wipes timeseries key alongside data and card variants
  - POST /sync/v2 route accepting {safeStats, timeSeries}, storing both in split KV keys
  - syncV2Routes mounted in index.ts before v1 syncRoutes
affects:
  - 10-02-worker-json-api (reads timeseries from KV for GET endpoints)
  - future card rendering phases (SafeDailyStats available for chart rendering)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Split KV keys for stats vs timeseries — user:{u}:data and user:{u}:timeseries stored independently"
    - "v2 route mounted before v1 in Hono — /sync/v2 before /sync for correct path matching"
    - "syncedAt enrichment — SafeStats augmented with timestamp at write time without changing the type"

key-files:
  created:
    - shipcard-worker/src/routes/syncV2.ts
  modified:
    - shipcard-worker/src/types.ts
    - shipcard-worker/src/kv.ts
    - shipcard-worker/src/index.ts

key-decisions:
  - "isValidSyncV2Body delegates SafeStats check to existing isValidSafeStats — no duplication of privacy validation logic"
  - "No DELETE /sync/v2 endpoint — DELETE /sync handles all three key types (data, timeseries, card variants)"
  - "syncedAt cast to any for putUserData — syncedAt not in SafeStats type but safe to store; future phases can read it"
  - "/sync/v2 mounted before /sync in Hono — required for correct route disambiguation"

patterns-established:
  - "KV timeseries key: user:{username}:timeseries — parallel to user:{username}:data"
  - "v2 sync response shape: { ok, apiVersion: 'v2', syncedAt, username, variantsInvalidated }"

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 10 Plan 01: Worker v2 Sync — Types, KV Helpers, POST /sync/v2 Summary

**POST /sync/v2 endpoint storing split SafeStats + SafeTimeSeries in separate KV keys, with full DELETE /sync cleanup coverage across all three key types**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-27T06:31:25Z
- **Completed:** 2026-03-27T06:33:25Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added SafeDailyStats, SafeTimeSeries, SyncV2Body interfaces and isValidSyncV2Body type guard to worker types.ts
- Added getTimeSeries/putTimeSeries KV helpers and updated deleteAllUserData to wipe all three key types
- Created syncV2.ts POST /sync/v2 route and mounted it before v1 syncRoutes in index.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: SafeTimeSeries types and isValidSyncV2Body** - `aeeaf0f` (feat)
2. **Task 2: KV time-series helpers and deleteAllUserData update** - `d6ba539` (feat)
3. **Task 3: POST /sync/v2 route and index.ts mount** - `4e4439a` (feat)

## Files Created/Modified
- `shipcard-worker/src/types.ts` — Added SafeDailyStats, SafeTimeSeries, SyncV2Body interfaces + isValidSyncV2Body type guard
- `shipcard-worker/src/kv.ts` — Added getTimeSeries/putTimeSeries, updated deleteAllUserData, updated module JSDoc key scheme
- `shipcard-worker/src/routes/syncV2.ts` — New: POST /sync/v2 route with auth, validation, dual KV storage, card re-render
- `shipcard-worker/src/index.ts` — Import syncV2Routes, mount at /sync/v2 before /sync, updated JSDoc

## Decisions Made
- **isValidSyncV2Body delegates to isValidSafeStats** — no duplication of privacy boundary enforcement logic; the v2 guard composes the v1 guard
- **No DELETE /sync/v2** — DELETE /sync (updated in Task 2) handles all three key types; one delete endpoint is cleaner than duplicating the handler
- **syncedAt cast via `as any`** — SafeStats type doesn't declare syncedAt but the field is safe to store and useful for debugging; future phases can read it from raw KV
- **/sync/v2 mounted before /sync in index.ts** — Hono matches the more specific path first; order matters here

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- POST /sync/v2 is live and stores time-series data at user:{username}:timeseries
- Plan 10-02 can now read that key via getTimeSeries() to serve JSON API endpoints GET /u/:username/stats and GET /u/:username/timeseries
- v1 POST /sync and GET /u/:username remain completely untouched and backward-compatible

---
*Phase: 10-worker-v2-sync-json-api*
*Completed: 2026-03-27*
