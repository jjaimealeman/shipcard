# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Developers using Claude Code can see what they shipped and what it cost, and share verifiable proof via an embeddable card.
**Current focus:** Phase 1 - Parser + Engine

## Current Position

Phase: 1 of 5 (Parser + Engine)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-03-25 — Completed 01-01-PLAN.md (project scaffolding + streaming parser)

Progress: [█░░░░░░░░░] 7% (1/15 plans estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: ~2 min
- Total execution time: ~2 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-parser-engine | 1 | ~2 min | ~2 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min)
- Trend: Baseline established

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Research flag]: JSONL schema edge cases need deeper inspection during Phase 1 planning — more sample files from different project types
- [Research flag]: SVG rendering on GitHub specifically — camo proxy and SVG sanitizer have undocumented restrictions (Phase 3)
- [Research flag]: Cloudflare Worker auth strategy for /api/sync — API key vs signed token decision needed in Phase 4 planning
- [Research gap]: npm name availability — check `npm show shiplog` before writing package.json (Phase 5)

## Session Continuity

Last session: 2026-03-25T22:07:13Z
Stopped at: Completed 01-01-PLAN.md — streaming parser with two-level dedup ready
Resume file: None
