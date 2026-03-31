# Domain Pitfalls

**Domain:** Local analytics tool + cloud card endpoint (MCP server / CLI / Cloudflare Worker)
**Researched:** 2026-03-25 (v1.0) + 2026-03-28 (v2.0 update)
**Confidence:** HIGH

---

## v2.0 Pitfalls — Themes + Monetization

New pitfalls specific to adding Stripe subscriptions, card themes, BYOT, custom slugs, Clack CLI, AI insights, and agent-agnostic data model to the existing system.

---

## Critical Pitfalls (v2.0)

### Pitfall A1: Stripe $1/mo Economics Are Deeply Negative

**What goes wrong:**
At $1/month, Stripe's 2.9% + $0.30 fee per transaction leaves $0.671 net — 33% margin destruction before any infrastructure cost. Every month, each subscriber costs ~$0.33 in pure Stripe fees. At 100 subscribers that is $33/mo lost to Stripe alone. At 1,000 subscribers it is $330/mo just in fees.

**Why it happens:**
Stripe's flat $0.30 fixed component is designed for higher-value transactions. For micro-subscriptions it becomes the dominant cost, not the percentage.

**Consequences:**
- 100 subscribers = $67 MRR, not $100
- One chargeback ($15 dispute fee in Stripe's 2025 tiered model) wipes out 22 months of a subscriber's revenue
- Fraud testing (carding attacks) can generate dozens of $1 chargebacks before detection, potentially destroying your Stripe account standing

**Prevention:**
- Price at $2/mo minimum to preserve margin: net $1.64/transaction (82%)
- At $1/mo, use annual billing ($12/yr): fee becomes $0.65/yr on a $12 charge (94.5% margin)
- Enable Stripe Radar fraud detection from day one
- Set chargeback alert threshold in Stripe Dashboard before going live
- Consider Stripe's Smart Retries for failed payments to reduce involuntary churn

**Warning signs:**
- Payment volume looks healthy but net revenue is anemic
- First chargeback arrives — check it against the total revenue from that subscriber

**Phase to address:** Monetization phase planning (before any Stripe integration begins)

---

### Pitfall A2: KV Eventual Consistency Breaks Subscription State

**What goes wrong:**
A user pays. The Stripe webhook fires and writes `tier: "pro"` to KV. The user immediately requests their card. The Worker reads KV at a different Cloudflare POP and gets the old `tier: "free"` value — up to 60 seconds stale. The card renders as free. User files a support ticket.

**Why it happens:**
Cloudflare KV is eventually consistent. Writes propagate globally in up to 60 seconds. Within the same POP, writes are immediately visible (RYOW). But Workers handling the card request may route through a different POP than the webhook handler.

Cloudflare's own guidance: "KV is unsuitable for scenarios requiring atomic operations." Subscription state requires atomic, immediately-consistent writes.

**Consequences:**
- Pro users see free cards immediately after subscribing
- Free users may briefly see pro features after downgrading
- Any logic that checks tier in a Worker is unreliable within the 60-second window

**Prevention:**
- Use Cloudflare D1 (SQLite, strongly consistent) for subscription state, NOT KV
- KV is fine for caching rendered cards (read-heavy, stale-tolerant)
- If D1 is not in scope: add `?nocache=1` query param support that re-reads state directly and busts cache after webhook fires
- Never use KV for any data that must be immediately correct after a write

**Warning signs:**
- "I just subscribed but my card still shows free" support requests
- Webhook logs show successful writes, but card still serves wrong tier

**Phase to address:** Monetization phase — storage architecture decision must happen before any payment code

---

### Pitfall A3: Webhook Signature Verification Fails on Cloudflare Workers

**What goes wrong:**
`stripe.webhooks.constructEvent()` throws `No crypto provider found` or `Cannot read properties of undefined (reading 'sign')`. The webhook endpoint returns 500. Stripe retries for 3 days. Subscription state never updates.

**Why it happens:**
The standard Stripe webhook verification relies on Node.js `crypto`. Cloudflare Workers run a V8 isolate, not Node.js. You must use the async WebCrypto variant.

**The exact fix (verified via official Stripe/Cloudflare documentation):**
```typescript
// WRONG — crashes in Workers
stripe.webhooks.constructEvent(body, sig, secret)

// CORRECT — Workers-compatible
await stripe.webhooks.constructEventAsync(
  body,
  sig,
  secret,
  undefined,
  Stripe.createSubtleCryptoProvider()
)
```

Also required: read the raw request body as text BEFORE any parsing. Any middleware that parses or touches the body first will corrupt the signature.

**Consequences:**
- All webhooks fail silently
- Subscriptions created but never activated
- Payment failures never trigger access revocation

**Prevention:**
- Use `constructEventAsync` + `createSubtleCryptoProvider()` from day one
- Read raw body with `await request.text()` before any other middleware
- Add a webhook test endpoint in development that logs the raw body + signature for debugging
- Stripe's official Workers template (stripe-samples/stripe-node-cloudflare-worker-template) has the correct pattern — reference it

**Warning signs:**
- 500 errors in Stripe webhook delivery dashboard
- `crypto` or `Buffer` errors in Worker logs

**Phase to address:** Monetization phase — use the correct pattern in initial scaffold, not as a fix

---

### Pitfall A4: Webhook Idempotency Missing — Duplicate State Updates

**What goes wrong:**
Stripe delivers the same webhook event twice (network retry, redelivery on non-200 response). Your handler provisions pro access twice, sends the welcome email twice, or double-charges the user's access expiration calculation.

**Why it happens:**
Stripe guarantees at-least-once delivery, not exactly-once. Your worker must be idempotent.

**Prevention:**
- Store processed webhook event IDs in D1 with a `processed_at` timestamp
- Before handling any event: `SELECT * FROM webhook_events WHERE stripe_event_id = ?`
- If found: return 200 immediately without processing
- If not found: process, then insert the event ID
- All subscription state updates must be idempotent (upsert, not insert)

**Warning signs:**
- Users receive duplicate "welcome to pro" emails
- Stripe webhook delivery shows 200 but you're seeing double processing in logs

**Phase to address:** Monetization phase — idempotency is not an optimization, it's a correctness requirement

---

### Pitfall A5: BYOT Themes Can Produce Unreadable Cards

**What goes wrong:**
A user supplies a theme with `background: "#000000"` and `text: "#111111"` — near-black on black, contrast ratio ~1.2:1. Their card renders as an illegible dark blob. If the card is public (GitHub README), it makes ShipCard look broken, not the user.

**Why it happens:**
CSS and SVG accept any valid color value. There is no browser enforcement of readability in server-rendered SVG.

**Consequences:**
- Screenshots of illegible cards circulate on Twitter/X as "ShipCard bug"
- Users blame the tool, not their theme
- Accessibility lawsuits (theoretical, but WCAG 2.1 requires 4.5:1 for text, 3:1 for graphics)

**Prevention:**
- Validate theme at upload time, not render time
- Compute contrast ratio for every text-on-background color pair using WCAG formula
- Reject themes below 3:1 contrast with a specific error: "Text color #111 on background #000 has contrast ratio 1.2:1 (minimum 3.0:1)"
- Clamp dangerous input: if `background` and `foreground` are same family, auto-adjust lightness
- Show a live preview in the theme editor before save
- Cap text sizes and font families to a safe allowlist

**Warning signs:**
- Users submitting "my card looks broken" issues where the card is technically correct but unreadable
- Dark-mode-only themes that break on light-background READMEs

**Phase to address:** Themes phase — validation must run at upload, not at render

---

### Pitfall A6: Custom SVG Themes Break Cross-Platform Rendering

**What goes wrong:**
A BYOT theme uses CSS custom properties (`var(--brand-color)`), `<foreignObject>`, or `@font-face` with an external URL. GitHub's camo proxy strips these. Discord doesn't embed SVGs as images at all. The card renders blank or broken everywhere but in a browser.

**Why it happens:**
Custom themes give users expressive power that exceeds what the platforms allow. The existing v1.0 pitfall (Pitfall 3 below) covers default themes, but BYOT introduces user-supplied vectors for the same problem.

**Prevention:**
- Strictly sanitize theme output before serving: strip `<script>`, `<foreignObject>`, `<use href="...">`, external `@font-face`, CSS `var()`, and any `url()` references
- At theme upload, run a whitelist SVG element/attribute validator — reject themes containing disallowed constructs
- Render themes server-side: never pass raw theme CSS into the SVG response; extract only named color/size tokens
- The theme system should expose parameters (colors, font size, border radius), not raw SVG or CSS injection
- Test against GitHub README embed, Discord link preview, and Reddit markdown on every theme template

**Warning signs:**
- User-reported blank cards on GitHub after uploading a custom theme
- BYOT themes that work in the ShipCard preview but fail on embedding platforms

**Phase to address:** Themes phase (BYOT design) — theme API must be parameterized tokens, never raw injection

---

### Pitfall A7: Custom URL Slug Conflicts With System Routes

**What goes wrong:**
A user claims the slug `api`, `login`, `dashboard`, `admin`, `health`, `docs`, `pro`, `settings`, `community`, `static`, or `_workers`. Their card URL `shipcard.dev/api` shadows the API endpoint. The system breaks silently for all users, not just the one who claimed the slug.

**Why it happens:**
Route matching in Cloudflare Workers and most frameworks tests user slugs before system routes unless explicitly protected.

**Consequences:**
- `GET /api/*` starts returning an SVG card instead of JSON
- Authentication endpoints become unreachable
- Extremely hard to debug — the Worker returns 200 with the wrong content type

**Prevention:**
- Maintain a hardcoded reserved slug blocklist, checked at registration time:
  `['api', 'login', 'logout', 'dashboard', 'admin', 'health', 'docs', 'pro', 'free', 'settings', 'community', 'static', 'assets', '_workers', 'cdn', 'webhook', 'oauth', 'callback', 'auth', 'me', 'card', 'preview', 'embed', 'feed']`
- System routes always take precedence in Worker routing — never use wildcard slug matching at the root level
- Validate slugs server-side at claim time, not just client-side
- Enforce slug format: lowercase alphanumeric + hyphens only, 3–30 characters, no leading/trailing hyphens

**Warning signs:**
- Any API endpoint starts returning unexpected content types
- Dashboard becomes inaccessible for all users simultaneously

**Phase to address:** Slug feature — reserved list must be hardcoded in the slug validation function before any user can claim slugs

---

### Pitfall A8: Slug Squatting and Brand Impersonation

**What goes wrong:**
User claims `stripe`, `github`, `anthropic`, `openai`, `cursor` before those companies or their developers do. These slugs have implicit brand authority. Someone creates `shipcard.dev/stripe` and uses it to impersonate Stripe's developer stats — potential phishing vector, legal exposure.

**Why it happens:**
First-come-first-served slug assignment with no governance.

**Prevention:**
- Extend reserved list to include major tech brand names (top 200 brands in developer tooling)
- Add a report/reclaim process for brand owners
- Require email verification before slug goes public
- Consider a "verified" badge system for known organizations
- Keep a `pending_review` state for slugs that match brand patterns

**Warning signs:**
- Support requests from companies claiming their name was taken
- A "shipcard.dev/[major-brand]" card showing fabricated stats

**Phase to address:** Slug feature — brand protection list at launch, not post-launch

---

### Pitfall A9: Clack Prompts Corrupt MCP stdio Transport

**What goes wrong:**
The new Clack CLI (`@clack/prompts`) writes ANSI escape codes and interactive prompts to stdout. When the same binary is invoked by Claude Code as an MCP server (via stdio transport), these Clack output sequences corrupt the JSON-RPC stream. Claude Code sees invalid JSON, disconnects the MCP server, and shows "tool not available."

**Why it happens:**
MCP stdio transport is a strict JSON-RPC protocol over stdin/stdout. Any non-JSON bytes written to stdout break the protocol. Clack's interactive prompts are stdout-heavy by design.

This is the same class of bug as the existing Pitfall 5 (`console.log` corruption), but worse: Clack writes to stdout unconditionally unless the consuming code detects non-TTY mode first.

**Prevention:**
- Gate ALL Clack usage behind a TTY check: `process.stdout.isTTY === true`
- In MCP mode (detected by argv or env var), never import or invoke any `@clack/prompts` code
- Keep CLI entry point (`src/cli.ts`) and MCP entry point (`src/mcp-server.ts`) completely separate — no shared modules that import Clack
- Clack's `@clack/core` (headless primitives) is safer for programmatic use if needed
- Add an integration test: pipe the binary as an MCP server and assert zero non-JSON bytes on stdout

**Warning signs:**
- MCP tools stop working after Clack migration
- JSON parse errors in Claude Code MCP logs
- Interactive prompts appearing in unexpected places (CI, scripts)

**Phase to address:** Clack migration phase — TTY guard must be the first line of every Clack-using code path

---

### Pitfall A10: Agent-Agnostic Refactor Silently Breaks Existing KV Data

**What goes wrong:**
The KV schema currently stores `{ tool: "claude_code", sessions: [...] }` or similar Claude-specific keys. Migrating to an agent-agnostic model renames fields or restructures objects. Existing users' KV data is in the old format. When the new Worker deploys, it reads old data with new code and either crashes or silently serves wrong stats.

**Why it happens:**
KV has no schema migrations. There is no "ALTER TABLE" equivalent. Old data sits indefinitely alongside new data.

**Consequences:**
- All existing users' cards break silently on deploy
- Stats show 0 or undefined for fields that were renamed
- No rollback path without reverting to old Worker code

**Prevention:**
- Version every KV value: `{ schema_version: 2, data: {...} }`
- Read path must handle both schema versions (migration-on-read)
- Never rename fields in-place — add new fields, keep old fields, deprecate after all data is migrated
- Before deploying the refactored Worker, run a migration script that reads all KV entries and re-writes them in the new schema
- Keep the old schema parser in the codebase for at least one release cycle

**Warning signs:**
- After deploying: "My card shows 0 sessions" from existing users
- Worker logs show `TypeError: Cannot read properties of undefined`

**Phase to address:** Agent-agnostic refactor — schema versioning must be designed before any KV writes are changed

---

## Moderate Pitfalls (v2.0)

### Pitfall B1: Free-to-Paid Migration Breaks Existing Users

**What goes wrong:**
Existing free users experience a perceived regression when paywalls appear. If the feature gating is aggressive (immediate lockout), users who were using something for free feel taken away from. If the grace period is unclear, users churn before subscribing.

**Prevention:**
- Grandfather existing users with a 30-day trial of pro features, communicated in advance via email
- "Soft gates" first: show pro features but require subscription to export/share
- Never hard-lock a feature that was previously free without a 30-day notice window
- Show a clear "what you get" comparison before any upgrade prompt
- Payment failure: 7-day grace period before access revocation, with daily reminder emails

**Warning signs:**
- Spike in account deletions immediately after paywall launch
- Social media posts about "ShipCard enshittification"

**Phase to address:** Monetization phase — free/paid boundary defined before any feature gating code is written

---

### Pitfall B2: Stripe Subscription and Local npm Package State Diverge

**What goes wrong:**
A user's Stripe subscription lapses (card declined, subscription cancelled). The Stripe webhook fires `customer.subscription.deleted`. But the user's local npm package has cached their `tier: "pro"` token and never re-validates. They continue accessing pro features locally long after their subscription ended.

**Why it happens:**
Local tools can't phone home on every command execution (privacy-first, offline-capable design). There's inherent tension between offline-capable local tools and server-side payment state.

**Prevention:**
- Local pro features (themes in CLI output, etc.) should be minimal — most pro gating happens at the Worker (card rendering), not locally
- Token has an expiry: validate against the Worker API no more than once per 24 hours, cache the result locally
- On Worker: check D1 subscription state on every card render request — never trust a local token for server-side gating
- Design pro features so that the valuable ones (card themes, priority CDN, AI insights) live in the Worker, not in the local tool

**Warning signs:**
- Users with lapsed subscriptions reporting they still have pro features in the CLI
- Revenue recognition issues: Stripe shows cancelled but usage continues

**Phase to address:** Monetization phase — define what pro means server-side vs. local before implementation

---

### Pitfall B3: AI Insights Cost Unpredictability

**What goes wrong:**
ShipCard calls an LLM API to generate "insights" for each user's stats. With 500 users requesting insights daily, the LLM cost exceeds the $1/mo subscription revenue by an order of magnitude.

**Why it happens:**
AI API costs are usage-based and unpredictable. A feature that costs $0.01/request feels cheap at 10 users but is $150/mo at 500 users — 30% of gross revenue at that scale.

**Prevention:**
- Cache AI insights aggressively: generate once per stats sync, not on every card view
- Cap insight generation to once per 24 hours per user
- Use the cheapest model that produces acceptable output (Claude Haiku, not Sonnet)
- Pre-generate insights in a background job, not on-request
- Monitor LLM spend per user and per month in a dashboard
- Set a hard monthly LLM spend cap as a circuit breaker

**Warning signs:**
- LLM cost line in your cloud bill grows faster than subscriber count
- Any single user triggering multiple insight regenerations per day

**Phase to address:** AI insights phase — cost model must be validated before shipping to all users

---

### Pitfall B4: Profanity and Abuse in Custom Slugs

**What goes wrong:**
Users claim `shipcard.dev/[slur]` or `shipcard.dev/fuck-you-stripe`. These URLs appear in GitHub READMEs, are indexed by Google, and reflect on ShipCard's brand. Content moderation is a full-time job at scale.

**Prevention:**
- Use an established profanity list (e.g., `dsojevic/profanity-list`) at slug validation time
- Note: username-style slugs have high false-positive risk with simple word matching — "assassin" → "ass", "scunthorpe" problem
- Consider a dual approach: blocklist for obvious cases, human review queue for edge cases
- Provide a report URL button on every public card page
- Terms of Service must explicitly ban profane/abusive slugs with a suspension clause

**Warning signs:**
- First profane slug claim — usually happens within hours of launch
- Support email about an offensive card URL

**Phase to address:** Slug feature — blocklist at launch, report mechanism at launch

---

## Minor Pitfalls (v2.0)

### Pitfall C1: Theme Color Token Naming Collisions

**What goes wrong:**
A BYOT theme uses the same token name as a system token (`--card-bg`, `--text-primary`) but with a different semantic meaning. Theme overrides system defaults unexpectedly. Part of the card renders with the theme colors, part with system defaults.

**Prevention:**
- Namespace BYOT theme tokens: `--user-bg`, `--user-text`, never reuse system token names
- Theme application is additive, not replacement — system tokens provide fallback values

**Phase to address:** Themes phase

---

### Pitfall C2: Stripe Billing Portal Re-directs to Wrong Domain

**What goes wrong:**
Stripe Customer Portal is configured with a return URL of `localhost:3000` from development. Deployed users click "Manage Billing" and are returned to localhost.

**Prevention:**
- Stripe Customer Portal return URL must be an environment variable
- Separate Stripe accounts (or restricted keys) for development vs. production
- Add a pre-deploy checklist item: verify all Stripe portal URLs point to production domain

**Phase to address:** Monetization phase

---

### Pitfall C3: SVG Font Rendering on PRO Badge

**What goes wrong:**
The PRO badge uses a font weight or character that renders differently on GitHub camo proxy vs. a browser. The badge looks like a filled box or question mark on some platforms.

**Prevention:**
- Use only characters from the basic ASCII range in SVG text
- Test PRO badge specifically in GitHub dark mode and light mode
- Avoid Unicode symbols in the badge text — use "PRO" not "⭐ PRO"

**Phase to address:** Themes phase

---

## Phase-Specific Warnings (v2.0)

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Stripe integration | Webhook crypto failure in Workers | `constructEventAsync` + `SubtleCryptoProvider` from day one |
| Stripe integration | $1/mo margin destruction | Annual billing or minimum $2/mo pricing |
| Stripe integration | Duplicate webhook processing | Idempotency key table in D1 |
| Subscription state | KV eventual consistency | Use D1 for tier state, KV only for cache |
| Subscription state | Local tool / server state diverge | Pro gating lives in Worker, not local tool |
| Theme system | BYOT unreadable colors | Contrast validation at upload time |
| Theme system | BYOT SVG sanitization bypass | Token-based theme API, no raw CSS injection |
| Custom slugs | System route collision | Hardcoded reserved list checked first |
| Custom slugs | Brand impersonation | Brand blocklist, report mechanism |
| Custom slugs | Profanity | Established wordlist + human review queue |
| Clack migration | MCP stdio corruption | TTY guard on all Clack code paths |
| Agent-agnostic refactor | Silent KV schema break | Schema versioning + migration-on-read |
| AI insights | LLM cost spiral | Cache + background job + spend cap |
| Free-to-paid | Churn from abrupt gating | 30-day grandfather + soft gates first |

---

## v1.0 Pitfalls (Retained)

These original pitfalls remain relevant for v2.0 development.

### Pitfall 1: JSONL Schema Instability

**What goes wrong:**
Claude Code's JSONL format changes across versions without warning. Fields get added, renamed, or restructured. A parser hardcoded to today's schema breaks silently on tomorrow's update — stats go wrong, cost calculations drift, or the tool crashes.

**Why it happens:**
Claude Code is a rapidly iterating product. The JSONL files are internal logging, not a public API. Anthropic has no obligation to maintain schema stability.

**How to avoid:**
- Build a resilient parser that extracts known fields gracefully and ignores unknowns
- Use optional typing (`field?: type`) for every non-guaranteed field
- Never crash on unexpected data — log a warning, skip the record
- Version-detect: check the `version` field in JSONL records to branch parsing logic
- Ship a `--debug` flag that dumps unparsed records for troubleshooting

**Warning signs:**
- Users report "stats stopped working after Claude Code update"
- Cost calculations suddenly show $0 or NaN

**Phase to address:** Phase 1 (JSONL parser must be resilient from day one)

---

### Pitfall 2: Cost Estimation Inaccuracy

**What goes wrong:**
Token-to-dollar conversion is wrong because: (a) model pricing changes and the tool ships stale rates, (b) JSONL token counts may not match billing (cached tokens, system prompts), (c) users on Max plan pay flat rate — per-token cost is meaningless for them.

**Prevention:**
- Make cost estimation explicitly approximate: "~$127 estimated" not "$127.00"
- Ship pricing as a versioned constant with "last updated" date visible to users
- Support a `--pricing-file` flag for user-supplied custom rates

**Phase to address:** Phase 1

---

### Pitfall 3: SVG Rendering Inconsistency Across Platforms

**What goes wrong:**
SVG cards look different on GitHub (uses camo proxy, sanitizes SVGs), Reddit (may not render inline SVG), Discord (may not embed SVG at all). Text wrapping, fonts, and colors break across renderers.

**Prevention:**
- Use only basic SVG elements: `<rect>`, `<text>`, `<g>`, `<svg>`, `<line>`
- Inline ALL styles — no `<style>` blocks, no external CSS
- Use web-safe fonts only (monospace, sans-serif) — never assume custom fonts render
- Test on GitHub README, Reddit markdown, and Discord embed before shipping

**Phase to address:** Phase 2

---

### Pitfall 4: Large JSONL File Performance

**What goes wrong:**
Power users with months of Claude Code history have JSONL files totaling hundreds of megabytes. `fs.readFileSync` + `JSON.parse` on the whole file causes OOM crashes or 30+ second startup times.

**Prevention:**
- Use Node.js `readline` interface for streaming line-by-line parsing
- Cache computed aggregates locally to avoid re-parsing unchanged files

**Phase to address:** Phase 1

---

### Pitfall 5: MCP Server Transport Gotchas

**What goes wrong:**
MCP servers communicate via stdio. Any accidental `console.log` in the MCP code path corrupts the JSON-RPC stream. (v2.0 note: Clack migration is the highest-risk vector for this in v2.0 — see Pitfall A9.)

**Prevention:**
- Never use `console.log` in MCP code paths — use `console.error`
- Keep CLI and MCP entry points strictly separate

**Phase to address:** Phase 1; revisit during Clack migration

---

### Pitfall 6: npm Publishing / bin Entry Mistakes

**What goes wrong:**
Package publishes but CLI command doesn't work: wrong `bin` path, missing shebang, ESM/CJS mismatch.

**Prevention:**
- Test `npm pack` + `npm install -g` locally before publishing
- Verify both bin entries work after install

**Phase to address:** Phase 1

---

### Pitfall 7: Privacy Leak via Card Data

**What goes wrong:**
The sync endpoint receives more data than intended — project names, file paths, or tool names leak into the card or KV store.

**Prevention:**
- Define a strict `SafeStats` interface: only numbers and explicit opt-in strings
- Let users preview exactly what will be synced before first upload

**Phase to address:** Phase 2

---

### Pitfall 8: KV Cache Stale Data

**What goes wrong:**
User syncs new stats but the card still shows old data because KV cache hasn't expired.

**Prevention:**
- Invalidate card cache on sync
- Show "last updated" timestamp on card

---

### Pitfall 9: npm Package Name Conflict

**Prevention:**
- Check npm before writing any code
- Have fallback names ready

---

### Pitfall 10: Cloudflare Worker Size Limit

**Prevention:**
- Monitor bundle size in CI
- Keep SVG templates as string literals

---

## Sources

**v2.0 sources (verified):**
- [Stripe webhook Cloudflare Workers — official template](https://github.com/stripe-samples/stripe-node-cloudflare-worker-template) (HIGH confidence)
- [Stripe webhook verification — jross.me](https://jross.me/verifying-stripe-webhook-signatures-cloudflare-workers/) (MEDIUM confidence)
- [Cloudflare KV how it works — official docs](https://developers.cloudflare.com/kv/concepts/how-kv-works/) (HIGH confidence)
- [Cloudflare storage options — official docs](https://developers.cloudflare.com/workers/platform/storage-options/) (HIGH confidence — recommends D1 for consistent state)
- [Stripe subscriptions webhooks — official docs](https://docs.stripe.com/billing/subscriptions/webhooks) (HIGH confidence)
- [Stripe chargeback fees 2025 — chargebackstop.com](https://www.chargebackstop.com/blog/stripe-chargeback-fees-in-2025-how-to-survive-the-new-two-tier-dispute-model) (MEDIUM confidence)
- [Stripe $1/mo fee math — acodei.com](https://www.acodei.com/blog/stripe-fee-structure-guide) (MEDIUM confidence — math verified against Stripe's published 2.9% + $0.30)
- [Clack TTY / MCP corruption — GitHub issues](https://github.com/ruvnet/claude-flow/issues/835) (MEDIUM confidence)
- [WCAG contrast requirements for SVG — WebAIM](https://webaim.org/articles/contrast/) (HIGH confidence)
- [Profanity list for slug filtering — dsojevic/profanity-list](https://github.com/dsojevic/profanity-list) (MEDIUM confidence)

**v1.0 sources (original):**
- Architecture research (first-hand JSONL file inspection on this machine)
- github-readme-stats GitHub issues (SVG rendering problems across platforms)
- MCP SDK documentation (stdio transport requirements)
- Cloudflare Workers documentation (KV limits, Worker size limits)
- ccusage GitHub issues (cost estimation complaints, schema changes)

---
*v1.0 pitfalls researched: 2026-03-25*
*v2.0 pitfalls researched: 2026-03-28*
