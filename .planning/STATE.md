# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Developers using Claude Code can see what they shipped and what it cost, and share verifiable proof via an embeddable card.
**Current focus:** Phase 2 - MCP + CLI

## Current Position

Phase: 2 of 5 (MCP + CLI)
Plan: 2 of 3 in current phase (02-01 and 02-02 complete)
Status: In progress
Last activity: 2026-03-25 — Completed 02-01-PLAN.md (CLI layer: args parser, table formatter, 3 commands)

Progress: [████░░░░░░] 33% (5/15 plans estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~2.7 min
- Total execution time: ~8 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-parser-engine | 3 | ~8 min | ~2.7 min |
| 02-mcp-cli | 2 (in progress) | ~4 min | ~2 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min), 01-02 (3 min), 01-03 (3 min), 02-01 (N/A - research), 02-02 (2 min)
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
- [02-01]: node:util.parseArgs with strict: false — avoids unknown flag crashes, zero deps
- [02-01]: shiplog card always JSON in Phase 2 — SVG generation deferred to Phase 3
- [02-01]: shouldUseColor() checks isTTY first — prevents garbled ANSI in piped output
- [02-02]: Tool-per-file pattern — each MCP tool in separate module for testability and clean server.ts
- [02-02]: import type McpServer in tool files — type-only import avoids runtime dependency in tool modules
- [02-02]: as const on MCP content type literal — prevents type widening from "text" to string

### Pending Todos

None yet.

### Blockers/Concerns

- [Research flag]: SVG rendering on GitHub specifically — camo proxy and SVG sanitizer have undocumented restrictions (Phase 3)
- [Research flag]: Cloudflare Worker auth strategy for /api/sync — API key vs signed token decision needed in Phase 4 planning
- [Research gap]: npm name availability — check `npm show shiplog` before writing package.json (Phase 5)

## Session Continuity

Last session: 2026-03-25T23:21:26Z
Stopped at: Completed 02-01-PLAN.md — CLI layer with 3 commands (summary, costs, card) wired to engine
Resume file: None
