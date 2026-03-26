# Phase 4: Cloud Worker - Research

**Researched:** 2026-03-25
**Domain:** Cloudflare Workers + KV, GitHub OAuth device flow, SVG serving, API key auth, sync CLI flow
**Confidence:** HIGH (core stack verified via official Cloudflare docs); MEDIUM (GitHub camo behavior verified via multiple sources)

---

## Summary

Phase 4 builds a Cloudflare Worker that serves cached SVG stats cards at the edge and accepts stat syncs from the CLI. The Worker is the first networked component in the ShipLog stack. Three major domains require research: (1) Cloudflare Worker + KV setup patterns, (2) GitHub OAuth device flow for CLI auth, and (3) SVG serving behavior when embedded in GitHub READMEs via the camo proxy.

The Cloudflare side is well-documented and low-risk. The current standard is a TypeScript Worker using Hono for routing (officially endorsed by Cloudflare), KV bindings for caching, and `wrangler secret put` for secrets. The Worker deploys to a `workers.dev` subdomain by default — no custom domain needed for alpha. Hono adds ~14KB to the bundle and gives clean route syntax with middleware support, which is the right tradeoff for a Worker with 4+ routes.

GitHub OAuth device flow is implemented cleanly using `@octokit/auth-oauth-device`. The library handles polling, code expiry, and interval backoff. After the OAuth token is obtained, the CLI calls the GitHub API to retrieve the username, then exchanges both for a Worker-issued bearer token stored in `~/.shiplog/config.json`. The Worker issues its own short tokens and stores them in KV — it does not store GitHub OAuth tokens.

The most important research finding is about GitHub's camo proxy caching SVGs for multi-day periods, which is exactly what ShipLog is designed to avoid. The fix is to send `Cache-Control: no-cache, no-store, must-revalidate` and `Pragma: no-cache` from the Worker endpoint. GitHub's camo will respect no-store and re-fetch on each page load. This is verified behavior used by the readme-stats ecosystem. ShipLog's design (cache-until-sync, per-variant KV keys) works cleanly: the Worker always returns current KV content, and the no-store headers ensure camo doesn't create a secondary layer.

**Primary recommendation:** Use Hono on Cloudflare Workers with KV bindings. Use `@octokit/auth-oauth-device` for CLI auth. Always send `Cache-Control: no-cache, no-store` from the card endpoint — this is the single most important correctness requirement.

---

## Standard Stack

### Core

| Library/Tool | Version | Purpose | Why Standard |
|---|---|---|---|
| `hono` | ^4.x | Worker routing, middleware, context | Officially endorsed by Cloudflare; zero deps; typed route params; SVG/custom content type support |
| `wrangler` | ^4.x | Dev, deploy, secret management, type generation | Official Cloudflare CLI; auto-provisions KV with wrangler 4.45+ |
| `@cloudflare/workers-types` (via `wrangler types`) | generated | TypeScript types for KV, env, fetch | Modern approach: `npx wrangler types` generates `worker-configuration.d.ts` |
| Cloudflare Workers KV | platform | Per-variant SVG cache, user data store | Free tier generous; edge-replicated reads; ~60s eventual consistency (acceptable for sync-based invalidation) |

### Supporting (CLI side)

| Library | Version | Purpose | When to Use |
|---|---|---|---|
| `@octokit/auth-oauth-device` | ^7.x | GitHub OAuth device flow | Only library needed; no client secret required |
| `node-fetch` or native `fetch` | Node 18+ built-in | CLI calls to Worker API endpoints | Node 18+ has global fetch; no lib needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Hono | Vanilla fetch handler with URL pattern matching | URLPattern is available in Workers but Hono is less boilerplate for 4+ routes with middleware |
| KV for card cache | R2 | R2 has per-request costs; KV is free for this read volume and fits key-value access pattern perfectly |
| Worker-issued bearer tokens | Forward GitHub OAuth token | Forwarding GitHub tokens exposes user's GitHub permissions; worker-issued tokens are scoped and revocable |
| `@octokit/auth-oauth-device` | Raw fetch to GitHub device endpoints | Library handles polling interval, expiry, error states correctly; ~2KB; correct tradeoff |

