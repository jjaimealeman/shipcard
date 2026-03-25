# ShipLog

## What This Is

ShipLog is the analytics layer for agentic developers. A local MCP server + CLI that reads Claude Code JSONL files and tells you what you shipped, what it cost, and lets you prove it with an embeddable SVG stats card served from Cloudflare Workers. Privacy-first — nothing leaves your machine unless you opt in.

## Core Value

Developers using Claude Code can see what they shipped and what it cost, and share verifiable proof via an embeddable card.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Local MCP server reads Claude Code JSONL files and exposes analytics tools
- [ ] CLI mirrors MCP tools for terminal-native users (`shiplog summary`, `shiplog costs`, `shiplog card`)
- [ ] `shiplog:summary` — sessions, tool calls, models used, projects, estimated cost
- [ ] `shiplog:costs` — cost breakdown by project, model, and time period
- [ ] `shiplog:card` — generate shareable SVG stats card
- [ ] Cloudflare Worker serves SVG cards at `/api/card/:username`
- [ ] KV-cached cards at edge with configurable TTL
- [ ] Dark and light card themes
- [ ] Opt-in cloud sync — user chooses what stats to share
- [ ] Privacy-first: no raw JSONL upload, only aggregated user-approved stats
- [ ] Zero external deps beyond MCP SDK
- [ ] Published to npm

### Out of Scope

- Leaderboards, trends, community dashboards — only after cards prove demand
- Team dashboards or seat-based billing — post-alpha
- Payment processing — post-alpha
- Support for non-Claude-Code agents (Codex CLI, Gemini CLI, Pi) — post-alpha
- Mobile or native desktop app — web/terminal only
- Session replay or detailed tool-call timelines — too complex for alpha
- OAuth/social login — API key sufficient for alpha

## Context

- Claude Code JSONL files live at `~/.claude/projects/` — schema stability unknown, needs resilient parser
- ccusage (12K GitHub stars) validates demand for local Claude Code analytics
- github-readme-stats (67K stars) validates embeddable card mechanic but suffers Vercel rate limits
- Cloudflare Workers + KV eliminates the rate-limit/cold-start problems
- Target users: solo devs on metered Claude plans ($100-300/mo) + vibe coders who want proof-of-shipping
- Alpha success metric: 500 GitHub stars, 1K npm downloads, 200 cards generated in first month
- Reddit (r/vibecoding, r/ClaudeCode, r/ClaudeAI) is the launch channel

## Constraints

- **Tech stack**: Node.js/TypeScript for local tool, Cloudflare Worker + KV for card endpoint — matches user's existing expertise
- **Distribution**: Must be npm-installable with copy-paste MCP config — friction kills adoption
- **Privacy**: MIT licensed, local-first, opt-in cloud. Non-negotiable — biggest adoption blocker if violated
- **Scope**: 3 MCP tools + 3 CLI commands + 1 card endpoint. No more for alpha.
- **Timeline**: Ship in 2-3 weeks. Reddit post IS the validation.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dual MCP + CLI interface | Covers IDE users and terminal natives — full spectrum | — Pending |
| Cloudflare Workers over Vercel | Avoids github-readme-stats rate-limit problems | — Pending |
| 3 MCP tools (not 7) | Ship the wedge, not the platform | — Pending |
| Alpha = local tool + card together | Card without data is useless, tool without card is a utility | — Pending |
| Phase 1 then Phase 2 sequential | Local tool must work before card has data | — Pending |

---
*Last updated: 2026-03-25 after initialization*
