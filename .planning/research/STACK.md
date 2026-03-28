# Technology Stack

**Project:** ShipCard v2.0
**Researched:** 2026-03-28
**Research Mode:** Stack dimension — v2.0 Themes + Monetization milestone

---

## Context: What v1.0 Already Has (Do Not Re-Research)

| Layer | Existing | Status |
|-------|---------|--------|
| Local CLI | `@modelcontextprotocol/sdk ^1.28.0`, `zod ^4.3.6`, `@octokit/auth-oauth-device ^7.1.5` | Locked |
| Worker framework | `hono ^4.0.0` | Locked |
| Worker bindings | `CARDS_KV`, `USER_DATA_KV` | Locked |
| Build | TypeScript `^5.0.0`, plain `tsc` | Locked |
| Theme system | 3 styles (github, branded, minimal) × 2 themes (dark, light) = 6 palettes | Extending |

The `shipcard/` and `shipcard-worker/` packages share a single version number. Both are on v1.0.0. v2.0 work adds to both.

---

## New Dependencies Required for v2.0

### 1. Stripe Integration (`shipcard-worker/`)

**Recommendation: `stripe ^17.x` — NOT v21.0.1**

v21.0.0 shipped 2026-03-26 with breaking changes: all `decimal_string` fields changed type from `string` to `Stripe.Decimal`. This is a fresh major version with active churn. Pin to the last stable pre-breaking-change series.

Run `npm view stripe dist-tags` at implementation time to confirm the correct stable pin.

| Technology | Version | Location | Purpose |
|------------|---------|---------|--------|
| `stripe` | `^17.x` (latest stable before v21 breaking changes) | `shipcard-worker/` | Stripe API client — subscriptions, webhooks, checkout sessions |

**Initialization pattern for Cloudflare Workers (verified from Stripe/Cloudflare official announcement):**

```typescript
import Stripe from 'stripe/lib/stripe.js';

export const webCrypto = Stripe.createSubtleCryptoProvider();

function getStripe(env: Env): ReturnType<typeof Stripe> {
  return Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),  // REQUIRED — Workers has no node:https
  });
}
```

**Key requirements:**
- `httpClient: Stripe.createFetchHttpClient()` — Cloudflare Workers runtime has no `node:https`. Without this, Stripe SDK throws at runtime.
- `Stripe.createSubtleCryptoProvider()` — passed to `stripe.webhooks.constructEventAsync()` for webhook signature verification using Web Crypto API.
- Does NOT require `nodejs_compat` flag when using `createFetchHttpClient()`. The Cloudflare announcement confirmed native support without the Node compat layer.

**Webhook event minimum set for SaaS subscriptions (verified from Stripe docs):**

| Event | What It Means | Required Action |
|-------|-------------|----------------|
| `checkout.session.completed` | New subscriber signed up | Write subscription record to D1, grant Pro access |
| `invoice.paid` | Monthly/annual renewal succeeded | Extend access period in D1 |
| `invoice.payment_failed` | Card declined | Flag account, send payment reminder |
| `customer.subscription.deleted` | Cancelled or expired | Revoke Pro access in D1 |
| `customer.subscription.updated` | Plan changed, trial ended | Update plan tier in D1 |

**Stripe Checkout vs custom form:** Use Stripe Checkout (hosted). At this scale, zero PCI scope. Checkout handles SCA, 3DS, regional payment methods. Not worth the maintenance cost of a custom form.

---

### 2. D1 Database (`shipcard-worker/`)

**Recommendation: Add Cloudflare D1 binding — zero new npm dependencies.**

KV is wrong for subscription state. KV is eventually consistent and has no atomic transactions. D1 is the correct store for user plan tier, Stripe customer IDs, and subscription lifecycle state.

| Technology | Version | Location | Purpose |
|------------|---------|---------|--------|
| Cloudflare D1 | platform service (no npm package) | `shipcard-worker/` | Subscription state, user plan tier, Stripe customer mapping |

