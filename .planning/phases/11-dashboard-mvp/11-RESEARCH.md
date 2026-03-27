# Phase 11: Dashboard MVP - Research

**Researched:** 2026-03-27
**Domain:** Cloudflare Worker HTML page + Alpine.js + Chart.js analytics dashboard
**Confidence:** HIGH

## Summary

Phase 11 adds a full analytics dashboard at `/u/:username/dashboard` — a new Hono route in the existing Worker that returns an HTML page (same pattern as `configureRoutes` and `landingRoutes`). The stack is locked: Alpine.js 3.15.8 for reactivity, Chart.js 4.5.1 for charts, and cal-heatmap 4.2.4 (requires D3.js v7) for the calendar heatmap. All libraries are loaded from CDN via `<script>` tags — no npm installs needed in the Worker.

The dashboard fetches data from two existing JSON API endpoints (`/u/:username/api/stats` and `/u/:username/api/timeseries`) on page load, stores it in Alpine.js global state (`Alpine.store()`), and computes filtered subsets reactively. Chart instances are created once and updated via `chart.data = ...; chart.update()` when the time range toggle changes — no destroy/recreate cycle.

The Alpine.js `@alpinejs/intersect` plugin handles "animate in when scrolled into view" without a raw IntersectionObserver. The `chartjs-plugin-datalabels` plugin handles inline donut labels (raw count + percentage).

**Primary recommendation:** Single new route file `src/routes/dashboard.ts` following the exact `configure.ts` pattern — a large template literal string returned via `c.html()`. All chart logic lives inline in the HTML `<script>` block, initialized after Alpine starts.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Alpine.js | 3.15.8 | Reactive state, time filter toggle, data loading | Locked by context decisions; zero-build CDN compatible |
| Chart.js | 4.5.1 | Bar, line, donut charts | Locked by context decisions; most widely used JS charting lib |
| @alpinejs/intersect | 3.x.x | Animate charts on scroll-into-view | Alpine's official plugin; zero custom IntersectionObserver code |
| chartjs-plugin-datalabels | 2.2.0 | Inline donut labels (count + %) | Purpose-built; hand-rolling labels in Chart.js is unreliable |
| cal-heatmap | 4.2.4 | Calendar heatmap panel | Purpose-built calendar heatmap for time-series data |
| D3.js | v7 | Required peer dep of cal-heatmap | Must load before cal-heatmap |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Hono `c.html()` | (existing) | Serve HTML from Worker | Already used in configure.ts and landing.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cal-heatmap + D3 | Hand-rolled SVG heatmap | cal-heatmap is battle-tested with navigation, color scales, tooltips. Hand-rolling for a calendar heatmap is 200+ lines of SVG math. |
| chartjs-plugin-datalabels | Custom tooltip callbacks | Plugin gives stable inline positioning; custom callbacks require complex canvas math |
| Alpine.js @intersect plugin | Raw IntersectionObserver | Plugin reduces boilerplate to `x-intersect.once="initChart($el)"` |

**CDN script load order (critical — must be this exact order):**
```html
<!-- 1. D3 (cal-heatmap peer dep) -->
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<!-- 2. Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"></script>
<!-- 3. chartjs-plugin-datalabels (after Chart.js) -->
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
<!-- 4. cal-heatmap (after D3) -->
<script src="https://cdn.jsdelivr.net/npm/cal-heatmap@4.2.4/dist/cal-heatmap.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/cal-heatmap@4.2.4/dist/cal-heatmap.css">
<!-- 5. Alpine.js intersect plugin (BEFORE Alpine core) -->
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/intersect@3.x.x/dist/cdn.min.js"></script>
<!-- 6. Alpine.js core (last, defer) -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.15.8/dist/cdn.min.js"></script>
```

## Architecture Patterns

### Recommended Project Structure
```
shiplog-worker/src/
├── routes/
│   ├── dashboard.ts     ← NEW: GET /u/:username/dashboard
│   ├── landing.ts       (existing)
│   ├── configure.ts     (existing — pattern to follow)
│   └── api.ts           (existing — data source)
└── index.ts             ← mount dashboardRoutes at /u (before cardRoutes)
```

