# Project Research Summary

**Project:** ShipLog
**Domain:** Local-first developer analytics + embeddable stats cards
**Researched:** 2026-03-25
**Confidence:** HIGH

## Executive Summary

ShipLog sits in a validated space — ccusage (12K stars) proves developers want Claude Code analytics, github-readme-stats (67K stars) proves embeddable cards are a growth mechanic. Nobody combines both. The local tool reads JSONL files from `~/.claude/projects/`, computes sessions/costs/models, and exposes via MCP + CLI. The Cloudflare Worker serves SVG cards at the edge with KV caching.

The stack is minimal and verified: MCP SDK v1.28.0, commander for CLI, tsup for build, TypeScript string templates for SVG, Cloudflare Worker + KV for card serving. Zero external deps in the engine — just Node.js built-ins. The architecture researcher inspected actual JSONL files on this machine and confirmed the schema: `assistant` messages carry `message.model`, `message.usage` (input/output/cache tokens), `message.content[]` (tool_use blocks), `sessionId`, `timestamp`, `cwd`, and `version`.

Critical risks: JSONL schema instability (Claude Code iterates fast, no public API contract), cost estimation accuracy (token-to-dollar is an estimate, not billing truth), and SVG rendering across platforms (GitHub sanitizes SVGs aggressively). All mitigatable with resilient parsing, explicit "~estimated" labeling, and basic-SVG-only templates.

## Key Findings

**Stack:** MCP SDK v1.28.0 + commander + tsup + TypeScript string template SVG + Cloudflare Worker/KV. No Hono, no SVG libraries, no monorepo.

**Table Stakes:** Cost breakdown by project/model/period, session-level stats, date filtering, JSON output, timezone support, terminal tables, `npx` invocation. ccusage sets this floor.

**Differentiator:** Embeddable SVG stats card. No Claude-native tool does this. github-readme-stats validates the mechanic at 67K stars.

**Architecture:** Flat repo, two entry points (`shiplog` CLI + `shiplog-mcp`), shared engine layer. Worker in `worker/` subdirectory with own package.json. Parser → Engine → MCP/CLI. Privacy boundary enforced at sync point via `SafeStats` type.

**Critical Pitfall:** JSONL schema changes. Build a resilient parser that gracefully handles unknown fields, uses optional typing, and version-detects.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: JSONL Parser + Analytics Engine
**Rationale:** Everything depends on this. Pure TypeScript, zero deps, fully testable with fixtures.
**Delivers:** Parser that reads `~/.claude/projects/**/*.jsonl` → typed events → aggregated stats (sessions, tokens, costs, models, tool calls)
**Addresses:** JSONL schema resilience, streaming for large files, cost estimation with explicit approximation
**Avoids:** Schema instability pitfall (resilient parser from day one)

### Phase 2: MCP Server + CLI
**Rationale:** Two entry points to the same engine. MCP makes ShipLog useful inside agentic workflows. CLI for terminal natives.
**Delivers:** `shiplog-mcp` (3 MCP tools via stdio), `shiplog` CLI (summary, costs, card commands), npm-publishable package
**Addresses:** Dual interface requirement, bin entry correctness, stdout/stderr separation for MCP
**Avoids:** Single entry point anti-pattern, stdout corruption in MCP mode

### Phase 3: SVG Card Generation
**Rationale:** The differentiator. Template string SVG, dark/light themes, works locally first.
**Delivers:** `shiplog card --local` generates SVG file, card renderer shared between CLI and Worker
**Addresses:** Cross-platform SVG rendering (GitHub, Reddit, Discord), XML escaping, theme system
**Avoids:** SVG rendering inconsistency pitfall (basic elements only, inline styles, test matrix)

### Phase 4: Cloudflare Worker Card Endpoint
**Rationale:** Makes cards shareable. Requires SafeStats type locked in Phase 1, SVG renderer from Phase 3.
**Delivers:** `POST /api/sync` + `GET /api/card/:username`, KV double-layer caching, opt-in sync from CLI
**Addresses:** Edge caching, privacy boundary (SafeStats stripping), card freshness
**Avoids:** Privacy leak pitfall (explicit stripping at sync boundary)

### Phase 5: npm Publishing + Launch Prep
**Rationale:** Package must install cleanly, both bin entries must work, README must sell.
**Delivers:** Published npm package, MCP config snippet for copy-paste setup, README with card embed example
**Addresses:** npm publishing gotchas, dual bin entry verification, `npx` invocation
**Avoids:** Publishing pitfall (test with npm pack before publish)

### Phase Ordering Rationale

- Phase 1 → Phase 2: Engine must exist before either interface can consume it
- Phase 2 → Phase 3: CLI/MCP working first means card generation can be validated against real data
- Phase 3 → Phase 4: SVG renderer must work locally before deploying to Worker
- Phase 4 → Phase 5: All features must work before publishing to npm
- Phase 3 can partially overlap with Phase 4 once SafeStats type is locked

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** JSONL schema deep-dive — need to parse more sample files to catch edge cases
- **Phase 3:** SVG rendering on GitHub specifically — GitHub's camo proxy and SVG sanitizer have undocumented restrictions
- **Phase 4:** Cloudflare Worker auth strategy for /api/sync — API key vs signed token vs username-only

Phases with standard patterns (skip research-phase):
- **Phase 2:** MCP server + CLI setup — well-documented, verified patterns in STACK.md
- **Phase 5:** npm publishing — standard process, just needs verification testing

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | MCP SDK v1.28.0 verified from GitHub releases, all other deps verified |
| Features | HIGH | Competitor feature audit from official sources (ccusage, WakaTime, github-readme-stats) |
| Architecture | HIGH | MCP SDK API verified, JSONL schema inspected first-hand, CF Worker patterns from official docs |
| Pitfalls | HIGH | Derived from architecture research + known issues in comparable tools |

**Overall confidence:** HIGH

### Gaps to Address

- **npm name availability:** Check `npm show shiplog` before writing package.json — fallback: `@shiplog/cli`
- **Auth strategy for /api/sync:** API key generation, storage, rotation — needs decision in Phase 4 planning
- **Claude Code JSONL edge cases:** More sample files needed — different project types, error sessions, tool failures
- **Max plan users:** Can we detect flat-rate plan from JSONL? If not, cost display needs a disclaimer

## Sources

### Primary (HIGH confidence)
- MCP TypeScript SDK v1.28.0 official docs + releases
- Cloudflare KV, Workers, wrangler official docs
- First-hand JSONL file inspection on this machine
- ccusage official GitHub + docs
- github-readme-stats official GitHub

### Secondary (MEDIUM confidence)
- WakaTime features page
- Agent Stats app page
- Claude Code Usage Monitor GitHub
- workers-sdk GitHub issues (monorepo pnpm bug)

---
*Research completed: 2026-03-25*
*Ready for roadmap: yes*
