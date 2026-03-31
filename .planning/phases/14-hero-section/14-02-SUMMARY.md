---
phase: 14-hero-section
plan: 02
subsystem: ui
tags: [alpine-js, dashboard, peak-days, metrics, css-grid, cloudflare-worker]

# Dependency graph
requires:
  - phase: 14-01
    provides: Today's Activity section with Alpine store today/yesterday getters
  - phase: 13-data-pipeline-cleanup
    provides: SafeDailyStats with byProject per-project breakdown
provides:
  - Peak Days section with 4 per-metric all-time record cards
  - Alpine store peak getters scanning ALL historical days
  - _peakDay, _peakProject, _fmtShortDate helpers in Alpine store
affects: [15-project-activity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Peak getters scan timeseries.days (ALL days) — never filteredDays — so range filter has zero effect"
    - "_peakDay(fn) uses Array.reduce to find max day by arbitrary extractor function"
    - "Peak meta line built with Alpine x-text ternary: date + project or just date when project null"
    - "Responsive peak-grid: repeat(2,1fr) default, repeat(4,1fr) at 640px+"

key-files:
  created: []
  modified:
    - shipcard-worker/src/routes/dashboard.ts

key-decisions:
  - "Scans timeseries.days (not filteredDays) — peak values are all-time records, immune to range selector"
  - "Cost formatted as exact $X.XX — no tilde prefix (this is a historical record, not an estimate)"
  - "_fmtShortDate uses noon (T12:00:00) to avoid timezone shift flipping the date by one day"
  - "Peak meta shows 'Mar 15 - project-name' with en-dash separator, falls back to just date when no byProject"
  - "Peak breakpoint at 640px (not 1024px like Today's Activity) — 4 compact cards fit comfortably at tablet width"

patterns-established:
  - "Pattern: _peakDay(fn) generic reducer pattern — reusable for any future per-metric peak"
  - "Pattern: Graceful byProject degradation — null project silently omitted from meta line"

# Metrics
duration: ~2min
completed: 2026-03-28
---

# Phase 14 Plan 02: Peak Days Summary

**Alpine store peak day getters (_peakDay, _peakProject, _fmtShortDate helpers + peakMessages/Sessions/Tokens/Cost computed getters) + Peak Days CSS + 4-card HTML section positioned between Today's Activity and Activity heatmap**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T00:46:02Z
- **Completed:** 2026-03-28T00:47:27Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added 7 new Alpine store members: `_peakDay(fn)` generic reducer, `_peakProject(day, metricKey)` top-project extractor (handles tokens sum + costCents for cost), `_fmtShortDate(dateStr)` short date formatter, and four computed getters `peakMessages`, `peakSessions`, `peakTokens`, `peakCost` each returning `{ value, date, project }` or null
- Added CSS for Peak Days section: `.peak-section` (margin-bottom 32px), `.peak-grid` (2x2 mobile, 1x4 at 640px+, gap 12px), `.peak-card` (compact surface card), `.peak-value` (20px Poppins 700), `.peak-meta` (11px mid color), `.peak-label` (11px uppercase letter-spacing), plus skeleton placeholders
- Added HTML section with "Peak Days" section title and 4 `.peak-card` elements for Messages, Sessions, Tokens, Cost — each with skeleton loading states, `x-text` value/meta/label bindings, and graceful null handling (em-dash when no data, date-only when no project)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Alpine store peak day computed getters** - `3e4ce8c` (feat)
2. **Task 2: Add Peak Days CSS and HTML section** - `7afac79` (feat)

**Plan metadata:** (docs: complete plan — committed after summary)

## Files Created/Modified

- `shipcard-worker/src/routes/dashboard.ts` - Added peak day getters to Alpine store + CSS + HTML section

## Decisions Made

- Peak getters scan `timeseries.days` (ALL days, never `filteredDays`) — range selector has zero effect on peak values, which are all-time records
- Cost peak formatted as `$X.XX` exact — no tilde (`~`) prefix because this is a historical record, not a running estimate
- `_fmtShortDate` uses `T12:00:00` (noon) when constructing Date to avoid timezone offset shifting the date by one day for Mountain Time users
- Responsive breakpoint at 640px (not 1024px like Today's Activity) — 4 compact peak cards fit comfortably at tablet width
- Meta line uses en-dash (`\u2013`) separator between date and project name for visual clarity
- When `byProject` is missing or project value is null, meta line shows just the date (graceful degradation, no visible error)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Both hero section plans (14-01 Today's Activity + 14-02 Peak Days) are complete
- Phase 14 is fully done
- Phase 15 (Project Activity) can proceed — depends on Phase 13 (complete) and Alpine `projectSortMetric` state (already wired from Phase 13)
- No blockers

---
*Phase: 14-hero-section*
*Completed: 2026-03-28*
