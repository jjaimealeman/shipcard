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
- [ ] **Phase 3: SVG Card** - Local card generation with dark/light themes
- [ ] **Phase 4: Cloud Worker** - Cloudflare Worker that serves and caches cards at the edge
- [ ] **Phase 5: Publish + Launch** - npm publishing, README, and launch readiness

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
**Plans**: TBD

Plans:
- [ ] 03-01: SVG template renderer with dark/light themes
- [ ] 03-02: GitHub rendering validation and XML escaping

### Phase 4: Cloud Worker
**Goal**: Users can sync stats to the cloud and share a publicly accessible card URL backed by edge caching
**Depends on**: Phase 3
**Requirements**: CLOUD-01, CLOUD-02, CLOUD-03, CLOUD-04, CLOUD-05
**Success Criteria** (what must be TRUE):
  1. `GET /api/card/:username` returns the correct SVG card for the user
  2. `POST /api/sync` accepts SafeStats payload with API key auth and updates the card
  3. KV-cached cards are served without re-rendering; sync invalidates the cache
  4. User can preview the exact data payload before first sync — no surprises about what reaches the cloud
  5. Raw JSONL paths, file content, and timestamps never appear in cloud storage
**Plans**: TBD

Plans:
- [ ] 04-01: Cloudflare Worker with GET card endpoint and KV caching
- [ ] 04-02: POST sync endpoint with API key auth and SafeStats privacy boundary
- [ ] 04-03: Opt-in sync flow in CLI with preview step

### Phase 5: Publish + Launch
**Goal**: Anyone can install ShipLog with one command and the README sells it
**Depends on**: Phase 4
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04
**Success Criteria** (what must be TRUE):
  1. `npm install -g shiplog` installs and both `shiplog` and `shiplog-mcp` bin entries work
  2. `npx shiplog summary` works without global install
  3. README contains a working card embed example, copy-paste MCP config, and CLI usage
**Plans**: TBD

Plans:
- [ ] 05-01: Package.json, tsup build, dual bin entries, npm publish
- [ ] 05-02: README with card embed, MCP config snippet, and CLI usage guide

## Progress

**Execution Order:**
Phases execute sequentially: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Parser + Engine | 3/3 | ✓ Complete | 2026-03-25 |
| 2. MCP + CLI | 3/3 | ✓ Complete | 2026-03-25 |
| 3. SVG Card | 0/2 | Not started | - |
| 4. Cloud Worker | 0/3 | Not started | - |
| 5. Publish + Launch | 0/2 | Not started | - |
