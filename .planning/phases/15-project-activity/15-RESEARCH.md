# Phase 15: Project Activity - Research

**Researched:** 2026-03-27
**Domain:** Alpine.js reactive store + Chart.js horizontal bar chart (no new libraries)
**Confidence:** HIGH

## Summary

Phase 15 is almost entirely a wiring task. The codebase already has every building block in place: the `projectSortMetric` state property exists in the Alpine store (hard-coded `'messages'`), the `buildProjectsChart()` function already aggregates all four metrics (messages, sessions, tokens, costCents) and sorts by the active metric, and the `btn-group` segmented control component is proven and styled. The only missing pieces are the HTML toggle (4 segments in the panel header) and a second reactive dependency in the `Alpine.effect` watcher so a metric change triggers a chart rebuild without a range change.

No new libraries, no new CDN scripts, no new data shapes — Phase 13 already delivers `byProject` with all four fields. The phase is fundamentally: expose `projectSortMetric` to the UI, connect it to `buildProjectsChart`, and replace the hardcoded `metric = 'messages'` line with a live lookup.

**Primary recommendation:** Wire `projectSortMetric` into `buildProjectsChart`, add the 4-segment `btn-group` to the panel header, and add `store.projectSortMetric` as a reactive dependency in the existing `Alpine.effect` watcher.

---

## Standard Stack

No new libraries. Everything needed already exists in the page.

### Core (already loaded)
| Library | Version | Purpose |
|---------|---------|---------|
| Alpine.js | 3.15.8 (CDN) | Reactive store + `x-model`/`:class` bindings |
| Chart.js | 4.5.1 (CDN) | `buildProjectsChart` horizontal bar |
| chartjs-plugin-datalabels | 2.2.0 (CDN) | Value labels inside bars (already registered) |

### No New Installs
Nothing to install. This phase is pure dashboard.ts edits.

---

## Architecture Patterns

### Pattern 1: Adding a Reactive Trigger to Alpine.effect

The existing watcher already tracks `store.filteredDays` as its reactive dependency. Adding `store.projectSortMetric` as a read inside the same effect block makes Chart.js rebuild whenever the metric changes.

```javascript
// Inside the Alpine.effect(() => { ... }) block
// Read projectSortMetric so Alpine tracks it as a dependency
const metric = store.projectSortMetric; // <-- new line, creates reactive dependency
const days = store.filteredDays;

if (!store.loading && days.length > 0) {
  // ... existing chart updates ...
  if (hasProjects) buildProjectsChart(days, metric); // pass metric through
}
```

**Why this works:** Alpine.effect re-runs whenever any reactive value read inside it changes. Reading `store.projectSortMetric` inside the effect is all that's needed — no separate `$watch` or callback required.

**Source:** Alpine.js reactivity model (training — HIGH confidence for this fundamental pattern; unchanged across Alpine 2.x and 3.x)

### Pattern 2: Passing Metric to buildProjectsChart

Currently `buildProjectsChart(days)` reads a hardcoded `metric = 'messages'`. The fix is to accept a `metric` parameter and read it from the store (or pass it in).

```javascript
// BEFORE (current code ~line 2189-2196):
// Sort by messages (Phase 15 will make this dynamic via projectSortMetric)
const metric = 'messages';
const sorted = Object.entries(projectMetrics)
  .sort((a, b) => b[1][metric] - a[1][metric])
  .slice(0, 10);

// AFTER:
function buildProjectsChart(days, metric) {
  metric = metric || Alpine.store('dashboard').projectSortMetric || 'messages';
  // ... rest unchanged ...
  const sorted = Object.entries(projectMetrics)
    .filter(([, v]) => (v[metric] || 0) > 0) // hide zero-value rows (per CONTEXT.md)
    .sort((a, b) => b[1][metric] - a[1][metric])
    .slice(0, 5); // free tier cap: 5 projects
  // ...
}
```

Note: Current code uses `.slice(0, 10)`. Phase 15 locks this to 5 (free tier cap per CONTEXT.md decisions).

### Pattern 3: The btn-group Segmented Control

The existing filter bar uses `.btn-group` with Alpine `:class` + `@click` pattern. The project panel header must use **identical markup** — same CSS class, same active pattern.

