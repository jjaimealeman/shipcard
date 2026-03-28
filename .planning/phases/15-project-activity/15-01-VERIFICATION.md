---
phase: 15-project-activity
verified: 2026-03-28T01:47:52Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 15: Project Activity Verification Report

**Phase Goal:** Users can slice project performance by any metric with a single click.
**Verified:** 2026-03-28T01:47:52Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Project Activity panel has a visible 4-segment toggle: Messages, Tokens, Sessions, Cost | VERIFIED | Lines 1076–1085: `.btn-group` with 4 buttons inside `#panel-projects` panel-header, each wired to `projectSortMetric` |
| 2 | Clicking a toggle segment re-sorts the bar chart by the selected metric without page reload | VERIFIED | Line 2357: `store.projectSortMetric` read before conditionals in `Alpine.effect`, making it a reactive dependency; line 2413: `buildProjectsChart(days, sortMetric)` called on change |
| 3 | Default sort on first load is messages | VERIFIED | Line 1186: `projectSortMetric: 'messages'` as the store property initializer |
| 4 | Bar chart values reflect the selected metric (not days active) when byProject data exists | VERIFIED | Lines 2217–2218: `METRIC_MAP` translates toggle key to internal field; line 2242: dataset label uses `LABEL_MAP[sortMetric]`; no remaining hardcoded `const metric = 'messages'` |
| 5 | Section heading shows "Showing N of X" where X is total project count | VERIFIED | Lines 1072–1074: `x-text="Math.min(5, $store.dashboard._projectTotal)"` and `x-text="$store.dashboard._projectTotal"`; lines 1175–1181: `get _projectTotal()` getter scanning all `timeseries.days` |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shiplog-worker/src/routes/dashboard.ts` | Sort toggle HTML, CSS mobile override, buildProjectsChart metric wiring, Alpine.effect reactive dependency | VERIFIED | 2442 lines; all required patterns present and wired |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `btn-group @click` | `$store.dashboard.projectSortMetric` | Alpine click binding | WIRED | Lines 1077–1084: each button sets `projectSortMetric` directly via `@click` |
| `Alpine.effect` watcher | `buildProjectsChart` | `store.projectSortMetric` read triggers rebuild | WIRED | Line 2357: `const sortMetric = store.projectSortMetric` declared unconditionally before any `if` guard; line 2413 passes it to chart builder |
| `buildProjectsChart` | `store.projectSortMetric` (via `sortMetric` param) | `METRIC_MAP` lookup replaces hardcoded field | WIRED | Lines 2217–2218: `METRIC_MAP` maps `'cost'` to `'costCents'` etc.; no residual hardcode |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| PROJ-01: 4-segment toggle visible in panel header | SATISFIED | Lines 1076–1085 |
| PROJ-02: Bar chart shows selected metric's value per project | SATISFIED | Lines 2217–2229 |
| PROJ-03: Clicking toggle re-sorts without page reload | SATISFIED | Alpine.effect reactive chain confirmed |
| PROJ-04: Default sort is messages on first load | SATISFIED | Line 1186 |
| "Showing N of X" heading | SATISFIED | Lines 1072–1074 + `_projectTotal` getter |
| Free tier capped at 5 projects | SATISFIED | Line 2223: `.slice(0, 5)` |
| Cost displays as $X.XX | SATISFIED | Lines 2262, 2274: `(v / 100).toFixed(2)` for cost branch |
| Mobile toggle not hidden by global CSS | SATISFIED | Lines 325–326: `.panel-header .btn-group { display: flex; font-size: 11px; }` overrides global hide |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | None found |

No TODO/FIXME markers, no placeholder content, no empty handlers, no hardcoded stub returns in the added code paths.

### Human Verification Required

#### 1. Toggle Visual State

**Test:** Load dashboard with project data. Observe the Project Activity panel header.
**Expected:** A 4-button toggle row is visible below the panel title. The "Messages" button has an `active` highlight on first load.
**Why human:** CSS `:class` active binding requires a rendered DOM to confirm visual highlight.

#### 2. Chart Re-sort on Click

**Test:** Click "Tokens", then "Cost", then "Sessions" in the toggle.
**Expected:** The horizontal bar chart re-orders its bars each time, labels update to the selected metric name, and cost bars show "$X.XX" datalabels.
**Why human:** Chart.js render output is not verifiable from source alone.

#### 3. Showing N of X Count

**Test:** Load a session with multiple projects. Check the "Showing N of X" sub-label in the panel title.
**Expected:** N = number of bars shown (max 5), X = total unique projects across all time.
**Why human:** Requires live data to confirm the `_projectTotal` getter returns the correct count.

#### 4. Mobile Viewport Toggle Visibility

**Test:** Resize browser to a narrow mobile width (~375px). Check the Project Activity panel.
**Expected:** The 4-segment toggle remains visible (not hidden), with smaller button padding.
**Why human:** Media query override behavior requires browser rendering to confirm.

---

## Summary

All 5 must-have truths are verified against the actual codebase:

- The 4-segment toggle is present in `#panel-projects` panel-header (lines 1076–1085), wired to `projectSortMetric` via Alpine click bindings.
- The Alpine.effect watcher unconditionally reads `store.projectSortMetric` on line 2357 before any conditional guard, establishing the reactive dependency.
- Both call sites of `buildProjectsChart` pass `sortMetric` (lines 2311, 2413) — no orphaned hardcoded call remains.
- `METRIC_MAP` (line 2217) translates the four toggle keys to internal data fields, including `cost → costCents`.
- The hardcoded `const metric = 'messages'` stub has been removed (confirmed by grep returning no matches).
- `.slice(0, 5)` free-tier cap is in place (line 2223).
- Cost formatting as `$X.XX` via `(v / 100).toFixed(2)` exists in both tooltip and datalabels callbacks (lines 2262, 2274).
- CSS mobile override `.panel-header .btn-group { display: flex; }` is present at lines 325–326.
- `_projectTotal` getter scans all-time `timeseries.days` (lines 1175–1181) and is referenced in the "Showing N of X" heading (line 1073).

The phase goal is achieved structurally. Four human verification items remain to confirm visual rendering and live data behavior, but none represent structural gaps.

---

_Verified: 2026-03-28T01:47:52Z_
_Verifier: Claude (gsd-verifier)_
