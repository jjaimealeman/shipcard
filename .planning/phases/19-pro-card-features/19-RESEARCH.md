# Phase 19: PRO Card Features - Research

**Researched:** 2026-03-29
**Domain:** SVG rendering, Cloudflare KV/Cache API, D1 schema, Hono routing, CLI subcommand architecture
**Confidence:** HIGH

---

## Summary

Phase 19 adds three PRO features on top of the existing Stripe subscriptions foundation from Phase 18: a PRO badge on the SVG card, instant cache purge on sync, and custom slug URLs with saved configurations. The codebase is well-structured for all three additions — each maps cleanly onto existing extension points.

The PRO badge is a pure SVG string injection in the three layout renderers (`classic.ts`, `compact.ts`, `hero.ts`). The cache refresh mechanic requires understanding that Cloudflare KV is the actual card cache (not the CDN Cache API) — `invalidateCardVariants()` already exists and purges by prefix; PRO sync just skips re-adding the TTL-delayed path and instead re-renders synchronously as the current sync route already does. The slug system needs a new D1 table, a new worker route at `/u/:username/:slug`, a new API route for CRUD operations, a new dashboard page, and a new CLI subcommand.

**Primary recommendation:** Build in this order — (1) PRO badge (isolated SVG change), (2) cache refresh behavior (modify sync route logic based on PRO tier), (3) slug system (D1 schema + worker route + dashboard + CLI, all connected).

---

## Standard Stack

### Core (already in use — no new deps)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Hono | existing | Worker routing | Already used for all routes |
| Cloudflare D1 | existing | Slug persistence | Already used for subscriptions |
| Cloudflare KV | existing | Card cache | Already used for all card variants |
| node:util parseArgs | existing | CLI arg parsing | Already used, zero-dep |

### No New Dependencies Required

All three features can be built with what's already in the project:
- SVG badge: pure string concatenation, same pattern as existing layout code
- Cache refresh: KV prefix delete already exists in `invalidateCardVariants()`
- Slug system: D1 + Hono + existing auth middleware + existing `isUserPro()` gate

---

## Architecture Patterns

### Recommended File Structure (new files only)
```
shipcard-worker/src/
├── db/
│   └── schema.sql                  # ADD: card_slugs table + card_slug_configs table
├── routes/
│   ├── card.ts                     # MODIFY: add /:username/:slug route
│   ├── sync.ts                     # MODIFY: PRO instant re-render vs free TTL branch
│   └── slugs.ts                    # NEW: CRUD API for slug management
├── svg/
│   └── layouts/
│       ├── classic.ts              # MODIFY: inject PRO badge
│       ├── compact.ts              # MODIFY: inject PRO badge
│       └── hero.ts                 # MODIFY: inject PRO badge
shipcard/src/cli/
├── index.ts                        # MODIFY: add 'slug' command dispatch
├── args.ts                         # MODIFY: add slug subcommand + flags
└── commands/
    └── slug.ts                     # NEW: slug create/list/delete command
```

### Pattern 1: PRO Badge in SVG Layouts

The badge is a `<rect>` + `<text>` group appended before the closing `</svg>` tag in each layout. Each layout has a known `CARD_WIDTH` constant — the badge anchors to `CARD_WIDTH - PADDING` from the right.

