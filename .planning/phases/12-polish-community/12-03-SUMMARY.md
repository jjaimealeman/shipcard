---
phase: 12-polish-community
plan: "03"
subsystem: api
tags: [cloudflare-kv, typescript, community, metadata, kv-list]

# Dependency graph
requires:
  - phase: 10-worker-v2-sync-json-api
    provides: putUserData() KV helper and SafeStats type
  - phase: 04-cloud-worker
    provides: USER_DATA_KV binding and kv.ts module
provides:
  - CommunityMeta interface for O(1) community page rendering
  - listUsers() single-call KV listing with per-user summary stats
  - incrementCardsServed() / getCardsServedCount() global counter
  - Both sync routes write metadata and increment counter on every sync
affects: [12-polish-community plan 04+ community routes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - KV metadata pattern — write summary stats as metadata at put() time, read all with single list() call
    - Null-safe metadata fallback — meta: k.metadata ?? null for v1 users without metadata

key-files:
  created: []
  modified:
    - shipcard-worker/src/types.ts
    - shipcard-worker/src/kv.ts
    - shipcard-worker/src/routes/syncV2.ts
    - shipcard-worker/src/routes/sync.ts

key-decisions:
  - "CommunityMeta stores flattened totalTokens (sum of all 4 fields) — community pages don't need breakdown"
  - "metadata param is optional on putUserData() — backward compatible, callers without community context unaffected"
  - "listUsers() filters for :data suffix — avoids double-counting timeseries/token keys in user: prefix"
  - "cards-served counter in USER_DATA_KV (not CARDS_KV) — logical grouping with user data, not card cache"
  - "Both v1 (sync.ts) and v2 (syncV2.ts) write metadata — ensures all users appear in community listings"

patterns-established:
  - "KV metadata pattern: store summary at write time via { metadata } option, retrieve cheaply via kv.list<T>()"
  - "Optional metadata param: putUserData(kv, username, data, metadata?) — zero breaking changes to existing callers"

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 12 Plan 03: Community KV Metadata Summary

**KV metadata written at sync time enables O(1) community listing via single kv.list() call with CommunityMeta per user**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-27T17:14:50Z
- **Completed:** 2026-03-27T17:17:20Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `CommunityMeta` interface to types.ts — clean privacy boundary separate from SafeStats
- Updated `putUserData()` to accept optional metadata, enabling O(1) community rendering via single `kv.list()` call
- Added `listUsers()` helper that returns all users with summary stats from a single KV list operation
- Added `getCardsServedCount()` and `incrementCardsServed()` counter stored at `meta:cards_served`
- Both v1 (`sync.ts`) and v2 (`syncV2.ts`) write CommunityMeta at sync time and increment the counter

## Task Commits

Each task was committed atomically:

1. **Task 1: CommunityMeta type and KV helpers** - `5ba813a` (feat)
2. **Task 2: Write metadata at sync time** - `58cdc96` (feat)

**Plan metadata:** committed with `docs(12-03): complete community-kv-metadata plan`

## Files Created/Modified

- `shipcard-worker/src/types.ts` - Added CommunityMeta interface with syncedAt, totalSessions, totalCost, projectCount, totalTokens
- `shipcard-worker/src/kv.ts` - Updated putUserData() signature, added listUsers(), getCardsServedCount(), incrementCardsServed()
- `shipcard-worker/src/routes/syncV2.ts` - Builds CommunityMeta before putUserData(), increments counter post-sync
- `shipcard-worker/src/routes/sync.ts` - Same metadata pattern for v1 syncs, counter increment added

## Decisions Made

- `CommunityMeta.totalTokens` is a flat number (sum of input + output + cacheCreate + cacheRead) — community pages only need a headline number, not the full breakdown
- `putUserData()` metadata param is optional — zero breaking changes; callers that don't need community listing (like delete flows) pass nothing
- `listUsers()` filters keys with `.endsWith(':data')` — the `user:` prefix also covers `timeseries` keys; filtering avoids double-counting
- Counter lives in `USER_DATA_KV` not `CARDS_KV` — logically grouped with user data, not the card rendering cache
- v1 `sync.ts` also writes metadata — ensures v1 users appear in community listings immediately without waiting for a v2 upgrade

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `listUsers()` is ready for community routes to call — returns `{ username, meta }[]` where `meta` is null for legacy v1 users without metadata
- `getCardsServedCount()` is ready for community stats endpoint
- Community routes (plan 04+) can build leaderboard/directory pages with a single KV list call at O(1) cost

---
*Phase: 12-polish-community*
*Completed: 2026-03-27*
