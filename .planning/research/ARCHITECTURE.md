# Architecture Patterns — v2.0 Themes + Monetization

**Domain:** Local analytics tool + cloud card endpoint (MCP server / CLI / Cloudflare Worker)
**Researched:** 2026-03-28
**Scope:** Integration patterns for v2.0 new features into existing ShipCard architecture
**Confidence:** HIGH (based on direct source inspection + verified Cloudflare/Stripe docs)

---

## Existing Architecture Summary

Before detailing integration points, a snapshot of what already exists:

```
shiplog/src/
  card/
    themes/         # ThemeColors registry (github, branded, minimal × dark/light)
    layouts/        # SVG layout templates (classic, compact, hero)
    renderer.ts     # renderCard(AnalyticsResult) → SVG
  engine/           # pure aggregation: ParsedMessage[] → AnalyticsResult
  parser/           # JSONL → ParsedMessage (streaming, zero-buffer)
  cli/
    commands/       # summary, costs, card, login, sync
    config.ts       # ~/.shipcard/config.json (auth) + ~/.shipcard.json (display)
    args.ts         # manual argv parser (no commander)
  mcp/              # 3 MCP tools over stdio

shiplog-worker/src/
  svg/
    themes/         # duplicate ThemeColors registry (Worker has its own copy)
    layouts/        # duplicate layout templates
    renderer.ts     # renderCard(SafeStats) → SVG
  routes/           # Hono route handlers per feature area
  kv.ts             # all KV helpers, key naming, TTLs
  types.ts          # Env, SafeStats, SafeTimeSeries, CardQueryParams
  index.ts          # Hono app wiring
```

KV namespaces (existing):
- `CARDS_KV` — rendered SVG cache, key: `card:{username}:{theme}:{layout}:{style}[:hide={a,b}]`
- `USER_DATA_KV` — SafeStats, SafeTimeSeries, auth tokens, community metadata

---

## Feature Integration Map

### 1. Theme System (new themes + PRO gating)

**Where theme definitions live:** In both packages independently (Worker and CLI maintain copies). This is the existing pattern — there is no shared code between Node.js and Worker runtimes. The Worker's `shiplog-worker/src/svg/themes/` and the CLI's `shiplog/src/card/themes/` are kept in sync manually at development time.

**What changes for new themes:**
- Add new palette files in both locations (e.g. `neon.ts`, `ocean.ts`)
- Extend `StyleName` union type in both `themes/index.ts` files
- Register in the REGISTRY map in both index files
- New themes beyond the existing 3 are PRO-only: gating happens in the Worker route handler (not in the renderer itself)

**Theme resolution in the card endpoint:**
```
GET /u/:username?style=neon&theme=dark
  → card.ts route handler
  → check isPro(username, env)        ← NEW: KV lookup for subscription state
  → if style is PRO-only AND !isPro → redirect to free default OR serve placeholder
  → resolveTheme(style, theme)
  → renderCard(userData, { style, theme, layout, hide })
```

The `isPro()` function lives in a new `billing.ts` module in the Worker (see section 2).

**KV cache key:** No change needed. The existing `card:{username}:{theme}:{layout}:{style}` key already captures all card variants including new themes. New themes just add new key combinations.

**BYOT (custom theme colors):** See section 3.

---

### 2. Stripe Integration on CF Worker

**New Worker module:** `shiplog-worker/src/billing.ts`

This module owns:
- Subscription state reads/writes to `USER_DATA_KV`
- `isPro(username, env): Promise<boolean>` — the single gate function called everywhere
- Webhook event handler (called from the new webhook route)

**New KV key:** `user:{username}:subscription`

Value shape:
```json
{
  "plan": "pro",
  "status": "active",
  "stripeCustomerId": "cus_xxx",
  "stripeSubscriptionId": "sub_xxx",
  "currentPeriodEnd": "2026-04-28T00:00:00Z",
  "updatedAt": "2026-03-28T00:00:00Z"
}
```

