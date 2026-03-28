# Project Research Summary

**Project:** ShipCard v2.0 — Themes + Monetization
**Domain:** Developer analytics stats card SaaS (local CLI + cloud card endpoint)
**Researched:** 2026-03-28
**Confidence:** HIGH

## Executive Summary

ShipCard v2.0 adds themes, monetization, BYOT, custom slugs, AI insights, and a PRO badge to a working v1.0 foundation. The research is unusually well-grounded: all four dimensions cross-reference the same authoritative sources (official Cloudflare, Stripe, and Clack docs) and the codebase was inspected directly. The architecture file describes the existing code precisely and identifies the exact files to modify. There is no exploratory phase required — the build order is clear, the code locations are known, and the dependencies are pinned.

The recommended approach is a 6-phase sequential build with one parallel track (Clack UX). Phases 1-3 deliver the monetization-unlocking infrastructure: agent-agnostic data model refactor, expanded theme system, and Stripe subscription management. Phases 4-6 build the value-add PRO features on top of that gate. The Clack CLI UX track is fully independent and can run in parallel at any phase. The most critical cross-cutting decision is storage: subscription state must go in D1 (strongly consistent), never KV (eventually consistent up to 60 seconds). This decision affects Phase 3 and every feature that reads `isPro()`.

The main risk is economics, not engineering. At $1/month, Stripe's $0.30 flat fee destroys 33% of gross revenue per transaction. The research recommends pricing at $2/month minimum, or using annual billing ($12/year) to bring per-transaction fees to under 6%. A secondary risk is the Clack library corrupting MCP stdio output if the TTY guard is missed — this is a known failure mode with a precise fix. Both risks are avoidable with upfront design decisions before any code is written.

---

## Key Findings

### Recommended Stack

The v2.0 stack adds exactly three npm packages and two Cloudflare platform services to the locked v1.0 foundation. No rewrites, no framework changes.

**New npm packages:**
- `stripe ^17.x` (worker) — subscription management; pin before v21.0.0 which shipped breaking `Decimal` type changes on 2026-03-26
- `@anthropic-ai/sdk ^0.80.0` (worker) — weekly insight generation via scheduled cron; requires `nodejs_compat` flag in wrangler.jsonc
- `@clack/prompts ^1.1.0` (CLI) — interactive wizard flows for `upgrade`, `themes`, `link create` commands; coexists with existing `args.ts` (no Commander migration needed)

**New Cloudflare platform services (no npm):**
- Cloudflare D1 — subscription state, Stripe customer mapping; free tier handles hundreds of thousands of users before hitting paid threshold
- Cloudflare Workers Cron (`0 6 * * 1`) — weekly insight generation schedule

**Critical version note:** Stripe v21.0.0 broke all `decimal_string` fields by changing their type to `Stripe.Decimal`. Pin to `^17.x` and run `npm view stripe dist-tags` at implementation time to confirm the stable series.

**Stripe in Workers requires two non-obvious initialization settings:** `httpClient: Stripe.createFetchHttpClient()` (Workers has no `node:https`) and `cryptoProvider: Stripe.createSubtleCryptoProvider()` (passed to `constructEventAsync` for webhook verification). Missing either causes runtime failures.

See STACK.md for the full wrangler.jsonc diff, D1 schema, and updated `Env` interface.

### Expected Features

The v2.0 feature set is organized around a single gate: Stripe PRO status stored in D1. Free features expand the card experience. PRO features are where the revenue lives.

**Must have (table stakes for v2.0 launch):**
- 10 built-in themes (free) — github-readme-stats established this expectation; launching with 3 feels dated
- `?theme=X` URL param (free) — universal pattern all stats card users know
- BYOT via URL params `?bg=&text=&accent=` (free) — users will try this immediately
- Stripe PRO checkout + webhook handler + D1 status — no payment, no milestone
- PRO badge on SVG card — first visible PRO value signal
- Custom slug (PRO) — high perceived-value feature, drives upgrade intent

