# Phase 14: Hero Section - Research

**Researched:** 2026-03-27
**Domain:** Alpine.js dashboard UI — today-vs-yesterday stat cards + per-metric peak day cards
**Confidence:** HIGH

## Summary

Phase 14 adds two new sections to an existing Alpine.js + Hono dashboard: a "Today's Activity" row showing 4 metrics with direction indicators vs yesterday, and a "Peak Day" row showing the best historical day for each metric. All data already lives in `timeseries.days` (a `SafeDailyStats[]` array loaded at page boot). No new API endpoints or data shapes are needed.

The existing codebase is a single large TypeScript file (`dashboard.ts`) that inlines the entire HTML page as a template literal and serves it via a Hono route. The Alpine.js store pattern (`Alpine.store('dashboard', {...})`) is already established with computed getters and a `load()` method that fetches `/api/stats` and `/api/timeseries`. Today's Activity and Peak Day are purely client-side computed properties wired to HTML via Alpine.js `x-text` and `:class` bindings.

The primary challenge is timezone-correct "today" identification: the data `date` field is UTC (`YYYY-MM-DD` from `msg.timestamp.slice(0,10)` in the engine), but the user wants calendar-day boundaries in their local timezone. Using `new Date().toISOString().slice(0,10)` would give UTC date, not local date. The pattern `new Date().toLocaleDateString('en-CA')` returns `YYYY-MM-DD` in the browser's local timezone — the correct approach.

**Primary recommendation:** Implement both sections as computed getters on the existing Alpine.js store. No new libraries, no new API calls, no structural changes to the data pipeline. CSS additions go inside the existing `<style>` block, HTML additions inside the existing template literal.

## Standard Stack

The dashboard is a self-contained HTML page with CDN-loaded libraries. No build step for the frontend.

### Core (already in use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Alpine.js | 3.15.8 (CDN) | Reactive UI state | Already in dashboard; store pattern established |
| Hono | ^4.0.0 | Cloudflare Worker routing | Already used throughout worker |

### Supporting (already in use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Chart.js | 4.5.1 (CDN) | Charting | Existing charts only — not needed for hero section |
| D3.js | 7 (CDN) | Heatmap | Existing heatmap only — not needed for hero section |

No new libraries needed. Today's Activity and Peak Day are pure Alpine computed properties + CSS.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline CSS in `<style>` block | Tailwind CDN | No — Tailwind not in the stack, would be inconsistent |
| Pure Alpine computed | Separate fetch for today | No — data already loaded, no round-trip needed |

**Installation:** None. No new packages.

## Architecture Patterns

### Existing Code Structure

```
dashboard.ts  (single file, ~1900 lines)
├── DASHBOARD_HTML template literal
│   ├── <style> block         (lines 37–502)
│   ├── HTML markup           (lines 504–796)
│   └── <script> block        (lines 812–1888)
│       ├── Alpine.store('dashboard', {...})  (lines 817–1060)
│       ├── COLORS / CHART_COLORS constants  (lines 1065–1078)
│       ├── Data helpers (fmtDate, aggregateByWeekday, etc.)
│       ├── Chart builder functions
│       └── Alpine:initialized bootstrap
└── dashboardRoutes.get() handler (lines 1897–1908)
```

### Pattern 1: Alpine Store Computed Getter

All derived values are `get` properties on the store. Today/yesterday/peak values follow the same pattern as existing hero stats like `heroTokens`, `heroCost`, etc.

**What:** Computed getters scan `this.timeseries.days` to find today's entry and yesterday's entry by date string comparison.
**When to use:** All Today's Activity and Peak Day values.

```javascript
// Source: existing dashboard.ts store pattern (lines 882–953)
get _todayDate() {
  // Returns YYYY-MM-DD in browser local timezone — NOT UTC
  // new Date().toISOString().slice(0,10) would be wrong (UTC)
  return new Date().toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD
},

get _yesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA');
},

get _todayStats() {
  if (!this.timeseries) return null;
  return this.timeseries.days.find(d => d.date === this._todayDate) || null;
},

get _yesterdayStats() {
  if (!this.timeseries) return null;
  return this.timeseries.days.find(d => d.date === this._yesterdayDate) || null;
},
```