**Badge SVG element (gold/amber, top-right pill):**
```typescript
// Source: analysis of existing layout patterns in classic.ts, compact.ts, hero.ts
const BADGE_COLOR = "#F59E0B";   // amber-400 — universally signals premium
const BADGE_TEXT = "#FFFFFF";
const BADGE_HEIGHT = 16;
const BADGE_PADDING_X = 8;

function proBadgeSvg(cardWidth: number, badgeY: number = 12): string {
  // Approximate text width for "PRO" at 9px bold = ~22px, total pill ~38px
  const badgeWidth = 38;
  const badgeX = cardWidth - 20 - badgeWidth; // right-aligned, 20px from edge
  return [
    `<rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${BADGE_HEIGHT}"`,
    ` rx="8" fill="${BADGE_COLOR}"/>`,
    `<text x="${badgeX + badgeWidth / 2}" y="${badgeY + 11}"`,
    ` font-size="9" font-weight="700" text-anchor="middle"`,
    ` fill="${BADGE_TEXT}" font-family="'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif">`,
    `PRO</text>`,
  ].join("");
}
```

The badge must be injected as the last element before `</svg>` so it renders on top of the card background. Each layout renders the background `<rect>` first, so badge z-order is correct by insertion position.

**Propagating `isPro` to layout renderers:**
- `renderCard()` in `svg/index.ts` is the single public entry point
- Add `isPro?: boolean` to `CardOptions` interface
- Pass through to `renderSvg()` in `renderer.ts` → `RenderOptions`
- Each layout function (`renderClassic`, `renderCompact`, `renderHero`) receives it and conditionally appends the badge

### Pattern 2: PRO Instant Cache Refresh

**How the current cache works (HIGH confidence from reading actual code):**
- `CARDS_KV` is the card cache — keys like `card:{username}:{theme}:{layout}:{style}`
- Current sync: calls `invalidateCardVariants()` (KV prefix delete) then synchronously re-renders ONE default variant to KV
- Cache-Control headers on the card route are already `no-cache, no-store` — this means **the CDN Cache API is NOT in use**
- The "cache" is entirely in KV; there is no HTTP CDN caching layer to purge

**This is a critical finding:** The existing architecture uses `no-cache` headers specifically to prevent CDN caching. The CONTEXT.md decision to "purge CDN cache" is actually already handled — `invalidateCardVariants()` already purges all KV variants. For PRO users, the distinction is:

- **Free:** After sync, only the default variant (dark/classic/github) is synchronously re-rendered; all other variants are rebuilt on-demand (next request re-renders from KV)
- **PRO:** After sync, the worker also re-renders ALL slug-specific variants synchronously

The practical instant-refresh perk for PRO is: their custom slug URL reflects new data immediately after sync (because slug configs save specific theme/layout combos, and those get pre-rendered). Free users' `/card/:username` default is already instant (sync re-renders it synchronously today).

**Revised interpretation:** PRO cache perk = slug cards reflect new data instantly (slug variants are pre-rendered on sync). The real free-vs-PRO difference will be visible once slugs exist.

For the sync route modification:
```typescript
// Source: analysis of shipcard-worker/src/routes/sync.ts
// After invalidateCardVariants(), PRO users get all slug variants re-rendered:
if (isPro) {
  const slugs = await getUserSlugs(env.DB, username);
  for (const slug of slugs) {
    const slugSvg = renderCard(body, {
      theme: slug.config.theme,
      layout: slug.config.layout,
      colors: slug.config.colors,
      isPro: true,
    });
    await putCardCacheV2(env.CARDS_KV, username, slug.config.layout, slug.config.theme, slugSvg);
  }
}
```

### Pattern 3: Custom Slug System

**D1 Schema (new table):**
```sql
-- card_slugs — one row per custom slug per user
CREATE TABLE IF NOT EXISTS card_slugs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT    NOT NULL,
  slug        TEXT    NOT NULL,
  -- Saved card configuration as JSON: { theme, layout, hide[], heroStat? }
  config      TEXT    NOT NULL DEFAULT '{}',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(username, slug)
);

CREATE INDEX IF NOT EXISTS idx_card_slugs_username
  ON card_slugs(username);
```

**Config JSON shape** (stored as TEXT in D1, parsed on read):
```typescript
interface SlugConfig {
  theme: string;   // e.g. "catppuccin", "dracula", "dark"
  layout: string;  // "classic" | "compact" | "hero"
  hide?: string[]; // stat keys to hide
  heroStat?: string;
  // BYOT colors (if PRO saved custom colors):
  colors?: {
    bg: string; title: string; text: string; icon: string; border: string;
  };
}
```

**Worker route for slug serving (GET /u/:username/:slug):**
```typescript
// Source: analysis of shipcard-worker/src/routes/card.ts and index.ts
// Must be mounted BEFORE the bare /:username route in the /u sub-app
// Current routing order in index.ts: dashboard > api > card
// Slug route fits between api and card, or add to card.ts as second handler

