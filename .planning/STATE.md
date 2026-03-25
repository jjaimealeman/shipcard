# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Developers using Claude Code can see what they shipped and what it cost, and share verifiable proof via an embeddable card.
**Current focus:** Phase 2 - CLI + MCP Tools

## Current Position

Phase: 1 of 5 (Parser + Engine) — COMPLETE
Plan: 3 of 3 complete
Status: Phase complete — ready for Phase 2
Last activity: 2026-03-25 — Completed 01-03-PLAN.md (date filtering, public runEngine() API, end-to-end validation)

Progress: [███░░░░░░░] 20% (3/15 plans estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~2.7 min
- Total execution time: ~8 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-parser-engine | 3 | ~8 min | ~2.7 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min), 01-02 (3 min), 01-03 (3 min)
- Trend: Consistent 2-3 min per plan

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Project]: Phase 1 + Phase 2 sequential — local tool must work before card has data
- [Project]: Dual MCP + CLI interface — covers IDE users and terminal natives
- [Project]: Cloudflare Workers over Vercel — avoids github-readme-stats rate-limit problems
- [Project]: 3 MCP tools only — ship the wedge, not the platform
- [01-01]: Node16 module resolution (not Bundler) — targeting Node 22 directly, no bundler
- [01-01]: glob async iterator form (for await of glob()) — promise form unreliable per research
- [01-01]: message.id dedup scoped per-file, uuid dedup shared — matches Claude Code write patterns
- [01-01]: User entries are metadata-only (cwd source) — ParsedMessages are assistant entries only
- [01-01]: Zero runtime deps enforced — only node: built-ins used in parser
- [01-02]: Pricing snapshot stored in data/ (outside src/) — loaded via import.meta.url at runtime, not compiled
- [01-02]: PricingMap is Map<string, ModelPricing> for O(1) lookup in aggregator hot path
- [01-02]: Per-message cost calculation (not per-session) — handles multi-model sessions correctly
- [01-02]: pricingCache in aggregator memoizes getModelPricing() calls per model string
- [01-03]: parseFilterDate uses local time (ISO + T00:00:00, relative/today + setHours(0,0,0,0))
- [01-03]: since inclusive (>=), until exclusive (<) — standard analytics range convention
- [01-03]: sessions map rebuilt from filtered messages so totalSessions reflects the window
- [01-03]: stats.filesRead/linesSkipped carry from full parse (reflects I/O, not filter)
- [01-03]: dist/ gitignored — compiled output not committed

### Pending Todos

None yet.

### Blockers/Concerns

- [Research flag]: JSONL schema edge cases need deeper inspection during Phase 1 planning — more sample files from different project types
- [Research flag]: SVG rendering on GitHub specifically — camo proxy and SVG sanitizer have undocumented restrictions (Phase 3)
- [Research flag]: Cloudflare Worker auth strategy for /api/sync — API key vs signed token decision needed in Phase 4 planning
- [Research gap]: npm name availability — check `npm show shiplog` before writing package.json (Phase 5)

## Session Continuity

Last session: 2026-03-25T22:20:46Z
Stopped at: Completed 01-03-PLAN.md — Phase 1 complete, runEngine() validated against real data
Resume file: None