### Installation

Worker:
```bash
npm create cloudflare@latest -- shiplog-worker
# Choose "Hello World" Worker + TypeScript
cd shiplog-worker
npm install hono
npx wrangler types
```

CLI additions (in existing `shiplog/` package):
```bash
npm install @octokit/auth-oauth-device
```

---

## Architecture Patterns

### Recommended Project Structure

```
shiplog-worker/
├── src/
│   ├── index.ts          # Hono app entry, route registration
│   ├── routes/
│   │   ├── card.ts       # GET /card/:username
│   │   ├── sync.ts       # POST /sync
│   │   ├── auth.ts       # GET /auth/callback, POST /auth/exchange
│   │   └── configure.ts  # GET /configure (HTML playground)
│   ├── kv.ts             # KV access helpers (get, put, delete, list)
│   ├── svg.ts            # SVG rendering (port from Phase 3 renderer)
│   ├── auth.ts           # Token validation middleware
│   └── types.ts          # Env interface, SafeStats type, shared types
├── wrangler.jsonc
├── .dev.vars             # Local secrets (gitignored)
├── worker-configuration.d.ts  # Generated by wrangler types
└── package.json
```

The existing `shiplog/src/card/` renderer should be copied (not imported) into the Worker — the Worker has no dependency on the npm package at runtime.

### Pattern 1: Hono App Entry

```typescript
// Source: https://hono.dev/docs/getting-started/cloudflare-workers
// src/index.ts
import { Hono } from 'hono'
import type { Env } from './types.js'

const app = new Hono<{ Bindings: Env }>()

// Routes registered via sub-app imports
app.route('/card', cardRoutes)
app.route('/sync', syncRoutes)
app.route('/auth', authRoutes)
app.route('/configure', configureRoutes)

export default app
```

### Pattern 2: Environment Type with KV Binding

```typescript
// Source: https://developers.cloudflare.com/kv/get-started/
// src/types.ts
export interface Env {
  CARDS_KV: KVNamespace
  USER_DATA_KV: KVNamespace
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  TOKEN_SECRET: string  // HMAC key for issuing bearer tokens
}
```

### Pattern 3: wrangler.jsonc Configuration

```jsonc
// Source: https://developers.cloudflare.com/workers/wrangler/configuration/
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "shiplog-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-03-25",
  "kv_namespaces": [
    {
      "binding": "CARDS_KV",
      "id": "<NAMESPACE_ID>"
    },
    {
      "binding": "USER_DATA_KV",
      "id": "<NAMESPACE_ID>"
    }
  ]
}
```

Secrets are NOT in wrangler.jsonc. Set via:
```bash
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put TOKEN_SECRET
```

Local dev secrets go in `.dev.vars` (dotenv format, gitignored):
```
GITHUB_CLIENT_SECRET="ghp_..."
TOKEN_SECRET="random-32-byte-hex"
```

### Pattern 4: SVG Card Response with Correct Headers

```typescript
// Source: https://fabiofranchino.com/log/how-to-return-an-svg-source-from-a-cloudflare-worker/
// KEY: Cache-Control headers prevent GitHub camo from caching stale cards
return c.body(svgString, 200, {
  'Content-Type': 'image/svg+xml',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
})
```

### Pattern 5: KV Key Naming for Per-Variant Cache

```
// User data (SafeStats payload):
user:{username}:data

// Rendered SVG variants (per appearance combo):
card:{username}:{theme}:{layout}:{style}

// Auth tokens:
token:{username}:active
```

Delete all variants on sync:
```typescript
// Source: https://developers.cloudflare.com/kv/api/list-keys/
const listed = await env.CARDS_KV.list({ prefix: `card:${username}:` })
await Promise.all(listed.keys.map(k => env.CARDS_KV.delete(k.name)))
```

### Pattern 6: GitHub OAuth Device Flow in CLI

