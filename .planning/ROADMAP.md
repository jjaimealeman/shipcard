# Roadmap: ShipCard

## Milestones

- **v1.0 MVP** — Phases 1-12 (shipped 2026-03-27) — [Archive](milestones/v1-ROADMAP.md)
- **v1.1 Dashboard Enhancement** — Phases 13-15 (shipped 2026-03-27)
- **v2.0 Themes + Monetization** — Phases 16-21 (in progress)

## Phase Numbering

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)
- v1.1 phases continue from Phase 13
- v2.0 phases continue from Phase 16

## v1.0 MVP (Phases 1-12) — SHIPPED 2026-03-27

| Phase | Plans | Status | Completed |
|-------|-------|--------|-----------|
| 1. Parser + Engine | 3/3 | Complete | 2026-03-25 |
| 2. MCP + CLI | 3/3 | Complete | 2026-03-25 |
| 3. SVG Card | 2/2 | Complete | 2026-03-25 |
| 4. Cloud Worker | 3/3 | Complete | 2026-03-25 |
| 5. Publish + Launch | 4/4 | Complete | 2026-03-26 |
| 6. Worker Card Params | 1/1 | Complete | 2026-03-26 |
| 7. Auth Verify + Docs | 1/1 | Complete | 2026-03-26 |
| 8. Landing Page | 1/1 | Complete | 2026-03-26 |
| 9. CLI Time-Series | 2/2 | Complete | 2026-03-26 |
| 10. Worker v2 API | 2/2 | Complete | 2026-03-27 |
| 11. Dashboard MVP | 3/3 | Complete | 2026-03-27 |
| 12. Polish + Community | 4/4 | Complete | 2026-03-27 |

Full details: [milestones/v1-ROADMAP.md](milestones/v1-ROADMAP.md)

---

## v1.1 Dashboard Enhancement (Phases 13-15) — SHIPPED 2026-03-27

**Milestone Goal:** Make the dashboard the reason people adopt ShipCard — richer per-project breakdowns, today's activity hero, and meaningful sort dimensions.

### Phase 13: Data Pipeline + Cleanup

**Goal:** The sync payload carries per-project stats and the dashboard's stale metrics are removed.
**Depends on:** Phase 12
**Requirements:** DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, CLEAN-01, CLEAN-02
**Success Criteria** (what must be TRUE):
  1. Daily aggregator computes tokens, sessions, messages, and cost per project per day
  2. Running `shipcard sync --show-projects` includes per-project stats in the payload sent to the Worker
  3. Worker stores per-project stats and the API returns them alongside existing project names
  4. Syncing with old-format data (no per-project stats) still works without errors or missing panels
  5. Slowest Day metric is gone from the dashboard and "Most Messages" label accurately describes what it shows

**Plans:** 2 plans

Plans:
- [x] 13-01-PLAN.md — Enrich daily aggregator with per-project stats and fix userMessages bug
- [x] 13-02-PLAN.md — Extend SafeTimeSeries, Worker API, privacy layer, and dashboard cleanup

### Phase 14: Hero Section

**Goal:** The dashboard opens with a vivid today-vs-yesterday snapshot and a Peak Day trophy card.
**Depends on:** Phase 13
**Requirements:** HERO-01, HERO-02, HERO-03, HERO-04, HERO-05, HERO-06
**Success Criteria** (what must be TRUE):
  1. Dashboard shows Today's Activity with 4 metrics (messages, sessions, tools, tokens), each with its own % change vs yesterday
  2. % change numbers reset at midnight local time, not on a rolling 24h basis
  3. Direction indicators (up/down) use neutral warm and cool tones — no red/green alarm colors anywhere in the hero section
  4. Dashboard shows a Peak Day card with the date, project name, message count, session count, and cost for the highest-activity day on record
  5. Peak Day card updates automatically when a new day surpasses the previous peak after the next sync

**Plans:** 2 plans

Plans:
- [x] 14-01-PLAN.md — Today's Activity section with 4 metrics and direction indicators vs yesterday
- [x] 14-02-PLAN.md — Peak Day per-metric cards with date, value, and project name

### Phase 15: Project Activity

**Goal:** Users can slice project performance by any metric with a single click.
**Depends on:** Phase 13
**Requirements:** PROJ-01, PROJ-02, PROJ-03, PROJ-04
**Success Criteria** (what must be TRUE):
  1. Project Activity panel has a visible sort toggle with four options: messages, tokens, sessions, cost
  2. The bar chart shows the selected metric's value per project (not days active)
  3. Clicking a different sort option re-orders the list and updates the chart without a page reload
  4. Default sort on first load is by messages

**Plans:** 1 plan

Plans:
- [x] 15-01-PLAN.md — Wire sort toggle and chart re-binding for 4 metrics

