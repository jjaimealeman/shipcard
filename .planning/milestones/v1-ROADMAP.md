# Milestone v1.0: ShipCard MVP

**Status:** SHIPPED 2026-03-27
**Phases:** 1-12
**Total Plans:** 29

## Overview

ShipLog ships in five sequential phases: a resilient JSONL parser and analytics engine first (everything depends on it), then dual MCP + CLI interfaces on top of that engine, then the differentiating SVG card renderer, then the Cloudflare Worker that makes cards shareable at the edge, and finally npm publishing and launch prep. Each phase delivers a coherent, verifiable capability before the next one begins.

Post-launch phases (6-12) added card param wiring, auth verification, landing page, time-series extraction, Worker v2 API, dashboard MVP, and polish + community features.

## Phases

### Phase 1: Parser + Engine
**Goal**: Developers can run the engine against real JSONL files and get accurate, resilient analytics output
**Depends on**: Nothing (first phase)
**Requirements**: PARSE-01–07, ANLYT-01–06
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffolding, JSONL types, streaming parser with two-level deduplication
- [x] 01-02-PLAN.md — Analytics engine: aggregator, LiteLLM pricing with 3-layer cache, cost estimation
- [x] 01-03-PLAN.md — Date filtering, public API entry point, integration test against real data

### Phase 2: MCP + CLI
**Goal**: Both terminal users and Claude Code IDE users can query their stats through their preferred interface
**Depends on**: Phase 1
**Requirements**: CLI-01–06, MCP-01–05
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — CLI foundation (args, config, format) + entry point with summary, costs, and card commands
- [x] 02-02-PLAN.md — MCP server with three tools (summary, costs, card) via stdio transport
- [x] 02-03-PLAN.md — Bin entries, build script with chmod, npx invocation, and MCP config documentation

### Phase 3: SVG Card
**Goal**: Users can generate a stats card locally that renders correctly on GitHub READMEs and other platforms
**Depends on**: Phase 2
**Requirements**: CARD-01–05
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Card rendering engine: XML escape, number formatting, theme system (3 styles x dark/light), three layouts (classic, compact, hero), renderCard() public API
- [x] 03-02-PLAN.md — CLI integration: git root detection, browser preview, new card flags, card command upgrade

### Phase 4: Cloud Worker
**Goal**: Users can sync stats to the cloud and share a publicly accessible card URL backed by edge caching
**Depends on**: Phase 3
**Requirements**: CLOUD-01–05
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Worker scaffold, SVG renderer copy, KV cache layer, GET /card/:username with anti-camo headers
- [x] 04-02-PLAN.md — Auth middleware, token exchange endpoint, POST /sync with SafeStats validation and cache invalidation
- [x] 04-03-PLAN.md — CLI login/sync commands, SafeStats conversion, browser configurator page

### Phase 5: Publish + Launch
**Goal**: Anyone can `npm install -g shipcard` and the README sells the product in 30 seconds
**Depends on**: Phase 4
**Requirements**: PUB-01–04
**Plans**: 4 plans

Plans:
- [x] 05-01-PLAN.md — Full codebase rename from shiplog to shipcard + Worker route change to /u/:username + custom domain config
- [x] 05-02-PLAN.md — Build verification, npm pack dry run, MIT LICENSE file
- [x] 05-03-PLAN.md — README with live card embed, MCP config snippet, CLI overview + USAGE.md + STYLES.md
- [x] 05-04-PLAN.md — Dry run publish chain, Worker deploy, npm publish (human checkpoint)

### Phase 6: Worker Card Params
**Goal**: Cloud-served cards respect the same customization params as local cards
**Depends on**: Phase 4
**Plans**: 1 plan

Plans:
- [x] 06-01-PLAN.md — Wire hide query param in Worker card route, call renderRedactedCard on sync delete

