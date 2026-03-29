---
phase: 19-pro-card-features
plan: 01
subsystem: ui
tags: [svg, pro-badge, rendering, card, layouts]

# Dependency graph
requires:
  - phase: 18-stripe-subscriptions
    provides: isUserPro() D1-backed helper, PRO subscription state
provides:
  - Gold PRO pill badge rendered in all three card layouts for subscribed users
  - isPro flag threading from CardOptions through RenderOptions to layout renderers
  - card route passing isPro to renderCard in BYOT, legacy, and curated code paths
affects:
  - 19-02 (heroStat PRO feature)
  - 19-03 (date range PRO feature)
  - Any future layout additions must accept isPro parameter

# Tech tracking
tech-stack:
  added: []
  patterns:
    - isPro propagation: optional boolean flows from CardOptions -> RenderOptions -> layout render functions
    - Self-contained badge helpers: proBadgeSvg() duplicated in each layout file (not shared module) to keep layouts independent
    - Badge injection: conditionally pushed before </svg> line in each layout

key-files:
  created: []
  modified:
    - shipcard-worker/src/svg/index.ts
    - shipcard-worker/src/svg/renderer.ts
    - shipcard-worker/src/svg/layouts/classic.ts
    - shipcard-worker/src/svg/layouts/compact.ts
    - shipcard-worker/src/svg/layouts/hero.ts
    - shipcard-worker/src/routes/card.ts

key-decisions:
  - "proBadgeSvg() duplicated per-layout (not shared module) to keep each layout file self-contained"
  - "BYOT path passes isPro: true (literal) since the code already passed the PRO gate check"
  - "Badge color #F59E0B (amber-400 / Tailwind gold) with white text on rx=8 pill shape"
  - "Single isUserPro() call for legacy+curated paths (reused across both renderCard calls)"

patterns-established:
  - "isPro optional boolean: default false in CardOptions, flows unchanged through pipeline"
  - "Badge position: top-right corner at y=12, x=cardWidth-padding-badgeWidth (consistent across layouts)"

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 19 Plan 01: PRO Badge in SVG Layouts Summary

**Gold amber pill badge (#F59E0B) conditionally rendered in classic, compact, and hero SVG card layouts, with isPro flag plumbed from D1 subscription check through the full rendering pipeline**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T17:02:02Z
- **Completed:** 2026-03-29T17:04:57Z
- **Tasks:** 2/2
- **Files modified:** 6

## Accomplishments

- `isPro?: boolean` added to `CardOptions` and `RenderOptions` interfaces
- `proBadgeSvg()` helper added to all three layout files (classic, compact, hero) — self-contained, no shared module dependency
- Card route calls `isUserPro()` in legacy and curated paths; BYOT path passes `isPro: true` (already past PRO gate)
- TypeScript compiles cleanly with `npx tsc --noEmit` — zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add isPro to CardOptions, RenderOptions, and layout renderer signatures** - `965faa7` (feat)
2. **Task 2: Pass isPro from card route to renderCard** - `ec040e1` (feat)

**Plan metadata:** (pending — docs commit)

## Files Created/Modified

- `shipcard-worker/src/svg/index.ts` - Added `isPro?: boolean` to `CardOptions`, destructured with default `false`, passed to `renderSvg`
- `shipcard-worker/src/svg/renderer.ts` - Added `isPro?: boolean` to `RenderOptions`, passed to all three layout dispatchers
- `shipcard-worker/src/svg/layouts/classic.ts` - Added `proBadgeSvg()` helper, updated `renderClassic` signature, conditional badge injection
- `shipcard-worker/src/svg/layouts/compact.ts` - Added `proBadgeSvg()` helper, updated `renderCompact` signature, conditional badge injection
- `shipcard-worker/src/svg/layouts/hero.ts` - Added `proBadgeSvg()` helper, updated `renderHero` signature (4th param), conditional badge injection
- `shipcard-worker/src/routes/card.ts` - Added `isUserPro()` call for legacy+curated paths, `isPro: true` literal for BYOT path, passed to all `renderCard` calls

## Decisions Made

- `proBadgeSvg()` duplicated per-layout rather than extracted to a shared module — keeps each layout file entirely self-contained, no cross-module dependencies
- BYOT path uses `isPro: true` literal since the code already passed the PRO gate (`isUserPro()` check at line 191) — avoids a redundant second D1 query
- Badge color `#F59E0B` (amber/gold) chosen to match standard PRO/premium visual language across SaaS products
- Single `isUserPro()` call serves both the legacy and curated `renderCard` calls (variable scoped above both branches)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PRO badge pipeline is complete — all future plans in Phase 19 that call `renderCard` simply add `isPro` to `CardOptions` and it flows automatically
- Plans 19-02 (heroStat unlocked) and 19-03 (date range) can use the same `isPro` parameter pattern established here
- No blockers for remaining Phase 19 plans

---
*Phase: 19-pro-card-features*
*Completed: 2026-03-29*