### Pattern 1: Hono HTML Route (from existing codebase)
**What:** Template literal HTML string returned via `c.html()`. Same pattern as `configure.ts`.
**When to use:** Any Worker route that serves an HTML page.
```typescript
// Source: shiplog-worker/src/routes/configure.ts (existing pattern)
import { Hono } from "hono";
import type { AppType } from "../types.js";

export const dashboardRoutes = new Hono<AppType>();

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>...</head>
<body>...</body>
</html>`;

dashboardRoutes.get("/:username/dashboard", (c) => {
  const username = c.req.param("username");
  // Username is injected into the template for the API fetch URLs
  return c.html(DASHBOARD_HTML.replace("__USERNAME__", username));
});
```

**Route mounting in index.ts (critical — must go before cardRoutes at /u):**
```typescript
// Source: shiplog-worker/src/index.ts (existing pattern — apiRoutes already does this)
app.route("/u", apiRoutes);      // /:username/api/*
app.route("/u", dashboardRoutes); // /:username/dashboard  ← NEW: before cardRoutes
app.route("/u", cardRoutes);      // /:username (catch-all)
```

### Pattern 2: Alpine.js Global Store for Dashboard State
**What:** Single `Alpine.store('dashboard', {...})` holds all fetched data, active range, and chart refs. Components read from store reactively.
**When to use:** Multiple chart panels all need to react to the same time range toggle.

```javascript
// Source: Context7 /alpinejs/alpine — Alpine.store() pattern
document.addEventListener('alpine:init', () => {
  Alpine.store('dashboard', {
    range: '30d',          // '7d' | '30d' | 'all'
    stats: null,           // SafeStats from /api/stats
    timeseries: null,      // SafeTimeSeries from /api/timeseries
    loading: true,
    error: null,

    // Called once on page load
    async init(username) {
      try {
        const [statsRes, tsRes] = await Promise.all([
          fetch(`/u/${username}/api/stats`),
          fetch(`/u/${username}/api/timeseries`)
        ]);
        this.stats = (await statsRes.json()).data;
        this.timeseries = (await tsRes.json()).data;
      } catch(e) {
        this.error = 'Failed to load data';
      } finally {
        this.loading = false;
      }
    },

    // Computed: filter timeseries.days to active range
    get filteredDays() {
      if (!this.timeseries) return [];
      const days = this.timeseries.days;
      if (this.range === 'all') return days;
      const cutoff = this.range === '7d' ? 7 : 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - cutoff);
      return days.filter(d => new Date(d.date) >= cutoffDate);
    }
  });
});
```

### Pattern 3: Chart.js Update (not destroy/recreate)
**What:** Create chart instances once. On range change, replace `chart.data` and call `chart.update()` with animation mode.
**When to use:** Any data-driven chart responding to the time filter toggle.

```javascript
// Source: chartjs.org/docs/latest/developers/updates.html (verified HIGH confidence)
// Create once
const myChart = new Chart(ctx, { type: 'bar', data: initialData, options: {...} });

// Update on range change (smooth morph, not flash)
myChart.data.labels = newLabels;
myChart.data.datasets[0].data = newValues;
myChart.update('active'); // 'active' mode = animate from current to new values
```

### Pattern 4: Alpine.js x-effect for Chart Re-render
**What:** `x-effect` re-runs when any reactive dependency changes. Use to drive chart updates when `$store.dashboard.range` changes.
**When to use:** Syncing Chart.js instances (not managed by Alpine) to Alpine state.

```javascript
// Source: Context7 /alpinejs/alpine — x-effect pattern
// In a chart panel component's x-data or x-init:
Alpine.data('barChart', () => ({
  chart: null,
  init() {
    // Create chart on mount
    this.chart = new Chart(this.$el.querySelector('canvas'), config);
    // x-effect auto-subscribes to $store.dashboard.range changes
    this.$watch('$store.dashboard.range', () => this.updateChart());
  },
  updateChart() {
    const days = Alpine.store('dashboard').filteredDays;
    this.chart.data.labels = days.map(d => d.date);
    this.chart.data.datasets[0].data = days.map(d => d.sessions);
    this.chart.update('active');
  }
}));
```

### Pattern 5: Intersect Plugin for Scroll-Triggered Chart Init
**What:** `x-intersect.once` triggers once when element enters viewport. Use to defer Chart.js initialization until panel is visible.
**When to use:** Charts below the fold — avoids rendering invisible charts on page load.

```html
<!-- Source: Context7 /alpinejs/alpine — @alpinejs/intersect plugin -->
<div x-data="barChart" x-intersect.once="initChart()">
  <canvas></canvas>