---

## v2.0 Themes + Monetization (Phases 16-21) — SHIPPED 2026-03-29

**Milestone Goal:** Turn ShipCard into a sustainable business — curated themes make cards worth sharing, Stripe subscriptions create recurring revenue, PRO features justify the upgrade, and AI insights make the dashboard indispensable for power users.

### Phase 16: Agent-Agnostic Architecture

**Goal:** The parser engine works with any agent's JSONL format through a clean adapter interface, with zero behavior change for Claude Code users.
**Depends on:** Phase 15
**Requirements:** ARCH-01, ARCH-02, ARCH-03
**Success Criteria** (what must be TRUE):
  1. All existing `shipcard` commands produce identical output before and after the refactor
  2. A `SourceAdapter` interface exists and the existing Claude Code parser is registered as `ClaudeCodeAdapter`
  3. The engine processes `ParsedMessage[]` from any adapter — no parser-specific logic leaks into engine code
  4. Adding a hypothetical second adapter requires zero changes to engine or CLI code

**Plans:** 2 plans

Plans:
- [x] 16-01-PLAN.md — Rename shiplog/ to shipcard/ and update all references
- [x] 16-02-PLAN.md — Create SourceAdapter interface, ClaudeCodeAdapter, wire into engine, version 2.0.0

### Phase 17: Theme System

**Goal:** Users can make their card their own by choosing from curated themes, and PRO users can supply custom colors — all visible in the dashboard configurator before embedding.
**Depends on:** Phase 16
**Requirements:** THEME-01, THEME-02, THEME-03, THEME-04, THEME-05, THEME-06
**Success Criteria** (what must be TRUE):
  1. Visiting `/card/:username?theme=catppuccin` (or dracula, tokyo-night, nord, gruvbox, solarized, one-dark, monokai) renders the card in that theme's palette
  2. Dashboard card configurator shows a live theme preview that updates when a different theme is selected from the dropdown
  3. PRO user can append `?bg=1e1e2e&title=cdd6f4&text=cdd6f4&icon=89b4fa&border=313244` and the card renders with those exact colors
  4. BYOT params with insufficient contrast (below WCAG 3:1 ratio) are rejected with a descriptive error message, not silently ignored
  5. Theme and BYOT color changes apply consistently across classic, compact, and hero card layouts

**Plans:** 3 plans

Plans:
- [x] 17-01-PLAN.md — Curated theme palettes, WCAG contrast validator, registry + renderer update
- [x] 17-02-PLAN.md — Card route: curated themes, BYOT with PRO gate, backward compat
- [x] 17-03-PLAN.md — Dashboard theme configurator with swatch grid, BYOT inputs, live preview

### Phase 18: Stripe Subscriptions

**Goal:** Users can subscribe to PRO, manage their subscription, and the Worker enforces PRO gating consistently across all routes.
**Depends on:** Phase 16
**Requirements:** PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06
**Success Criteria** (what must be TRUE):
  1. Clicking "Upgrade to PRO" opens a Stripe Checkout session and completing it activates PRO on the user's account within seconds
  2. `isPro(userId)` returns the correct answer immediately after a webhook fires — no eventual-consistency lag from KV
  3. Canceling a subscription via the Customer Portal downgrades the account at the end of the current billing period, not immediately
  4. A failed payment webhook marks the subscription past-due and the dashboard shows a payment-failed banner
  5. Free users see an upgrade prompt when they attempt to use a PRO-only feature (BYOT, custom slugs, AI insights)

**Plans:** 5 plans

Plans:
- [x] 18-01-PLAN.md — Stripe SDK + D1 binding + schema + subscription query helpers
- [x] 18-02-PLAN.md — Webhook handler for Stripe subscription lifecycle events
- [x] 18-03-PLAN.md — Billing routes (checkout, portal, welcome) + isPro D1 migration
- [x] 18-04-PLAN.md — Dashboard billing UI: PRO badge, payment banner, upgrade prompts
- [x] 18-05-PLAN.md — Human verification of billing integration

### Phase 19: PRO Card Features

**Goal:** PRO subscribers get a visibly superior card experience — instant cache refresh, a PRO badge, and custom slugs with saved configurations.
**Depends on:** Phase 18
**Requirements:** CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, CARD-06
**Success Criteria** (what must be TRUE):
  1. PRO cards display a small PRO badge on the SVG that free cards do not have
  2. Running `shipcard sync` as a PRO user causes the card to reflect new data within seconds; free users wait up to 1 hour for the CDN cache to expire
  3. PRO user can create a custom slug at `/u/:username/:slug` and the card at that URL uses the saved configuration (theme, layout)
  4. Free users are blocked from creating custom slugs and see an upgrade prompt
  5. Creating a slug with a reserved word (e.g., "admin", "api") or fewer than 3 characters fails with a clear error message

