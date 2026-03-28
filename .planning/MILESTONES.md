# Project Milestones: ShipCard

## v1.1 Dashboard Enhancement (Shipped: 2026-03-28)

**Delivered:** Enriched dashboard with Today's Activity hero, Peak Day records, and per-project sort toggles — making the dashboard the reason to adopt ShipCard.

**Phases completed:** 13-15 (5 plans total)

**Key accomplishments:**

- Enriched data pipeline with per-project stats (tokens, sessions, cost, messages) flowing from JSONL to Worker KV
- Fixed userMessages bug (was hardcoded 0, now from real UserEntry timestamps)
- Today's Activity hero with 4 metrics and individual % change vs yesterday
- Peak Days cards showing 4 per-metric all-time records with date and project name
- Project Activity sort toggle slicing by messages, tokens, sessions, or cost
- Dashboard section reorder (static sections first, range-reactive below)

**Stats:**

- 57 files changed (4,672 insertions, 93 deletions)
- ~14,396 lines of TypeScript/HTML/JSON (total project)
- 3 phases, 5 plans, 11 tasks
- 1 day (2026-03-27)

**Git range:** `feat(13-01)` → `feat(15-01)`

**What's next:** v2.0 — AI-powered queries, custom cards, paid tier

---

## v1.0 MVP (Shipped: 2026-03-27)

**Delivered:** Full analytics platform for agentic developers — local JSONL parser + CLI + MCP server, Cloudflare Worker serving embeddable SVG cards, analytics dashboard, and community leaderboard.

**Phases completed:** 1-12 (29 plans total)

**Key accomplishments:**
- Streaming JSONL parser with resilient deduplication and LiteLLM pricing engine
- Dual CLI + MCP server interface published to npm as `shipcard`
- SVG card renderer with 3 layouts, 6 themes, and GitHub-compatible output
- Cloudflare Worker with OAuth login, privacy-validated sync, and edge-cached cards
- Full analytics dashboard with 9 chart panels (Alpine.js + Chart.js)
- Community feed with leaderboard, cards-served counter, and mobile-responsive design

**Stats:**
- 237 files created/modified
- ~13,131 lines of TypeScript/HTML/JSON
- 12 phases, 29 plans
- 3 days from start to ship (2026-03-25 → 2026-03-27)
- 160 commits

**Git range:** `docs: initialize project` → `docs(12): complete polish-community phase`

**What's next:** v2 — enhanced card themes, multi-agent support (Codex CLI, Gemini CLI), public profile pages, team dashboards

---