</div>
```

### Pattern 6: Sticky Time Filter (CSS position: sticky)
**What:** Filter bar uses `position: sticky; top: 0; z-index: 100` to stay visible while scrolling.
**When to use:** The time filter — this is the main solved pain point from the old dashboard.

```css
.filter-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  padding: 12px 24px;
}
```

### Pattern 7: Segmented Control (Time Filter Toggle)
**What:** Exact `.btn-group` CSS pattern from the existing landing page configurator. Orange active pill.
**When to use:** The 7d / 30d / All time toggle — must match visual language exactly.

```html
<!-- Source: shiplog-worker/src/routes/landing.ts (existing CSS pattern) -->
<div class="btn-group">
  <button :class="{ active: $store.dashboard.range === '7d' }"
          @click="$store.dashboard.range = '7d'">7d</button>
  <button :class="{ active: $store.dashboard.range === '30d' }"
          @click="$store.dashboard.range = '30d'">30d</button>
  <button :class="{ active: $store.dashboard.range === 'all' }"
          @click="$store.dashboard.range = 'all'">All time</button>
</div>
```

CSS already exists in landing.ts — copy the `.btn-group` block verbatim.

### Pattern 8: Skeleton Loading State
**What:** CSS shimmer animation on placeholder divs matching the layout of each panel. Shown while `$store.dashboard.loading === true`.
**When to use:** Initial page load before API responses arrive.

```css
.skeleton {
  background: linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius);
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Pattern 9: Donut Chart with Inline Labels
**What:** `chartjs-plugin-datalabels` renders "Label: N (X%)" directly on donut segments.
**When to use:** Tool, model, and message type donuts where raw count + percentage must both be visible.

```javascript
// Source: chartjs-plugin-datalabels docs (verified MEDIUM confidence)
// Register globally after Chart.js loads:
Chart.register(ChartDataLabels);

const donutConfig = {
  type: 'doughnut',
  data: {
    labels: ['Bash', 'Read', 'Edit'],
    datasets: [{ data: [420, 311, 200], backgroundColor: ['#d97757', '#6a9bcc', '#788c5d'] }]
  },
  options: {
    plugins: {
      datalabels: {
        color: '#faf9f5',
        formatter: (value, ctx) => {
          const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
          const pct = ((value / total) * 100).toFixed(1);
          return `${ctx.chart.data.labels[ctx.dataIndex]}: ${value.toLocaleString()} (${pct}%)`;
        },
        font: { size: 11 }
      }
    }
  }
};
```

### Pattern 10: Cal-Heatmap Data Format
**What:** cal-heatmap 4.x accepts an array of `{date, value}` objects. The `date` field must be a parseable date string or Unix timestamp.
**When to use:** The calendar heatmap panel, fed from `timeseries.days`.

```javascript
// Source: cal-heatmap.com (verified MEDIUM confidence — v4 API)
const cal = new CalHeatmap();
cal.paint({
  data: {
    source: days.map(d => ({ date: d.date, value: d.sessions })),
    x: 'date',
    y: 'value'
  },
  domain: { type: 'month' },
  subDomain: { type: 'day', radius: 2 },
  scale: {
    color: {
      range: ['#2a2a28', '#d97757'],  // dark border → orange accent
      type: 'linear',
      domain: [0, maxSessions]
    }
  },
  date: { start: new Date(firstDay) },
  itemSelector: '#heatmap-container'
});
```

**Note:** `cal-heatmap` 4.x dropped the 3.x API completely. Do not use any 3.x examples found online.