cardRoutes.get("/:username/:slug", async (c) => {
  const username = c.req.param("username");
  const slug = c.req.param("slug");

  // 1. Load slug config from D1
  const slugRow = await getSlug(c.env.DB, username, slug);
  if (!slugRow) {
    // Return placeholder, not 404 — consistent with card behavior
    return svgResponse(c, renderPlaceholderCard(username));
  }

  // 2. PRO check (slug only exists for PRO, but double-check)
  const isPro = await isUserPro(c.env.DB, username);

  // 3. Load user data + render with saved config
  const userData = await getUserData(c.env.USER_DATA_KV, username);
  if (!userData) return svgResponse(c, renderPlaceholderCard(username));

  const config = JSON.parse(slugRow.config) as SlugConfig;
  // Use slug-specific KV cache key (include slug name)
  const cacheKey = `card:${username}:slug:${slug}`;
  const cached = await c.env.CARDS_KV.get(cacheKey);
  if (cached) return svgResponse(c, cached);

  const svg = renderCard(userData, { ...config, isPro });
  await c.env.CARDS_KV.put(cacheKey, svg);
  return svgResponse(c, svg);
});
```

**KV key for slug cache:** `card:{username}:slug:{slug}` — uses the `slug:` prefix segment to prevent collision with existing `card:{username}:{theme}:{layout}:{style}` keys. The existing `invalidateCardVariants()` function uses prefix `card:{username}:` so it will naturally include slug cache keys.

**Worker API routes for CRUD (new `slugs.ts`):**
```
POST   /u/:username/slugs           — create slug (PRO + auth)
GET    /u/:username/slugs           — list slugs (PRO + auth)
DELETE /u/:username/slugs/:slug     — delete slug (PRO + auth)
```

All slug CRUD routes require auth (same bearer token as sync) AND PRO status.

**CLI subcommand architecture:**
The current CLI uses `positionals[0]` as command. For `shipcard slug create`, the pattern is `positionals[0] = "slug"`, `positionals[1] = "create"`. This is a two-level dispatch:

```typescript
// In index.ts dispatch switch:
case "slug":
  await runSlug(mergedFlags, positionals[1]); // 'create' | 'list' | 'delete'
  break;

// In commands/slug.ts:
export async function runSlug(flags: SlugFlags, subcommand: string | undefined) {
  switch (subcommand) {
    case "create": return runSlugCreate(flags);
    case "list":   return runSlugList(flags);
    case "delete": return runSlugDelete(flags);
    default: printSlugHelp(); process.exit(0);
  }
}
```

The `args.ts` needs a new `slug` string flag for the slug name (for create/delete):
```typescript
slug: { type: "string" }  // --slug my-dark-card
```

But positionals are better for slug name: `shipcard slug create my-dark-card --theme catppuccin`. The `allowPositionals: true` is already set. `positionals[2]` would be the slug name.

**Slug validation constants (worker-side):**
```typescript
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 50;
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/; // no leading/trailing hyphens
const SLUG_RESERVED = new Set([
  "admin", "api", "settings", "config", "dashboard",
  "billing", "sync", "auth", "webhook", "community",
  "configure", "login", "logout", "help", "support",
  "pro", "free", "upgrade", "pricing",
]);
const SLUG_MAX_PER_USER = 5;
```

**Upgrade block responses:**
- Worker API (JSON): `{ error: "Custom slugs are a PRO feature", upgrade_url: "https://shipcard.dev/billing/checkout" }`
- Worker slug URL (SVG): `renderErrorSvg("PRO Feature", ["Custom slugs require ShipCard PRO", "Upgrade at shipcard.dev/billing/checkout"])`
- CLI: single-line stderr + non-zero exit: `"Custom slugs are a PRO feature. Upgrade at shipcard.dev/billing/checkout\n"`
- Dashboard: Alpine.js upgrade block with feature comparison (Claude's discretion)

### Route Ordering Critical Detail

In `index.ts`, the new slug-serving route must be registered BEFORE the bare `/:username` card route to avoid Hono matching `/u/jaime/my-card` as `username=jaime/my-card`:

```typescript
// index.ts — current order:
app.route("/u", dashboardRoutes);  // /:username/dashboard
app.route("/u", apiRoutes);        // /:username/api/*
app.route("/u", cardRoutes);       // /:username  ← bare username catch-all

