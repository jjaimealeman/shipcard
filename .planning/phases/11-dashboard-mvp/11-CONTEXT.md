# Phase 11: Dashboard MVP - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Full analytics dashboard at `/u/:username/dashboard` with 9 chart panels using Alpine.js + Chart.js. Displays hero stats, activity overview, calendar heatmap, daily activity chart, day-of-week bars, tool/model/message donuts, and project activity bars. Time filter toggles re-render all charts client-side. Dark theme using Anthropic brand colors.

</domain>

<decisions>
## Implementation Decisions

### Hero stats area
- Top-line metrics: token usage, costs, ROI, coding tenure (time since first session)
- Presentation: stat cards with inline sparklines showing trend over selected period
- These are the metrics developers care most about — they get the spotlight

### Page layout & hierarchy
- Panel arrangement: Claude's discretion (bento grid, 2-col, or single-col — pick what works best for the content types)
- SVG card inclusion on dashboard: Claude's discretion
- Visual style: Anthropic brand colors (`#141413` dark, `#faf9f5` light, `#d97757` orange accent, `#6a9bcc` blue accent, `#788c5d` green accent, `#b0aea5` mid gray, `#e8e6dc` light gray)
- Fonts: keep existing chosen fonts (Poppins headings, Lora body) — already embedded in the Worker
- All UI controls (toggles, switches, buttons) follow the same visual language as the landing page configurator

### Chart style & density
- Data-rich feel: gridlines, axis labels, values on hover, legends — real analytics dashboard, not a design portfolio
- Donut chart labels: show both raw count and percentage inline (e.g., "Opus: 1,234 (68%)")
- Calendar heatmap style: Claude's discretion
- Charts animate in when scrolled into view (intersection observer pattern)

### Time filter behavior
- Default range: 30 days
- Toggle options: 7d / 30d / All time
- Toggle style: segmented control matching the existing configurator pill style (orange highlight slides between options)
- Toggle placement: sticky — stays visible as user scrolls so they can switch ranges without scrolling back up
- No refresh button — data loads once on page visit
- Animated transitions when switching ranges — charts smoothly morph to new data

### Empty & loading states
- Loading: skeleton placeholders (gray shimmer boxes in the shape of each panel — user sees layout immediately)
- No-data user: Claude's discretion (friendly empty state or similar)
- No v1-only backward compatibility concerns — zero users, everything we build is the first version

### Visibility
- Dashboards are public by default — same model as SVG cards
- Private dashboards deferred to paid tiers (future phase)

### Claude's Discretion
- Panel arrangement / grid layout choice
- SVG card placement on dashboard (if any)
- Calendar heatmap color treatment
- Empty state messaging
- Exact animation timing and easing
- Chart.js configuration details

</decisions>

<specifics>
## Specific Ideas

- Old dashboard reference: filter bar was a horizontal row of pill buttons, clicking a toggle changed stats for the entire page with animation — "it was beautiful"
- Pain point from old dashboard: filter was not sticky, had to scroll back up to toggle and then scroll down to see changes — sticky filter solves this
- Configurator screenshot shows the exact segmented control style to match (orange active pill, dark background, rounded corners)
- "What do people care about the most? Token use. Costs. ROI. How long they've been coding." — these drive the hero area

</specifics>

<deferred>
## Deferred Ideas

- Paid tiers with private dashboard option — gated by adoption rate and usage metrics
- Public roadmap page on shipcard.dev — shows planned features, signals active maintenance, builds trust
- Mobile responsive layout — Phase 12

</deferred>

---

*Phase: 11-dashboard-mvp*
*Context gathered: 2026-03-27*
