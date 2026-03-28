# Phase 14: Hero Section - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

The dashboard opens with a vivid today-vs-yesterday snapshot and Peak Day trophy cards. This phase adds two new sections to the existing dashboard: Today's Activity (4 metrics with direction indicators and yesterday comparison) and Peak Day cards (per-metric all-time records). No new data collection — uses existing daily stats and byProject data from Phase 13.

</domain>

<decisions>
## Implementation Decisions

### Today's Activity layout
- Title: "Today's Activity"
- 1x4 horizontal row on desktop, 2x2 grid on mobile/narrow screens
- Each card shows: today's value (big, plain number), direction arrow (▲/▼), metric label, yesterday's value in a subtle background bar below
- No +/- prefix on numbers — the arrow between value and label provides the directional gut-check
- Raw difference, not percentages — user sees both actual values and compares instantly
- When today == yesterday: no arrow shown (equal state is transient, will change as user keeps coding)
- When today is all zeros (hasn't coded yet): show 0s with ▼ arrows and yesterday's real values — honest, potentially motivating
- Calendar day basis (00:00–23:59 local), not rolling 24h (locked in roadmap)

### Color & tone language
- ▲ up arrow: use existing dashboard accent color (warm tone)
- ▼ down arrow: Claude's discretion — pick a cool neutral that pairs well with the accent
- No red/green alarm colors anywhere in hero section (locked in roadmap)
- Color scope (arrow only vs arrow + number): Claude's discretion based on readability
- Yesterday row: subtle background bar/strip separating it from today's values (like the mockup)

### Peak Day cards
- One peak card PER metric — messages, sessions, tokens, and cost each get their own peak day
- Peak days will likely fall on different dates, which is more interesting than a single "best day"
- Each card shows: metric value, date (short format: "Mar 15"), and project name that earned the peak
- Project name comes from byProject data (Phase 13)
- Layout (row of mini cards vs stacked list): Claude's discretion based on available space and pairing with Today's Activity
- Auto-updates when a new sync surpasses a previous peak
- New-peak visual indicator: Claude's discretion on whether a subtle "NEW" badge is worth the complexity

### Claude's Discretion
- Down arrow specific cool color choice
- Whether arrow color tints the number or just the arrow
- Peak Day card layout (row vs list)
- New-peak indicator treatment
- First-day edge case handling (unicorn scenario — users will virtually always have historical data)
- Exact spacing, typography, and card sizing

</decisions>

<specifics>
## Specific Ideas

- User's mockup: dark background, large +/- numbers with metric labels, yesterday row as a muted bar strip across the bottom — capture this visual weight and separation
- Direction arrows (▲/▼) between the value and label, not as prefixes on the number
- Peak Day per-metric approach was user's idea — "can there be a peak day for each?" with project name was the chef's kiss moment
- Users will almost always have backlog data from existing JSONL files — don't over-engineer empty states

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-hero-section*
*Context gathered: 2026-03-27*
