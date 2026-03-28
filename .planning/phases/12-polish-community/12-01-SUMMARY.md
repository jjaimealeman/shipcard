---
phase: 12-polish-community
plan: 01
subsystem: ui
tags: [svg, card, dashboard, alpine, footer, watermark]

# Dependency graph
requires:
  - phase: 03-svg-card
    provides: classic/compact/hero layout files with footer rendering
  - phase: 11-dashboard-mvp
    provides: Alpine store with loading/notFound/error booleans, dashboard HTML template
provides:
  - "Get yours at shipcard.dev" right-aligned footer watermark on all SVG card layouts
  - Dashboard empty state for unknown users (notFound=true)
  - Dashboard error banner for fetch failures (error is set)
  - Dashboard content hidden when any error/empty state is active
affects: [future card layout changes, dashboard UX updates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SVG footer: text-anchor=end + x=CARD_WIDTH-PADDING for right-aligned watermark text"
    - "Dashboard x-show triple condition: !loading && !notFound && !error for content visibility"

key-files:
  created: []
  modified:
    - shipcard-worker/src/svg/index.ts
    - shipcard-worker/src/svg/layouts/classic.ts
    - shipcard-worker/src/svg/layouts/compact.ts
    - shipcard-worker/src/svg/layouts/hero.ts
    - shipcard/src/card/index.ts
    - shipcard/src/card/layouts/classic.ts
    - shipcard/src/card/layouts/compact.ts
    - shipcard/src/card/layouts/hero.ts
    - shipcard-worker/src/routes/dashboard.ts

key-decisions:
  - "Footer right-aligned (text-anchor=end, x=CARD_WIDTH-PADDING) — no <a> tag since SVG loaded via <img src> sandboxes hyperlinks"
  - "Dashboard content wrapper guards on !loading && !notFound && !error — shows skeleton during load, hides on empty/error, shows data only when all clear"
  - "Empty/error states were already implemented in Phase 11; only the content wrapper x-show condition needed updating to include !error"

patterns-established:
  - "SVG watermark: text-anchor=end at CARD_WIDTH-PADDING gives consistent right-aligned footer across all layouts"

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 12 Plan 01: SVG Footer and Dashboard Empty States Summary

**Right-aligned "Get yours at shipcard.dev" watermark added to all 6 SVG card layouts, dashboard content now fully hidden on empty/error states**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-27T17:13:30Z
- **Completed:** 2026-03-27T17:15:35Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Changed footer text from "ShipCard" to "Get yours at shipcard.dev" in both worker and local tool
- Changed footer alignment from center (text-anchor=middle) to right-aligned (text-anchor=end, x=CARD_WIDTH-PADDING) in all 6 layout files
- Updated dashboard content wrapper x-show to guard on `!loading && !notFound && !error` — dashboard content now fully hidden when either empty or error state is active

## Task Commits

Each task was committed atomically:

1. **Task 1: SVG card promo footer** - `23b2741` (feat)
2. **Task 2: Dashboard empty and error states** - `ba6c4a0` (feat)

## Files Created/Modified

- `shipcard-worker/src/svg/index.ts` - footer text changed to "Get yours at shipcard.dev"
- `shipcard-worker/src/svg/layouts/classic.ts` - footer x and text-anchor updated
- `shipcard-worker/src/svg/layouts/compact.ts` - footer x and text-anchor updated
- `shipcard-worker/src/svg/layouts/hero.ts` - footer x and text-anchor updated
- `shipcard/src/card/index.ts` - footer text changed to "Get yours at shipcard.dev"
- `shipcard/src/card/layouts/classic.ts` - footer x and text-anchor updated
- `shipcard/src/card/layouts/compact.ts` - footer x and text-anchor updated
- `shipcard/src/card/layouts/hero.ts` - footer x and text-anchor updated
- `shipcard-worker/src/routes/dashboard.ts` - content wrapper x-show updated to include !error guard

## Decisions Made

- No `<a>` tag on footer — SVG loaded via `<img src>` sandboxes all hyperlinks, so text-only watermark is the correct approach
- Empty/error state HTML and CSS were already fully implemented in Phase 11 (11-01 through 11-03); only the content wrapper condition needed the `!error` addition
- Dashboard content wrapper uses `!$store.dashboard.loading` in addition to notFound/error — prevents skeleton content flash during page load

## Deviations from Plan

None — plan executed exactly as written. The dashboard already had empty-state and error-bar CSS/HTML from Phase 11; Task 2 required only the content wrapper x-show condition update.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SVG footer watermark is live on all card embeds — every README card now promotes shipcard.dev
- Dashboard empty/error states are production-ready for unknown usernames and fetch failures
- Ready for Phase 12 Plan 02 (remaining polish/community tasks)

---
*Phase: 12-polish-community*
*Completed: 2026-03-27*