`isPro()` reads this key, checks `status === "active"` and `currentPeriodEnd > now`. Returns false on any miss or expired value. This keeps the check synchronous-ish (single KV read, no Stripe API call on hot path).

**New Env binding:** Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to `Env` interface in `types.ts` and `wrangler.jsonc`.

**Webhook route:** `POST /billing/webhook`

Hono handler pattern (verified against Hono Stripe webhook docs):
```typescript
// The raw body must not be consumed before signature verification
const body = await c.req.text()
const sig = c.req.header("stripe-signature") ?? ""
const event = await stripe.webhooks.constructEventAsync(
  body, sig, c.env.STRIPE_WEBHOOK_SECRET
)
```

Relevant event types to handle:
- `customer.subscription.created` → write KV with `status: "active"`
- `customer.subscription.updated` → update KV (plan change, status change)
- `customer.subscription.deleted` → update KV with `status: "canceled"`
- `invoice.payment_failed` → update KV with `status: "past_due"`

**Stripe SDK in Workers:** Use `stripe` npm package with Workers-compatible initialization:
```typescript
import Stripe from "stripe"
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
  cryptoProvider: Stripe.createSubtleCryptoProvider(),
})
```
This pattern is required for the Workers runtime (no Node.js `http` module available). Announced GA in October 2025 (Cloudflare blog).

**New Worker route:** `shiplog-worker/src/routes/billing.ts` wired at `app.route("/billing", billingRoutes)`.

**Checkout route:** `POST /billing/checkout` — creates a Stripe Checkout session, returns the URL. CLI `shipcard upgrade` command calls this and opens the browser.

---

### 3. BYOT (Bring Your Own Theme) Storage

**What BYOT means:** User-defined `ThemeColors` object stored in KV, applied at render time instead of a built-in palette.

**KV key:** `user:{username}:theme:{slug}`

Value: JSON-serialized `ThemeColors` (7 color fields: bg, border, title, text, value, icon, footer).

Example: `user:jaime:theme:my-dark`

**URL resolution:**
```
GET /u/:username?style=custom&customTheme=my-dark
```

The card route reads `user:{username}:theme:my-dark` from KV, validates the shape (all 7 fields are valid CSS color strings), and passes the colors directly to the renderer instead of going through `resolveTheme()`.

**Renderer change:** `renderCard()` in the Worker's `svg/index.ts` needs to accept `colors?: ThemeColors` as an override parameter, bypassing the registry lookup when present.

**Card cache key:** Must include the custom theme slug to avoid collisions:
```
card:{username}:custom-{slug}:{layout}:{style}
```

Or simpler: treat custom themes as a new `style` name: `style=custom:{slug}` normalized to a safe filename-safe key.

**Recommended KV key for cache:** `card:{username}:t:{themeslug}:{layout}:{hide}`
Keep the existing key structure but replace the `{style}` segment with a normalized theme identifier.

**BYOT management API (PRO only):**
- `PUT /api/theme/:slug` — create/update custom theme (auth required, isPro check)
- `DELETE /api/theme/:slug` — delete custom theme
- `GET /api/theme/:slug` — read custom theme (public, for card preview)

**BYOT on the CLI:** The `shipcard card --local` command gets a `--custom-theme <file>` flag that reads a JSON file from disk matching the `ThemeColors` shape. No network call needed — purely local rendering. This is a CLI-only addition, no Worker involvement.

---

### 4. Custom Slugs

**What custom slugs mean:** A user can create named card configurations (saved sets of `?theme=&layout=&style=` params) accessible at `/u/:username/:slug`. The slug is a human-readable alias like `/u/jaime/hacker` that resolves to a specific card config.

**KV key:** `slug:{username}:{slug}`

Value shape:
```json
{
  "theme": "dark",
  "layout": "hero",
  "style": "branded",
  "hide": ["cost"],
  "customTheme": "my-dark",
  "createdAt": "2026-03-28T00:00:00Z"
}
```

**Route resolution:**
```
GET /u/:username/:slug
  → slugRoutes handler (new)
  → kv.get(`slug:{username}:{slug}`)
  → resolve to CardOptions
  → render card (same path as GET /u/:username with query params)
```

