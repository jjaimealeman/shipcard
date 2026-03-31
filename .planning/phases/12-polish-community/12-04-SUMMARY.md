---
phase: 12-polish-community
plan: "04"
subsystem: ui
tags: [hono, kv, alpine, community, leaderboard, landing-page]

# Dependency graph
requires:
  - phase: 12-03
    provides: "CommunityMeta KV metadata, listUsers(), getCardsServedCount() helpers"
provides:
  - Community teaser table (10 most-recent users) on homepage
  - Cards-served counter on homepage (shown when >= 100)
  - Full /community leaderboard page with Alpine.js client-side sorting
  - Four sort categories: Most Recent, Most Active, Highest Cost, Most Tokens
affects: [future community features, social proof, onboarding funnel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Placeholder injection: static LANDING_HTML with <!--PLACEHOLDER--> comments replaced in async handler"
    - "Server-side KV read at request time: listUsers() called in every GET / and GET /community request"
    - "Alpine.js JSON hydration: users array serialized as window.__USERS__ script tag, consumed by Alpine component"

key-files:
  created:
    - shipcard-worker/src/routes/community.ts
  modified:
    - shipcard-worker/src/routes/landing.ts
    - shipcard-worker/src/index.ts

key-decisions:
  - "Placeholder injection for landing page: LANDING_HTML is a static template literal evaluated at module load; dynamic content injected via .replace() on <!--PLACEHOLDER--> comments in async handler — avoids restructuring the large template"
  - "communityRoutes mounted after landingRoutes and before /u routes — /community is a top-level named route, must not collide with /:username pattern in card/api routes"
  - "Alpine.js component uses window.__USERS__ global (set via inline <script>) rather than Alpine.store — self-contained page with no shared state"
  - "Cost parsed to costNum float for sort: totalCost string like ~$12.34 stripped of non-numeric chars for numeric comparison"
  - "escHtml() defined in both community.ts and as local helper in landing.ts — avoids cross-module coupling for a 5-line utility"

patterns-established:
  - "Placeholder injection: for pages with a large static template, add <!--PLACEHOLDER--> comments and replace them in the async handler rather than restructuring the template"
  - "Alpine JSON hydration: server-serializes data as JSON into a <script>var __DATA__=...</script> tag; Alpine component reads window.__DATA__ in init()"

# Metrics
duration: 4min
completed: 2026-03-27
---

# Phase 12 Plan 04: Community Pages Summary

**Server-rendered community teaser on homepage and full /community leaderboard with Alpine.js sorting, both reading from KV metadata via a single listUsers() call**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T17:20:40Z
- **Completed:** 2026-03-27T17:24:40Z
- **Tasks:** 2
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments

- Homepage now shows a 10-row "Recent members" table sorted by most-recent sync, server-rendered from KV metadata with zero extra fetches
- Homepage shows "Serving X cards" counter below hero subtitle when cardsServed >= 100
- New /community route with full leaderboard: all users, sortable by 4 categories (recent/active/cost/tokens) with Alpine.js tab+column-header sorting
- Community nav link added to site header
- Null metadata (v1 users without meta) handled gracefully — username shown, dashes for stats
- Zero users shows friendly "Be the first — run `shipcard sync` to join" message

## Task Commits

1. **Task 1: Homepage community teaser and cards-served counter** - `5b34157` (feat)
2. **Task 2: Full community page at /community** - `d0f22f0` (feat)

## Files Created/Modified

- `shipcard-worker/src/routes/landing.ts` - Added imports, async handler with KV reads, CSS, placeholder injection, community teaser builder, cards-served counter
- `shipcard-worker/src/routes/community.ts` — New full leaderboard page with Alpine.js sorting
- `shipcard-worker/src/index.ts` — Added communityRoutes import and mount at /community

## Decisions Made

- **Placeholder injection**: The `LANDING_HTML` constant is a template literal evaluated at module load (it already uses `${__APP_VERSION__}`). Instead of splitting or restructuring it, added `<!--PLACEHOLDER-->` HTML comments and replaced them in the async handler. Clean, minimal change.
- **communityRoutes mount position**: Placed after `landingRoutes` and before `/u` routes. `/community` is a top-level route; if placed after `/u` mounts, Hono would already have matched `/community` as `:username` (if card/api routes catch it). Verified: order is correct.
- **Alpine.js hydration via window global**: Community page serializes user array as `window.__USERS__` in a script tag. Alpine component reads it in `init()`. No fetch needed — data is already server-rendered.
- **costNum for sort**: `totalCost` is a formatted string (`~$12.34`). Extracted to `costNum` float at server-render time so Alpine can sort numerically without client-side parsing.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Community pages fully functional: homepage teaser and /community leaderboard both live
- Phase 12 wave 2 complete (plans 03 + 04 done)
- Phase 12 is now complete

---
*Phase: 12-polish-community*
*Completed: 2026-03-27*