### Anti-Patterns to Avoid
- **Destroying and recreating Chart.js instances on range change:** Use `chart.update()` instead. Destroy/recreate causes canvas flicker and loses animation state.
- **Using Alpine.js `x-data` on each chart panel independently for data fetching:** Fetch once into `Alpine.store()`, all panels read from store. Parallel fetches per panel = race conditions and duplicate requests.
- **Initializing Chart.js in a `defer` script before Alpine starts:** Alpine's `alpine:init` event fires before the DOM is processed. Init charts inside `alpine:init` or in component `init()` methods, not in bare `<script>` tags.
- **Using cal-heatmap 3.x API:** Version 4.x is a complete rewrite. The `3.x` `init()` pattern does not work in 4.x.
- **Registering chartjs-plugin-datalabels globally when only needed on donuts:** Register per-chart via `plugins: { datalabels: {...} }` and use `Chart.register(ChartDataLabels)` selectively, or disable per chart with `plugins: { datalabels: { display: false } }` on non-donut charts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar heatmap | SVG grid with date math | cal-heatmap | 200+ lines of SVG math, date edge cases (leap years, ISO week boundaries), color interpolation |
| Donut inline labels | Canvas text overlay | chartjs-plugin-datalabels | Arc center calculation, text wrapping, overlap detection are all handled |
| Scroll-triggered animation | Raw IntersectionObserver | @alpinejs/intersect | Plugin handles threshold, once, margin modifiers declaratively |
| Shimmer animation | JS-based loading | CSS `@keyframes shimmer` | Pure CSS, no JS needed, matches skeleton pattern |
| Time range filtering | Custom date library | Native `Date` + array filter | No external dep needed for simple day-cutoff filtering |

**Key insight:** The charting domain looks simple ("just draw a bar chart") but edge cases in canvas rendering, tooltip positioning, and animation state management make custom solutions expensive to maintain. Use the established plugins.

## Common Pitfalls

### Pitfall 1: Cal-Heatmap v3 vs v4 API Mismatch
**What goes wrong:** Using the old `cal.init({...})` API (v3) with cal-heatmap 4.x. The v4 API uses `cal.paint({...})`.
**Why it happens:** Most blog posts and Stack Overflow answers reference v3. jsDelivr defaults to latest (v4).
**How to avoid:** Pin the CDN to `@4.2.4`, use `cal.paint()` with `data.source`, `domain`, `subDomain`, `scale` config structure.
**Warning signs:** `cal.init is not a function` in the browser console.

### Pitfall 2: Chart.js Datalabels Plugin Not Registered
**What goes wrong:** Donut labels don't appear. No error thrown — the plugin is silently inactive.
**Why it happens:** `chartjs-plugin-datalabels` must be explicitly registered with `Chart.register(ChartDataLabels)` after loading the script. It does NOT auto-register.
**How to avoid:** Add `Chart.register(ChartDataLabels)` immediately after the CDN script loads, before any chart is instantiated.
**Warning signs:** No labels on doughnut segments despite plugin being loaded.

### Pitfall 3: Alpine.js Plugin Load Order
**What goes wrong:** `@alpinejs/intersect` plugin not working — `x-intersect` directive is unknown.
**Why it happens:** Alpine plugins must be loaded (via `<script defer>`) BEFORE the Alpine core script. Both need `defer`.
**How to avoid:** Load intersect CDN `<script defer>` tag first, Alpine core `<script defer>` tag second.
**Warning signs:** `x-intersect` ignored, no errors (Alpine just ignores unknown directives).

### Pitfall 4: Chart Canvas Already In Use
**What goes wrong:** `Canvas is already in use. Chart with ID X must be destroyed before the canvas with ID Y can be reused.`
**Why it happens:** `x-intersect.once` triggers chart init, but the component is re-mounted (e.g., by Alpine hot-reload or accidental double-trigger).
**How to avoid:** Store chart instance reference, check `if (this.chart) this.chart.destroy()` before `new Chart(...)`.
**Warning signs:** Console error about canvas reuse.

### Pitfall 5: Username Injection — XSS Risk
**What goes wrong:** Injecting `:username` directly into the HTML template string creates XSS if username contains `</script>` or `<img onerror=`.
**Why it happens:** GitHub usernames are alphanumeric + hyphens only, but worth validating anyway before injection.
**How to avoid:** Sanitize username before injecting into template — only allow `[a-zA-Z0-9-]` (GitHub username format). Use `JSON.stringify()` when embedding in a JS context: `const USERNAME = ${JSON.stringify(username)};`.
**Warning signs:** Username with special chars breaks JS or renders unexpected HTML.

