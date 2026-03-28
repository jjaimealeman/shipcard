# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-27)

**Core value:** Developers using Claude Code can see what they shipped and what it cost, and share verifiable proof via an embeddable card.
**Current focus:** v1.1 Dashboard Enhancement — Phase 14: Hero Section

## Current Position

Phase: 14 — Hero Section (In progress)
Plan: 01 of 2 complete
Status: In progress
Last activity: 2026-03-28 — Completed 14-01-PLAN.md (Today's Activity section)

Progress: [███░░░░░░░░░░░░░░░░░░░░░░░░░] 3/6 plans (v1.1)

## Performance Metrics

**v1.0 Totals:**
- 12 phases, 29 plans
- 160 commits
- 237 files, ~13,131 LOC
- 3 days (2026-03-25 → 2026-03-27)

**v1.1 Totals (running):**
- 3 phases planned (13-15)
- 17 requirements mapped

## Accumulated Context

### Decisions

- v1.1 is dashboard enhancement on free tier; v2.0 reserved for monetized tier
- Export buttons deferred to v3
- Slowest Day metric dropped (dead — never changes once set)
- Direction indicators use neutral tones, not red/green alarm colors
- Today's Activity uses calendar day (00:00–23:59), not rolling 24h
- DATA pipeline phases first — dashboard can't show per-project stats without enriched sync payload
- CLEAN-01 and CLEAN-02 bundled into Phase 13 (data layer touches same code)
- Phase 15 (Project Activity) depends on Phase 13 but can run after Phase 14 in parallel if needed
- DailyStats.byProject is optional — existing consumers (SafeTimeSeries, card render) unchanged
- Per-project userMessages hardcoded 0 (UserEntry JSONL has no project association field)
- userMessagesByDate uses optional param pattern in aggregateDaily for backward compatibility
- Worker SafeDailyStats mirrors CLI SafeDailyStats exactly (byProject added to both, no cross-package import)
- Worker isValidSyncV2Body unchanged -- byProject is optional and passes through envelope validator silently
- projectSortMetric state property added to Alpine dashboard store for Phase 15 to wire sort toggles
- CLEAN-01 (Slowest Day) and CLEAN-02 (Most Messages) confirmed never existed -- no removals needed
- Local date for "today": always use toLocaleDateString('en-CA'), never toISOString().slice(0,10) (UTC breaks for evening users)
- Direction indicators scan all timeseries.days (not filteredDays) — today is range-independent

### Pending Todos

- None for Phase 13 (complete)

### Blockers/Concerns

- [Action]: Replace placeholder OAuth client ID in login.ts with real GitHub OAuth App
- [Action]: Set real KV namespace IDs in wrangler.jsonc before production deploy
- [RESOLVED 13-01]: userMessages per day was hardcoded 0 — now populated from real UserEntry timestamps

## Session Continuity

Last session: 2026-03-28T00:43:17Z
Stopped at: Completed 14-01-PLAN.md (Today's Activity section — 4 metric cards with direction indicators)
Resume with: `/gsd:execute-phase 14` plan 02 (Peak Day cards)