**wrangler.jsonc addition:**
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "shipcard-prod",
      "database_id": "<generated after: npx wrangler d1 create shipcard-prod>"
    }
  ]
}
```

**Minimum schema for subscription management:**

```sql
CREATE TABLE users (
  username         TEXT PRIMARY KEY,   -- GitHub username, existing PK
  stripe_customer  TEXT UNIQUE,        -- Stripe customer_id (cus_...)
  plan             TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  sub_id           TEXT,               -- Stripe subscription_id (sub_...)
  current_period_end INTEGER,          -- Unix timestamp, from Stripe
  insights_opt_in  INTEGER DEFAULT 0,  -- 1 = opted into weekly AI insights
  created_at       INTEGER DEFAULT (unixepoch()),
  updated_at       INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_stripe_customer ON users(stripe_customer);
```

**D1 free tier limits (verified from Cloudflare pricing page, 2026-03-28):**
- Free: 5M rows read/day, 100K writes/day, 500 MB storage
- Paid ($5/mo Workers plan): 25B rows read/month included, 50M writes included, 5 GB included

D1 handles ShipCard's scale up to hundreds of thousands of users on the free tier. The $5/month threshold triggers only when comfortably profitable.

**No Drizzle/Prisma.** Use `env.DB.prepare()` directly. ShipCard's schema is 1-2 tables. An ORM adds complexity with zero benefit at this scale.

---

### 3. `@clack/prompts` (`shipcard/`)

**Recommendation: `@clack/prompts ^1.1.0`**

| Technology | Version | Location | Purpose |
|------------|---------|---------|--------|
| `@clack/prompts` | `^1.1.0` | `shipcard/` (CLI only, not MCP) | Interactive CLI prompts with styled UI |

**Current state (verified from official docs and GitHub, 2026-03-28):**
- Latest: `1.1.0` released 2026-03-03
- 7,600+ GitHub stars, 63,900+ dependents — actively maintained
- `@clack/core` is the headless primitive; `@clack/prompts` is the opinionated UX layer (use `prompts`, not `core`)

**Available APIs:**

| API | What It Does |
|-----|-------------|
| `intro(title)` | Opens a styled session header |
| `outro(message)` | Closes with success/final message |
| `text({ message, validate? })` | Single-line text input |
| `password({ message, validate? })` | Masked input |
| `confirm({ message })` | Yes/No prompt |
| `select({ message, options })` | Single-choice menu |
| `multiselect({ message, options })` | Multi-choice menu |
| `autocomplete({ message, options })` | Searchable dropdown |
| `spinner()` | Returns `{ start(msg), stop(msg), message(msg) }` |
| `progress()` | Returns `{ advance(), stop() }` |
| `log.info / .success / .error / .warn` | Semantic log lines |
| `isCancel(value)` | Check if user pressed Ctrl+C |

**Integration with commander — NOT a migration:**

Commander handles `argv` parsing and routes to command handlers. Clack handles interactive prompts *within* those handlers. They are fully orthogonal — no conflicts, no rewrite needed.

```typescript
// commander command definition — existing pattern, keep as-is
program
  .command('card')
  .option('--theme <name>', 'card theme')
  .action(async (options) => {
    // if --theme not passed, ask interactively via clack
    if (!options.theme) {
      const theme = await select({
        message: 'Choose a theme',
        options: [
          { value: 'github-dark', label: 'GitHub Dark' },
          { value: 'dracula', label: 'Dracula' },
        ],
      });
      if (isCancel(theme)) { process.exit(0); }
      options.theme = theme;
    }
  });
```

**Commands that benefit from clack in v2.0:**
- `shipcard login` — already has prompts, replace raw readline
- `shipcard sync` — progress spinner during upload
- `shipcard themes` — select/preview from theme list
- `shipcard insights` — opt-in confirmation

**Startup cost:** ~30ms added to CLI startup. Acceptable for interactive commands. Non-interactive commands (`summary`, `costs`) do not invoke clack.

---

### 4. Theme Infrastructure (both packages)

**Recommendation: TypeScript objects in `shipcard/` + JSON serialized to `USER_DATA_KV` in worker. Zero new npm dependencies.**

The existing theme system in `shipcard/src/card/themes/` is already well-structured:
- `ThemeColors` interface: 7 slots (bg, border, title, text, value, icon, footer)
- `StyleName` type union and `resolveTheme()` registry function
- 3 styles × 2 dark/light variants = 6 palettes today

**v2.0 expansion strategy for 8-10 curated themes:**

Flatten the two-axis model (style + theme) into a single `ThemeName`:

```typescript
export type ThemeName =
  // existing (backward compat — keep these string values)
  | 'github-dark' | 'github-light'
  | 'branded-dark' | 'branded-light'
  | 'minimal-dark' | 'minimal-light'
  // new curated themes (v2.0)
  | 'dracula'
  | 'nord'
  | 'solarized-dark' | 'solarized-light'
  | 'monokai'
  // BYOT
  | `custom:${string}`;
```

Each curated theme is a `ThemeColors` object file in `shipcard/src/card/themes/`. No runtime parsing. No external files. Pure TypeScript objects that compile to ~200 bytes each.

**BYOT (Bring Your Own Theme) — custom theme storage:**

| Location | Key Pattern | Content |
|----------|------------|---------|
| `~/.shipcard/themes/<slug>.json` (local) | filesystem | User's custom `ThemeColors` JSON for local card rendering |
| `USER_DATA_KV` (worker) | `theme:{username}:{slug}` | Same JSON for remote card serving |

Custom theme upload: `shipcard themes push --name my-theme` reads local JSON, validates `ThemeColors` shape (all 7 color fields present, valid CSS hex/rgb strings), and `PUT /api/themes/:slug` to worker. Worker validates and writes to KV. Card requests with `?theme=custom:my-theme` read from KV at render time.

**Worker-side resolution (extends existing `resolveTheme()`):**

```typescript
async function resolveThemeColors(
  themeName: string,
  env: Env,
  username?: string
): Promise<ThemeColors> {
  if (themeName.startsWith('custom:') && username) {
    const slug = themeName.slice(7);
    const stored = await env.USER_DATA_KV.get(`theme:${username}:${slug}`);
    if (stored) return JSON.parse(stored) as ThemeColors;
  }
  return resolveBuiltinTheme(themeName); // existing registry, unchanged
}
```

No new npm packages. KV values are unlimited strings (25 MB max). A `ThemeColors` JSON object is ~200 bytes.

---

### 5. AI Insights (pre-computed weekly digest)

**Recommendation: `@anthropic-ai/sdk ^0.80.0` in `shipcard-worker/` + Cloudflare Workers cron trigger.**

| Technology | Version | Location | Purpose |
|------------|---------|---------|--------|
| `@anthropic-ai/sdk` | `^0.80.0` | `shipcard-worker/` | Call Claude API from scheduled Worker |
| Cloudflare Workers Cron | platform feature (no npm) | `shipcard-worker/` | Weekly scheduled digest generation |

**Architecture: scheduled Worker, pre-computed, served from KV.**

Insights do not run on-demand — that would be slow (2-5s per user) and expensive. They run on a weekly schedule via Cloudflare cron, write results to KV, and the dashboard fetches from KV at zero latency.

**wrangler.jsonc addition:**
```jsonc
{
  "triggers": {
    "crons": ["0 6 * * 1"]  // Every Monday at 06:00 UTC
  }
}
```

**Scheduled handler pattern:**
```typescript
export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    if (controller.cron === '0 6 * * 1') {
      await generateWeeklyInsights(env);
    }
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    return app.fetch(request, env); // existing hono app, unchanged
  }
};
```

**Insight generation flow:**
1. D1 query: `SELECT username FROM users WHERE insights_opt_in = 1`
2. For each user: read `SafeTimeSeries` from `USER_DATA_KV`
3. Build summarization prompt from last 7 days of `SafeDailyStats`
4. Call `claude-haiku-3-5` via `@anthropic-ai/sdk`
5. Write result string to `USER_DATA_KV` at `insights:{username}:latest`
6. Dashboard panel reads via `GET /api/insights/latest` (Bearer-gated)

**Model: `claude-haiku-3-5`.** Haiku is 30x cheaper than Sonnet for simple summarization. At ~500 input tokens + ~300 output tokens per user: ~$0.0004/user/week at Haiku pricing. Viable at 10,000 users for ~$4/week.

**`nodejs_compat` flag:** The `@anthropic-ai/sdk` uses `node:crypto` internally. Add `nodejs_compat` to `wrangler.jsonc` compatibility flags.

**Data source:** `SafeTimeSeries` already exists in `USER_DATA_KV` from v1.1 sync. No new data collection needed. The cron reads what users have already uploaded.

**Privacy gate:** Only generate for `insights_opt_in = 1` users. Opt-in is explicit (never default). The `ANTHROPIC_API_KEY` cost is borne by ShipCard, limited to Pro plan users or explicit opt-in to prevent unbounded cost.

---

### 6. Agent-Agnostic Data Model

**Recommendation: Zero new npm dependencies — this is a data modeling and refactoring decision.**

**Current state:** The `SafeStats` and `SafeTimeSeries` types are structurally generic but the parser layer (`shipcard/src/parser/`) is Claude Code-specific.

**Abstraction: `AgentParser` interface in `shipcard/src/engine/`**

```typescript
// New: agent-agnostic session representation
export interface AgentSession {
  agent: 'claude-code' | 'cursor' | 'windsurf' | 'aider' | 'unknown';
  date: string;           // ISO date
  model?: string;
  durationMs?: number;
  tokens?: {
    input: number;
    output: number;
    cacheCreate?: number;
    cacheRead?: number;
  };
  costCents?: number;
  toolCalls?: Record<string, number>;
}