The slug route sits in a new `routes/slug.ts` file. It must be mounted BEFORE `cardRoutes` in `index.ts` because Hono matches routes in declaration order. Current order is:
```
app.route("/u", dashboardRoutes)    // /:username/dashboard
app.route("/u", apiRoutes)          // /:username/api/*
app.route("/u", cardRoutes)         // /:username
```
Slug routes: `/:username/:slug` — add between `apiRoutes` and `cardRoutes`.

**Slug management API (PRO only):**
- `PUT /api/slug/:slug` — save a named card config
- `DELETE /api/slug/:slug` — delete a slug
- `GET /api/slug/:slug` — read slug config

**CLI integration:** `shipcard link create <slug> --layout hero --style branded` — calls `PUT /api/slug/:slug`.

**Free vs PRO:** Free users get 1 slug. PRO users get unlimited. Check `isPro()` in the PUT handler; if free, count existing slugs via `kv.list({ prefix: \`slug:{username}:\` })` before allowing creation.

---

### 5. Priority CDN (Tiered Cache TTL)

**Current behavior:** Card cache has no TTL (`putCardCache` called without `expirationTtl`). Cache is invalidated explicitly on sync.

**Tiered CDN pattern:** Free users get a short TTL on KV cache (the cache expires and the next request re-renders, slightly slower). PRO users get no TTL (cache persists indefinitely until next sync). The user experience difference is that PRO cards are always served instantly from KV even if the KV entry was evicted by Cloudflare's edge; free cards may occasionally miss and incur a render.

Actually the meaningful distinction is different: since existing code already invalidates on every sync (no TTL), the "priority CDN" is better implemented as a `Cache-Control` response header difference:

```
Free user:  Cache-Control: no-cache, no-store, must-revalidate   ← current (prevents GitHub camo caching)
PRO user:   Cache-Control: public, s-maxage=3600                  ← allows edge CDN caching
```

Wait — the current no-cache headers are intentional to prevent GitHub camo from caching stale cards. Changing this for PRO users trades freshness for speed. This is only valuable for cards served directly (not GitHub README embeds). Reconsider in planning.

**Simpler PRO CDN value:** Dedicated KV namespace for PRO users with more aggressive precompute (all theme variants pre-rendered on sync, not on first miss). Free users: render on first miss and cache. PRO users: all variants pre-rendered during sync itself (warm cache guarantee).

**Implementation in Worker:**
```typescript
// During POST /sync/v2 for PRO users:
if (await isPro(username, env)) {
  await preRenderAllVariants(userData, username, env.CARDS_KV)
}
```

`preRenderAllVariants()` iterates all (style × theme × layout) combinations and pre-populates CARDS_KV. This is a background write during sync — no latency impact on the user's sync call (use `c.executionCtx.waitUntil()` for the pre-render).

**Modified component:** `routes/syncV2.ts` — add PRO check + waitUntil prerender after successful data write.

---

### 6. AI Insights

**What AI insights produce:** Pre-computed narrative strings written to KV, served alongside card data. Examples: "You're in the top 10% of sessions this month", "Your Bash tool calls doubled vs last 30 days".

**Where computation happens:** Worker cron trigger (`scheduled` handler), not on sync.

Rationale: Computing insights on sync would block the sync response. Computing in a cron allows batch processing across all users at off-peak times. The Worker's `scheduled()` handler runs via Cron Triggers (wrangler config).

**Cron pattern:**
```typescript
// wrangler.jsonc addition:
"triggers": { "crons": ["0 3 * * *"] }  // 3am UTC daily

// Worker scheduled handler:
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(computeInsightsForAllUsers(env))
  }
}
```

**Hono + scheduled handler coexistence:** Hono handles `fetch`, the `scheduled` handler is separate. Export both from `index.ts`:
```typescript
export default {
  fetch: app.fetch,
  scheduled: async (event, env, ctx) => { ... }
}
```