### Pattern 2: Direction Indicator Logic

Today's Activity uses `▲`/`▼` arrows (or nothing for equal). The arrow is in the markup, colored via class binding.

```javascript
// Direction: 1 = up, -1 = down, 0 = equal
_dir(todayVal, yesterdayVal) {
  if (todayVal > yesterdayVal) return 1;
  if (todayVal < yesterdayVal) return -1;
  return 0;
},
```

In HTML:
```html
<!-- Arrow shown only when direction is non-zero -->
<span x-show="$store.dashboard._dir(todayMessages, yesterdayMessages) !== 0"
      :class="$store.dashboard._dir(todayMessages, yesterdayMessages) > 0 ? 'dir-up' : 'dir-down'">
  <span x-text="$store.dashboard._dir(todayMessages, yesterdayMessages) > 0 ? '▲' : '▼'"></span>
</span>
```

Colors:
- `dir-up` → `color: var(--orange)` (existing warm accent)
- `dir-down` → `color: var(--blue)` (existing cool blue — not red, not green)

### Pattern 3: Per-Metric Peak Day

Peak Day scans all `timeseries.days` (all-time, not filtered by range) and returns the day with the maximum value for each metric.

```javascript
get _peakMessages() {
  if (!this.timeseries || !this.timeseries.days.length) return null;
  return this.timeseries.days.reduce((best, d) =>
    d.messages > (best?.messages ?? -1) ? d : best, null);
},

get _peakTokens() { /* same pattern, d.tokens.input + output + cacheCreate + cacheRead */ },
get _peakSessions() { /* same pattern, d.sessions */ },
get _peakCost() { /* same pattern, d.costCents */ },
```

Peak Day project name: use `byProject` to find the project with the most messages on that day.

```javascript
_peakProjectName(peakDay) {
  if (!peakDay || !peakDay.byProject) return null;
  const entries = Object.entries(peakDay.byProject);
  if (!entries.length) return null;
  return entries.reduce((best, [name, stats]) =>
    stats.messages > (best[1]?.messages ?? -1) ? [name, stats] : best
  )[0];
},
```

### Pattern 4: Section Layout (CSS Grid)

Today's Activity: `hero-today-grid` — 1x4 on desktop (1024px+), 2x2 on tablet (640px+), 2x2 on mobile (default).

```css
/* Source: mirrors existing .hero-grid pattern in dashboard.ts lines 291–355 */
.hero-today-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);  /* default 2x2 */
  gap: 16px;
  margin-bottom: 16px;
}
@media (min-width: 1024px) {
  .hero-today-grid {
    grid-template-columns: repeat(4, 1fr);  /* desktop 1x4 */
  }
}
```

Peak Day: `peak-grid` — 4 mini cards in a row, wrapping gracefully on mobile.

```css
.peak-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 32px;
}
@media (min-width: 640px) {
  .peak-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Pattern 5: Today's Activity Card HTML Shape

Each card: big number (top), then arrow + label row, then yesterday's value as a muted strip.

```html
<!-- Today's Activity card — messages example -->
<div class="today-card">
  <div class="today-value" x-text="$store.dashboard.todayMessages"></div>
  <div class="today-arrow-label">
    <span class="dir-arrow"
          x-show="$store.dashboard.dirMessages !== 0"
          :class="$store.dashboard.dirMessages > 0 ? 'dir-up' : 'dir-down'"
          x-text="$store.dashboard.dirMessages > 0 ? '▲' : '▼'"></span>
    <span class="today-label">Messages</span>
  </div>
  <div class="today-yesterday">
    Yesterday: <span x-text="$store.dashboard.yesterdayMessages"></span>
  </div>
