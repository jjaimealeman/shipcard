# Phase 15: Project Activity - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can slice project performance by any metric with a single click. Sort toggle with four options (messages, tokens, sessions, cost), horizontal bar chart re-binds per project. This phase enhances the existing Project Activity section from v1 — same layout pattern, expanded sort options.

</domain>

<decisions>
## Implementation Decisions

### Sort toggle design
- Segmented control — identical style to existing card settings UI (Theme/Layout/Style toggles)
- 4 segments: Messages, Tokens, Sessions, Cost
- Same border, fill on active, ghost on inactive — no deviation from existing component
- Default sort on first load: Messages
- Placement: right-aligned on same line as section heading (matching v1 layout)
- No "(click to filter)" hint text — dropped from v1
- No camera/export icon — hidden entirely for free tier

### Bar chart style
- Horizontal bars matching v1 aesthetic (warm orange/amber gradient)
- Value labels inside the bar (e.g., "12.4K")
- Relative scale — longest bar always fills full width, others proportional
- Projects with zero value for selected metric are hidden (not shown)

### Project list layout
- Section heading: "Project Activity (showing 5 of X)" where X is total project count
- 5 projects max for free tier — hard cap
- Project name on left, bar in middle, value label inside bar
- Long project names truncate with ellipsis
- No copy icon per row — dropped from v1
- No per-row actions in v1.1

### Transition behavior
- Smooth reorder (~300ms) when switching sort metrics — rows slide to new positions
- Bar widths animate simultaneously with row reorder
- Rows entering (gained non-zero value) fade in; rows exiting (zero value) fade out
- Toggle segment switches use same instant swap as existing segmented controls — no sliding highlight

### Claude's Discretion
- Secondary stat to the right of each bar (contextual pairing per sort mode, or drop if cleaner)
- Bar color variation per metric (subtle shift or keep uniform orange — whatever fits palette)
- Value formatting per metric (e.g., "$12.40" for cost vs "12.4K" for others)
- Exact animation timing and easing curves

</decisions>

<specifics>
## Specific Ideas

- v1 reference: same layout as original Project Activity section — heading left, toggle right, horizontal bars with value labels inside, project names on left
- Segmented control must match existing card settings UI exactly (Theme/Layout/Style) for consistency — "so it doesn't feel like a different app"
- "Showing 5 of X" creates natural conversation: "Why only 5?" — leads to paid plans organically

</specifics>

<deferred>
## Deferred Ideas

- **Export/download as PNG** — camera icon per section, paid tier feature (v3+)
- **SVG copy to clipboard** — alongside PNG download, paid tier (v3+)
- **Ascending/descending sort toggle** — "click to sort" direction switching (v3+)
- **More than 5 projects visible** — paid tier: 10/15/20/all, pricing TBD (v3+)

</deferred>

---

*Phase: 15-project-activity*
*Context gathered: 2026-03-27*
