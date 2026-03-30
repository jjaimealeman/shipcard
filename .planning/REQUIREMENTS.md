# Requirements: ShipCard v2.0 Themes + Monetization

**Defined:** 2026-03-28
**Core Value:** Developers using Claude Code can see what they shipped and what it cost, and share verifiable proof via an embeddable card and analytics dashboard.

## v2.0 Requirements

### Themes

- [x] **THEME-01**: User can select from 8-10 curated themes (Catppuccin, Dracula, Tokyo Night, Nord, Gruvbox, Solarized, One Dark, Monokai)
- [x] **THEME-02**: Theme selection applies to SVG card via URL parameter (`?theme=catppuccin`)
- [x] **THEME-03**: Theme preview visible in dashboard card configurator
- [x] **THEME-04**: PRO user can specify custom colors via URL params (bg, title, text, icon, border)
- [x] **THEME-05**: BYOT colors are validated for WCAG 3:1 minimum contrast ratio
- [x] **THEME-06**: Theme system works across all 3 card layouts (classic, compact, hero)

### Monetization

- [x] **PAY-01**: User can subscribe to PRO tier ($2/mo or $20/yr) via Stripe Checkout
- [x] **PAY-02**: Subscription state stored in D1 with strong consistency
- [x] **PAY-03**: `isPro()` gate available to all Worker routes for feature gating
- [x] **PAY-04**: Stripe webhook handler processes subscription lifecycle events (created, updated, canceled, payment_failed)
- [x] **PAY-05**: User can manage subscription (cancel, switch plan) via Stripe Customer Portal
- [x] **PAY-06**: Free users see upgrade prompts at PRO feature touchpoints

### Card Enhancements

- [x] **CARD-01**: PRO cards display a small PRO badge on the SVG
- [x] **CARD-02**: PRO cards refresh cache instantly on sync (free: 1 hour TTL)
- [x] **CARD-03**: PRO user can create custom card URL slugs (`/u/:username/:slug`)
- [x] **CARD-04**: Each slug maps to a saved card configuration (theme, layout, style)
- [x] **CARD-05**: Free users get 1 card (default), PRO users get unlimited slugs
- [x] **CARD-06**: Slug system enforces reserved word list and minimum length

### AI Insights

- [x] **INSIGHT-01**: PRO users see weekly coding insights on dashboard (peak hours, cost trends, streaks)
- [x] **INSIGHT-02**: Insights are pre-computed (Workers AI or Haiku cron), not live LLM calls
- [x] **INSIGHT-03**: Insights update automatically when user syncs

### CLI

- [x] **CLI-01**: CLI uses `@clack/prompts` for interactive flows (login, sync, card config)
- [x] **CLI-02**: Clack output is gated behind `process.stdout.isTTY` — MCP/pipe mode falls back to plain text
- [x] **CLI-03**: Existing command interface unchanged (no breaking changes to `shipcard summary/costs/card`)

### Architecture

- [x] **ARCH-01**: Parser refactored with `SourceAdapter` interface for future agent support
- [x] **ARCH-02**: Existing Claude Code parser wrapped as `ClaudeCodeAdapter`
- [x] **ARCH-03**: Engine consumes `ParsedMessage[]` regardless of source adapter

## Deferred (future milestones)

- BYOT saved presets (named theme configs stored per user)
- Support Codex CLI JSONL format
- Support Gemini CLI log format
- Team dashboards with cost allocation (`/t/:team-slug/dashboard`, $5/mo)
- Burn rate predictor (estimated cost remaining in billing window)
- Natural language date parsing (--since yesterday)
- Per-chart export buttons (PNG/JSON/SVG)
- Weekly email digest of AI insights

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-agent JSONL parsing | Wait for community demand — agent-agnostic model is prep only |
| Persistent background daemon | Trust killer for privacy-focused tool |
| Telemetry without opt-in | Destroys trust instantly |
| Mobile/desktop native app | Web/terminal only |
| Monthly $1 pricing | Stripe fees destroy 33% margin — $2/mo minimum |
| BYOT saved presets | Adds storage complexity — defer, URL params are stateless |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 16 | Complete |
| ARCH-02 | Phase 16 | Complete |
| ARCH-03 | Phase 16 | Complete |
| THEME-01 | Phase 17 | Complete |
| THEME-02 | Phase 17 | Complete |
| THEME-03 | Phase 17 | Complete |
| THEME-04 | Phase 17 | Complete |
| THEME-05 | Phase 17 | Complete |
| THEME-06 | Phase 17 | Complete |
| PAY-01 | Phase 18 | Complete |
| PAY-02 | Phase 18 | Complete |
| PAY-03 | Phase 18 | Complete |
| PAY-04 | Phase 18 | Complete |
| PAY-05 | Phase 18 | Complete |
| PAY-06 | Phase 18 | Complete |
| CARD-01 | Phase 19 | Complete |
| CARD-02 | Phase 19 | Complete |
| CARD-03 | Phase 19 | Complete |
| CARD-04 | Phase 19 | Complete |
| CARD-05 | Phase 19 | Complete |
| CARD-06 | Phase 19 | Complete |
| INSIGHT-01 | Phase 20 | Complete |
| INSIGHT-02 | Phase 20 | Complete |
| INSIGHT-03 | Phase 20 | Complete |
| CLI-01 | Phase 21 | Complete |
| CLI-02 | Phase 21 | Complete |
| CLI-03 | Phase 21 | Complete |

**Coverage:**
- v2.0 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-29 — Phase 21 CLI-01 through CLI-03 marked Complete, all 27 requirements complete*