</div>
```

### Pattern 6: Position in Existing Page Structure

Insert BEFORE the existing "Activity" section (around line 638 in current dashboard.ts).

```
<!-- Existing: Overview section (hero-grid with 4 aggregate stats cards) -->
<!-- NEW: Today's Activity section (section-title + hero-today-grid) -->
<!-- NEW: Peak Day section (section-title + peak-grid) -->
<!-- Existing: Activity section (heatmap) -->
```

The existing comment at line 635: `<!-- Phase 14 will add a "Peak Day" card here -->` — replace this placeholder comment with the actual sections.

### Anti-Patterns to Avoid

- **Using UTC date for "today":** `new Date().toISOString().slice(0,10)` returns UTC date. At 11 PM Mountain Time, this would give "tomorrow's" date. Use `toLocaleDateString('en-CA')` which respects the browser timezone.
- **Filtering by `filteredDays` for peak:** Peak Day should always scan all-time `timeseries.days`, not the range-filtered `filteredDays`. Peak is a historical record, not a range-relative metric.
- **Adding a new API endpoint:** All data is already in `timeseries`. No new fetch needed.
- **Modifying `SafeDailyStats` shape:** The data pipeline is done. Don't touch types.
- **Using red for down arrows:** The design brief explicitly says no red/green alarm colors. Use `--blue` for down, `--orange` for up.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Local date in YYYY-MM-DD | Custom offset calculation | `toLocaleDateString('en-CA')` | `en-CA` locale always produces YYYY-MM-DD format; built-in browser API |
| Number formatting | Custom formatter | Existing `_fmtNum()` in the store | Already handles K/M/B abbreviations |
| Date display ("Mar 15") | Custom formatter | Existing `fmtDate()` helper | Already used throughout dashboard |
| Cost formatting | Custom | Existing `heroCost` pattern | `toLocaleString` with cents conversion already solved |

**Key insight:** The dashboard already has all the helpers. Peak Day and Today's Activity are ~3-4 new computed getters each, not new infrastructure.

## Common Pitfalls

### Pitfall 1: UTC vs Local Timezone for "Today"

**What goes wrong:** `new Date().toISOString().slice(0,10)` returns today's date in UTC. A user in Mountain Time (UTC-6) at 11 PM gets tomorrow's date. No matching day in `timeseries.days`, so "Today" always shows 0s — even after coding all day.
**Why it happens:** `toISOString()` always returns UTC.
**How to avoid:** `new Date().toLocaleDateString('en-CA')` returns `YYYY-MM-DD` in local timezone. The `en-CA` locale is specifically chosen because it produces ISO date format.
**Warning signs:** Today's values always show 0 even though user coded recently.

### Pitfall 2: Midnight Boundary Race Condition

**What goes wrong:** If Alpine store loads at 11:59:58 PM, `_todayDate` is Day X. By the time the user scrolls down at 12:00:02 AM, it's Day X+1. Computed getters are re-evaluated lazily, so the values will auto-correct on next access — Alpine's reactivity handles this gracefully without explicit handling.
**Why it happens:** Dates are computed fresh each time the getter is accessed.
**How to avoid:** No action needed — Alpine's computed getters re-run on every access. Document as expected behavior.

### Pitfall 3: Missing Today (User Hasn't Coded Yet)

**What goes wrong:** If `_todayDate` not found in `timeseries.days`, `_todayStats` is null. Must handle null gracefully — show 0s with down arrows (not blank/undefined).
**Why it happens:** Today is a valid day with no data yet (morning, before first session).
**How to avoid:** Getters return 0 when `_todayStats` is null. Show ▼ arrows since 0 < yesterday. This is intentional per context: "honest, potentially motivating."

### Pitfall 4: Peak Day with No `byProject` Data

**What goes wrong:** `byProject` is optional — only present when user synced with `--show-projects`. Many users won't have it. Attempting `Object.entries(peakDay.byProject)` on undefined throws.
**Why it happens:** `byProject` is conditionally populated.
**How to avoid:** Always guard: `peakDay.byProject ? ... : null`. When null, don't show project name in peak card (just show "—" or omit the row).

### Pitfall 5: No Historical Data at All

**What goes wrong:** `timeseries` is null (user only did v1 sync, no timeseries data) or `timeseries.days` is empty. All peak and today computations must handle this gracefully.
**Why it happens:** Legacy v1-only users have no timeseries in KV.
**How to avoid:** Guard all getters with `if (!this.timeseries || !this.timeseries.days.length) return null`. The existing `x-show="!$store.dashboard.loading && !$store.dashboard.notFound"` wrapper already hides content during load.

### Pitfall 6: Inserting HTML in Wrong Location

**What goes wrong:** The dashboard HTML is a template literal string. Inserting in the wrong place breaks layout or Alpine context.
**Why it happens:** Template strings are hard to navigate — easy to misplace.
**How to avoid:** Look for the existing placeholder comment at line ~635: `<!-- Phase 14 will add a "Peak Day" card here -->`. Insert both new sections there, right after the existing `hero-grid` div closes.

### Pitfall 7: `x-show` vs `style="display:none"` Conflict

**What goes wrong:** Alpine uses `x-show` to toggle visibility. But SSR (serving raw HTML before Alpine loads) means content flashes. The existing pattern adds `style="display:none"` on elements shown only when `!loading`, and `style="display:block"` on the outer wrapper (which Alpine then manages).
**Why it happens:** Alpine hydrates async; initial HTML state matters.
**How to avoid:** Follow the exact existing pattern: loading skeleton gets `style="display:none"`, content div gets `style="display:none"`, outer wrapper has `style="display:block"`.

## Code Examples

Verified patterns from the existing codebase:

### Local Date in YYYY-MM-DD Format

```javascript
// Source: Browser built-in API (verified behavior)
// en-CA locale always returns YYYY-MM-DD — independent of OS locale setting
const today = new Date().toLocaleDateString('en-CA');
// Returns: "2026-03-27" (local time, not UTC)

