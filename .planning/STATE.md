# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Developers using Claude Code can see what they shipped and what it cost, and share verifiable proof via an embeddable card and analytics dashboard.
**Current focus:** v2.0 — Themes + Monetization

## Current Position

Phase: 18 — Stripe Subscriptions (in progress)
Plan: 01 of 5 — Foundation complete
Status: In progress
Last activity: 2026-03-29 — 18-01 complete: Stripe SDK installed, D1 schema + query helpers created

Progress: ██████░░░░ 56% (5/9 plans complete across v2.0)

## Performance Metrics

**v1.0 Totals:**
- 12 phases, 29 plans
- 160 commits
- 237 files, ~13,131 LOC
- 3 days (2026-03-25 → 2026-03-27)

**v1.1 Totals:**
- 3 phases, 5 plans, 11 tasks
- 28 commits
- 57 files changed (4,672 insertions, 93 deletions)
- ~14,396 LOC total project
- 1 day (2026-03-27)

**v2.0 Totals (in progress):**
- 6 phases planned, 2 complete (16, 17)
- 27 requirements across 6 categories (9 complete)

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full history.

### Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 16-01 | Used git mv for directory rename | Preserves 100% git history across all 81 renamed files |
| 16-01 | Left historical shiplog CLI command name in old phase plans | Accurate historical context, only path refs updated |
| 16-01 | shipcard-worker verified via tsc --noEmit (no build script) | Wrangler handles compilation; noEmit is correct for CF Workers |
| 16-02 | Function-object style for ClaudeCodeAdapter | Matches codebase conventions; no class keyword anywhere in codebase |
| 16-02 | ParseResult re-exported from adapters/interface.ts | Engine never reaches into parser internals; clean import boundary |
| 16-02 | Default adapter is "claude-code" | Zero breaking changes; EngineOptions.adapter is optional |
| 16-02 | v2.0.0 bumped in both packages simultaneously | Per CLAUDE.md versioning rules; both packages share same version |
| 17-01 | MIN_RATIO = 3.0 (WCAG 1.4.11 for UI components, not 4.5:1) | SVG card is a graphic/UI component, not body text; 4.5:1 rejects valid palettes |
| 17-01 | resolveThemeV2() defaults to catppuccin for unknown/missing theme | New requests get best visual default; legacy ?theme=dark still routes to github-dark |
| 17-01 | resolveCuratedTheme() returns null (not throws) for unknown names | Card route handles gracefully without try/catch |
| 17-02 | PRO gate checked before contrast validation | Prevents free users from learning which color combos would pass contrast |
| 17-02 | BYOT cards skip KV cache entirely | Prevents unbounded cache growth from arbitrary hex combinations |
| 17-02 | Default ?theme is catppuccin (not github-dark) | New users get best visual default; legacy ?theme=dark still works |
| 17-03 | Theme Configurator uses local x-data (not global Alpine store) | Self-contained component; no store pollution |
| 17-03 | isPro injected server-side via __IS_PRO__ placeholder | No client-side fetch flash; single KV read at page serve time |
| 17-03 | byotMode activates only when all 5 fields filled + valid + passing contrast | Prevents partial BYOT URLs from being served |
| 17-03 | Preview img uses window.location.origin, embed code uses shipcard.dev | Preview must work in local dev; embed code is for users to paste in READMEs |
| 17-03 | Theme palettes embedded inline in HTML (not fetched) | Avoids extra API call; 9 themes is small enough for inline data |
| 17-03 | BYOT inputs debounced at 300ms | Prevents excessive card fetches while user types hex values |
| 18-01 | Stripe.createFetchHttpClient() for CF Workers | Workers runtime has no Node.js http module; fetch-based client mandatory |
| 18-01 | past_due treated as PRO in isUserProFromD1() | Grace period for payment failures; prevents immediate access loss |
| 18-01 | D1 chosen over KV for subscriptions | Strong consistency required for billing state; KV eventual consistency unsuitable |
| 18-01 | ON CONFLICT(username) DO UPDATE for upsertSubscription | Handles first-time subscribers and webhook updates in single query |

### Pending Todos

- Set up Stripe account (create products, configure portal, get API keys)
- Create D1 database: `npx wrangler d1 create shipcard-db` then update wrangler.jsonc database_id
- Apply D1 schema: `npx wrangler d1 execute shipcard-db --file=src/db/schema.sql`
- Execute Phase 18 Plans 02-05 (webhook handler, checkout API, portal API, PRO gate)

### Blockers/Concerns

- [Action]: Replace placeholder OAuth client ID in login.ts with real GitHub OAuth App
- [Action]: Set real KV namespace IDs in wrangler.jsonc before production deploy
- [Decision]: Stripe account setup needed before Phase 18 (Stripe Subscriptions)

## Session Continuity

Last session: 2026-03-29T07:51:33Z
Stopped at: 18-01 complete — Stripe SDK foundation layer built
Resume with: Execute Phase 18 Plan 02 (webhook handler) — requires Stripe account + D1 database setup first