**AI backend options (Workers AI vs OpenAI):**
- Workers AI: zero extra cost on paid Workers plan, no API key, but model selection limited
- OpenAI/Anthropic: more capable, but requires secret + cost per user

Recommendation: Workers AI for v2.0 (free to run, `@cf/meta/llama-3.1-8b-instruct` is capable enough for short insight strings). Add `AI` binding to `Env` and `wrangler.jsonc`. Switch to external API if quality proves insufficient.

**New Env binding:** `AI: Ai` (Workers AI binding).

**KV key for insights:** `user:{username}:insights`

Value shape:
```json
{
  "generatedAt": "2026-03-28T00:00:00Z",
  "headline": "Top 5% for sessions this week",
  "bullets": [
    "Bash is your most-used tool (42% of calls)",
    "Cost up 18% vs last 30 days"
  ],
  "version": 1
}
```

**When insights are served:** The `GET /u/:username/api/stats` route already returns SafeStats. Add a new endpoint `GET /u/:username/api/insights` that returns the insights blob from KV. Dashboard renders it. Card rendering does not include insights (cards are static SVG).

**PRO gating:** Insights endpoint returns `403` with `{ "error": "insights require PRO" }` for free users. Cron skips free users to conserve compute.

**Modified component:** `types.ts` (add `Insights` type), `kv.ts` (add `getInsights`/`putInsights`), `routes/api.ts` (add insights endpoint), `index.ts` (export scheduled handler), `wrangler.jsonc` (cron + AI binding).

---

### 7. Agent-Agnostic Data Model

**Current hardcoding in the parser:**
- `schema.ts`: `AssistantEntry.message.model` is always a Claude model string
- `schema.ts`: `UserEntry.version` is a Claude Code version string
- `reader.ts`: reads from `~/.claude/projects/` by default
- `engine/types.ts`: field names like `cwd` are Claude Code-specific

**What needs to change:**

The `ParsedMessage` type (output of parser, input to engine) is already fairly generic:
```typescript
interface ParsedMessage {
  sessionId: string
  timestamp: string
  model: string        // already generic — just a string
  tokens: TokenCounts  // provider-agnostic shape
  toolCalls: string[]  // already generic
  thinkingBlocks: number
  cwd: string          // Claude Code-specific → rename to "context" or keep as-is
  isSidechain: boolean // Claude Code-specific concept
}
```

**Recommended abstraction layer:**

Add a `SourceAdapter` interface in `parser/`:
```typescript
interface SourceAdapter {
  name: string                                     // e.g. "claude-code", "openai-codex"
  defaultDataDir: string                           // e.g. ~/.claude/projects
  discoverFiles(dir: string): AsyncGenerator<string>
  parseEntry(raw: unknown): ParsedMessage | null   // returns null for unsupported entry types
}
```

The existing JSONL reader becomes `ClaudeCodeAdapter` implementing this interface. New adapters (Cursor, Codex) implement the same interface with their own file discovery and entry parsing.

**Engine changes:** None. The engine already consumes `ParsedMessage[]` — if adapter yields `ParsedMessage` the engine is unaffected.

**CLI changes:**
- `config.ts`: add optional `adapter` field (default: `"claude-code"`)
- `args.ts`: add `--adapter <name>` flag
- The default remains `~/.claude/projects/` so zero breaking change for existing users

**MCP changes:** The MCP tools accept `projectsDir` override today. Add optional `adapter` parameter to each tool.

**New module:** `shiplog/src/parser/adapters/` directory with `claude-code.ts` as the first adapter. The existing `reader.ts` and `schema.ts` move into `adapters/claude-code.ts`. The parser `index.ts` becomes an adapter registry.

**SafeStats/SafeTimeSeries:** These are already agent-agnostic (no Claude-specific field names in the cloud payload). The only change needed: add `source: string` to `SafeStats` so the Worker knows which adapter generated the data (useful for community page filtering). Default value: `"claude-code"` — backward compatible.

**Build order implication:** This is an internal refactor with no external surface change. Do it as a first step in v2.0 planning so new adapters can be added cleanly.

---

### 8. Clack CLI Integration

