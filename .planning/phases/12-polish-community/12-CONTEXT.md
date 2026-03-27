# Phase 12: Polish + Community - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Production-ready dashboard with mobile responsive layout, loading/empty state handling, community features on homepage + dedicated community route, and SVG card promo footer. Scope: polish existing dashboard, add community visibility, add growth-engine footer to cards.

</domain>

<decisions>
## Implementation Decisions

### Mobile responsive
- Single column stack on mobile — all 9 dashboard panels stack vertically, full width
- Three breakpoints: 375px (phone), 640px (large phone/small tablet), 1024px (desktop)
- Filter bar collapses to dropdown on mobile (saves vertical space)
- All charts resize to fit container width — no horizontal scrolling anywhere
- Calendar heatmap capped to past one month on mobile to avoid density issues at narrow widths

### State handling
- Skeleton pulse loading states (gray pulsing rectangles matching panel shapes) — extends existing Phase 11 skeletons
- Unknown/no-data users see friendly empty page: dashboard shell with message like "No data yet — sync with shipcard sync to get started"
- Error handling: minimal — CF Workers essentially never fail, don't over-engineer retry/error UI

### Community feed — Homepage teaser
- 10-row "Recent members" table on homepage showing latest users who joined
- Columns: #, Username, Est. Cost, Projects, Sessions, Tokens (6 columns)
- Columns sortable
- "Serving X cards" counter appears below the hero subtitle text, only after 100+ cards served threshold
- If threshold never reached, revisit goals

### Community feed — Dedicated route
- Full community page at a dedicated route (e.g., /community)
- Multiple leaderboard tables: most recent, most active, highest cost, most sessions
- Sortable columns, paginated, room to grow
- Homepage table is a teaser that drives to the full community page

### Card promo footer
- "Get yours at shipcard.dev" — bottom right of SVG card, subtle/muted color (watermark feel)
- Wrapped in `<a>` tag with `target="_blank"` — clickable but opens new tab, doesn't hijack the embedding page
- Always shown — no opt-out, this is the growth engine
- Applied to all card layouts (classic, compact, hero) — consistent branding everywhere

### Claude's Discretion
- Error handling approach (inline vs full-page) — keep it simple given CF reliability
- Exact breakpoint CSS implementation (media queries vs container queries)
- Community route path naming (/community, /leaders, etc.)
- Pagination approach for full community page
- Typography and spacing adjustments for mobile

</decisions>

<specifics>
## Specific Ideas

- Homepage table should feel like a living roster — row count reflects growth (5 users → 10 → 160 → 1,234)
- "Serving X cards" positioned below the h1 + subtitle paragraph on the existing landing page, visible but not dominant
- Promo footer should feel like a watermark, not an ad — subtle enough that users don't mind it on their README

</specifics>

<deferred>
## Deferred Ideas

- Private/unlisted dashboards — user mentioned in success criteria but not discussed; defer specifics to implementation or future phase
- Configurator panel selection for dashboard — in success criteria, defer details to planning
- Multiple leaderboard category routes (e.g., /leader/projects, /leader/sessions) — start with single community page, split later if needed
- **Public roadmap page** on shipcard.dev — show what's coming, what's planned, what's NOT planned
- **Stripe integration** — $1/month billing, free vs paid tier gating logic
- **Pricing page** — communicate free vs paid tiers clearly
- **"Built for Claude Code" positioning** — explicit on landing page copy, lean into the niche
- **Multi-platform expansion** (gemini.shipcard.dev, codex.shipcard.dev) — name is platform-agnostic, keep option open but don't promise or build until Claude Code is nailed with 1,000+ users

</deferred>

---

*Phase: 12-polish-community*
*Context gathered: 2026-03-27*