// Parser contract — each agent implements this
export interface AgentParser {
  readonly agent: AgentSession['agent'];
  canParse(filePath: string): boolean;
  parse(filePath: string): AsyncGenerator<AgentSession>;
}
```

The existing Claude Code parser in `shipcard/src/parser/` is refactored to implement `AgentParser`. The `engine/aggregator.ts` layer accepts `AgentSession[]` regardless of source.

**What other agents expose — current state:**

| Agent | Telemetry Format | Parseable Locally? |
|-------|-----------------|-------------------|
| Claude Code | JSONL at `~/.claude/projects/` | YES — implemented |
| Cursor | Server-side only per privacy policy | NO — no local files |
| Windsurf | Unknown — requires investigation | UNKNOWN |
| Aider | `.aider.input.history` + `.aider.chat.history.md` (text) | Partial — no token data |
| Codex CLI | Unknown | UNKNOWN |

**Key finding on Cursor (MEDIUM confidence):** Cursor's usage data is server-side. No community reports of local JSONL files equivalent to Claude Code's `~/.claude/projects/`. Agent-agnostic model cannot support Cursor via local parsing without a data export flow from Cursor's dashboard.

**Scope for v2.0:** Build the `AgentParser` interface and refactor Claude Code parser to implement it. Ship no other parsers in v2.0. The interface enables future parsers without a data model rewrite. Do not commit to Cursor support until local data availability is confirmed.

---

## Updated Dependency Tables

### `shipcard/` — new in v2.0

| Package | Version | Reason |
|---------|---------|--------|
| `@clack/prompts` | `^1.1.0` | Interactive CLI prompts for themes, login improvements, insights opt-in |

### `shipcard-worker/` — new in v2.0

| Package | Version | Reason |
|---------|---------|--------|
| `stripe` | `^17.x` (pin before v21) | Subscriptions, webhooks, Stripe Checkout |
| `@anthropic-ai/sdk` | `^0.80.0` | Weekly insight generation from scheduled Worker |

### `shipcard-worker/` — platform additions (no npm)

| Service | How Added | Reason |
|---------|----------|--------|
| Cloudflare D1 | `wrangler.jsonc` d1_databases binding | Subscription state, user plan tier |
| Cloudflare Workers Cron | `wrangler.jsonc` triggers.crons | Weekly insight generation schedule |

### `wrangler.jsonc` full v2.0 diff

```jsonc
{
  // ADD: nodejs_compat for @anthropic-ai/sdk (and optionally stripe)
  "compatibility_flags": ["nodejs_compat"],

  // ADD: D1 database binding
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "shipcard-prod",
      "database_id": "<run: npx wrangler d1 create shipcard-prod>"
    }
  ],

  // ADD: weekly cron for AI insights
  "triggers": {
    "crons": ["0 6 * * 1"]
  }
}
```

### New secrets (set via wrangler secret put)

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put ANTHROPIC_API_KEY
```

