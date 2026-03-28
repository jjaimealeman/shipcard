---
phase: 11-dashboard-mvp
plan: 03
subsystem: ui
tags: [cal-heatmap, chart.js, alpine.js, dashboard, grid-layout, cloudflare-worker]

dependency-graph:
  requires: ["11-01", "11-02"]
  provides: ["Calendar heatmap panel", "Project activity bars panel", "Responsive grid layout", "Visual verification passed"]
  affects: ["12-polish-community"]

tech-stack:
  added: []
  patterns: ["cal-heatmap v4 cal.paint() API", "Conditional panel visibility via Alpine x-show", "Responsive bento grid (3→2→1 col)"]

key-files:
  modified:
    - shipcard-worker/src/routes/dashboard.ts

decisions:
  - id: "11-03-a"
    decision: "Renamed store.init() to store.load() to prevent Alpine auto-invocation race condition"
    rationale: "Alpine.js auto-calls store.init() with no args during registration, racing with x-init call that passes username — caused fetch to /u/undefined/api/stats → 404 overwriting successful response"
  - id: "11-03-b"
    decision: "Calendar heatmap always shows all-time data regardless of range filter"
    rationale: "Heatmap is a historical overview — filtering to 7d would show mostly empty calendar"
  - id: "11-03-c"
    decision: "Project panel uses x-show with hasProjects getter for conditional visibility"
    rationale: "Users who don't sync with --show-projects should see a helpful message, not an empty chart"

metrics:
  duration: "~12 min (including checkpoint verification)"
  completed: "2026-03-27"
  tasks-completed: 2
  tasks-total: 2
---

# Phase 11 Plan 03: Calendar Heatmap + Project Bars Summary

**Cal-heatmap v4 activity heatmap, conditional project bars, responsive bento grid, and Alpine init() race condition fix verified via Playwright**

## Performance

- **Duration:** ~12 min (including automated visual verification)
- **Started:** 2026-03-27T07:52:00Z
- **Completed:** 2026-03-27T08:15:00Z
- **Tasks:** 2 (1 auto + 1 visual checkpoint)
- **Files modified:** 1

## Accomplishments
- Calendar heatmap renders all-time activity with green threshold scale via cal-heatmap v4
- Project activity horizontal bars conditionally visible when user synced with --show-projects
- Responsive bento grid layout (3-col → 2-col → 1-col)
- Fixed critical Alpine.js store.init() race condition causing "No data yet" on all dashboards
- Full visual verification passed via Playwright (filters, charts, hero stats all working)

## Task Commits

1. **Task 1: Add calendar heatmap and project activity bars** - `1a20ede` (feat)
2. **Fix: Alpine init() race condition** - `440428a` (fix)
3. **Task 2: Visual checkpoint** - Verified via Playwright automated testing

**Plan metadata:** (bundled with phase completion commit)

## Files Modified
- `shipcard-worker/src/routes/dashboard.ts` - Added heatmap init, project chart, grid CSS; renamed init→load

## Decisions Made
- Renamed `store.init()` → `store.load()` to prevent Alpine.js automatic invocation race condition
- Calendar heatmap always shows all-time data (not filtered by range)
- Project panel conditionally visible via `x-show="$store.dashboard.hasProjects"`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug Fix] Alpine store.init() race condition**
- **Found during:** Visual checkpoint verification (Playwright testing)
- **Issue:** Alpine.js auto-calls `store.init()` with no args, causing fetch to `/u/undefined/api/stats` → 404, which raced with the legitimate `x-init` call and overwrote `notFound` to true
- **Fix:** Renamed method from `init()` to `load()`, added guard `if (!username) return`
- **Files modified:** shipcard-worker/src/routes/dashboard.ts
- **Verification:** Playwright confirmed 2 API calls (both 200), no duplicates, store fully populated
- **Committed in:** 440428a

---

**Total deviations:** 1 auto-fixed (critical bug)
**Impact on plan:** Essential fix — dashboard was completely broken without it. No scope creep.

## Issues Encountered
- Worker needed deployment (`wrangler deploy`) before live testing could proceed
- Initial 404 on dashboard URL was pre-deployment (expected)

## Verification Results (Playwright)
- API: 2 calls, both 200 (no duplicate/race calls)
- Store: loading=false, notFound=false, hasStats=true, hasTimeseries=true
- Filters: 7d=8 days, 30d=30 days, All=60 days — all update hero stats and charts
- Charts: 7/8 canvases rendered (project chart empty correctly — no --show-projects data)
- Console errors: none

## Next Phase Readiness
- Dashboard MVP complete — all 9 panels rendering with real data
- Phase 12 (Polish + Community) can begin: mobile responsive, loading/error states, community feed

---
*Phase: 11-dashboard-mvp*
*Completed: 2026-03-27*