### Pitfall 6: Hono Route Order — Dashboard Must Come Before Card Catch-All
**What goes wrong:** `GET /u/:username/dashboard` returns an SVG card (the single-segment `:username` catch-all) instead of the dashboard HTML.
**Why it happens:** Hono matches routes in registration order. `cardRoutes` registers `/:username` which matches `/dashboard-username` before `/:username/dashboard` can fire.
**How to avoid:** Mount `dashboardRoutes` at `/u` BEFORE `cardRoutes` in `index.ts` — same principle already applied for `apiRoutes`.
**Warning signs:** Dashboard URL returns an SVG image.

## Code Examples

Verified patterns from official sources:

### Fetch both APIs in parallel and store in Alpine.store
```javascript
// Source: Alpine.js docs (Context7) + MDN Promise.all
document.addEventListener('alpine:init', () => {
  Alpine.store('dashboard', {
    loading: true,
    error: null,
    stats: null,
    timeseries: null,
    range: '30d',
    syncedAt: null,

    async fetchData(username) {
      try {
        const [sRes, tRes] = await Promise.all([
          fetch(`/u/${username}/api/stats`),
          fetch(`/u/${username}/api/timeseries`)
        ]);
        if (!sRes.ok || !tRes.ok) throw new Error('Not found');
        const s = await sRes.json();
        const t = await tRes.json();
        this.stats = s.data;
        this.timeseries = t.data;
        this.syncedAt = t.syncedAt;
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },

    get filteredDays() {
      if (!this.timeseries) return [];
      if (this.range === 'all') return this.timeseries.days;
      const n = this.range === '7d' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - n);
      return this.timeseries.days.filter(d => new Date(d.date) >= cutoff);
    }
  });
});
```

### Chart.js dark theme baseline (matches existing CSS vars)
```javascript
// Source: chartjs.org/docs (Context7) — global defaults override
Chart.defaults.color = '#b0aea5';           // --mid for axis labels
Chart.defaults.borderColor = '#2a2a28';     // --border for gridlines
Chart.defaults.backgroundColor = '#d97757'; // --orange default
Chart.defaults.font.family = "'Lora', Georgia, serif";
```

### Bar chart for daily sessions (skeleton)
```javascript
// Source: chartjs.org/docs/latest/charts/bar.html (verified HIGH confidence)
new Chart(canvas, {
  type: 'bar',
  data: {
    labels: filteredDays.map(d => d.date),
    datasets: [{
      label: 'Sessions',
      data: filteredDays.map(d => d.sessions),
      backgroundColor: '#d97757',
      borderRadius: 4,
    }]
  },
  options: {
    responsive: true,
    animation: { duration: 400, easing: 'easeInOutQuart' },
    scales: {
      x: { grid: { color: '#2a2a28' } },
      y: { grid: { color: '#2a2a28' }, beginAtZero: true }
    },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1e1e1c', borderColor: '#2a2a28', borderWidth: 1 }
    }
  }
});
```

### Hero stat sparkline (mini line chart, no axes)
```javascript
// Source: chartjs.org/docs (Context7) — sparkline pattern
new Chart(sparklineCanvas, {
  type: 'line',
  data: {
    labels: last7Days,
    datasets: [{ data: last7Values, borderColor: '#d97757', borderWidth: 2,
                 pointRadius: 0, fill: false, tension: 0.4 }]
  },
  options: {
    responsive: false,
    animation: false,
    scales: { x: { display: false }, y: { display: false } },
    plugins: { legend: { display: false }, tooltip: { enabled: false } }
  }
});
```

### Day-of-week aggregation (client-side from timeseries.days)
```javascript
// Source: native JS (no library needed)
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const byDow = new Array(7).fill(0);
filteredDays.forEach(d => {
  const dow = new Date(d.date).getDay();
  byDow[dow] += d.sessions;
});
// → horizontal bar chart
```

### Model donut aggregation (from timeseries.days)
```javascript
// Source: types.ts — SafeDailyStats.models: Record<string, number>
const modelTotals = {};
filteredDays.forEach(d => {
  Object.entries(d.models).forEach(([model, count]) => {
    modelTotals[model] = (modelTotals[model] || 0) + count;
  });
});
```