```typescript
// Source: https://github.com/octokit/auth-oauth-device.js
import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device'

const auth = createOAuthDeviceAuth({
  clientType: 'oauth-app',
  clientId: 'YOUR_GITHUB_CLIENT_ID',  // public — safe in CLI
  scopes: ['read:user'],              // only need username
  onVerification(verification) {
    console.log(`Open: ${verification.verification_uri}`)
    console.log(`Enter code: ${verification.user_code}`)
    // Optional: open browser automatically
  }
})

const { token } = await auth({ type: 'oauth' })

// Fetch username with the GitHub token
const res = await fetch('https://api.github.com/user', {
  headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'shiplog-cli' }
})
const { login: username } = await res.json()
```

The GitHub client ID is public — device flow does not use the client secret on the CLI side. The secret is only needed on the Worker for the token exchange endpoint. This means the CLI can have the client ID hardcoded.

### Pattern 7: Worker Bearer Token Auth Middleware (Hono)

```typescript
// Source: https://developers.cloudflare.com/workers/examples/auth-with-headers/
import type { MiddlewareHandler } from 'hono'

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization' }, 401)
  }
  const token = authHeader.slice(7)
  const record = await c.env.USER_DATA_KV.get(`token:${token}:username`)
  if (!record) {
    return c.json({ error: 'Invalid token' }, 401)
  }
  c.set('username', record)
  await next()
}
```

Store tokens as: key=`token:{token_value}:username`, value=`{username}`. This allows O(1) lookup and easy revocation by deleting the key.

### Anti-Patterns to Avoid

- **No TTL on card cache:** ShipLog explicitly caches until next sync (design decision). Do NOT set `expirationTtl` on KV puts for card entries. TTL is for token expiry only.
- **Storing GitHub OAuth token in KV:** Don't. Exchange it immediately for a Worker-issued token. The GitHub token has broad user permissions and should never persist server-side.
- **Time-based cache invalidation for SVG via HTTP headers:** The `Cache-Control: no-store` approach means GitHub camo re-fetches on every render. The KV entry itself is the source of truth. This is correct.
- **Building a custom router:** URLPattern is available but Hono is the correct choice here — Cloudflare officially endorses it and it handles the OPTIONS preflight for CORS automatically.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| GitHub device flow polling + backoff | Custom poll loop | `@octokit/auth-oauth-device` | Handles interval, expiry (15 min), 429 rate limits, error states |
| Worker routing | Custom URL dispatch switch | Hono | Route params, middleware ordering, CORS handling, TypeScript types |
| TypeScript types for KV/Env | Manual `d.ts` file | `npx wrangler types` | Generates correct types from your actual wrangler.jsonc bindings |
| SVG cache prefix-delete | Implement paginated list-delete | `list({ prefix })` + `delete()` per key | KV list supports prefix; bulk delete from Worker is unsupported — must loop |

**Key insight:** The GitHub device flow has ~6 distinct error states (expired_token, access_denied, slow_down, etc.) and a variable polling interval. This is not worth implementing from scratch.

---

## Common Pitfalls

### Pitfall 1: GitHub Camo Caches SVGs for Days

**What goes wrong:** Without correct Cache-Control headers, GitHub's camo proxy caches the SVG and ignores subsequent updates. Users see stale cards for hours or days. This is the core problem ShipLog is designed to avoid.

**Why it happens:** Camo applies long TTLs (observed: 31-day max-age in some cases) by default. The origin server's headers must explicitly opt out.

**How to avoid:** Always return `Cache-Control: no-cache, no-store, must-revalidate` and `Pragma: no-cache` from the card endpoint. This forces camo to re-fetch on every page render.

**Warning signs:** Card shows old data after a sync. No error — just stale content.

### Pitfall 2: KV Eventual Consistency on Sync + Immediate Fetch

**What goes wrong:** User syncs, immediately requests their card from a different CF edge node, gets the old cached SVG because KV propagation takes up to 60 seconds.

**Why it happens:** KV is eventually consistent — writes may not be immediately visible across all regions.

**How to avoid:** The sync endpoint (`POST /sync`) should invalidate KV entries AND re-render the SVG synchronously before returning. That way the very next request has the new card already in KV.