// With slugs — slug route is IN cardRoutes, defined before /:username:
// cardRoutes.get("/:username/:slug", ...)  ← first
// cardRoutes.get("/:username", ...)        ← second
```

Hono matches routes in registration order within the same router, so `/:username/:slug` (two segments) defined first will correctly capture two-segment paths before `/:username` (one segment) captures one-segment paths.

### Dashboard Slug Management Page

Add a new section to the dashboard HTML at `/u/:username/dashboard`. The dashboard currently uses Alpine.js for reactivity. The slug management section:

- Shows the list of slugs with their configs (fetched from `GET /u/:username/slugs`)
- Has a "Create Slug" form: slug name input + theme/layout selectors
- Delete button per slug
- Upgrade block for free users (shown instead of the create form)
- Auth requirement: slug CRUD needs the bearer token, which is stored in local `~/.config/shipcard/auth.json` on the CLI side but NOT available in the browser dashboard (public page, no session)

**Important discovery:** The dashboard is a public page with no authentication. Slug management from the dashboard requires the user to be authenticated. Two options:
1. Dashboard shows slug info (read-only) publicly, creation/deletion is CLI-only
2. Dashboard embeds a token entry field or links to a CLI command

Given the CONTEXT.md decision "dashboard supports full CRUD", the dashboard needs some auth mechanism. The simplest pattern (consistent with Phase 18 billing flow) is a GitHub OAuth flow: clicking "Manage Slugs" redirects through OAuth to establish a short-lived session cookie.

**Recommendation:** Use a session approach in the dashboard. Add a `GET /billing/session` endpoint (or reuse the auth flow) that sets a secure httpOnly cookie with the bearer token for the current user after OAuth verification. Then slug CRUD routes check either Bearer token OR session cookie.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG text width measurement | Manual pixel math | Hard-code badge dimensions | "PRO" is a fixed string; 38px wide × 16px high is safe for all fonts |
| Slug validation regex | Custom parser | Simple regex + Set lookup | 3 lines covers all requirements |
| Cache invalidation across DCs | Cloudflare Cache API purge | KV delete (already done) | Cache-Control is `no-cache` — CDN doesn't cache these SVGs |
| CLI interactive prompts | readline/inquirer | Simple sequential positionals | Already zero-dep; maintain that |
| Dashboard session auth | Full OAuth flow | Reuse existing `/auth/exchange` + cookie | Pattern already exists |

---

## Common Pitfalls

### Pitfall 1: CDN vs KV Cache Confusion

**What goes wrong:** Assuming the "CDN cache" needs to be purged globally (via Cloudflare Cache API) for instant refresh to work.

**Why it happens:** The CONTEXT.md says "PRO sync triggers both KV purge AND CDN cache purge." But the card route already sends `Cache-Control: no-cache, no-store, must-revalidate` — the CDN/camo proxy does NOT cache these responses.

**How to avoid:** The card cache IS the KV cache. `invalidateCardVariants()` already handles this. For PRO instant refresh, the perk is that slug-specific KV entries are proactively re-rendered on sync (not rebuilt lazily on next request). Free users only get the default variant pre-rendered; their custom-query-param cards are rebuilt on-demand.

**Warning signs:** If you see `caches.default.delete()` being added to the sync route, stop — that's unnecessary complexity.

### Pitfall 2: Route Collision for Slug URLs

**What goes wrong:** `/:username/:slug` matches everything with two path segments under `/u`, including `/u/jaime/dashboard` and `/u/jaime/api`.

**How to avoid:** The dashboard and API routes are already registered BEFORE `cardRoutes` in `index.ts`. Within `cardRoutes`, define `/:username/:slug` AFTER specific named routes like `/:username/api` but BEFORE the bare `/:username` route. Verify by checking that `/u/jaime/dashboard` still hits the dashboard handler after the new route is added.

### Pitfall 3: D1 Migration vs Wrangler Apply

**What goes wrong:** Adding the `card_slugs` table to `schema.sql` without running the migration on the live D1 database.

**How to avoid:** D1 uses `schema.sql` as documentation but doesn't auto-apply it. Must run:
```bash
npx wrangler d1 execute shipcard-db --file=src/db/schema.sql
# Local:
npx wrangler d1 execute shipcard-db --local --file=src/db/schema.sql
```
Use `CREATE TABLE IF NOT EXISTS` (already the pattern in schema.sql) so re-running is safe.

### Pitfall 4: Slug Cache Key Collision with Existing KV Keys

**What goes wrong:** A slug named "dark" with username "jaime" creates key `card:jaime:slug:dark` — but this is fine. The risk is a slug named "slug" creating `card:jaime:slug:slug` — also fine. But slug names that match theme/layout names in the legacy key format could theoretically cause confusion.

**How to avoid:** Use the `slug:` segment prefix in KV keys (`card:{username}:slug:{slug}`) — this guarantees no overlap with legacy keys (`card:{username}:{theme}:{layout}:{style}`) or v2 keys (`card:{username}:{layout}:t={theme}`). The existing `invalidateCardVariants()` prefix `card:{username}:` naturally covers slug cache keys.

### Pitfall 5: CLI Subcommand Positional Access

**What goes wrong:** `parseCliArgs()` returns only `positionals[0]` as the command. The slug name from `shipcard slug create my-slug-name` lives at `positionals[2]` but isn't captured.

**How to avoid:** The `args.ts` must return the full `positionals` array (or pass it through). Currently `positionals` is consumed internally. The simplest fix: export `subcommand: positionals[1]` and `target: positionals[2]` from `parseCliArgs()`, or pass `process.argv.slice(3)` separately to the slug handler.

---

## Code Examples

### PRO Badge in Classic Layout
```typescript
// Append before </svg> close in renderClassic()
// Source: analysis of classic.ts CARD_WIDTH=495, PADDING=20
if (options?.isPro) {
  const BADGE_W = 38;
  const BADGE_H = 16;
  const BADGE_X = CARD_WIDTH - PADDING - BADGE_W; // 437
  const BADGE_Y = 12;
  lines.push(
    `  <rect x="${BADGE_X}" y="${BADGE_Y}" width="${BADGE_W}" height="${BADGE_H}" rx="8" fill="#F59E0B"/>`,
    `  <text x="${BADGE_X + BADGE_W / 2}" y="${BADGE_Y + 11}" font-size="9" font-weight="700"`,
    `    text-anchor="middle" fill="#FFFFFF"`,
    `    font-family="'Segoe UI',Ubuntu,'Helvetica Neue',Sans-Serif">PRO</text>`
  );
}
lines.push(`</svg>`);
```

### D1 Slug Query Helpers
```typescript
// Source: pattern from shipcard-worker/src/db/subscriptions.ts
export interface CardSlug {
  id: number;
  username: string;
  slug: string;
  config: string; // JSON
  created_at: number;
  updated_at: number;
}

