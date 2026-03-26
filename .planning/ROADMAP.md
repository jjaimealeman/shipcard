# Roadmap: ShipLog

## Overview

ShipLog ships in five sequential phases: a resilient JSONL parser and analytics engine first (everything depends on it), then dual MCP + CLI interfaces on top of that engine, then the differentiating SVG card renderer, then the Cloudflare Worker that makes cards shareable at the edge, and finally npm publishing and launch prep. Each phase delivers a coherent, verifiable capability before the next one begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Parser + Engine** - JSONL parser and analytics engine — the foundation everything else builds on
- [x] **Phase 2: MCP + CLI** - Dual interfaces (MCP server + CLI) consuming the engine
- [x] **Phase 3: SVG Card** - Local card generation with dark/light themes
- [x] **Phase 4: Cloud Worker** - Cloudflare Worker that serves and caches cards at the edge
- [x] **Phase 5: Publish + Launch** - npm publishing, README, and launch readiness
- [x] **Phase 6: Worker Card Params** - Wire hide param and redacted card in Worker
- [x] **Phase 7: Auth Verify + Docs** - Test OAuth device flow, document npx CLI usage
- [x] **Phase 8: Landing Page** - Polished homepage for shipcard.dev (replacing JSON health check)

## Phase Details

### Phase 1: Parser + Engine
**Goal**: Developers can run the engine against real JSONL files and get accurate, resilient analytics output
**Depends on**: Nothing (first phase)
**Requirements**: PARSE-01, PARSE-02, PARSE-03, PARSE-04, PARSE-05, PARSE-06, PARSE-07, ANLYT-01, ANLYT-02, ANLYT-03, ANLYT-04, ANLYT-05, ANLYT-06
**Success Criteria** (what must be TRUE):
  1. Engine reads all JSONL files from `~/.claude/projects/` and produces typed session data without crashing on unknown fields
  2. Output includes accurate session count, total tokens (input/output/cache), models used, tool call counts, and projects derived from cwd
  3. Cost display shows estimated cost per project and model with explicit "~estimated" label and pricing version
  4. Date range filtering with `--since` / `--until` narrows results to the specified window
  5. Engine serializes all output to JSON when requested
**Plans:** 3 plans in 3 waves (sequential — each builds on the previous)

Plans:
- [x] 01-01-PLAN.md — Project scaffolding, JSONL types, streaming parser with two-level deduplication
- [x] 01-02-PLAN.md — Analytics engine: aggregator, LiteLLM pricing with 3-layer cache, cost estimation
- [x] 01-03-PLAN.md — Date filtering, public API entry point, integration test against real data

### Phase 2: MCP + CLI
**Goal**: Both terminal users and Claude Code IDE users can query their stats through their preferred interface
**Depends on**: Phase 1
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, CLI-06, MCP-01, MCP-02, MCP-03, MCP-04, MCP-05
**Success Criteria** (what must be TRUE):
  1. `shiplog summary` and `shiplog costs` display formatted tables in the terminal with correct data
  2. `--json`, `--since`, and `--until` flags work consistently across all CLI commands
  3. `npx shiplog` runs without installation and without configuration
  4. MCP server responds to `shiplog:summary`, `shiplog:costs`, and `shiplog:card` tool calls with correct data
  5. MCP server produces zero stdout output (all logging to stderr), preventing corruption of the stdio transport
**Plans:** 3 plans in 2 waves (02-01 + 02-02 parallel, then 02-03)

Plans:
- [x] 02-01-PLAN.md — CLI foundation (args, config, format) + entry point with summary, costs, and card commands
- [x] 02-02-PLAN.md — MCP server with three tools (summary, costs, card) via stdio transport
- [x] 02-03-PLAN.md — Bin entries, build script with chmod, npx invocation, and MCP config documentation

### Phase 3: SVG Card
**Goal**: Users can generate a stats card locally that renders correctly on GitHub READMEs and other platforms
**Depends on**: Phase 2
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04, CARD-05
**Success Criteria** (what must be TRUE):
  1. `shiplog card --local` produces an SVG file displaying sessions, tool calls, models, projects, and estimated cost
  2. Dark and light theme variants both render correctly
  3. Card survives GitHub's camo proxy and SVG sanitizer (basic elements only, inline styles, no scripts)
  4. All user-controlled text is XML-escaped — injected angle brackets or ampersands appear as literals
**Plans:** 2 plans in 2 waves (03-01 first, then 03-02)

Plans:
- [x] 03-01-PLAN.md — Card rendering engine: XML escape, number formatting, theme system (3 styles x dark/light), three layouts (classic, compact, hero), renderCard() public API
- [x] 03-02-PLAN.md — CLI integration: git root detection, browser preview, new card flags (--layout, --style, --theme, --hide, --hero-stat, --preview, -o), card command upgrade, help text update

