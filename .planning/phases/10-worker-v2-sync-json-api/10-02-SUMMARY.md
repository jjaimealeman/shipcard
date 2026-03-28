---
phase: 10-worker-v2-sync-json-api
plan: 02
subsystem: api
tags: [hono, cloudflare-workers, kv, cors, json-api, timeseries]

# Dependency graph
requires:
  - phase: 10-01
    provides: SafeTimeSeries type, getTimeSeries KV helper, syncedAt stored alongside SafeStats in KV

provides:
  - GET /u/:username/api/stats public endpoint returning SafeStats JSON with syncedAt
  - GET /u/:username/api/timeseries public endpoint returning SafeTimeSeries JSON with syncedAt
  - apiRoutes Hono sub-app with wildcard CORS (hono/cors)
  - Route mount ordering guarantee: apiRoutes before cardRoutes at /u

affects:
  - 11-dashboard-mvp (consumes these endpoints for chart data)
  - any phase that adds new /u/* routes (must register before cardRoutes)

# Tech tracking
tech-stack:
  added: [hono/cors (cors middleware from existing hono install)]
  patterns:
    - JSON API sub-app pattern — dedicated routes/api.ts with its own Hono instance and CORS middleware
    - syncedAt envelope — { data, syncedAt } response wraps raw KV data with freshness metadata
    - apiRoutes-before-cardRoutes mount ordering — safety convention for /u prefix

key-files:
  created:
    - shipcard-worker/src/routes/api.ts
  modified:
    - shipcard-worker/src/index.ts

key-decisions:
  - "apiRoutes mounted before cardRoutes at /u — ensures /:username/api/* paths resolve before /:username single-segment catch-all"
  - "CORS wildcard (cors()) on /* in apiRoutes — data is public, same access model as SVG card; can be tightened to dashboard origin in Phase 11"
  - "syncedAt for stats uses (data as any).syncedAt ?? null — not in SafeStats type but stored in KV by /sync/v2; null for legacy v1-synced users"
  - "syncedAt for timeseries uses data.generatedAt — always present in SafeTimeSeries, natural freshness source"
  - "404 JSON for unknown users (not placeholder) — API consumers need machine-readable not-found, unlike SVG card which serves a placeholder"

patterns-established:
  - "JSON API sub-app: dedicated Hono instance in routes/api.ts with own CORS middleware"
  - "syncedAt envelope: { data, syncedAt } wraps any KV payload for freshness display"
  - "Route registration order matters at shared prefixes: specific sub-apps first, general catch-all last"

# Metrics
duration: 1min
completed: 2026-03-27
---

# Phase 10 Plan 02: Worker JSON API Routes Summary

**Two public JSON endpoints (GET /u/:username/api/stats and /api/timeseries) with CORS and syncedAt freshness envelope, enabling the Phase 11 dashboard to fetch chart data cross-origin**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-27T06:36:19Z
- **Completed:** 2026-03-27T06:37:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `shipcard-worker/src/routes/api.ts` with `apiRoutes` Hono sub-app exporting two GET handlers
- Applied wildcard CORS via `hono/cors` so the Phase 11 dashboard can fetch data from any origin
- Mounted `apiRoutes` at `/u` before `cardRoutes` in `index.ts` to prevent route shadowing
- Both endpoints return `{ data, syncedAt }` envelope — dashboard gets freshness info without parsing dates from data fields

## Task Commits

Each task was committed atomically:

1. **Task 1: Create public JSON API routes** - `dd49451` (feat)
2. **Task 2: Mount API routes in index.ts and verify route ordering** - `53ebed0` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `shipcard-worker/src/routes/api.ts` - New: apiRoutes sub-app with GET stats + timeseries handlers and CORS middleware
- `shipcard-worker/src/index.ts` - Updated: import + mount apiRoutes before cardRoutes; updated JSDoc route listing

## Decisions Made
- **apiRoutes before cardRoutes at /u**: Hono evaluates routes in registration order. Even though `/:username` (1 segment) and `/:username/api/stats` (3 segments) are unlikely to conflict in Hono's segment-aware router, the convention of "more specific sub-app first" is safer and explicit.
- **CORS wildcard now, tighten in Phase 11**: The data is already public (same as SVG card). Hardcoding the dashboard origin now would be premature — origin unknown until Phase 11 deploys.
- **404 (not placeholder) for unknown users**: Unlike the SVG card which renders a placeholder for unknown users (graceful degradation for `![](url)` embeds), the JSON API must return machine-readable 404 — callers need to know the user doesn't exist.
- **syncedAt via `(data as unknown as Record<string, unknown>).syncedAt ?? null`**: `syncedAt` is stored in KV alongside SafeStats by `/sync/v2` but is not part of the `SafeStats` type. Cast avoids a type definition change just to read a stored extra field.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 10 complete: both plans done. Worker now handles v2 sync (POST /sync/v2) and exposes JSON API (GET /u/:username/api/stats and /api/timeseries).
- Phase 11 (Dashboard MVP) can consume `/u/:username/api/stats` and `/u/:username/api/timeseries` directly via fetch with no additional Worker changes needed.
- CORS is already wildcard — no Worker deploy needed before Phase 11 frontend development starts.

---
*Phase: 10-worker-v2-sync-json-api*
*Completed: 2026-03-27*
