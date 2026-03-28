---
phase: 11-dashboard-mvp
plan: "01"
name: dashboard-skeleton
subsystem: frontend
tags: [alpine, chartjs, dashboard, html, worker-routes]

dependency-graph:
  requires: ["10-02"]
  provides: ["GET /u/:username/dashboard HTML page", "Alpine.js global store", "hero stats", "sticky filter bar", "skeleton loading", "9 chart panel containers"]
  affects: ["11-02", "11-03"]

tech-stack:
  added: ["alpinejs@3.15.8", "chart.js@4.5.1", "chartjs-plugin-datalabels@2.2.0", "cal-heatmap@4.2.4", "d3@7"]
  patterns: ["Alpine.store global state", "CDN-only JS (no bundler)", "HTML-in-template-literal (existing pattern)", "skeleton shimmer loading", "sticky filter bar"]

key-files:
  created:
    - shipcard-worker/src/routes/dashboard.ts
  modified:
    - shipcard-worker/src/index.ts

decisions:
  - id: "11-01-a"
    decision: "dashboardRoutes mounted at /u BEFORE apiRoutes — Hono must match /:username/dashboard before /:username/api/*"
    rationale: "Route specificity: /dashboard suffix must not be swallowed by the api catch-all pattern"
  - id: "11-01-b"
    decision: "Alpine.store('dashboard') global store with init(username) called from x-init on body"
    rationale: "Single shared state accessible from all DOM elements without component nesting"
  - id: "11-01-c"
    decision: "Timeseries 404 degrades gracefully — stats still shown, sparklines empty"
    rationale: "v1-only users (no timeseries) should still see aggregate stats, not a broken page"
  - id: "11-01-d"
    decision: "replace(/__USERNAME__/g, username) — regex with global flag replaces all 4+ occurrences"
    rationale: "Username appears in title, filter bar, empty state copy, footer card link, and body x-init"
  - id: "11-01-e"
    decision: "9 chart panels as skeleton+canvas pairs — Plans 02 and 03 wire Chart.js into the canvas elements"
    rationale: "Clean separation: Plan 01 owns structure/state, Plans 02-03 own chart rendering"

metrics:
  duration: "8 minutes"
  completed: "2026-03-27"
  tasks-completed: 2
  tasks-total: 2
  lines-created: 979
---

# Phase 11 Plan 01: Dashboard Skeleton Summary

**One-liner:** Alpine.js dashboard skeleton with hero stats sparklines, sticky 7d/30d/all filter bar, shimmer skeleton loading, and 9 chart panel containers served from `GET /u/:username/dashboard`.

## What Was Built

The foundation of the Phase 11 analytics dashboard. A single Hono route at `GET /u/:username/dashboard` serves a complete self-contained HTML page that:

1. Loads CDN scripts in the correct dependency order (D3 → Chart.js → datalabels → cal-heatmap → Alpine intersect → Alpine core)
2. Boots an Alpine.js global store (`Alpine.store('dashboard')`) with full data fetching, computed hero stats, and sparkline generators
3. Shows a sticky filter bar (position: sticky; top: 0; z-index: 100) with 7d / 30d / All segmented control matching the configurator pill style
4. Displays 4 hero stat cards (Total Tokens, Total Cost, Cost/Session, Coding Since) with inline SVG sparklines and shimmer skeleton placeholders
5. Provides 9 named panel containers with skeleton/canvas pairs ready for Plans 02 and 03 to inject Chart.js charts into

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Dashboard route: HTML skeleton, Alpine store, hero stats, filter bar, skeleton loading | 340f442 | shipcard-worker/src/routes/dashboard.ts (979 lines) |
| 2 | Wire dashboard route into Worker entry point | 10fd0d8 | shipcard-worker/src/index.ts |

## Verification Results

All plan verification criteria passed:

1. `npx tsc --noEmit` — zero errors
2. `dashboardRoutes` imported and mounted in index.ts before apiRoutes
3. `Alpine.store` present in dashboard.ts
4. `skeleton` CSS class and shimmer animation present
5. `position: sticky` on filter bar
6. 81 occurrences of `panel-` prefix (9 named panels with multiple references each)
7. All artifacts meet minimum line count (979 > 400 required)

## Panel Inventory

| ID | Panel Name | Type | Notes |
|----|-----------|------|-------|
| panel-calendar | Activity Heatmap | cal-heatmap | Full-width, Plan 03 |
| panel-daily | Daily Activity | Chart.js line/bar | Plan 02 |
| panel-dow | Day of Week | Chart.js bar | Plan 02 |
| panel-tools | Tool Usage | Chart.js donut | Plan 02 |
| panel-models | Model Mix | Chart.js donut | Plan 02 |
| panel-messages | Message Types | Chart.js donut | Plan 02 |
| panel-tokens | Token Breakdown | Chart.js stacked bar | Plan 02 |
| panel-cost | Cost Over Time | Chart.js line | Plan 02 |
| panel-projects | Project Activity | Chart.js horizontal bar | Plan 03 (conditional on hasProjects) |

## Alpine Store API

Key properties available to Plans 02 and 03:

- `$store.dashboard.filteredDays` — SafeDailyStats[] filtered to selected range
- `$store.dashboard.range` — reactive `'7d' | '30d' | 'all'`
- `$store.dashboard.stats` — SafeStats object (aggregate)
- `$store.dashboard.timeseries` — SafeTimeSeries object (nullable)
- `$store.dashboard.hasProjects` — boolean for projects panel visibility
- `$store.dashboard.loading` — boolean for skeleton state
- `$store.dashboard.syncedAt` — ISO timestamp string from API envelope

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Plan 02 can immediately begin wiring Chart.js charts into the 8 canvas panel elements (`panel-daily-chart`, `panel-dow-chart`, etc.). The Alpine store `filteredDays` and `range` reactivity are ready. Plan 03 handles cal-heatmap and project bars.

**No blockers for Plan 02.**