**Current CLI architecture:** Hand-rolled argv parser in `args.ts`, `process.stdout.write()` throughout, no interactive prompts.

**How Clack coexists with the existing pattern:**

Clack (`@clack/prompts`) is an interactive prompts library — it replaces `process.stdout.write` strings with styled terminal UI for flows that need user input. Commander is a different tool (argument parsing). The existing code does NOT use Commander — it uses a custom `args.ts`. So the question is really: where do Clack prompts replace or augment the current argv-parsed linear flows?

**Pattern: selective Clack adoption**

Clack is valuable for interactive wizard flows. Existing commands (`summary`, `costs`, `card --local`) are non-interactive — they take flags and print output. No Clack needed there.

Commands that benefit from Clack:
- `shipcard login` — multi-step OAuth flow with spinners, success/error states
- `shipcard sync` — currently prints a preview and requires `--confirm`; Clack can replace the "run again with --confirm" pattern with an inline confirmation prompt
- `shipcard upgrade` — new command, wizard to select plan + open checkout

**Implementation pattern:**

Each command handler checks `process.stdout.isTTY` before using Clack. Non-TTY environments (CI, piped output) fall back to the existing plain text output. This is the standard Clack usage pattern.

```typescript
// In commands/sync.ts
import { confirm, spinner, outro } from "@clack/prompts"

if (process.stdout.isTTY && !flags.confirm) {
  // Interactive path — show Clack UI
  const s = spinner()
  s.start("Analyzing local stats...")
  const result = await runEngine(...)
  s.stop("Done")

  const shouldSync = await confirm({ message: "Sync these stats to the cloud?" })
  if (isCancel(shouldSync) || !shouldSync) {
    outro("Sync cancelled")
    return
  }
  // proceed with sync
} else {
  // Non-interactive path — existing behavior
}
```

**Clack does NOT replace `args.ts`.** Argument parsing stays in `args.ts`. Clack only replaces terminal output and adds interactive prompts within command handlers.

**New commands that use Clack from the start:**
- `shipcard upgrade` — Clack wizard selecting plan, calls billing API
- `shipcard theme create` — Clack wizard for BYOT color picker
- `shipcard link create` — Clack form for slug + card options

**Dependency:** `@clack/prompts` added to `shiplog/package.json`. This is NOT a zero-dep requirement violation — the zero-dep constraint applies to MCP server and parsing core, not the CLI's UX layer. Verify this assumption against project constraints before phase planning.

---

## New vs Modified Components

### New Files

| File | Purpose |
|------|---------|
| `shiplog-worker/src/billing.ts` | `isPro()`, subscription KV reads/writes |
| `shiplog-worker/src/routes/billing.ts` | Stripe webhook + checkout endpoints |
| `shiplog-worker/src/routes/slug.ts` | Custom slug resolution |
| `shiplog/src/parser/adapters/claude-code.ts` | Claude Code source adapter (extracted from reader.ts) |
| `shiplog/src/parser/adapters/index.ts` | Adapter registry |
| `shiplog/src/cli/commands/upgrade.ts` | `shipcard upgrade` Clack wizard |
| `shiplog/src/cli/commands/theme.ts` | `shipcard theme create/list` BYOT CLI |
| `shiplog/src/cli/commands/link.ts` | `shipcard link create/delete` slug CLI |

### Modified Files