### Phase 7: Auth Verify + Docs
**Goal**: OAuth login works end-to-end and npx CLI usage is discoverable without global install
**Depends on**: Phase 5
**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md — Rename package to unscoped shipcard, update all docs, verify OAuth device flow end-to-end

### Phase 8: Landing Page
**Goal**: shipcard.dev root serves a polished landing page that sells the product in 30 seconds
**Depends on**: Phase 7
**Plans**: 1 plan

Plans:
- [x] 08-01-PLAN.md — Complete landing page: self-hosted fonts, HTML/CSS/JS page with configurator, index.ts wiring

### Phase 9: CLI Time-Series Extraction
**Goal**: CLI computes daily aggregates from JSONL files and sends them alongside SafeStats via a v2 sync endpoint
**Depends on**: Phase 8
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md — Parser enhancement (thinkingBlocks, userMessages) + daily aggregation engine
- [x] 09-02-PLAN.md — SafeTimeSeries privacy envelope, --show-projects flag, v2 sync with 404 fallback

### Phase 10: Worker v2 Sync + JSON API
**Goal**: Worker accepts time-series data, stores it in KV, and serves JSON API endpoints for the dashboard
**Depends on**: Phase 9
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md — SafeTimeSeries types, KV helpers, POST /sync/v2 route, updated DELETE cleanup
- [x] 10-02-PLAN.md — Public JSON API routes (GET /api/stats + /api/timeseries) with CORS

### Phase 11: Dashboard MVP
**Goal**: Full analytics dashboard at /u/:username/dashboard with 9 chart panels using Alpine.js + Chart.js
**Depends on**: Phase 10
**Plans**: 3 plans

Plans:
- [x] 11-01-PLAN.md — Dashboard skeleton: route, Alpine.js state, data fetching, sticky filter bar, skeleton loading, hero stats
- [x] 11-02-PLAN.md — Chart.js visualizations: activity overview, daily cost, day-of-week, tool/model/message donuts
- [x] 11-03-PLAN.md — Calendar heatmap, project activity bars, grid layout polish, visual checkpoint

### Phase 12: Polish + Community
**Goal**: Production-ready dashboard with mobile layout, community visibility, and SVG promo footer as growth engine
**Depends on**: Phase 11
**Plans**: 4 plans

Plans:
- [x] 12-01-PLAN.md — SVG promo footer ("Get yours at shipcard.dev") + dashboard empty/error states
- [x] 12-02-PLAN.md — Mobile responsive dashboard CSS + heatmap mobile day cap
- [x] 12-03-PLAN.md — KV metadata on sync + community helper functions + cards-served counter
- [x] 12-04-PLAN.md — Homepage community teaser + /community leaderboard page

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
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

---

## Milestone Summary

**Key Decisions:**
- Node16 module resolution for local tool, Bundler for Worker
- SVG renderer copied into Worker (no cross-package import)
- Opaque UUID bearer tokens, GitHub API verification
- Privacy: two-layer validation (CLI strips + Worker rejects banned fields)
- Alpine.js + Chart.js for dashboard (no build step)
- npm package name "shipcard" (shiplog was taken)
- Cloudflare Workers + KV over Vercel (avoids rate limits)

**Issues Resolved:**
- MCP card tool upgraded from JSON stub to full SVG via renderCard()
- deleteToken() orphaned export removed
- REQUIREMENTS.md route path corrected to /u/:username
- Alpine store.init() → store.load() rename to prevent auto-call race
- cal-heatmap replaced with custom SVG heatmap (dependency issues)

**Technical Debt Carried:**
- Placeholder OAuth client ID in login.ts (needs real GitHub OAuth App)
- Placeholder KV namespace IDs in wrangler.jsonc (needs real Cloudflare KV)
- userMessages per day hardcoded to 0 in dailyAggregator.ts
- Phase 5 missing formal VERIFICATION.md
- Configurator panel selection for dashboard deferred

---

_For current project status, see .planning/ROADMAP.md_
