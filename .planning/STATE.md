# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Developers using Claude Code can see what they shipped and what it cost, and share verifiable proof via an embeddable card and analytics dashboard.
**Current focus:** v2.0 — Themes + Monetization

## Current Position

Phase: 21 — Clack CLI (in progress)
Plan: 01 of N — Plan 01 complete
Status: In progress
Last activity: 2026-03-30 — Completed 21-01: @clack/prompts installed, clack.ts TTY-guard module, Clack framing on summary/costs/card

Progress: ███████████░ 96% (18/18 v2.0 plans complete + Phase 21 underway)

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
- 6 phases planned, 5 complete (16, 17, 18, 19, 20)
- 27 requirements across 6 categories (24 complete)

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
| 18-03 | GET + GitHub OAuth redirect flow for billing (no Bearer tokens) | Dashboard is public — OAuth redirect is the only viable browser auth mechanism |
| 18-03 | BillingState with nonce encoded as base64url JSON in OAuth state param | Carries checkout/portal intent through redirect; nonce prevents replay attacks |
| 18-03 | isUserPro() kept as thin wrapper in kv.ts after D1 migration | Avoids changing all call sites; only param type changed from KVNamespace to D1Database |
| 18-02 | getSubscriptionPeriodEnd() reads from SubscriptionItem (Stripe v21) | stripe-node v21 moved current_period_end from Subscription root to SubscriptionItem |
| 18-02 | getInvoiceSubscriptionId() navigates invoice.parent.subscription_details | stripe-node v21 moved invoice.subscription to nested parent.subscription_details path |
| 18-02 | markEventProcessed before processing body | Concurrent delivery prevention; mark-before-process ensures only one execution proceeds |
| 18-04 | isPro/billing state in Alpine.store('dashboard') | Shared state needed across filter-bar, banner, and billing section without prop drilling |
| 18-04 | Payment banner outside .page div, directly below filter-bar | Maximum visibility; always above all page content even on scroll |
| 18-04 | Billing section uses x-if templates (not x-show) | Avoids rendering both PRO and free DOM simultaneously |
| 19-02 | card_slugs.config stored as TEXT (JSON string) | Keeps schema minimal; SlugConfig shape can evolve without D1 schema migrations |
| 19-02 | validateSlug returns null (valid) or error string (invalid) | Consistent with existing error pattern in codebase; callers check for null |
| 19-03 | slugRoutes mounted before cardRoutes in index.ts | Multi-segment /:username/slugs must match before /:username single-segment catch-all |
| 19-03 | Slug KV key: card:{u}:slug:{s} namespace | Distinct from card:{u}:{layout}:t={theme} standard keys; prevents cache collisions |
| 19-03 | Slug card route renders with isPro:true always | Only PRO users can create slugs, so all slug cards are PRO by definition |
| 19-03 | resolveCuratedTheme falls back to catppuccin for unknown/missing theme in slug config | Matches existing card.ts behavior; graceful default for stale or partial configs |
| 19-04 | subcommand/target added to ParsedCliArgs as positionals[1]/[2] | Generic subcommand dispatch pattern reusable by any future command |
| 19-04 | Slug validation constants mirrored from worker (not imported) | CLI has zero dependency on worker package; keeps CLI self-contained |
| 19-05 | Slug section uses local x-data (not Alpine.store) | Self-contained; slug state doesn't need sharing with other dashboard components |
| 19-05 | Bearer token in sessionStorage (not localStorage) | Privacy-first; user re-connects each session intentionally |
| 20-01 | BaseAiTextGenerationModels removed from ai.run() cast | Type doesn't exist; string literal satisfies keyof AiModels generic constraint directly |
| 20-01 | hourlyActivity?: number[] added to SafeDailyStats | compute.ts requires the field; optional so old payloads still validate |
| 20-01 | peakHours returns undefined when no hourlyActivity data | Cleaner than empty object; callers guard with if(insights.peakHours) |
| 20-03 | PRO narrative uses two-write pattern to KV (stats first, narrative after waitUntil) | CLI gets 200 immediately; dashboard shows partial data while AI generates |
| 20-03 | Reused isPro variable already computed for slug pre-rendering | Avoids second D1 query in sync handler |
| 20-03 | Insights API endpoint is public and CORS-enabled | Consistent access model with stats and timeseries endpoints |
| 20-04 | insightsPanel() references server-injected username const directly | Avoids Alpine store timing dependency; username known at page generation time |
| 20-04 | No upgrade banners inside insights panel | Per CONTEXT.md: /upgrade page is the single place for free-vs-PRO comparison; free users see real 14-day data |
| 21-01 | All Clack imports centralized in clack.ts | Commands never import from @clack/prompts directly; single import point enforces TTY-guard pattern |
| 21-01 | intro() is a no-op in non-TTY (not stderr write) | Pipe and MCP consumers must see zero UI chrome; even stderr framing would break consumers |
| 21-01 | Silent try/catch fallback on all TTY Clack calls | Edge-case terminal robustness; any rendering error silently falls through to non-TTY path |

### Pending Todos

- Set up Stripe account (create products, configure portal, get API keys)
- Create D1 database: `npx wrangler d1 create shipcard-db` then update wrangler.jsonc database_id
- Apply D1 schema: `npx wrangler d1 execute shipcard-db --file=src/db/schema.sql`
- Deploy worker with D1 + Stripe secrets
### Blockers/Concerns

- [Action]: Replace placeholder OAuth client ID in login.ts with real GitHub OAuth App
- [Action]: Set real KV namespace IDs in wrangler.jsonc before production deploy
- [Action]: Replace D1 database_id placeholder in wrangler.jsonc after `wrangler d1 create`
- [Action]: Set Stripe secrets via `wrangler secret put` before production deploy

## Session Continuity

Last session: 2026-03-30T03:48:29Z
Stopped at: Completed 21-01-PLAN.md — @clack/prompts + clack.ts + read-only command framing
Resume file: .planning/phases/21-clack-cli/21-02-PLAN.md (if it exists)
