# ShipCard

## What This Is

ShipCard is the analytics platform for agentic developers. A local MCP server + CLI reads Claude Code JSONL files, computes cost and activity analytics, and generates embeddable SVG stats cards. A Cloudflare Worker serves cards at the edge, hosts an analytics dashboard, and powers a community leaderboard. Privacy-first — nothing leaves your machine unless you opt in.

## Core Value

Developers using Claude Code can see what they shipped and what it cost, and share verifiable proof via an embeddable card and analytics dashboard.

## Current State

**Version:** v1.1 shipped 2026-03-28
**Package:** `shipcard` on npm (MIT licensed)
**Codebase:** ~14,396 LOC TypeScript/HTML/JSON
**Stack:** Node.js/TypeScript local tool + Cloudflare Worker + KV

**What shipped in v1.0:**
- Streaming JSONL parser with resilient deduplication
- CLI: `shipcard summary`, `costs`, `card`, `login`, `sync`
- MCP server: `shipcard:summary`, `shipcard:costs`, `shipcard:card`
- SVG card renderer: 3 layouts (classic, compact, hero) x 3 styles x 2 themes
- Cloudflare Worker: card serving, OAuth login, v1+v2 sync, JSON API
- Analytics dashboard: 9 chart panels with Alpine.js + Chart.js
- Community: homepage teaser, /community leaderboard, cards-served counter
- Landing page at shipcard.dev with live card configurator

**What shipped in v1.1:**
- Today's Activity hero (4 metrics with % change vs yesterday, calendar day boundaries)
- Peak Days cards (4 per-metric all-time records with date and project name)
- Project Activity sort toggle (messages, tokens, sessions, cost)
- Per-project stats in sync payload (tokens, sessions, cost per project per day)
- Dashboard section reorder (static sections first, range-reactive below)

## Requirements

### Validated

- ✓ Local MCP server reads Claude Code JSONL files and exposes analytics tools — v1.0
- ✓ CLI mirrors MCP tools for terminal-native users — v1.0
- ✓ `shipcard:summary` — sessions, tool calls, models used, projects, estimated cost — v1.0
- ✓ `shipcard:costs` — cost breakdown by project, model, and time period — v1.0
- ✓ `shipcard:card` — generate shareable SVG stats card — v1.0
- ✓ Cloudflare Worker serves SVG cards at `/u/:username` — v1.0
- ✓ KV-cached cards at edge, invalidated on sync — v1.0
- ✓ Dark and light card themes — v1.0
- ✓ Opt-in cloud sync — user chooses what stats to share — v1.0
- ✓ Privacy-first: no raw JSONL upload, only aggregated user-approved stats — v1.0
- ✓ Zero external deps beyond MCP SDK — v1.0
- ✓ Published to npm as `shipcard` — v1.0
- ✓ Today's Activity hero — 4 metrics with individual % vs yesterday — v1.1
- ✓ Peak Day cards — 4 per-metric all-time records with date and project — v1.1
- ✓ Project Activity toggles — sort by messages, tokens, sessions, or cost — v1.1
- ✓ Per-project stats in sync payload — tokens, sessions, cost per project per day — v1.1
- ✓ Neutral direction indicators for % change (orange/blue, not red/green) — v1.1

### Active

(None — planning next milestone)

### Deferred (post-adoption)

- Additional card themes (tokyonight, dracula, synthwave, etc.)
- Custom color parameters via URL query string
- Support Codex CLI JSONL format
- Support Gemini CLI log format
- Burn rate predictor (estimated cost remaining in billing window)
- Natural language date parsing (--since yesterday)
- Team dashboards with cost allocation
- Per-chart export buttons (PNG/JSON/SVG) — v3

### Out of Scope

- Persistent background daemon — trust killer for privacy-focused tool
- Telemetry without explicit opt-in — destroys trust instantly
- Real-time editor plugin (WakaTime-style) — Claude Code already writes JSONL
- Session replay or detailed tool-call timelines — too complex, low ROI
- Mobile or native desktop app — web/terminal only
- Payment processing — post-validation

## Context

- Claude Code JSONL files live at `~/.claude/projects/` — parser handles schema changes gracefully
- ccusage (12K GitHub stars) validates demand for local Claude Code analytics
- github-readme-stats (67K stars) validates embeddable card mechanic
- Cloudflare Workers + KV eliminates rate-limit/cold-start problems that plague Vercel-based alternatives
- Target users: solo devs on metered Claude plans ($100-300/mo) + vibe coders who want proof-of-shipping
- Alpha success metric: 500 GitHub stars, 1K npm downloads, 200 cards generated in first month
- Reddit (r/vibecoding, r/ClaudeCode, r/ClaudeAI) is the launch channel

## Constraints

- **Tech stack**: Node.js/TypeScript for local tool, Cloudflare Worker + KV for cloud — matches existing expertise
- **Distribution**: Must be npm-installable with copy-paste MCP config — friction kills adoption
- **Privacy**: MIT licensed, local-first, opt-in cloud. Non-negotiable — biggest adoption blocker if violated
- **Naming**: Package is `shipcard` (shiplog was taken on npm)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dual MCP + CLI interface | Covers IDE users and terminal natives | ✓ Good — both interfaces used |
| Cloudflare Workers over Vercel | Avoids rate-limit problems | ✓ Good — zero cold starts |
| 3 MCP tools (not 7) | Ship the wedge, not the platform | ✓ Good — focused surface |
| npm name `shipcard` | `shiplog` taken on registry | ✓ Good — clean branding |
| SVG renderer copied into Worker | No cross-package import complexity | ✓ Good — independent deploys |
| Alpine.js + Chart.js for dashboard | No build step, CDN-loaded | ✓ Good — fast iteration |
| Two-layer privacy validation | CLI strips + Worker rejects banned fields | ✓ Good — defense in depth |
| Phase 1 then Phase 2 sequential | Local tool must work before card has data | ✓ Good — natural dependency |

| v1.1 dashboard on feature branch | v2.0 reserved for monetized tier | ✓ Good — shipped and merged |
| Chart update in-place (not destroy/recreate) | Canvas context breaks on destroy/recreate cycle | ✓ Good — all 4 sort metrics work |
| Dashboard section reorder | Static sections first, range-reactive below | ✓ Good — better UX hierarchy |

---
*Last updated: 2026-03-28 after v1.1 milestone*