| File | What Changes |
|------|-------------|
| `shiplog-worker/src/types.ts` | Add `Env.STRIPE_SECRET_KEY`, `Env.STRIPE_WEBHOOK_SECRET`, `Env.AI`; add `Subscription`, `Insights`, `CardConfig` (slug) types |
| `shiplog-worker/src/kv.ts` | Add `getSubscription/putSubscription`, `getInsights/putInsights`, `getSlug/putSlug/listSlugs`, `getCustomTheme/putCustomTheme` |
| `shiplog-worker/src/index.ts` | Mount billing routes; add slug routes; export `scheduled` handler alongside `fetch` |
| `shiplog-worker/src/routes/card.ts` | Add PRO theme gating; support custom theme colors; support slug resolution |
| `shiplog-worker/src/routes/syncV2.ts` | Add `waitUntil` prerender for PRO users |
| `shiplog-worker/src/routes/api.ts` | Add `GET /u/:username/api/insights` endpoint |
| `shiplog-worker/src/svg/renderer.ts` | Accept optional `colors: ThemeColors` override param (BYOT) |
| `shiplog-worker/wrangler.jsonc` | Add Stripe secrets, AI binding, cron trigger |
| `shiplog/src/parser/reader.ts` | Extract into adapter pattern (claude-code adapter) |
| `shiplog/src/parser/schema.ts` | Move into `adapters/claude-code.ts` |
| `shiplog/src/cli/index.ts` | Add upgrade, theme, link commands |
| `shiplog/src/cli/args.ts` | Add new command parsing |
| `shiplog/src/cli/commands/sync.ts` | Add Clack interactive path |
| `shiplog/src/cli/commands/login.ts` | Add Clack spinners/states |

---

## Data Flow Changes

### New: PRO Card Serving

```
GET /u/:username?style=neon
  → card route
  → isPro(username, KV)             ← new KV read
  → PRO: resolve neon palette → render
  → FREE: redirect to ?style=github  OR  serve "upgrade" placeholder card
```

### New: Subscription Sync

```
Stripe → POST /billing/webhook
  → verify stripe-signature header
  → parse event type
  → update user:{username}:subscription in KV
  → invalidate card cache (isPro state changed → cached cards may be wrong)
```

### New: AI Insights Cron

```
Cron (3am UTC daily)
  → list all user:{username}:data keys
  → for each PRO user:
    → read SafeTimeSeries from KV
    → compute delta stats (vs 30-day avg)
    → prompt Workers AI with stats context
    → write user:{username}:insights to KV
```

### New: Custom Slug Resolution

```
GET /u/jaime/hacker
  → slug route (matched BEFORE card route)
  → kv.get("slug:jaime:hacker")
  → resolve to CardOptions { theme, layout, style, hide }
  → render card via same renderCard() path
  → cache at card:{username}:slug-hacker:{layout}:...
```

### Modified: Sync with PRO Prerender

```
POST /sync/v2 (PRO user)
  → validate payload
  → write user:{username}:data + timeseries
  → invalidate card cache (existing)
  → ctx.waitUntil(preRenderAllVariants())   ← new, async background
```

---

## KV Key Namespace Summary

Complete key map after v2.0:

| Key Pattern | KV Namespace | TTL | Purpose |
|-------------|-------------|-----|---------|
| `card:{username}:{theme}:{layout}:{style}` | `CARDS_KV` | none (explicit invalidation) | Rendered SVG cache |
| `card:{username}:{theme}:{layout}:{style}:hide={a,b}` | `CARDS_KV` | none | Rendered SVG with hidden stats |
| `card:{username}:t:{customSlug}:{layout}` | `CARDS_KV` | none | Rendered SVG with custom theme |
| `user:{username}:data` | `USER_DATA_KV` | none | SafeStats (source of truth) |
| `user:{username}:timeseries` | `USER_DATA_KV` | none | SafeTimeSeries |
| `user:{username}:subscription` | `USER_DATA_KV` | none | Stripe subscription state |
| `user:{username}:insights` | `USER_DATA_KV` | 24h | AI-computed insights |
| `user:{username}:theme:{slug}` | `USER_DATA_KV` | none | BYOT custom theme colors |
| `slug:{username}:{slug}` | `USER_DATA_KV` | none | Custom slug → CardOptions mapping |
| `token:{token}:username` | `USER_DATA_KV` | 1yr | Auth token → username |
| `meta:cards_served` | `USER_DATA_KV` | none | Global counter |

---

## Suggested Build Order

Dependencies flow bottom-up. Each phase unlocks the next.