**Warning signs:** Card is stale immediately after sync, then updates a minute later.

### Pitfall 3: `wrangler dev` vs Production KV

**What goes wrong:** `wrangler dev` uses local in-memory KV by default. Code that works locally fails in production due to KV binding differences.

**How to avoid:** For testing actual KV behavior, use `wrangler dev --remote` to connect to real Cloudflare KV namespaces.

**Warning signs:** Local tests pass, production fails on KV reads/writes.

### Pitfall 4: GitHub Client Secret Exposed in CLI

**What goes wrong:** Including the `GITHUB_CLIENT_SECRET` in the CLI bundle, which is published to npm and trivially extractable.

**Why it happens:** Confusion about which side needs the secret. Device flow does NOT need the secret on the CLI.

**How to avoid:** The client secret lives only in the Worker (as a Wrangler secret). The CLI only needs the public `clientId`. The Worker has a token exchange endpoint that uses the secret.

**Warning signs:** Any code path in `shiplog/src/` that reads `GITHUB_CLIENT_SECRET`.

### Pitfall 5: KV List Pagination Ignored

**What goes wrong:** `list({ prefix })` returns max 1000 keys. If a user has >1000 cached variants (unlikely but theoretically possible), some keys are not deleted on sync.

**Why it happens:** list() is paginated via `cursor` but the default implementation only fetches the first page.

**How to avoid:** Check `list_complete` flag on the KV list result. For `shiplog sync --delete`, loop through all pages. For normal sync invalidation, the max appearance combos are bounded (3 themes × 2 modes × 3 layouts = 18 variants max) — single page always sufficient.

**Warning signs:** Old card variants survive a sync in theory. Not a practical risk for Phase 4.

### Pitfall 6: SVG Renderer Needs Re-Entry in Worker

**What goes wrong:** Trying to import the SVG renderer from the published `shiplog` npm package in the Worker.

**Why it happens:** The Worker has no dependency on the CLI package at runtime.

**How to avoid:** Copy the relevant card renderer modules (`/src/card/`) into the Worker codebase verbatim. They use only template literals and basic types — no Node.js deps. TypeScript types for `SafeStats` should be defined in the Worker's `types.ts`, not imported from the CLI.

**Warning signs:** Worker `package.json` lists `shiplog` as a dependency.

### Pitfall 7: Configurator Opens With Empty State

**What goes wrong:** The browser configurator at `/configure` loads with no user data pre-populated, making it useless for preview.

**Why it happens:** The CLI needs to pass the current SafeStats payload to the browser without going through the Worker (no auth token in browser).

**How to avoid:** CLI encodes the sanitized stats as a URL-encoded query parameter or base64 hash fragment when opening the configurator URL. `localStorage` persists the configurator settings between visits (by username key). Never put auth token in the URL.

---

## Code Examples

### GET /card/:username — Full Handler

```typescript
// Source: Cloudflare KV docs + Hono routing docs
app.get('/card/:username', async (c) => {
  const username = c.req.param('username')
  const theme = c.req.query('theme') ?? 'light'
  const layout = c.req.query('layout') ?? 'classic'
  const style = c.req.query('style') ?? 'github'

  const cacheKey = `card:${username}:${theme}:${layout}:${style}`
  const cached = await c.env.CARDS_KV.get(cacheKey)

  if (cached) {
    return c.body(cached, 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    })
  }

  // No cached variant — fetch user data and render
  const userData = await c.env.USER_DATA_KV.get(`user:${username}:data`, 'json')
  if (!userData) {
    return c.body(renderPlaceholderCard(username), 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    })
  }

  const svg = renderCard(userData as SafeStats, { theme, layout, style })
  await c.env.CARDS_KV.put(cacheKey, svg)  // No TTL — invalidated on sync

  return c.body(svg, 200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  })
})
```

### POST /sync — Sync Endpoint

