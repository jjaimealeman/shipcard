# Requirements: ShipLog

**Defined:** 2026-03-25
**Core Value:** Developers using Claude Code can see what they shipped and what it cost, and share verifiable proof via an embeddable card.

## v1 Requirements

### Parser

- [ ] **PARSE-01**: Tool reads all JSONL files from `~/.claude/projects/**/*.jsonl` via streaming parser
- [ ] **PARSE-02**: Parser extracts token counts (input, output, cache_creation, cache_read) from assistant messages
- [ ] **PARSE-03**: Parser identifies model used per message (e.g., claude-opus-4-6, claude-sonnet-4-6)
- [ ] **PARSE-04**: Parser groups messages by sessionId into discrete sessions
- [ ] **PARSE-05**: Parser handles unknown/changed JSONL fields gracefully without crashing
- [ ] **PARSE-06**: Parser extracts tool_use blocks from assistant message content for tool call counting
- [ ] **PARSE-07**: Parser derives project context from cwd field in messages

### Analytics

- [ ] **ANLYT-01**: Engine computes estimated cost per session/project/model using versioned pricing table
- [ ] **ANLYT-02**: Engine supports date range filtering (--since / --until)
- [ ] **ANLYT-03**: Engine counts tool calls per session and project
- [ ] **ANLYT-04**: Engine produces JSON-serializable output for --json flag
- [ ] **ANLYT-05**: Cost displayed as approximate ("~$127 estimated") with pricing version visible
- [ ] **ANLYT-06**: Engine computes summary stats: total sessions, total tokens, models used, projects touched

### CLI

- [ ] **CLI-01**: `shiplog summary` displays overview stats as formatted terminal table
- [ ] **CLI-02**: `shiplog costs` displays cost breakdown by project, model, and time period
- [ ] **CLI-03**: `shiplog card` generates SVG card locally (--local) or syncs to cloud for shareable URL
- [ ] **CLI-04**: `--json` flag outputs machine-readable JSON for all commands
- [ ] **CLI-05**: `--since` and `--until` flags filter by date range for all commands
- [ ] **CLI-06**: Package installable via `npx shiplog` with zero configuration

### MCP Server

- [ ] **MCP-01**: `shiplog:summary` tool returns sessions, tool calls, models, projects, and estimated cost
- [ ] **MCP-02**: `shiplog:costs` tool returns cost breakdown by project, model, and time period
- [ ] **MCP-03**: `shiplog:card` tool generates card data or triggers sync
- [ ] **MCP-04**: MCP server runs via stdio transport with zero stdout pollution (all logging to stderr)
- [ ] **MCP-05**: Copy-paste MCP config for Claude Code / Cursor setup documented in README

### Card

- [ ] **CARD-01**: SVG stats card displays sessions, tool calls, models used, projects, and estimated cost
- [ ] **CARD-02**: Dark and light theme variants
- [ ] **CARD-03**: Card renders correctly on GitHub README (survives camo proxy + SVG sanitizer)
- [ ] **CARD-04**: Card uses basic SVG elements only (rect, text, g, svg, line) with inline styles
- [ ] **CARD-05**: All user-controlled text is XML-escaped to prevent injection

### Cloud

- [ ] **CLOUD-01**: Cloudflare Worker serves SVG card at `GET /api/card/:username`
- [ ] **CLOUD-02**: Worker accepts aggregated stats via `POST /api/sync` with API key auth
- [ ] **CLOUD-03**: KV caches rendered SVG cards with 1-hour TTL, invalidated on sync
- [ ] **CLOUD-04**: Only SafeStats (numeric aggregates + username) reach the cloud — no paths, content, or timestamps
- [ ] **CLOUD-05**: User can preview exact data payload before first sync

### Publishing

- [ ] **PUB-01**: Package published to npm with dual bin entries (shiplog CLI + shiplog-mcp)
- [ ] **PUB-02**: Both bin entries work after `npm install -g`
- [ ] **PUB-03**: MIT license
- [ ] **PUB-04**: README with card embed example, MCP config snippet, and CLI usage

## v2 Requirements

### Enhanced Analytics

- **ANLYT-V2-01**: Burn rate predictor (estimated cost remaining in billing window)
- **ANLYT-V2-02**: Cost anomaly detection (unusual spend alerts)
- **ANLYT-V2-03**: Natural language date parsing (--since yesterday, --since "last monday")
- **ANLYT-V2-04**: Annual/period "wrapped" report

### Multi-Agent

- **MULTI-01**: Support Codex CLI JSONL format
- **MULTI-02**: Support Gemini CLI log format
- **MULTI-03**: Auto-detect agent type from file format

### Card Enhancements

- **CARD-V2-01**: Additional themes (tokyonight, dracula, synthwave, etc.)
- **CARD-V2-02**: Custom color parameters via URL query string
- **CARD-V2-03**: Multiple card layouts (compact, full, badge)

### Community

- **COMM-01**: Public profile pages on shiplog.dev
- **COMM-02**: Leaderboards (opt-in)
- **COMM-03**: Team dashboards with cost allocation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Source code upload or file content tracking | Privacy-first — only JSONL metadata, never project files |
| Persistent background daemon | Trust killer for privacy-focused tool |
| Telemetry without explicit opt-in | Destroys trust instantly |
| Real-time editor plugin (WakaTime-style) | Claude Code already writes JSONL — don't add another layer |
| Gamification / competitive leaderboards | Mismatches solo dev target user at v1 |
| Team dashboards | Multi-user model adds complexity without v1 validation |
| Payment processing | Post-alpha, after cards prove demand |
| Mobile app | Web/terminal only for alpha |
| Session replay / tool-call timelines | Too complex for alpha scope |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PARSE-01 | Phase 1 | Pending |
| PARSE-02 | Phase 1 | Pending |
| PARSE-03 | Phase 1 | Pending |
| PARSE-04 | Phase 1 | Pending |
| PARSE-05 | Phase 1 | Pending |
| PARSE-06 | Phase 1 | Pending |
| PARSE-07 | Phase 1 | Pending |
| ANLYT-01 | Phase 1 | Pending |
| ANLYT-02 | Phase 1 | Pending |
| ANLYT-03 | Phase 1 | Pending |
| ANLYT-04 | Phase 1 | Pending |
| ANLYT-05 | Phase 1 | Pending |
| ANLYT-06 | Phase 1 | Pending |
| CLI-01 | Phase 2 | Pending |
| CLI-02 | Phase 2 | Pending |
| CLI-03 | Phase 2 | Pending |
| CLI-04 | Phase 2 | Pending |
| CLI-05 | Phase 2 | Pending |
| CLI-06 | Phase 2 | Pending |
| MCP-01 | Phase 2 | Pending |
| MCP-02 | Phase 2 | Pending |
| MCP-03 | Phase 2 | Pending |
| MCP-04 | Phase 2 | Pending |
| MCP-05 | Phase 2 | Pending |
| CARD-01 | Phase 3 | Pending |
| CARD-02 | Phase 3 | Pending |
| CARD-03 | Phase 3 | Pending |
| CARD-04 | Phase 3 | Pending |
| CARD-05 | Phase 3 | Pending |
| CLOUD-01 | Phase 4 | Pending |
| CLOUD-02 | Phase 4 | Pending |
| CLOUD-03 | Phase 4 | Pending |
| CLOUD-04 | Phase 4 | Pending |
| CLOUD-05 | Phase 4 | Pending |
| PUB-01 | Phase 5 | Pending |
| PUB-02 | Phase 5 | Pending |
| PUB-03 | Phase 5 | Pending |
| PUB-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after initial definition*