**Should have (differentiators):**
- Catppuccin Mocha as the hero/default theme — culturally dominant in the Neovim/terminal community in 2025-2026
- PRO badge on public profile and leaderboard (HTML, not just SVG)
- Priority CDN via pre-rendering all card variants on sync for PRO users (`ctx.waitUntil()`)
- Custom slug with real-time availability check (debounced 500ms — table stakes UX from Bitly/Rebrandly)

**Defer to v2.1:**
- BYOT dashboard builder with color picker (high complexity, needs UI design)
- Weekly digest email (email infra + template + Resend integration)
- AI efficiency score (novel metric needing UX design to explain)
- Annual coding wrapped (high effort, seasonal)
- Agent-agnostic parsers for Cursor/Windsurf/Aider (Cursor has no local JSONL; defer until data availability confirmed)

**Explicit anti-features:**
- Annual billing complexity at $1/mo (revisit at higher price points)
- Team/org billing (v3+ motion)
- Vanity "top X% of developers" metrics (users see through it; show real data)

See FEATURES.md for authoritative hex values for all 10 curated themes (Catppuccin Mocha, Dracula, Tokyo Night, Nord, Gruvbox Dark, Solarized Dark, One Dark, Monokai, Rose Pine, GitHub Dark).

### Architecture Approach

The existing architecture (two independent packages: `shiplog/` CLI and `shiplog-worker/` Cloudflare Worker) is sound and requires only targeted additions, not restructuring. The packages share no runtime code by design — theme definitions are duplicated intentionally to avoid coordinated deploy requirements.

**Major new components:**
1. `billing.ts` (new Worker module) — owns `isPro(username, env): Promise<boolean>`, D1 subscription reads/writes, and webhook event handling; the single source of truth for PRO status; called from card route, sync route, BYOT API, slug API
2. `routes/billing.ts` (new Worker route) — `POST /billing/webhook` (Stripe events) and `POST /billing/checkout` (create Checkout session); webhook route must read raw body with `c.req.text()` before any middleware touches it
3. `routes/slug.ts` (new Worker route) — `GET /u/:username/:slug` mounted before card routes (Hono matches in declaration order); KV key `slug:{username}:{slug}` stores `CardOptions` JSON
4. `parser/adapters/` (new CLI directory) — `SourceAdapter` interface + `ClaudeCodeAdapter` extracted from existing `reader.ts`; engine is unaffected since it already consumes `ParsedMessage[]`
5. `kv.ts` + `types.ts` (modified Worker files) — add subscription, insights, BYOT theme, and slug helpers; 5 new key patterns in `USER_DATA_KV`

**Key data flow additions:**
- Every card render now calls `isPro()` (single D1 read) before resolving theme
- Stripe webhooks update D1 subscription state; card cache must be invalidated when PRO status changes
- Cron (Monday 6am UTC) generates insights, writes to `user:{username}:insights` with 24h TTL
- PRO sync triggers `ctx.waitUntil(preRenderAllVariants())` as a background task

See ARCHITECTURE.md for the complete file-level change inventory (8 new files, 14 modified files) and full KV key namespace map.

### Critical Pitfalls

1. **KV for subscription state** — KV is eventually consistent (up to 60s stale). A user subscribes, the webhook writes `pro`, their next card request hits a different Cloudflare POP and reads `free`. Use D1 for subscription state. KV is only for rendered SVG cache and user data. This decision must be locked before Phase 3 begins.

2. **Stripe $0.30 fixed fee on $1/mo** — Net revenue is $0.671 per transaction (33% loss to Stripe alone). One chargeback ($15 dispute fee) wipes 22 months of a subscriber's revenue. Price at $2/mo minimum, or use $12/year annual billing (94.5% margin). Enable Stripe Radar from day one.

3. **Webhook signature verification fails in Workers** — `constructEvent()` uses Node.js `crypto` and crashes in the V8 isolate. The exact fix: `await stripe.webhooks.constructEventAsync(body, sig, secret, undefined, Stripe.createSubtleCryptoProvider())`. Raw body must be read with `c.req.text()` before any middleware. Use this pattern in the initial scaffold — do not write the wrong version first.

4. **Clack prompts corrupt MCP stdio** — `@clack/prompts` writes ANSI escape codes to stdout. MCP stdio transport is strict JSON-RPC — any non-JSON bytes break it. Gate every Clack call behind `process.stdout.isTTY === true`. Keep CLI (`src/cli.ts`) and MCP (`src/mcp-server.ts`) entry points completely separate with no shared Clack-importing modules.