export async function getUserSlugs(db: D1Database, username: string): Promise<CardSlug[]> {
  const result = await db
    .prepare('SELECT * FROM card_slugs WHERE username = ? ORDER BY created_at ASC')
    .bind(username)
    .all<CardSlug>();
  return result.results;
}

export async function getSlug(db: D1Database, username: string, slug: string): Promise<CardSlug | null> {
  const row = await db
    .prepare('SELECT * FROM card_slugs WHERE username = ? AND slug = ?')
    .bind(username, slug)
    .first<CardSlug>();
  return row ?? null;
}

export async function countUserSlugs(db: D1Database, username: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) as count FROM card_slugs WHERE username = ?')
    .bind(username)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function createSlug(
  db: D1Database, username: string, slug: string, config: SlugConfig
): Promise<void> {
  await db
    .prepare('INSERT INTO card_slugs (username, slug, config) VALUES (?, ?, ?)')
    .bind(username, slug, JSON.stringify(config))
    .run();
}

export async function deleteSlug(db: D1Database, username: string, slug: string): Promise<void> {
  await db
    .prepare('DELETE FROM card_slugs WHERE username = ? AND slug = ?')
    .bind(username, slug)
    .run();
}
```

### Slug Validation (Worker-side)
```typescript
// Reusable validation function for both API and CLI (via error response)
const SLUG_RESERVED = new Set([
  "admin", "api", "settings", "config", "dashboard",
  "billing", "sync", "auth", "webhook", "community",
  "configure", "login", "logout", "help", "support",
  "pro", "free", "upgrade", "pricing",
]);