### Updated `Env` interface in `types.ts`

```typescript
export interface Env {
  // existing — unchanged
  CARDS_KV: KVNamespace;
  USER_DATA_KV: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  TOKEN_SECRET: string;
  // new in v2.0
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ANTHROPIC_API_KEY: string;
}
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Stripe in Workers | `stripe` with `createFetchHttpClient()` | Direct REST API calls | Official SDK handles idempotency, retries, webhook sig verification, TypeScript types. Raw fetch saves nothing meaningful. |
| Stripe version | `^17.x` | `^21.0.1` (latest) | v21.0.0 shipped 2026-03-26 with breaking `Decimal` type changes. Pin to stable series. |
| Subscription state | Cloudflare D1 | KV | KV has no transactions and is eventually consistent. Cannot safely update `plan + sub_id + period_end` atomically. D1 provides ACID SQLite guarantees. |
| Subscription state | Cloudflare D1 | External Postgres | D1 is native to the Cloudflare stack. No new infrastructure, no connection pools, no cold-start latency. Postgres is overkill for a users table at this scale. |
| Interactive CLI | `@clack/prompts` | `inquirer` / `@inquirer/prompts` | Clack is purpose-built for modern Node ESM CLIs, cleaner API surface, better aesthetics for developer tooling. Both are valid; Clack wins on DX. |
| Custom theme storage | KV (ThemeColors JSON, ~200 bytes) | R2 | R2 is for large files. KV is the correct tool for small, frequently-read values. |
| AI insights hosting | `@anthropic-ai/sdk` in Cloudflare Worker cron | External cron service (Trigger.dev, GitHub Actions) | Cloudflare cron keeps the stack fully Cloudflare-native. No external dependencies. |
| AI model for insights | `claude-haiku-3-5` | `claude-sonnet-4-5` | Haiku is 30x cheaper. Digest summaries do not require Sonnet-level reasoning. |
| D1 access | Raw `env.DB.prepare()` | Drizzle ORM | Single table. Drizzle adds 30KB+ bundle size and a codegen step for zero benefit at this scale. |

---

## Confidence Assessment

| Claim | Confidence | Basis |
|-------|------------|-------|
| Stripe `createFetchHttpClient()` required for Workers | HIGH | Official Cloudflare/Stripe joint announcement, code example verified |
| Stripe v21.0.0 has breaking `Decimal` type changes | HIGH | GitHub releases page, confirmed 2026-03-26 |
| `@clack/prompts` v1.1.0 is current | HIGH | Official GitHub + npm search results confirming 2026-03-03 release |
| Clack + Commander fully orthogonal | HIGH | Official Clack docs, widely used community pattern |
| D1 free tier: 5M rows read/day | HIGH | Official Cloudflare pricing page, fetched 2026-03-28 |
| `@anthropic-ai/sdk` v0.80.0 is current | HIGH | npm search results, published 9 days ago |
| `nodejs_compat` needed for `@anthropic-ai/sdk` | MEDIUM | Cloudflare docs confirm flag for Node.js API deps; SDK uses `node:crypto` internals — verify during implementation |
| Cursor has no local JSONL telemetry | MEDIUM | Cursor privacy policy states server-side; no community reports of local files — absence of evidence, not evidence of absence |
| Haiku pricing estimate ~$0.0004/user/week | MEDIUM | Based on training data pricing; verify against current Anthropic pricing page before budgeting |

---

## Sources

- Cloudflare + Stripe native Workers support: https://blog.cloudflare.com/announcing-stripe-support-in-workers/
- stripe-node GitHub releases (v21.0.1 latest): https://github.com/stripe/stripe-node/releases
- Stripe webhook minimum events: https://docs.stripe.com/billing/subscriptions/build-subscriptions
- @clack/prompts official docs: https://bomb.sh/docs/clack/packages/prompts/
- @clack/prompts GitHub (v1.1.0, 7.6K stars): https://github.com/bombshell-dev/clack
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Scheduled Handler docs: https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
- Cloudflare Cron Triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Cloudflare nodejs_compat flag: https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- @anthropic-ai/sdk npm (v0.80.0): https://www.npmjs.com/package/@anthropic-ai/sdk
- Cursor data use & privacy policy: https://cursor.com/data-use