5. **BYOT unreadable color combinations** — A user submits `bg: #000000, text: #111111` (1.2:1 contrast ratio). The card renders as an illegible blob and screenshots circulate as "ShipCard bug." Validate WCAG contrast ratio at theme upload time, reject below 3:1, and return a specific error message citing the failing color pair.

Additional pitfalls with documented prevention strategies: webhook idempotency (D1 event ID dedup table), agent-agnostic KV schema migration (version every KV value, migration-on-read), slug route collisions with system routes (hardcoded reserved list covering 25+ route names), slug squatting / brand impersonation (tech brand blocklist + pending review state).

---

## Implications for Roadmap

Based on research, the build order follows a strict dependency chain: subscription gate must exist before any PRO features can be built. Phases 1-2 are preparation; Phase 3 is the gate; Phases 4-6 are the features. Clack is independent throughout.

### Phase 1: Agent-Agnostic Data Model Refactor
**Rationale:** Zero user-visible change, but unlocks clean extensibility. Do this first while the codebase is small and there are no live subscribers to break. Sets up the `SourceAdapter` interface for future parsers. Also the right time to add `schema_version` fields to KV values (Pitfall A10 prevention) before the Stripe integration introduces new schema versions.
**Delivers:** `SourceAdapter` interface, `ClaudeCodeAdapter` extracted from `reader.ts`, schema versioning strategy, migration-on-read pattern
**Avoids:** Pitfall A10 (silent KV data breakage on schema change)
**Research flag:** Standard refactor pattern — no additional research needed

### Phase 2: Theme System Expansion + BYOT
**Rationale:** Delivers immediately visible value with zero infrastructure risk. Themes are entirely additive — new palette files, extended type union, new URL params. PRO gating can be a placeholder (`isPro()` always returns false) until Phase 3 activates it. Ships the table stakes users expect from a stats card tool.
**Delivers:** 10 curated themes (Catppuccin Mocha, Dracula, Tokyo Night, Nord, Gruvbox Dark, Solarized Dark, One Dark, Monokai, Rose Pine, GitHub Dark), `?theme=X` URL param, BYOT via URL params, BYOT named theme storage in KV (PRO, gated by placeholder), PRO badge SVG element
**Avoids:** Pitfall A5 (contrast validation at upload), Pitfall A6 (token-based theme API, no CSS injection), Pitfall C1 (namespace BYOT tokens), Pitfall C3 (ASCII-only PRO badge text)
**Research flag:** Authoritative hex values already in FEATURES.md — no additional research needed

### Phase 3: Stripe Integration + Subscription Gate
**Rationale:** The monetization axis of the milestone. Highest-complexity phase (D1 setup, Stripe webhook handler, billing flow) and it unlocks all subsequent PRO features. Phase 2's PRO placeholder becomes real here. Must be completed before Phases 4-6 because all of them call `isPro()`.
**Delivers:** D1 database with users table, `billing.ts` module, `isPro()` gate function, `/billing/webhook` and `/billing/checkout` routes, `shipcard upgrade` Clack wizard, PRO badge activates from Phase 2 placeholder
**Uses:** `stripe ^17.x`, Cloudflare D1, Stripe Checkout (hosted, zero PCI scope), webhook idempotency table, `constructEventAsync` + `SubtleCryptoProvider`
**Avoids:** Pitfall A1 (pricing decision — $2/mo minimum), Pitfall A2 (D1 not KV for subscription state), Pitfall A3 (`constructEventAsync` pattern in initial scaffold), Pitfall A4 (idempotency table), Pitfall B1 (30-day grandfather + soft gates), Pitfall B2 (PRO gating in Worker, not local tool), Pitfall C2 (Stripe portal return URL as env var)
**Research flag:** Stripe/Cloudflare integration has official samples — standard patterns apply; no additional research needed

