---
phase: 15-project-activity
plan: 01
subsystem: ui
tags: [alpine, chart.js, dashboard, bar-chart, sort-toggle, project-metrics]

# Dependency graph
requires:
  - phase: 13-data-pipeline-cleanup
    provides: byProject metrics in timeseries.days (messages, sessions, tokens, costCents per project)
provides:
  - 4-segment sort toggle in Project Activity panel (Messages/Tokens/Sessions/Cost)
  - Dynamic buildProjectsChart wired to projectSortMetric Alpine store property
  - Reactive Alpine.effect dependency on projectSortMetric for toggle-triggered chart rebuilds
  - "Showing N of X" section heading with all-time project count
  - Datalabels inside bars with metric-aware formatting
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Alpine.effect reactive dependency pattern: read store prop before conditional to establish tracking"
    - "METRIC_MAP + field pattern for toggling between internal field names from UI-facing keys"
    - ".panel-header .btn-group CSS override to escape global mobile hide rule"

key-files:
  created: []
  modified:
    - shiplog-worker/src/routes/dashboard.ts

key-decisions:
  - "Sort toggle visible on mobile via .panel-header .btn-group override (global .btn-group display:none bypassed)"
  - "Free tier cap at 5 projects (was 10 in Phase 13 implementation)"
  - "Projects with zero value for selected metric are filtered out (not shown as empty bars)"
  - "Orange color for project bars replaces green (orange = primary accent for selected metric)"
  - "Cost field maps to costCents internally; tooltip and datalabels show $X.XX format"
  - "sortMetric read before if-conditional in Alpine.effect to ensure reactive tracking always fires"

patterns-established:
  - "METRIC_MAP pattern: UI key -> internal field name, with fallback to default"
  - "LABEL_MAP pattern: UI key -> display string for Chart.js dataset label"
  - "Reactive sort trigger: const sortMetric = store.sortProp before any guard clauses in Alpine.effect"

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 15 Plan 01: Sort Toggle Chart Summary

**Project Activity bar chart dynamically sorts by Messages/Tokens/Sessions/Cost via 4-segment Alpine toggle, with datalabels, cost formatting, and 5-project cap**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T01:43:02Z
- **Completed:** 2026-03-28T01:45:15Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added 4-segment sort toggle (Messages/Tokens/Sessions/Cost) in Project Activity panel header, visible on all screen sizes including mobile
- Wired `buildProjectsChart` to `projectSortMetric` Alpine store via reactive effect dependency — clicking a toggle segment instantly re-sorts and re-renders the bar chart without page reload
- Added "Showing N of X" section heading with `_projectTotal` getter scanning all-time timeseries data
- Added datalabels inside bars with metric-aware formatting (K/M shorthand for numbers, $X.XX for cost)
- Added tooltip callback with matching cost/number formatting
- Projects with zero value for the selected metric are hidden from the chart

## Task Commits

Each task was committed atomically:

1. **Task 1: Add sort toggle HTML + CSS mobile override + section heading** - `207da0c` (feat)
2. **Task 2: Wire buildProjectsChart to projectSortMetric + reactive dependency** - `a9cc6db` (feat)

**Plan metadata:** (docs: complete sort-toggle-chart plan) — in progress

## Files Created/Modified

- `shiplog-worker/src/routes/dashboard.ts` - Sort toggle HTML, CSS override, _projectTotal getter, METRIC_MAP, reactive sortMetric dependency, datalabels, tooltip callbacks

## Decisions Made

- **5-project cap:** Free tier shows max 5 projects (was 10 in Phase 13 initial implementation). Keeps the panel compact and reflects free tier constraint.
- **Filter zero-value entries:** Projects with zero value for the selected metric are hidden rather than shown with empty bars. Avoids visual noise when switching metrics.
- **Orange bars:** Project bars switch from green to orange to match the primary accent color convention used throughout the dashboard for "selected/active" state.
- **sortMetric before conditional:** In Alpine.effect, `const sortMetric = store.projectSortMetric` is placed before the `if (!store.loading && days.length > 0)` guard so Alpine always tracks the dependency even when the guard is falsy. Without this, toggling before data loads would not register the reactive dependency.
- **CSS specificity override:** `.panel-header .btn-group` has higher specificity than `.btn-group`, overriding the global mobile hide rule without requiring `!important` or a media query reversal.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 15 is the final v1.1 phase. The sort toggle completes the Project Activity panel.
- v1.1 Dashboard Enhancement is complete: Phase 13 (data pipeline), Phase 14 (hero section + peak days), Phase 15 (project activity sort).
- Ready for v1.1 release tagging.

---
*Phase: 15-project-activity*
*Completed: 2026-03-28*