```typescript
// Source: Cloudflare Workers docs + KV list API
app.post('/sync', authMiddleware, async (c) => {
  const username = c.get('username') as string
  const body = await c.req.json<SafeStats>()

  // Validate SafeStats (no paths, no raw content)
  if (!isValidSafeStats(body)) {
    return c.json({ error: 'Invalid payload' }, 400)
  }

  // Store user data
  await c.env.USER_DATA_KV.put(`user:${username}:data`, JSON.stringify(body))

  // Invalidate all cached card variants for this user
  const variants = await c.env.CARDS_KV.list({ prefix: `card:${username}:` })
  await Promise.all(variants.keys.map(k => c.env.CARDS_KV.delete(k.name)))

  return c.json({ ok: true, username, variantsInvalidated: variants.keys.length })
})
```

### KV Key for Bearer Tokens

```typescript
// Store token on auth:
await env.USER_DATA_KV.put(`token:${token}:username`, username, {
  expirationTtl: 60 * 60 * 24 * 365  // 1 year TTL on auth tokens
})

// Validate in middleware:
const username = await env.USER_DATA_KV.get(`token:${token}:username`)
```

### CLI Auth Flow

```typescript
// Source: @octokit/auth-oauth-device README
import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device'
import open from 'open'  // or hand-roll platform dispatcher

async function login(): Promise<void> {
  const auth = createOAuthDeviceAuth({
    clientType: 'oauth-app',
    clientId: 'SHIPLOG_GITHUB_CLIENT_ID',  // hardcoded public value
    scopes: ['read:user'],
    onVerification(v) {
      console.log(`Visit: ${v.verification_uri}`)
      console.log(`Enter code: ${v.user_code}`)
      open(v.verification_uri)  // auto-open browser
    }
  })

  const { token: githubToken } = await auth({ type: 'oauth' })

  // Get GitHub username
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${githubToken}`, 'User-Agent': 'shiplog/1.0' }
  })
  const { login: username } = await res.json()

  // Exchange for Worker-issued token
  const tokenRes = await fetch('https://shiplog.workers.dev/auth/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ githubToken, username })
  })
  const { token: shiplogToken } = await tokenRes.json()

  // Persist to ~/.shiplog/config.json
  await saveConfig({ username, token: shiplogToken })
  console.log(`Logged in as ${username}`)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `@cloudflare/workers-types` static package | `npx wrangler types` generated types | Wrangler v3+ | Types now match actual wrangler.jsonc config |
| Manual route dispatch with Request.url | Hono framework | 2023+ | Officially endorsed by Cloudflare; simpler |
| KV `expirationTtl` for cache management | No TTL + explicit invalidation on sync | Always available, rarely used this way | ShipLog's sync-driven design avoids TTL complexity |
| Vercel serverless for stats cards | Cloudflare Workers at edge | github-readme-stats rate-limit era | No cold starts, no per-instance limits |

**Deprecated/outdated:**
- `@cloudflare/workers-types` for Worker applications: use `wrangler types` instead. The package still exists but is no longer the recommended path.
- `wrangler.toml`: wrangler.jsonc is the current standard (JSON with comments, includes schema autocomplete via `$schema` field).

---

## Open Questions

1. **GitHub OAuth App vs GitHub App for device flow**
   - What we know: Device flow is supported by both. `@octokit/auth-oauth-device` supports both via `clientType` option. OAuth Apps do not require installation; GitHub Apps require per-user installation.
   - What's unclear: GitHub is depreciating OAuth Apps in favor of GitHub Apps long-term, but no hard timeline is documented.
   - Recommendation: Use OAuth App for Phase 4. `clientType: 'oauth-app'`, scope `read:user`. Zero installation friction.

2. **Worker-issued token format: opaque string vs JWT**
   - What we know: KV lookup by token value works for opaque random strings. JWT would allow stateless validation without KV lookup.
   - What's unclear: Whether stateless validation is worth the added JWT complexity for Phase 4.
   - Recommendation: Opaque token stored in KV. Simpler, revocable, no JWT library needed. Generate with `crypto.randomUUID()` (available in Workers runtime).