### Phase 4: Custom Slugs (PRO)
**Rationale:** Highest perceived-value PRO feature for social sharing and developer identity. Depends on Phase 3. KV is the correct store (read-heavy, globally distributed, rarely written). Simple to implement: one new route file, two KV key patterns, one CLI command.
**Delivers:** `slug:{username}:{slug}` KV storage, `GET /u/:username/:slug` route (mounted before card routes), slug CRUD API, real-time availability check endpoint, `shipcard link create` CLI command, reserved word blocklist (25+ system routes + tech brand blocklist)
**Avoids:** Pitfall A7 (reserved list checked at registration), Pitfall A8 (brand blocklist + pending review state), Pitfall B4 (profanity blocklist)
**Research flag:** Standard URL shortener pattern — no additional research needed

### Phase 5: Priority CDN for PRO
**Rationale:** Low-effort PRO win — pure Worker logic, no new deps. The correct implementation is pre-rendering all card variants during sync via `ctx.waitUntil()`, not a `Cache-Control` header change (which would break GitHub README freshness for PRO users — a worse outcome).
**Delivers:** `preRenderAllVariants()` called in `waitUntil` during PRO user sync, warm cache guarantee for all theme/layout combinations after each sync
**Avoids:** Cache-Control freshness regression for GitHub README embeds (noted as risk in ARCHITECTURE.md)
**Research flag:** No additional research needed — implementation is Worker-internal

### Phase 6: AI Insights (PRO)
**Rationale:** Last phase because it requires all prior infrastructure: D1 for `insights_opt_in` flag (Phase 3), PRO gate (Phase 3), `SafeTimeSeries` in KV from v1.1 sync. Uses Workers AI (`@cf/meta/llama-3.1-8b-instruct`) for cost efficiency — no additional API key required on the Cloudflare paid Workers plan. External `@anthropic-ai/sdk` (claude-haiku-3-5) is the quality-upgrade fallback.
**Delivers:** Cloudflare Workers Cron trigger, `scheduled` handler alongside existing `fetch` export, `user:{username}:insights` KV entries with 24h TTL, `GET /u/:username/api/insights` endpoint (PRO-gated), dashboard insights panel
**Uses:** Workers AI binding (no npm) or `@anthropic-ai/sdk ^0.80.0` (requires `nodejs_compat` flag)
**Avoids:** Pitfall B3 (cron pre-computation, 24h cache, spend cap, cheapest viable model)
**Research flag:** Workers AI model quality for insight strings is unverified — test with sample `SafeTimeSeries` data during phase planning before committing to model choice over Anthropic SDK

### Clack UX Track (Parallel)
**Rationale:** Fully independent of all phases. Touches only CLI command UX, not data model or Worker logic. Can be worked alongside any phase or as a cleanup sweep. The one hard constraint is the TTY guard — every Clack call must check `process.stdout.isTTY === true` before executing.
**Delivers:** Clack UX for `shipcard login` (spinners, styled states) and `shipcard sync` (inline confirmation replaces `--confirm` flag pattern), plus UX polish for new commands created in Phases 3-4 (`upgrade`, `theme create`, `link create`)
**Uses:** `@clack/prompts ^1.1.0` added to `shiplog/package.json`
**Avoids:** Pitfall A9 (TTY guard on every Clack code path, `process.stdout.isTTY === true` check)
**Research flag:** No additional research needed

### Phase Ordering Rationale

- Phase 1 before Phase 2 so new theme code is written against the clean `SourceAdapter` abstraction, not the legacy reader
- Phase 2 before Phase 3 so the theme system can ship immediately to users without waiting for Stripe, and Phase 3 simply activates the placeholder PRO gates that Phase 2 already wired in
- Phase 3 before Phases 4-6 because `isPro()` is the gate for all PRO features — no ordering ambiguity
- Phase 5 before Phase 6 because both touch the sync route; simpler to add pre-rendering before adding the cron handler
- Clack is parallel throughout because it is purely CLI UX with no architectural dependency on any phase

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified against official npm + GitHub; Stripe/Workers integration from official Cloudflare announcement; D1 pricing from official Cloudflare docs |
| Features | HIGH | Theme hex values from official palette repos (Catppuccin, Dracula, Nord official sites); feature gating strategy from WakaTime/Railway/Vercel analysis |
| Architecture | HIGH | Based on direct codebase inspection + official Hono/Cloudflare/Stripe docs; exact file names and change scope identified |
| Pitfalls | HIGH | Critical pitfalls (KV consistency, Stripe fees, webhook crypto) verified from official docs and live Stripe pricing math |