```
Phase 1: Agent-agnostic data model refactor (shiplog only)
  — Extract ClaudeCodeAdapter from reader.ts/schema.ts
  — Add SourceAdapter interface
  — Zero user-visible change; enables future adapters
  — No Worker changes

Phase 2: Theme system expansion + BYOT (both packages)
  — Add new palette files in both packages
  — Add custom theme KV storage in Worker
  — Add ?style=custom&customTheme= resolution in card route
  — Add shipcard theme CLI commands
  — PRO gating placeholder (always returns false until Phase 3)

Phase 3: Stripe integration (Worker only)
  — Add Stripe dependency + billing.ts module
  — Add /billing/webhook and /billing/checkout routes
  — Implement isPro() gate
  — Wire PRO gating into theme access (Phase 2 placeholder becomes real)
  — Add shipcard upgrade CLI command

Phase 4: Custom slugs (Worker + CLI)
  — Depends on Phase 3 (slug management is PRO)
  — Add slug KV storage + slug routes
  — Add shipcard link CLI commands

Phase 5: Priority CDN / PRO prerender (Worker only)
  — Depends on Phase 3 (isPro must work)
  — Add waitUntil prerender in syncV2 route
  — Consider Cache-Control header differentiation

Phase 6: AI insights (Worker only)
  — Depends on Phase 3 (insights are PRO)
  — Add Workers AI binding
  — Add cron trigger + scheduled handler
  — Add insights KV storage + API endpoint
  — Dashboard renders insights panel

Phase 7: Clack CLI UX (shiplog only)
  — Independent of Phases 2-6 (UX layer only)
  — Can run in parallel with any phase
  — Refactor login + sync to Clack interactive paths
  — Add Clack UX to upgrade, theme, link commands (created in earlier phases)
```

**Parallelism note:** Phase 7 (Clack) can be worked in parallel with any phase because it touches only CLI command UX, not data model or Worker logic.

---

## Anti-Patterns to Avoid

### Do Not Put Stripe Logic in the Card Route

The card route must stay fast (< 5ms on cache hit). Any Stripe API call in the hot path would add 50-200ms latency. `isPro()` must be a single KV read only. Stripe state is always written to KV asynchronously by the webhook handler, never fetched live during card serving.

### Do Not Share Theme Code Between Packages as an npm Dep

Tempting to extract `ThemeColors` into a shared package. Do not do this. The Worker and CLI have independent build and deploy lifecycles. A shared package introduces a coordinated deploy requirement. Keep the duplication — it is 200 lines total and changes rarely.

### Do Not Compute AI Insights During Sync

Sync must be synchronous and fast (user is waiting). Insights computation involves an AI inference call (100-500ms minimum). Use `ctx.waitUntil()` only for lightweight background work (prerendering SVG variants). Insights belong in the cron path.

### Do Not Require isPro() for Insight Storage, Only for Insight Serving

The cron computes insights for all users to amortize KV list cost, but the API endpoint gates serving behind PRO check. This decouples the compute cost (always paid on cron) from the business model decision (serve or not). Revisit if compute cost scales poorly.

### Do Not Use Clack Outside TTY Contexts

Clack assumes a TTY. Always guard with `process.stdout.isTTY`. CI environments, piped shells, and MCP tool invocations will not have a TTY. Every command that uses Clack must have a non-interactive fallback (flags-only path).

---

## Sources

- Existing codebase: direct inspection of `shiplog/src/` and `shiplog-worker/src/` (HIGH confidence)
- Hono Stripe webhook pattern: https://hono.dev/examples/stripe-webhook (HIGH confidence)
- Cloudflare native Stripe SDK support: https://blog.cloudflare.com/announcing-stripe-support-in-workers/ (HIGH confidence — October 2025 announcement)
- Cloudflare Workers cron triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/ (HIGH confidence)
- Cloudflare Workers scheduled handler: https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/ (HIGH confidence)
- Stripe Workers template: https://github.com/stripe-samples/stripe-node-cloudflare-worker-template (MEDIUM confidence — sample, may lag SDK)
- Clack prompts npm: https://www.npmjs.com/package/@clack/prompts (HIGH confidence)
- URL shortener KV pattern (slug model): community-verified pattern across multiple sources (MEDIUM confidence)