3. **Configurator stats encoding: query params vs hash fragment**
   - What we know: Hash fragments (`#`) are never sent to the server, making them safe for client-side-only data. URL length limits apply to query params too but are more strict on some hosts.
   - What's unclear: The exact size of a SafeStats payload encoded in a URL.
   - Recommendation: Use hash fragment (`#data=base64encodedJSON`) for the stats payload passed to the configurator. Hash is never logged by the server, never sent to Cloudflare, and not subject to URL length limits in the same way.

4. **`shiplog sync --delete` and token invalidation**
   - What we know: `--delete` wipes user data and all card variants from KV.
   - What's unclear: Whether `--delete` should also invalidate the auth token (forcing re-login) or keep the token active.
   - Recommendation: `--delete` should delete user data and card cache but NOT the auth token. If the user wants to disconnect, they can run `shiplog logout` (a separate command). Deleting data ≠ revoking identity.

---

## Sources

### Primary (HIGH confidence)

- Cloudflare Workers KV docs — https://developers.cloudflare.com/kv/get-started/ — KV bindings, put/get/delete/list API, wrangler.jsonc syntax
- Cloudflare Workers KV write API — https://developers.cloudflare.com/kv/api/write-key-value-pairs/ — put() signature, limits, options
- Cloudflare Workers KV read API — https://developers.cloudflare.com/kv/api/read-key-value-pairs/ — get(), getWithMetadata(), eventual consistency
- Cloudflare Workers KV list API — https://developers.cloudflare.com/kv/api/list-keys/ — list() prefix filtering, pagination, 1000-key limit
- Cloudflare Workers KV delete API — https://developers.cloudflare.com/kv/api/delete-key-value-pairs/ — delete(), no bulk delete from Worker
- Cloudflare Workers TypeScript — https://developers.cloudflare.com/workers/languages/typescript/ — `wrangler types` replaces `@cloudflare/workers-types`
- Cloudflare Workers environment variables — https://developers.cloudflare.com/workers/configuration/environment-variables/ — vars, secrets, .dev.vars
- Cloudflare Workers secrets — https://developers.cloudflare.com/workers/configuration/secrets/ — `wrangler secret put`, access via env
- Cloudflare Workers auth example — https://developers.cloudflare.com/workers/examples/auth-with-headers/ — API key validation pattern
- Cloudflare Hono guide — https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/ — official endorsement
- Hono routing docs — https://hono.dev/docs/api/routing — named params, route groups, middleware
- Hono context API — https://hono.dev/docs/api/context — c.body(), c.json(), custom Content-Type headers
- GitHub OAuth device flow — https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow — endpoints, flow sequence, token response
- @octokit/auth-oauth-device — https://github.com/octokit/auth-oauth-device.js — library API, onVerification callback

### Secondary (MEDIUM confidence)

- SVG from Cloudflare Worker — https://fabiofranchino.com/log/how-to-return-an-svg-source-from-a-cloudflare-worker/ — `image/svg+xml` header requirement, verified against Cloudflare Workers examples
- GitHub camo caching behavior — multiple community sources (github-readme-stats discussions, sbts/github-badge-cache-buster) confirm `Cache-Control: no-store` is the correct fix; consistent across sources

### Tertiary (LOW confidence)

- Camo proxy behavior — atmos/camo README (archived 2021) — does not document SVG restrictions explicitly; current behavior inferred from community reports
- GitHub camo cache duration — observed as 31-day max-age in some reports, "a few hours" in others — exact TTL is not publicly documented

---

## Metadata

**Confidence breakdown:**
- Standard stack (Workers + KV + Hono): HIGH — official Cloudflare documentation
- GitHub OAuth device flow: HIGH — official GitHub docs + octokit library
- SVG serving headers: HIGH — official Workers example + multiple consistent community sources
- GitHub camo Cache-Control behavior: MEDIUM — multiple consistent sources but no official GitHub documentation on exact TTLs
- KV eventual consistency: HIGH — explicitly documented in Cloudflare KV docs

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (Cloudflare Worker APIs are stable; GitHub OAuth device flow is stable; Hono is active)