function validateSlug(slug: string): string | null {
  if (slug.length < 3) return "Slug must be at least 3 characters";
  if (slug.length > 50) return "Slug must be 50 characters or fewer";
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    return "Slug must be lowercase alphanumeric with hyphens only (no leading/trailing hyphens)";
  }
  if (SLUG_RESERVED.has(slug)) return `"${slug}" is a reserved word`;
  return null; // valid
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global CDN cache purge needed | KV-only cache (no-cache headers) | Already in codebase | "CDN purge" is just KV delete |
| Single card URL per user | Custom slug URLs | Phase 19 | Multiple card presets per user |
| PRO check only for BYOT colors | PRO check for badge + slugs | Phase 19 | `isUserPro()` called in more places |

---

## Open Questions

1. **Dashboard slug auth mechanism**
   - What we know: Dashboard is a public HTML page, no session management
   - What's unclear: How does a user authenticate to create/delete slugs from the dashboard without the CLI token?
   - Recommendation: Use the existing GitHub OAuth flow — add a `GET /billing/session` route that runs GitHub OAuth and sets a short-lived session cookie (same pattern as billing checkout). The slug CRUD routes check `Authorization: Bearer <token>` OR a session cookie. This keeps the dashboard fully functional for slug management without building a new auth system.

2. **PRO badge rendering in cached SVGs**
   - What we know: Cards are cached in KV; the `isPro` flag needs to reach `renderCard()`
   - What's unclear: When a PRO user's card is served from KV cache, the badge is already baked in — but if the user cancels PRO, the cached card still shows the badge until next sync
   - Recommendation: On sync, always re-render the default card variant (already done) which will reflect current PRO status. Cache invalidation on downgrade can be triggered from the Stripe webhook handler when `customer.subscription.deleted` fires.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis — `shipcard-worker/src/` (routes, kv.ts, db/, svg/layouts/)
- Direct codebase analysis — `shipcard/src/cli/` (args.ts, index.ts, commands/)
- Context7: `/llmstxt/developers_cloudflare_workers_llms-full_txt` — Cache API, cache.delete() behavior
- Context7: `/llmstxt/hono_dev_llms-small_txt` — Hono route grouping, sub-app mounting

### Secondary (MEDIUM confidence)
- Context7 Cache API docs: `cache.delete` only purges local DC; confirmed no global purge needed given existing `no-cache` headers

### Key Insight (HIGH confidence)
The card route already sends `Cache-Control: no-cache, no-store, must-revalidate`. This was added explicitly to defeat GitHub's camo CDN cache. The "CDN cache" from CONTEXT.md is therefore the KV cache — and `invalidateCardVariants()` already handles it. No new Cloudflare Cache API calls are needed.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps, pure extension of existing patterns
- Architecture: HIGH — all patterns derived from direct codebase analysis
- Pitfalls: HIGH (CDN/KV confusion), MEDIUM (dashboard auth mechanism), MEDIUM (badge cache staleness on downgrade)

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable stack, 30-day window)
