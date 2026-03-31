# ShipCard

## What This Is

ShipCard is the analytics platform for agentic developers. A local MCP server + CLI reads Claude Code JSONL files, computes cost and activity analytics, and generates embeddable SVG stats cards. A Cloudflare Worker serves themed cards at the edge, hosts an analytics dashboard with AI-powered insights, and powers a community leaderboard. PRO subscribers get custom themes, URL slugs, and weekly coding insights. Privacy-first — nothing leaves your machine unless you opt in.

## Core Value

Developers using Claude Code can see what they shipped and what it cost, and share verifiable proof via an embeddable card and analytics dashboard.

## Current State

**Version:** v2.0 shipped 2026-03-29
**Package:** `shipcard` on npm (MIT licensed)
**Codebase:** ~19,714 LOC TypeScript/HTML/JSON
**Stack:** Node.js/TypeScript local tool + Cloudflare Worker + D1 + KV

**What shipped in v2.0:**
- Agent-agnostic SourceAdapter architecture (ClaudeCodeAdapter, extensible registry)
- 9 curated card themes (Catppuccin, Dracula, Tokyo Night, Nord, Gruvbox, Solarized Dark/Light, One Dark, Monokai)
- BYOT custom colors for PRO users with WCAG 3:1 contrast validation
- Stripe subscriptions ($2/mo or $20/yr) with D1 strong consistency
- GitHub OAuth checkout flow (no Bearer tokens in browser)
- PRO badge on SVG cards, custom URL slugs with saved configs
- AI-powered weekly insights (peak hours, cost trends, streaks) via Workers AI
- Polished Clack CLI with TTY-guarded interactive prompts
- Dashboard theme configurator, billing UI, slug management, insights panel

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
- ✓ 9 curated card themes with URL param selection — v2.0
- ✓ BYOT custom colors with WCAG 3:1 contrast validation (PRO) — v2.0
- ✓ Theme preview in dashboard card configurator — v2.0
- ✓ Stripe PRO subscriptions ($2/mo, $20/yr) with D1 strong consistency — v2.0
- ✓ Webhook lifecycle handling (create, update, cancel, payment failure) — v2.0
- ✓ Customer Portal for subscription management — v2.0
- ✓ Upgrade prompts at PRO feature touchpoints — v2.0
- ✓ PRO badge on SVG cards — v2.0
- ✓ Custom URL slugs with saved card configs (PRO) — v2.0
- ✓ Instant cache refresh on PRO sync — v2.0
- ✓ AI weekly insights (peak hours, cost trends, streaks) — v2.0
- ✓ Insights pre-computed at sync time via Workers AI — v2.0
- ✓ Clack CLI with TTY-guarded interactive prompts — v2.0
- ✓ SourceAdapter interface with ClaudeCodeAdapter — v2.0

### Active

(No active requirements — next milestone TBD)

### Deferred (future milestones)

- BYOT saved presets (named theme configs stored per user)
- Support Codex CLI JSONL format
- Support Gemini CLI log format
- Team dashboards with cost allocation (`/t/:team-slug/dashboard`, $5/mo)
- Burn rate predictor (estimated cost remaining in billing window)
- Natural language date parsing (--since yesterday)
- Per-chart export buttons (PNG/JSON/SVG)
- Weekly email digest of AI insights

### Out of Scope

- Persistent background daemon — trust killer for privacy-focused tool
- Telemetry without explicit opt-in — destroys trust instantly
- Real-time editor plugin (WakaTime-style) — Claude Code already writes JSONL
- Session replay or detailed tool-call timelines — too complex, low ROI
- Mobile or native desktop app — web/terminal only
- Multi-agent JSONL parsing — wait for community demand before investing
- Monthly $1 pricing — Stripe fees destroy 33% margin

## Context

- Claude Code JSONL files live at `~/.claude/projects/` — parser handles schema changes gracefully
- ccusage (12K GitHub stars) validates demand for local Claude Code analytics
- github-readme-stats (67K stars) validates embeddable card mechanic
- Cloudflare Workers + KV + D1 eliminates rate-limit/cold-start problems that plague Vercel-based alternatives
- Target users: solo devs on metered Claude plans ($100-300/mo) + vibe coders who want proof-of-shipping
- Alpha success metric: 500 GitHub stars, 1K npm downloads, 200 cards generated in first month
- Reddit (r/vibecoding, r/ClaudeCode, r/ClaudeAI) is the launch channel

## Constraints

- **Tech stack**: Node.js/TypeScript for local tool, Cloudflare Worker + D1 + KV for cloud — matches existing expertise
- **Distribution**: Must be npm-installable with copy-paste MCP config — friction kills adoption
- **Privacy**: MIT licensed, local-first, opt-in cloud. Non-negotiable — biggest adoption blocker if violated
- **Naming**: Package is `shipcard` (shiplog was taken on npm)
- **Pricing**: $2/mo minimum — Stripe fees make $1/mo unsustainable

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
| v1.1 dashboard on feature branch | v2.0 reserved for monetized tier | ✓ Good — shipped and merged |
| GitHub OAuth + Stripe for payments | Single auth provider, link Stripe by GitHub user ID | ✓ Good — stateless browser flow |
| $2/mo solo tier ($20/yr) | $1/mo destroyed by Stripe fees | ✓ Good — sustainable margin |
| BYOT as paid differentiator | Free curated themes drive adoption, custom theming drives revenue | ✓ Good — clear upgrade path |
| D1 over KV for subscriptions | Strong consistency required for billing state | ✓ Good — no eventual-consistency billing bugs |
| GET + GitHub OAuth redirect for billing | Dashboard is public, no Bearer tokens in browser | ✓ Good — works without client-side auth |
| catppuccin as default theme | Best visual default for new users | ✓ Good — modern, appealing |
| WCAG 3:1 for BYOT contrast | UI component standard (not body text 4.5:1) | ✓ Good — practical threshold |
| Clack for CLI UX | Premium interactive CLI feel | ✓ Good — beautiful terminal output |
| Agent-agnostic SourceAdapter | Prep for Kiro/OpenCode/Pi without building parsers yet | ✓ Good — clean extension point |
| Insights at sync time (not cron) | Simpler, more immediate, no scheduled worker needed | ✓ Good — instant feedback |
| Workers AI for narrative generation | Built-in CF binding, no external API keys | ✓ Good — zero config for users |

---
*Last updated: 2026-03-29 after v2.0 milestone completed*