**Plans:** 5 plans

Plans:
- [x] 19-01-PLAN.md — PRO badge in SVG layouts + renderer plumbing
- [x] 19-02-PLAN.md — D1 slug schema + query helpers + validation
- [x] 19-03-PLAN.md — Slug CRUD API routes + slug card serving + PRO sync pre-render
- [x] 19-04-PLAN.md — CLI slug subcommands (create, list, delete)
- [x] 19-05-PLAN.md — Dashboard slug management section + upgrade block

### Phase 20: AI Insights

**Goal:** PRO users see pre-computed weekly coding insights on their dashboard that update automatically on each sync.
**Depends on:** Phase 18
**Requirements:** INSIGHT-01, INSIGHT-02, INSIGHT-03
**Success Criteria** (what must be TRUE):
  1. PRO dashboard shows a weekly insights panel with peak coding hours, cost trends, and activity streaks
  2. Insights are computed by a scheduled cron job (not a live LLM call during page load) — the dashboard loads instantly
  3. After running `shipcard sync`, the insights panel reflects data from the latest sync within the next cron interval
  4. Free users see the insights panel placeholder with an upgrade prompt, not an error or blank space

**Plans:** 4 plans

Plans:
- [x] 20-01-PLAN.md — Insight types, compute pure functions, Workers AI narrative module + AI binding
- [x] 20-02-PLAN.md — CLI hourly activity tracking in daily aggregation pipeline
- [x] 20-03-PLAN.md — Wire insights into syncV2 handler + KV storage + API endpoint
- [x] 20-04-PLAN.md — Dashboard insights panel with 3 cards + PRO narrative + empty/stale states

### Phase 21: Clack CLI

**Goal:** Interactive CLI flows use polished prompts in terminal mode while remaining fully compatible with MCP and pipe usage.
**Depends on:** Phase 16
**Requirements:** CLI-01, CLI-02, CLI-03
**Success Criteria** (what must be TRUE):
  1. Running `shipcard login` in a terminal shows a Clack-styled interactive prompt; running it via MCP or a pipe falls back to plain text output
  2. Running `shipcard sync` in a terminal shows a Clack spinner and success/error messages with the Clack visual style
  3. All existing command flags and output formats (`shipcard summary`, `shipcard costs`, `shipcard card`) are unchanged — no breaking changes

**Plans:** 3 plans

Plans:
- [x] 21-01-PLAN.md — Install @clack/prompts, create TTY guard module, add light framing to read-only commands
- [x] 21-02-PLAN.md — Full Clack walkthrough for login command
- [x] 21-03-PLAN.md — Clack spinners and confirm prompts for sync and slug commands

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Parser + Engine | v1.0 | 3/3 | Complete | 2026-03-25 |
| 2. MCP + CLI | v1.0 | 3/3 | Complete | 2026-03-25 |
| 3. SVG Card | v1.0 | 2/2 | Complete | 2026-03-25 |
| 4. Cloud Worker | v1.0 | 3/3 | Complete | 2026-03-25 |
| 5. Publish + Launch | v1.0 | 4/4 | Complete | 2026-03-26 |
| 6. Worker Card Params | v1.0 | 1/1 | Complete | 2026-03-26 |
| 7. Auth Verify + Docs | v1.0 | 1/1 | Complete | 2026-03-26 |
| 8. Landing Page | v1.0 | 1/1 | Complete | 2026-03-26 |
| 9. CLI Time-Series | v1.0 | 2/2 | Complete | 2026-03-26 |
| 10. Worker v2 API | v1.0 | 2/2 | Complete | 2026-03-27 |
| 11. Dashboard MVP | v1.0 | 3/3 | Complete | 2026-03-27 |
| 12. Polish + Community | v1.0 | 4/4 | Complete | 2026-03-27 |
| 13. Data Pipeline + Cleanup | v1.1 | 2/2 | Complete | 2026-03-27 |
| 14. Hero Section | v1.1 | 2/2 | Complete | 2026-03-27 |
| 15. Project Activity | v1.1 | 1/1 | Complete | 2026-03-27 |
| 16. Agent-Agnostic Architecture | v2.0 | 2/2 | Complete | 2026-03-28 |
| 17. Theme System | v2.0 | 3/3 | Complete | 2026-03-28 |
| 18. Stripe Subscriptions | v2.0 | 5/5 | Complete | 2026-03-29 |
| 19. PRO Card Features | v2.0 | 5/5 | Complete | 2026-03-29 |
| 20. AI Insights | v2.0 | 4/4 | Complete | 2026-03-29 |
| 21. Clack CLI | v2.0 | 3/3 | Complete | 2026-03-29 |