**Overall confidence:** HIGH

### Gaps to Address

- **Stripe version pin:** Run `npm view stripe dist-tags` at Phase 3 implementation time to confirm the correct stable series (`^17.x` recommended; v21 has breaking changes as of 2026-03-26)
- **Workers AI insight quality:** `@cf/meta/llama-3.1-8b-instruct` has not been tested for insight string quality — test with sample `SafeTimeSeries` data before committing to Workers AI over `@anthropic-ai/sdk` in Phase 6
- **`nodejs_compat` flag scope:** Required for `@anthropic-ai/sdk` (`node:crypto` dependency) — verify it does not conflict with Stripe's `createFetchHttpClient()` pattern (Stripe explicitly does NOT require the flag); both may coexist without issue but needs a quick deploy test
- **Cursor local data availability:** Architecture research confirms Cursor stores usage data server-side with no local JSONL equivalent — do not plan any Cursor adapter work until Cursor provides a data export API; block this in requirements explicitly
- **Pricing decision:** The $1/mo vs $2/mo vs $12/year question must be resolved before Phase 3 begins — it affects Stripe configuration, the checkout flow, and customer-facing copy; this is a product decision, not a technical one

---

## Sources

### Primary (HIGH confidence)
- Cloudflare + Stripe native Workers support: https://blog.cloudflare.com/announcing-stripe-support-in-workers/
- stripe-node GitHub releases (breaking v21.0.0 Decimal changes): https://github.com/stripe/stripe-node/releases
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare KV how it works (eventual consistency): https://developers.cloudflare.com/kv/concepts/how-kv-works/
- Cloudflare storage options guide (D1 for consistent state): https://developers.cloudflare.com/workers/platform/storage-options/
- Cloudflare Workers cron triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Cloudflare Workers scheduled handler: https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
- @clack/prompts GitHub (v1.1.0): https://github.com/bombshell-dev/clack
- @anthropic-ai/sdk npm (v0.80.0): https://www.npmjs.com/package/@anthropic-ai/sdk
- catppuccin/palette JSON (Mocha hex values): https://github.com/catppuccin/palette/blob/main/palette.json
- draculatheme.com/contribute (Dracula hex values): https://draculatheme.com/contribute
- folke/tokyonight.nvim (Tokyo Night hex values): https://github.com/folke/tokyonight.nvim
- nordtheme.com/docs (Nord hex values): https://www.nordtheme.com/docs/colors-and-palettes
- morhetz/gruvbox-contrib (Gruvbox hex values): https://github.com/morhetz/gruvbox-contrib/blob/master/color.table
- ethanschoonover.com/solarized: https://ethanschoonover.com/solarized/
- Stripe subscriptions webhooks: https://docs.stripe.com/billing/subscriptions/webhooks
- github-readme-stats theme system + BYOT URL params: https://github.com/anuraghazra/github-readme-stats
- WCAG contrast requirements: https://webaim.org/articles/contrast/
- Hono Stripe webhook pattern: https://hono.dev/examples/stripe-webhook
- Existing codebase (direct inspection of `shiplog/src/` and `shiplog-worker/src/`)

### Secondary (MEDIUM confidence)
- Stripe fee math at $1/mo (2.9% + $0.30 verified against Stripe published rates)
- Cursor privacy policy (no local JSONL): https://cursor.com/data-use
- Claude Haiku pricing estimate (~$0.0004/user/week): based on training data; verify against current Anthropic pricing before Phase 6 budgeting
- One Dark hex values: aggregate from joshdick/onedark.vim + color-hex.com
- Monokai hex values: corrected gist (multiple sources agree on values)
- Rose Pine palette: github-readme-stats built-in theme list
- WakaTime weekly digest format: https://github.com/athul/waka-readme
- Slug profanity list: https://github.com/dsojevic/profanity-list
- Clack TTY / MCP corruption pattern: https://github.com/ruvnet/claude-flow/issues/835

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
