---
phase: 06-worker-card-params
plan: 01
subsystem: api
tags: [hono, cloudflare-workers, kv, svg, hide-params, cache-key]

# Dependency graph
requires:
  - phase: 04-cloud-worker
    provides: Card route, sync route, kv.ts helpers, and svg/index.ts with renderCard/renderRedactedCard
provides:
  - Card route parses ?hide= multi-value query params and passes them to renderCard and cache
  - Cache key includes sorted hide params for deterministic hits regardless of param order
  - DELETE /sync renders and stores a redacted SVG card after wiping user data
  - renderRedactedCard is no longer an orphaned export
affects: [05-publish-launch, any future card customization work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use c.req.queries() (plural) in Hono for multi-value query params — singular drops duplicates"
    - "Sort hide array with [...hide].sort() before joining into cache key to prevent mutation"
    - "putCardCache after deleteAllUserData + invalidateCardVariants to avoid immediate erasure"

key-files:
  created: []
  modified:
    - shipcard-worker/src/kv.ts
    - shipcard-worker/src/routes/card.ts
    - shipcard-worker/src/routes/sync.ts

key-decisions:
  - "Cache key format: card:{user}:{theme}:{layout}:{style}:hide={sorted,keys} — appended only when non-empty"
  - "getCardCache/putCardCache accept optional hide param defaulting to [] — zero breaking changes to callers without hide"
  - "DELETE /sync response includes redactedCard: true to signal CLI that redacted card was stored"

patterns-established:
  - "Multi-value query params: always use c.req.queries() not c.req.query() in Hono"
  - "KV key with multi-value suffix: sort + join to ensure determinism"

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 6 Plan 1: Worker Card Params Summary

**`?hide=` multi-value param wired into card route and cache key; DELETE /sync now stores a redacted SVG via renderRedactedCard instead of leaving the user with no card**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T05:41:01Z
- **Completed:** 2026-03-26T05:42:32Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Card route now parses `?hide=cost&hide=models` via `c.req.queries()` (multi-value safe) and passes the array to `renderCard()` and both cache functions
- Cache key in `kv.ts` appends `:hide=cost,models` (sorted) only when non-empty — deterministic regardless of query param order
- DELETE /sync renders `renderRedactedCard(username)` and stores it as the default `dark/classic/github` variant after wiping all user data
- `renderRedactedCard` has a real call site — no longer an orphaned export in svg/index.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add hide param to card cache key and card route** - `b49cc40` (feat)
2. **Task 2: Render redacted card on sync delete** - `a2fa66c` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `shipcard-worker/src/kv.ts` - cardKey() / getCardCache() / putCardCache() updated with optional hide param
- `shipcard-worker/src/routes/card.ts` - Parses ?hide= via queries(), threads through to renderCard and cache
- `shipcard-worker/src/routes/sync.ts` - Imports renderRedactedCard; DELETE handler stores redacted SVG after delete

## Decisions Made
- Cache key format uses `:hide=sorted,keys` suffix appended only when hide is non-empty — avoids polluting existing keys and keeps invalidation via prefix listing intact
- `getCardCache`/`putCardCache` take `hide: string[] = []` as last argument — backward-compatible, no callers broken
- `putCardCache` for redacted card in DELETE handler uses default variant (`dark/classic/github`) — mirrors the POST /sync pre-warm pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Worker integration gaps from v1 audit are closed: hide params work end-to-end, redacted card is served on delete
- svg/index.ts remains untouched as required
- Ready for any remaining Phase 6 plans or final launch verification

---
*Phase: 06-worker-card-params*
*Completed: 2026-03-26*