const yesterday = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA');
})();
```

### Finding Today/Yesterday in Days Array

```javascript
// Source: existing store pattern (dashboard.ts filteredDays getter line 831)
get _todayStats() {
  if (!this.timeseries || !this.timeseries.days) return null;
  const today = new Date().toLocaleDateString('en-CA');
  return this.timeseries.days.find(d => d.date === today) || null;
},
```

### Today's Messages with Direction

```javascript
// Source: derived from existing heroTokens pattern (lines 882–891)
get todayMessages() {
  return this._todayStats ? this._todayStats.messages : 0;
},
get yesterdayMessages() {
  if (!this.timeseries || !this.timeseries.days) return 0;
  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA');
  })();
  const y = this.timeseries.days.find(d => d.date === yesterday);
  return y ? y.messages : 0;
},
get dirMessages() {
  const t = this.todayMessages, y = this.yesterdayMessages;
  return t > y ? 1 : t < y ? -1 : 0;
},
```

### Peak Day Finder

```javascript
// Source: reduce pattern — standard JS, no library needed
get peakDayMessages() {
  if (!this.timeseries || !this.timeseries.days.length) return null;
  return this.timeseries.days.reduce((best, d) =>
    d.messages > (best ? best.messages : -1) ? d : best, null);
},
get peakDayTokens() {
  if (!this.timeseries || !this.timeseries.days.length) return null;
  return this.timeseries.days.reduce((best, d) => {
    const t = d.tokens.input + d.tokens.output + d.tokens.cacheCreate + d.tokens.cacheRead;
    const bt = best ? best.tokens.input + best.tokens.output + best.tokens.cacheCreate + best.tokens.cacheRead : -1;
    return t > bt ? d : best;
  }, null);
},
```

### Existing Color Palette (do not deviate)

```javascript
// Source: dashboard.ts lines 1065–1074
const COLORS = {
  orange:  '#d97757',  // warm accent — use for UP arrows
  blue:    '#6a9bcc',  // cool blue — use for DOWN arrows
  green:   '#788c5d',
  fg:      '#faf9f5',
  mid:     '#b0aea5',
  surface: '#1e1e1c',
  border:  '#2a2a28',
  bg:      '#141413',
};
```

### CSS Variables (reference these, don't hardcode hex)

```css
/* Source: dashboard.ts lines 37–48 */
:root {
  --bg: #141413;
  --fg: #faf9f5;
  --mid: #b0aea5;
  --light: #e8e6dc;
  --orange: #d97757;   /* up arrow color */
  --blue: #6a9bcc;     /* down arrow color */
  --green: #788c5d;
  --surface: #1e1e1c;
  --border: #2a2a28;
  --radius: 8px;
}
```

### Yesterday Strip Pattern

The "yesterday" row appears as a muted strip below the main metric. Suggested CSS:

```css
/* New class — add to <style> block */
.today-yesterday-bar {
  margin-top: 8px;
  padding: 6px 8px;
  background: var(--bg);
  border-radius: 4px;
  font-size: 11px;
  color: var(--mid);
  font-family: 'Poppins', system-ui, sans-serif;
}
.today-yesterday-bar strong {
  color: var(--light);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Rolling 24h comparison | Calendar day boundaries (00:00–23:59 local) | Phase 14 decision | Simpler, predictable, resets at midnight |
| Single "Peak Day" card | Per-metric peak cards (messages, sessions, tokens, cost) | Phase 14 decision | More interesting — different days for different records |

**Not changing:**
- Dashboard remains a Cloudflare Worker serving server-rendered HTML (no React, no build step)
- Alpine.js CDN pattern (not bundled)
- SafeDailyStats data shape (already finalized in Phase 13)

## Open Questions

1. **Cost formatting for Peak Day cost card**
   - What we know: `costCents` is integer cents; existing `heroCost` divides by 100 and formats with `toLocaleString`
   - What's unclear: Whether to show `~$X.XX` (approximate) or exact `$X.XX` for peak day cost
   - Recommendation: Use exact `$X.XX` since it's a historical record (not an estimate), drop the `~` prefix

2. **Skeleton state for new sections**
   - What we know: Existing hero cards use `.stat-card.loading` with `.skel-value` shimmer placeholders
   - What's unclear: Whether to add full skeleton shimmer for new sections or just hide them until loaded
   - Recommendation: Follow existing pattern — add same `.skel-value`/`.skel-sub` shimmer blocks inside the new cards, shown when `$store.dashboard.loading`

3. **"NEW" peak badge**
   - What we know: Context says "Claude's discretion on whether a subtle NEW badge is worth the complexity"
   - What's unclear: What defines "new" — new since last page load? New since last sync?
   - Recommendation: Skip the NEW badge. There's no persistent "previous peak" to compare against (store resets on each load). The complexity isn't worth it for v1.1.

## Sources

### Primary (HIGH confidence)
- Codebase: `/home/jaime/www/_github/SaaS/shipcard-worker/src/routes/dashboard.ts` — full Alpine store, HTML markup, CSS variables, all chart patterns
- Codebase: `/home/jaime/www/_github/SaaS/shipcard-worker/src/types.ts` — `SafeDailyStats`, `PerProjectDailyStats` type shapes
- Codebase: `/home/jaime/www/_github/SaaS/shipcard/src/cli/safestats.ts` — confirms `byProject` is optional, populated only with `--show-projects`
- Codebase: `/home/jaime/www/_github/SaaS/shipcard/src/engine/dailyAggregator.ts` — confirms `DailyStats` fields: `messages`, `sessions`, `tokens`, `costCents`, `byProject`
- `.planning/phases/14-hero-section/14-CONTEXT.md` — user decisions, layout choices, color decisions

### Secondary (MEDIUM confidence)
- `toLocaleDateString('en-CA')` for YYYY-MM-DD format: well-established browser API behavior, works in all modern browsers including Cloudflare Workers' V8 environment

### Tertiary (LOW confidence)
- None — all findings verified against codebase directly

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — codebase confirms Alpine.js 3.15.8, no new libraries needed
- Architecture: HIGH — existing store patterns directly show how to add new getters
- Data shapes: HIGH — types.ts and dailyAggregator.ts fully document available fields
- Pitfalls: HIGH — UTC/local timezone pitfall verified against existing `fmtDate` pattern (uses `T00:00:00` suffix)
- Color choices: HIGH — CSS variables and COLORS constants verified in source

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable codebase, no external library updates needed)