```html
<!-- In panel-header, right side (replace .panel-badge "Bar Chart") -->
<div class="btn-group" x-data>
  <button
    :class="{ active: $store.dashboard.projectSortMetric === 'messages' }"
    @click="$store.dashboard.projectSortMetric = 'messages'">Messages</button>
  <button
    :class="{ active: $store.dashboard.projectSortMetric === 'tokens' }"
    @click="$store.dashboard.projectSortMetric = 'tokens'">Tokens</button>
  <button
    :class="{ active: $store.dashboard.projectSortMetric === 'sessions' }"
    @click="$store.dashboard.projectSortMetric = 'sessions'">Sessions</button>
  <button
    :class="{ active: $store.dashboard.projectSortMetric === 'cost' }"
    @click="$store.dashboard.projectSortMetric = 'cost'">Cost</button>
</div>
```

The `.btn-group` CSS already handles: border wrapping, dividers between buttons, orange fill on `.active`, ghost hover on inactive. No new CSS needed.

**Known issue:** The `.btn-group` CSS at ~line 321 has `display: none` inside a mobile block. The filter bar btn-group is shown via `@media (min-width: 640px) { .btn-group { display: flex; } }`. The project panel toggle needs to always display (it's inside a panel, not the filter bar). Use an inline override or a modifier class.

### Pattern 4: "Showing N of X" Section Heading

The section heading currently reads `"Projects"` (line 1063). Per CONTEXT.md this becomes `"Project Activity (showing 5 of X)"`. The value X (total project count across all time) needs to be a computed getter on the store.

```javascript
// In Alpine store computed getters:
get projectCount() {
  if (!this.timeseries) return 0;
  const names = new Set();
  this.timeseries.days.forEach(d => {
    if (d.byProject) Object.keys(d.byProject).forEach(n => names.add(n));
    if (d.projects)  d.projects.forEach(n => names.add(n));
  });
  return names.size;
},
```

Then in HTML:
```html
<div class="section-title">
  Project Activity
  <span x-show="$store.dashboard.projectCount > 0"
        x-text="'(showing ' + Math.min(5, $store.dashboard.projectCount) + ' of ' + $store.dashboard.projectCount + ')'"></span>
</div>
```

### Pattern 5: Value Formatting Per Metric

The store already has `_fmtNum(n)` which produces `"12.4K"` style output (line 1485). Cost values use dollars. The chart needs metric-specific label formatting.

```javascript
// Metric-to-formatter map (defined once in the script)
const PROJECT_METRIC_KEY = {
  messages: { field: 'messages',   label: 'Messages', fmt: v => fmtNum(v) },
  tokens:   { field: 'tokens',     label: 'Tokens',   fmt: v => fmtNum(v) },
  sessions: { field: 'sessions',   label: 'Sessions', fmt: v => fmtNum(v) },
  cost:     { field: 'costCents',  label: 'Cost',     fmt: v => '$' + (v/100).toFixed(2) },
};
```

Note: `_fmtNum` is a store method; the chart function lives outside the store. A standalone `fmtNum` helper already exists nearby in the codebase via the heatmap label formatting pattern (line 1634). The plan should duplicate or extract it for use in `buildProjectsChart`.

### Pattern 6: Chart.js Tooltip Callback for Cost

The chart dataset `label` and tooltip need to display `"$12.40"` not a raw number for cost sort. Chart.js tooltip callback:

```javascript
plugins: {
  tooltip: {
    ...TOOLTIP_BASE,
    callbacks: {
      label: ctx => {
        const v = ctx.parsed.x;
        if (metric === 'cost') return '$' + (v / 100).toFixed(2);
        return fmtNum(v);
      }
    }
  }
}
```

### Anti-Patterns to Avoid

- **Don't create a new Alpine.effect for just the metric toggle.** One effect already watches `filteredDays`; add `projectSortMetric` as a second read in the same effect block.
- **Don't use Chart.js `patchChart()` for the projects chart.** The project chart needs a full rebuild on metric change (different data field, different sort order, possibly different set of visible rows). `buildProjectsChart` already does `chartProjects.destroy()` before creating new — keep this pattern.
- **Don't use `display: none` on the btn-group in the panel header.** The mobile CSS rule hides all `.btn-group` elements. Either scope the rule to the filter bar or use a wrapper class `panel-btn-group` with its own display rule.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reactive chart rebuild on toggle | Custom event emitter / dispatchEvent | Read `projectSortMetric` inside existing `Alpine.effect` | One read is all Alpine needs to track dependency |
| Sorting animation | Custom DOM reorder with requestAnimationFrame | Chart.js `buildProjectsChart` destroy+rebuild with `ANIM_OPTS` | Chart.js handles animated bar height transitions natively |
| Value labels inside bars | Custom SVG overlay | `chartjs-plugin-datalabels` (already registered) | Already in use on donut charts; just set `display: true` on the dataset |
| Segmented toggle UI | New CSS component | Existing `.btn-group` class | Identical to filter bar — user decision in CONTEXT.md |

---

## Common Pitfalls

### Pitfall 1: btn-group Hidden on Mobile
**What goes wrong:** The mobile media query at ~line 321 sets `.btn-group { display: none }` and only un-hides it at 640px+ for the filter bar context. Placing a `.btn-group` inside a panel will make it invisible on mobile.
**Why it happens:** The CSS rule is scoped to the `.btn-group` class globally, not just the filter bar.
**How to avoid:** Add a modifier class `panel-sort` or override with `.panel-header .btn-group { display: flex }` so the panel toggle is always visible regardless of breakpoint.
**Warning signs:** Toggle invisible on mobile viewport in browser devtools.

### Pitfall 2: Alpine.effect Dependency Not Tracked
**What goes wrong:** Metric toggle clicks update `projectSortMetric` but chart doesn't rebuild.
**Why it happens:** If `projectSortMetric` is read AFTER a conditional short-circuit (like `if (!hasProjects) return`), Alpine may not track it as a dependency on first run.
**How to avoid:** Read `store.projectSortMetric` **before** any conditional returns at the top of the effect block. Always establish the reactive dependency unconditionally.
**Warning signs:** Chart rebuilds on range change but not on metric toggle.

### Pitfall 3: Slice vs Filter Order
**What goes wrong:** Zero-value projects appear in the chart when a metric has no data for some projects.
**Why it happens:** Current code sorts then slices to top 10. Phase 15 adds a filter-out-zeros step, but if filter runs after slice it may surface hidden zeros.
**How to avoid:** Order is: aggregate → filter zeros → sort → slice(5). Never sort before filter.

### Pitfall 4: Cost Field Name Mismatch
**What goes wrong:** Cost sort shows all zeros.
**Why it happens:** The aggregated object uses `costCents` (line 2176) but a `metric = 'cost'` key would miss it.
**How to avoid:** Use a lookup map: `{ messages: 'messages', tokens: 'tokens', sessions: 'sessions', cost: 'costCents' }` to map the toggle value to the actual object field. Or keep internal key `cost` and aggregate into `cost` not `costCents`.

### Pitfall 5: "Showing 5 of X" Counts All-Time Projects
**What goes wrong:** Count reflects only filtered days (7d/30d), not all projects ever seen.
**Why it happens:** Computing the count from `filteredDays` misses projects not active in the selected range.
**How to avoid:** Compute project count from `this.timeseries.days` (all-time), not `filteredDays`. This is intentional — "you have X projects total, showing the top 5 in this range."

---

## Code Examples

### Minimum Viable Change: buildProjectsChart with metric param
```javascript
// Source: dashboard.ts ~line 2189 (existing comment even says "Phase 15 will make this dynamic")
// Current:
const metric = 'messages';

// Replace with:
const metricMap = { messages: 'messages', tokens: 'tokens', sessions: 'sessions', cost: 'costCents' };
const sortKey = metricMap[Alpine.store('dashboard').projectSortMetric] || 'messages';

const sorted = Object.entries(projectMetrics)
  .filter(([, v]) => (v[sortKey] || 0) > 0)        // hide zeros
  .sort((a, b) => b[1][sortKey] - a[1][sortKey])
  .slice(0, 5);                                      // free tier cap
```

### Alpine.effect: Adding Reactive Dependency
```javascript
// Source: dashboard.ts ~line 2302
Alpine.effect(() => {
  const _metric = store.projectSortMetric; // reactive dependency (read before conditionals)
  const days = store.filteredDays;
  if (!store.loading && days.length > 0) {
    // ... existing chart updates ...
    if (hasProjects) buildProjectsChart(days);
  }
});
```

### Chart Dataset Label Dynamic
```javascript
// In buildProjectsChart, update dataset label to reflect current metric
const metricLabels = { messages: 'Messages', tokens: 'Tokens', sessions: 'Sessions', cost: 'Cost (USD)' };
datasets: [{
  label: metricLabels[store.projectSortMetric] || 'Messages',
  // ...
}]
```

### Section Heading HTML
```html
<!-- Replace current "Projects" section-title div -->
<div class="section-title">
  Project Activity
  <span
    x-show="$store.dashboard.projectCount > 5"
    x-text="'(showing 5 of ' + $store.dashboard.projectCount + ')'">
  </span>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Hardcoded `metric = 'messages'` in buildProjectsChart | Phase 15: read from `store.projectSortMetric` | Unlocks 4-way sort without new data |
| `.slice(0, 10)` (arbitrary limit) | `.slice(0, 5)` (free tier cap, explicit) | "Showing 5 of X" makes upsell legible |
| `panel-badge` "Bar Chart" label on right | 4-segment `btn-group` sort toggle | Replaces decorative badge with functional control |
| Section heading "Projects" | "Project Activity (showing 5 of X)" | Creates natural upsell hook |

---

## Open Questions

1. **Secondary stat beside each bar (Claude's Discretion)**
   - What we know: CONTEXT.md marks this as Claude's discretion — "contextual pairing per sort mode, or drop if cleaner"
   - What's unclear: Chart.js horizontal bar doesn't natively support a secondary text column to the right of bars. Options: (a) use datalabels inside bar + a second dataset as a transparent overlay with its own label, (b) skip it for cleanliness (the "drop if cleaner" path), (c) render the secondary stat as a tick label on the right y-axis (complex).
   - Recommendation: Drop it for 15-01. The inside-bar value label (datalabels plugin) is sufficient. Secondary stat adds complexity with no user decision backing it.

2. **Bar color variation per metric (Claude's Discretion)**
   - What we know: CONTEXT.md says "subtle shift or keep uniform orange — whatever fits palette". Current code uses `COLORS.green` for the projects chart.
   - What's unclear: Whether to change to orange (matching CONTEXT.md "warm orange/amber gradient" description) or keep green.
   - Recommendation: Switch to `COLORS.orange` (`#d97757`) to match the CONTEXT.md description. The green was likely a placeholder. Use a single color per metric (no per-metric color variation) for simplicity.

3. **Smooth row reorder animation (~300ms per CONTEXT.md)**
   - What we know: CONTEXT.md specifies "rows slide to new positions" with fade in/out for zero-value rows. Chart.js destroy+rebuild triggers its built-in `ANIM_OPTS` (duration: 400, easeInOutQuart) which animates bar width growth from zero — this is a "bars grow from left" animation, not a "rows slide vertically."
   - What's unclear: True row-reorder sliding requires either a sorted DOM list with CSS transitions (non-Chart.js) or a Chart.js feature not present in 4.5.1.
   - Recommendation: Accept Chart.js destroy+rebuild animation as the "smooth reorder." The bars appear to animate into their new positions because they grow from zero. This is visually acceptable and zero extra code. Document in plan that the 300ms animation is approximated by ANIM_OPTS (400ms). If user wants true DOM-slide in v3+, that's a deferred enhancement.

---

## Sources

### Primary (HIGH confidence)
- **Codebase direct read** — `dashboard.ts` lines 2154-2235 (`buildProjectsChart`), 1158-1159 (`projectSortMetric`), 2295-2367 (`Alpine.effect` watcher), 119-147 (`.btn-group` CSS)
- **Codebase direct read** — Alpine store structure, `filteredDays`, `hasProjects`, `_fmtNum` patterns

### Secondary (MEDIUM confidence)
- **Alpine.js reactivity model** — `Alpine.effect` tracks any reactive property read inside its callback; adding a read establishes the dependency. Consistent behavior across Alpine 3.x. (training knowledge, consistent with Alpine 3.15.8 in use)
- **Chart.js 4.5.1 destroy+rebuild pattern** — No smooth label-swap API in Chart.js for horizontal bar charts; destroy+new Chart is the canonical approach for data shape changes. (training knowledge, consistent with Chart.js 4.x in use)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing
- Architecture: HIGH — reading from live codebase, patterns already proven in same file
- Pitfalls: HIGH — derived from reading exact code that will be modified

**Research date:** 2026-03-27
**Valid until:** 60 days (stable Alpine + Chart.js versions pinned in HTML)