### Phase 4: Cloud Worker
**Goal**: Users can sync stats to the cloud and share a publicly accessible card URL backed by edge caching
**Depends on**: Phase 3
**Requirements**: CLOUD-01, CLOUD-02, CLOUD-03, CLOUD-04, CLOUD-05
**Success Criteria** (what must be TRUE):
  1. `GET /card/:username` returns the correct SVG card for the user
  2. `POST /sync` accepts SafeStats payload with bearer token auth and updates the card
  3. KV-cached cards are served without re-rendering; sync invalidates the cache
  4. User can preview the exact data payload before first sync — no surprises about what reaches the cloud
  5. Raw JSONL paths, file content, and timestamps never appear in cloud storage
**Plans:** 3 plans in 3 waves (sequential — each builds on the previous)

Plans:
- [x] 04-01-PLAN.md — Worker scaffold, SVG renderer copy, KV cache layer, GET /card/:username with anti-camo headers
- [x] 04-02-PLAN.md — Auth middleware, token exchange endpoint, POST /sync with SafeStats validation and cache invalidation
- [x] 04-03-PLAN.md — CLI login/sync commands, SafeStats conversion, browser configurator page

### Phase 5: Publish + Launch
**Goal**: Anyone can `npm install -g shipcard` and the README sells the product in 30 seconds
**Depends on**: Phase 4
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04
**Success Criteria** (what must be TRUE):
  1. `npm install -g shipcard` installs and both `shipcard` and `shipcard-mcp` bin entries work
  2. `npx shipcard summary` works without global install
  3. README contains a working card embed example, copy-paste MCP config, and CLI usage
**Plans:** 4 plans in 3 waves (05-01 first, then 05-02 + 05-03 parallel, then 05-04)

Plans:
- [x] 05-01-PLAN.md — Full codebase rename from shiplog to shipcard + Worker route change to /u/:username + custom domain config
- [x] 05-02-PLAN.md — Build verification, npm pack dry run, MIT LICENSE file
- [x] 05-03-PLAN.md — README with live card embed, MCP config snippet, CLI overview + USAGE.md + STYLES.md
- [x] 05-04-PLAN.md — Dry run publish chain, Worker deploy, npm publish (human checkpoint)

### Phase 6: Worker Card Params
**Goal**: Cloud-served cards respect the same customization params as local cards — hide and redacted card on delete
**Depends on**: Phase 4
**Requirements**: CLOUD-01 (enhancement)
**Gap Closure**: Closes integration gaps + cloud card flow from v1 audit
**Success Criteria** (what must be TRUE):
  1. `GET /u/:username?hide=cost` returns an SVG card with the cost stat hidden
  2. `DELETE /sync` renders a redacted card via `renderRedactedCard()` instead of generic placeholder
  3. `renderRedactedCard()` is no longer an orphaned export
**Plans:** 1 plan in 1 wave

Plans:
- [x] 06-01-PLAN.md — Wire hide query param in Worker card route, call renderRedactedCard on sync delete

### Phase 7: Auth Verify + Docs
**Goal**: OAuth login works end-to-end and npx CLI usage is discoverable without global install
**Depends on**: Phase 5
**Requirements**: PUB-02 (completion), PUB-04 (enhancement)
**Gap Closure**: Closes PUB-02 partial + documentation gap from v1 audit
**Success Criteria** (what must be TRUE):
  1. `shipcard login` completes GitHub device flow successfully (or client ID is fixed)
  2. README and USAGE.md document `npx shipcard <command>` usage (unscoped package name)
**Plans:** 1 plan in 1 wave

Plans:
- [x] 07-01-PLAN.md — Rename package to unscoped shipcard, update all docs, verify OAuth device flow end-to-end

### Phase 8: Landing Page
**Goal**: shipcard.dev root serves a polished landing page that sells the product in 30 seconds
**Depends on**: Phase 7
**Requirements**: TBD (user gathering inspiration)
**Success Criteria** (what must be TRUE):
  1. `GET /` on shipcard.dev serves an HTML landing page (not JSON health check)
  2. Page includes live card demo, quick-start instructions, and value proposition
**Plans:** 1 plan in 1 wave (single vertical slice)

Plans:
- [x] 08-01-PLAN.md — Complete landing page: self-hosted fonts, HTML/CSS/JS page with configurator, index.ts wiring

## Progress

**Execution Order:**
Phases execute sequentially: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Parser + Engine | 3/3 | ✓ Complete | 2026-03-25 |
| 2. MCP + CLI | 3/3 | ✓ Complete | 2026-03-25 |
| 3. SVG Card | 2/2 | ✓ Complete | 2026-03-25 |
| 4. Cloud Worker | 3/3 | ✓ Complete | 2026-03-25 |
| 5. Publish + Launch | 4/4 | ✓ Complete | 2026-03-26 |
| 6. Worker Card Params | 1/1 | ✓ Complete | 2026-03-26 |
| 7. Auth Verify + Docs | 1/1 | ✓ Complete | 2026-03-26 |
| 8. Landing Page | 1/1 | ✓ Complete | 2026-03-26 |
