# Roadmap: ShipCard

## Milestones

- **v1.0 MVP** — Phases 1-12 (shipped 2026-03-27) — [Archive](milestones/v1-ROADMAP.md)
- **v1.1 Dashboard Enhancement** — Phases 13-15 (in progress)

## Phase Numbering

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)
- v1.1 phases continue from Phase 13

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