### Project activity bars (conditional — only if projects data present)
```javascript
// Source: types.ts — SafeDailyStats.projects?: string[]
// Projects panel is only rendered if any day has projects data
const hasProjects = filteredDays.some(d => d.projects && d.projects.length > 0);
// Count project occurrences across days
const projectCounts = {};
filteredDays.forEach(d => {
  (d.projects || []).forEach(p => {
    projectCounts[p] = (projectCounts[p] || 0) + 1;
  });
});
```

### Coding tenure calculation (from timeseries.days)
```javascript
// "Time since first session" — earliest date in all days (not filtered)
const allDays = Alpine.store('dashboard').timeseries.days;
const firstDate = new Date(allDays[0].date);
const now = new Date();
const diffMs = now - firstDate;
const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
const weeks = Math.floor(diffDays / 7);
const tenure = weeks > 0 ? `${weeks}w ${diffDays % 7}d` : `${diffDays}d`;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| cal-heatmap `cal.init()` | cal-heatmap `cal.paint()` | v4.0 (2022) | Complete API break — all v3 examples are wrong |
| Chart.js `chart.destroy()` then `new Chart()` | `chart.data = ...; chart.update('active')` | Chart.js 3.x | Smooth morph animation vs hard flash |
| Alpine.js v2 `x-spread` | Alpine.js v3 `x-bind` / `x-data` functions | v3.0 (2021) | v2 syntax errors in v3 |
| chartjs-plugin-datalabels auto-register | Must call `Chart.register(ChartDataLabels)` | v2.0 | Silent failure if not registered |

**Deprecated/outdated:**
- cal-heatmap v3 `cal.init({...})`: Replaced by `cal.paint({...})` in v4. Do not use.
- Chart.js v2 `chart.getDatasetAtEvent()`: Replaced in v3. All v2 examples are invalid.

## Open Questions

1. **cal-heatmap "update data for range filter"**
   - What we know: cal-heatmap v4 has a `fill()` method for updating data after paint
   - What's unclear: Whether re-calling `cal.paint()` after destroying is better than `cal.fill()` for range updates
   - Recommendation: Use `cal.destroy()` + `cal.paint()` on range change for simplicity; the calendar heatmap is a fixed time window (show "all time" always) anyway since it's a historical view

2. **@alpinejs/intersect exact CDN version**
   - What we know: `@3.x.x` works as a floating semver in jsDelivr CDN URLs
   - What's unclear: Whether to pin to `3.15.8` to match Alpine core version
   - Recommendation: Pin both to `3.15.8` for consistency

3. **ROI metric definition**
   - What we know: User context mentions "ROI" as a hero stat
   - What's unclear: No ROI formula in `SafeStats` or `SafeTimeSeries` — not a stored field
   - Recommendation: Compute at render time as "hours saved" proxy — e.g., (total tool calls × assumed 30s manual equivalent) / 3600 = hours saved estimate. Or present as "cost per session" which is deterministic. Flag for user clarification during plan review.

## Sources

### Primary (HIGH confidence)
- `/alpinejs/alpine` (Context7) — x-data, x-effect, Alpine.store(), @intersect plugin, CDN install
- `/websites/chartjs` (Context7) — Chart types, update API, animation, tooltip config
- `shiplog-worker/src/routes/configure.ts` — Exact `c.html()` route pattern to follow
- `shiplog-worker/src/routes/landing.ts` — CSS variables, `.btn-group` segmented control CSS
- `shiplog-worker/src/types.ts` — `SafeTimeSeries`, `SafeDailyStats`, `SafeStats` field names

### Secondary (MEDIUM confidence)
- jsDelivr package pages — Chart.js 4.5.1, Alpine.js 3.15.8 confirmed current versions
- chartjs-plugin-datalabels official docs — `Chart.register(ChartDataLabels)` registration pattern
- cal-heatmap.com — v4 `cal.paint()` API, D3 dependency confirmed

### Tertiary (LOW confidence)
- cal-heatmap v4 `fill()` vs `destroy()`+`paint()` for data updates — not verified from docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — library IDs verified on jsDelivr, versions confirmed current
- Architecture: HIGH — based on existing Worker codebase patterns (configure.ts, api.ts)
- Pitfalls: HIGH — most derived from actual API docs and codebase analysis
- cal-heatmap internals: MEDIUM — v4 API confirmed but range-update strategy is LOW

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (Alpine.js and Chart.js are stable; cal-heatmap is slower moving)
