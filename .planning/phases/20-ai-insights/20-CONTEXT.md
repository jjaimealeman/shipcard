# Phase 20: AI Insights - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

PRO users see pre-computed weekly coding insights on their dashboard that update automatically on each sync. Local CLI computes insights for all users; PRO dashboard gets enhanced AI-generated narrative via Workers AI. Free users see real data with limited depth.

</domain>

<decisions>
## Implementation Decisions

### Insight Generation Method
- Local-first compute: CLI computes insights from raw JSONL during `shipcard sync` — all users get this
- PRO dashboard gets an additional Workers AI narrative summary tying stats together (hybrid approach)
- Local algo handles stats computation; edge LLM only generates the narrative layer
- Zero API cost to ShipCard for free users — compute happens on user's machine

### Insight Content & Layout
- Card grid layout — each insight type is its own card, consistent with existing dashboard style
- Three core insight types: peak coding hours, cost trends, activity streaks
- Specific visualizations for each card are Claude's discretion

### Free vs PRO Depth Gating
- Free tier: current week + previous week comparison (2-week window)
- PRO tier: 4-week rolling window with richer trend data + AI narrative card
- Free users see their real data, not blurred/placeholder content — limited depth, not limited access
- No upgrade banners in the insights panel — `/upgrade` page is the single place for free-vs-PRO comparison
- `/upgrade` page shows mockups/screenshots of "This is free & this is PRO" side by side

### Computation Cadence
- Insights recompute on every `shipcard sync` — always fresh after a sync
- Week boundary: Claude's discretion (user leaned Monday-Sunday but deferred)
- Stale data handling: show last computed insights with a subtle "Last updated X days ago" badge

### PRO Visual Treatment
- AI narrative card visual differentiation: Claude's discretion
- Consistent with existing PRO badge patterns where appropriate

### Claude's Discretion
- Peak coding hours visualization (heat map, bar chart, or text callout)
- Cost trend card design (sparkline, delta, or comparison text)
- Activity streak definition and threshold logic
- Week boundary choice (Mon-Sun vs Sun-Sat vs rolling)
- Stale data threshold before showing the badge
- AI narrative card visual treatment

</decisions>

<specifics>
## Specific Ideas

- "Could we make local only available for free tier, and paid PRO plans can use both/hybrid?" — confirmed, this is the gating model
- Privacy angle: "Your AI insights are computed locally. We never see your code." — strong selling point
- WakaTime inspiration: user was a long-time WakaTime user and wants similar insight depth for agentic developers
- Cadell's enterprise feedback: multi-LLM dashboard for big corp is the real moat, not single-vendor Claude tool

</specifics>

<deferred>
## Deferred Ideas

### Enterprise / Teams (future milestone)
- Team dashboard: aggregate insights across team members
- Corporate cost tracking across LLM licenses (Claude, Codex, Gemini)
- Multi-LLM aggregation as enterprise selling point — "strips away friction of building their own dashboard"
- Cadell's feedback: "big corp on multiple LLMs" is the target market

### Local Card Collection (future phase)
- Users generate multiple local-only ShipCards/visualizations
- Custom cards/charts on request — a builder/configurator feature
- Free users can build a "collection" locally but only sync ONE to share
- PRO users can sync multiple

### Card Endpoint Improvements (bugs/enhancements)
- Safari crash on SVG card page — needs investigation
- Fixed width for markdown/HTML card embed
- `.png`/`.jpg` endpoint (`/u/username.png`) for platforms that strip SVGs — node-svg2img NOT needed, but server-side rasterization could be useful eventually

### Upgrade Page
- `/upgrade` page with free-vs-PRO comparison mockups/screenshots across all features (not just insights)
- Single nav link, no banners scattered throughout

</deferred>

---

*Phase: 20-ai-insights*
*Context gathered: 2026-03-29*
