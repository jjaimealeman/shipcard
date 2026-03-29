---
phase: 19-pro-card-features
plan: 03
subsystem: api
tags: [hono, cloudflare-workers, d1, kv, slugs, pro-gate]

# Dependency graph
requires:
  - phase: 19-02
    provides: D1 slug schema and query helpers (createSlug, getUserSlugs, getSlug, deleteSlug, validateSlug, countUserSlugs)
  - phase: 19-01
    provides: isPro flag wired into renderCard across all code paths
  - phase: 18-01
    provides: isUserPro() D1-backed subscription check, Stripe billing infrastructure

provides:
  - POST /u/:username/slugs — PRO-gated slug creation with validation and cap enforcement
  - GET /u/:username/slugs — authenticated slug listing with parsed config
  - DELETE /u/:username/slugs/:slug — slug deletion with KV cache purge
  - GET /u/:username/:slug — card serving from saved slug config (BYOT or curated theme)
  - PRO sync pre-render — all slug variant KV entries refreshed on every sync

affects: ["19-04", "19-05", "future-dashboard-slugs"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "slugRoutes mounted before cardRoutes in index.ts to prevent /:username catch-all collision"
    - "Slug KV cache key: card:{username}:slug:{slug} (distinct namespace from standard card keys)"
    - "Sync PRO pre-render: isUserPro check + getUserSlugs loop + renderCard per slug after invalidate"
    - "BYOT color derivation in slug route: value=title, footer=text (mirrors card.ts convention)"

key-files:
  created:
    - shipcard-worker/src/routes/slugs.ts
  modified:
    - shipcard-worker/src/routes/card.ts
    - shipcard-worker/src/routes/sync.ts
    - shipcard-worker/src/index.ts

key-decisions:
  - "slugRoutes mounted before cardRoutes so /:username/slugs is matched before /:username bare handler"
  - "Slug KV key uses card:{u}:slug:{s} namespace to avoid collision with standard variant keys"
  - "PRO check skipped on DELETE — user already owns slug; auth middleware ensures only owner can delete"
  - "Slug card route always renders with isPro:true since only PRO users can create slugs"
  - "resolveCuratedTheme fallback to catppuccin for unknown/missing theme names (mirrors card.ts behavior)"

patterns-established:
  - "Slug card caching: direct env.CARDS_KV.put/get (not putCardCacheV2) for slug-namespaced keys"
  - "Config parsing: JSON.parse(slugRow.config) as SlugConfig at route layer, not in db helpers"

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 19 Plan 03: Slug CRUD API Routes Summary

**Hono slug CRUD routes (POST/GET/DELETE) + slug card serving at /:username/:slug + PRO sync pre-render for instant slug URL freshness**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-29T17:08:16Z
- **Completed:** 2026-03-29T17:10:50Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- PRO users can create up to 5 custom slugs via POST /u/:username/slugs with full validation (format, reserved words, uniqueness, cap)
- GET /u/:username/:slug serves SVG cards from saved slug config with BYOT or curated theme resolution and KV caching
- Sync endpoint now pre-renders all PRO slug variants after data upload so slug URLs reflect new stats instantly
- Free users receive a 403 with upgrade URL on slug creation attempts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create slug CRUD API routes** - `ee4a9b9` (feat)
2. **Task 2: Add slug card serving route + PRO sync pre-render** - `dbeeb68` (feat)

**Plan metadata:** (docs commit pending)

## Files Created/Modified

- `shipcard-worker/src/routes/slugs.ts` - Hono sub-app with POST/GET/DELETE slug CRUD, PRO gate, validation, cap enforcement
- `shipcard-worker/src/routes/card.ts` - Added /:username/:slug route before /:username; resolves BYOT or curated colors from SlugConfig
- `shipcard-worker/src/routes/sync.ts` - After sync, checks isPro and re-renders all slug variants into KV
- `shipcard-worker/src/index.ts` - Mounts slugRoutes before cardRoutes, updates route comment block

## Decisions Made

- slugRoutes mounted before cardRoutes so multi-segment `/u/:username/slugs` paths are matched before the single-segment `/:username` catch-all
- Slug KV cache key uses `card:{username}:slug:{slug}` namespace (distinct from `card:{username}:{layout}:t={theme}` standard keys) to prevent collisions
- Slug card route always renders with `isPro: true` — only PRO users can create slugs, so all slug cards are PRO by definition
- resolveCuratedTheme falls back to catppuccin for unknown/missing theme names, matching existing card.ts behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Slug HTTP surface is complete: create, list, delete, serve
- Plan 19-04 (CLI slug commands) can call these endpoints directly
- Plan 19-05 (dashboard slug manager) can call GET/DELETE endpoints to render slug list UI

---
*Phase: 19-pro-card-features*
*Completed: 2026-03-29*
