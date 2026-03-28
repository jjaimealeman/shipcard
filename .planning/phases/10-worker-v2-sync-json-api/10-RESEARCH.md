# Phase 10: Worker v2 Sync + JSON API - Research

**Researched:** 2026-03-27
**Domain:** Cloudflare Workers / Hono routing / KV storage patterns
**Confidence:** HIGH

## Summary

Phase 10 is a Worker-side extension. The CLI already sends `{ safeStats, timeSeries }` to `POST /sync/v2` (implemented in Phase 9). This phase adds the Worker endpoint that receives it, stores it in KV, and exposes two new public JSON GET routes. The existing `POST /sync` (v1) and `GET /u/:username` (SVG card) must remain completely unchanged.

The existing codebase establishes clear patterns: Hono sub-apps mounted via `app.route()`, typed `AppType` generics, KV helper functions in `kv.ts`, and validation guards in `types.ts`. Phase 10 follows these exact patterns — it is an additive extension, not a refactor. No new packages are needed; everything required already exists in the Worker.

The main discretionary decisions are: KV key structure (split vs blob), sync mode (replace vs merge), CORS policy, envelope shape, and whether to filter time-series by date range. Each of these is analyzed below with a clear recommendation.

**Primary recommendation:** Add `POST /sync/v2` as a new route file, add `GET /u/:username/api/stats` and `GET /u/:username/api/timeseries` as extensions to the existing card route, and store time-series as a separate KV key (`user:{username}:timeseries`) to keep reads cheap and independent.

---

## Standard Stack

### Core (already in Worker — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hono | existing | Routing, middleware, `c.json()` | Already powering all routes |
| @cloudflare/workers-types | existing | KV, Env type bindings | Already typed via `globals.d.ts` |

### Supporting (built-in, no install)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `cors` from `hono/cors` | CORS headers on public GET routes | Dashboard will be on a different origin |
| `crypto.randomUUID()` | Already used for tokens | N/A for this phase |

**Installation:** None required. All dependencies already present.

---

## Architecture Patterns

### Recommended File Structure (additive only)

```
shipcard-worker/src/
├── index.ts                    # Mount new syncV2Routes + apiRoutes
├── types.ts                    # Add SafeTimeSeries + isValidSyncV2Body
├── kv.ts                       # Add getTimeSeries, putTimeSeries, deleteTimeSeries
└── routes/
    ├── sync.ts                 # UNCHANGED (v1)
    ├── syncV2.ts               # NEW: POST /sync/v2, DELETE /sync/v2 (or reuse DELETE /sync)
    ├── api.ts                  # NEW: GET /u/:username/api/stats + timeseries
    ├── card.ts                 # UNCHANGED (SVG)
    ├── auth.ts                 # UNCHANGED
    ├── configure.ts            # UNCHANGED
    └── landing.ts              # UNCHANGED
```

### Pattern 1: New Hono Sub-App Mounted in index.ts

```typescript
// Source: existing index.ts pattern + hono.dev docs
import { syncV2Routes } from "./routes/syncV2.js";
import { apiRoutes } from "./routes/api.js";

app.route("/sync", syncRoutes);      // v1 — UNCHANGED
app.route("/sync/v2", syncV2Routes); // v2 NEW
app.route("/u", cardRoutes);         // SVG — UNCHANGED
app.route("/u", apiRoutes);          // JSON API NEW — shares /u prefix
```

Note: Hono resolves routes in registration order. `apiRoutes` handles `/:username/api/*` which does not conflict with `cardRoutes` handling `/:username`.

### Pattern 2: POST /sync/v2 Route

```typescript
// Source: mirrors existing sync.ts pattern exactly
syncV2Routes.post("/", authMiddleware, async (c) => {
  const body = await c.req.json();
  if (!isValidSyncV2Body(body)) {
    return c.json({ error: "Invalid v2 payload" }, 400);
  }
  const username = c.get("username");
  if (body.safeStats.username.toLowerCase() !== username.toLowerCase()) {
    return c.json({ error: "Username mismatch" }, 403);
  }

  await putUserData(env.USER_DATA_KV, username, body.safeStats);
  await putTimeSeries(env.USER_DATA_KV, username, body.timeSeries);
  const variantsInvalidated = await invalidateCardVariants(env.CARDS_KV, username);
  // Re-render default card variant synchronously (same as v1)
  const defaultSvg = renderCard(body.safeStats, { theme: "dark", layout: "classic", style: "github" });
  await putCardCache(env.CARDS_KV, username, "dark", "classic", "github", defaultSvg);

  const syncedAt = new Date().toISOString();
  return c.json({ ok: true, apiVersion: "v2", syncedAt, username, variantsInvalidated });
});
```

### Pattern 3: Public JSON GET Routes

```typescript
// Source: hono.dev CORS docs + existing card.ts GET pattern
import { cors } from "hono/cors";

apiRoutes.use("/:username/api/*", cors()); // Wildcard CORS for dashboard

apiRoutes.get("/:username/api/stats", async (c) => {
  const username = c.req.param("username");
  const data = await getUserData(env.USER_DATA_KV, username);
  if (!data) return c.json({ error: "Not found" }, 404);
  return c.json({ data, syncedAt: data.syncedAt ?? null }); // see KV design below
});

apiRoutes.get("/:username/api/timeseries", async (c) => {
  const username = c.req.param("username");
  const ts = await getTimeSeries(env.USER_DATA_KV, username);
  if (!ts) return c.json({ error: "Not found" }, 404);
  return c.json({ data: ts, syncedAt: ts.generatedAt });
});
```

### Pattern 4: KV Key Design — Split (Recommended)

```
user:{username}:data          → SafeStats JSON (existing key, unchanged)
user:{username}:timeseries    → SafeTimeSeries JSON (new key)
```

Compared to single-blob (`user:{username}:v2`):
- Stats GET does not read time-series bytes (cheaper read)
- Time-series GET does not read stats bytes
- v1 `POST /sync` continues writing only `user:{username}:data` — no migration needed
- DELETE /sync must now also delete `user:{username}:timeseries`

### Pattern 5: Sync Mode — Full Replace (Recommended)

The CLI always sends a full recompute from local JSONL. There is no append/merge case. Full replace is simpler, has no ordering issues, and matches how v1 works today. `putTimeSeries` does a plain `kv.put()`.

### Anti-Patterns to Avoid

- **Merging time-series days on the Worker**: The CLI owns the canonical dataset. The Worker is a dumb store. Never merge partial payloads on the Worker.
- **Storing syncedAt separately**: Embed it in the stored payload itself (or derive from `timeSeries.generatedAt`). Avoids a second KV read per GET.
- **Returning raw SafeStats without envelope**: API responses should include `syncedAt` per the CONTEXT.md requirement. Wrap: `{ data: SafeStats, syncedAt: string }`.
- **Filtering time-series by date range on the Worker**: The expected payload is ~365 SafeDailyStats entries (~50-100KB). Full dump is fine and eliminates query param complexity. Date-range filtering belongs in the dashboard client.
- **Reusing DELETE /sync for v2**: Keep one DELETE endpoint. The CONTEXT.md says DELETE /sync wipes everything. Extend existing `deleteAllUserData` to also delete the timeseries key.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CORS headers | Custom middleware | `cors` from `hono/cors` | RFC-compliant, handles preflight OPTIONS, already in Hono |
| JSON validation | Ad-hoc type checks | Extend `isValidSafeStats` pattern from types.ts | Consistent, already tested pattern |
| KV key construction | Inline template literals in routes | `kv.ts` helper functions | Centralizes all key logic, testable |

**Key insight:** The Worker already has all the scaffolding. Phase 10 is pure addition — new route file, new KV helpers, type extensions.

---

## Common Pitfalls

### Pitfall 1: Mounting Order Conflict Between cardRoutes and apiRoutes

**What goes wrong:** Both `cardRoutes` and `apiRoutes` are mounted at `/u`. If `cardRoutes` registers `/:username` with a wildcard, it could swallow `/:username/api/stats` before `apiRoutes` sees it.

**Why it happens:** Hono evaluates routes in registration order. A `/:username` handler in `cardRoutes` matches any path under `/u/*`.

**How to avoid:** Register `apiRoutes` before `cardRoutes` in `index.ts`, OR confirm that `cardRoutes` only registers `/:username` (exact segment, no wildcard) — which it does today (`cardRoutes.get("/:username", ...)`). Since `/:username` matches exactly one path segment, `/:username/api/stats` (two more segments) will NOT be matched by it. Hono's router is segment-aware.

**Warning signs:** `GET /u/jaime/api/stats` returns an SVG instead of JSON.

### Pitfall 2: DELETE /sync Only Wipes Stats, Not Time-Series

**What goes wrong:** `deleteAllUserData` in `kv.ts` currently deletes `user:{username}:data` and `card:{username}:*` keys. After Phase 10, it must also delete `user:{username}:timeseries`.

**How to avoid:** Update `deleteAllUserData` in `kv.ts` to include `kv.delete(\`user:${username}:timeseries\`)`.

**Warning signs:** After delete+resync cycle, old time-series data persists.

### Pitfall 3: syncedAt Not Stored — GET Returns Stale or Missing Timestamp

**What goes wrong:** `SafeStats` has no `syncedAt` field. If the GET /api/stats route tries to read `data.syncedAt`, it gets `undefined`.

**How to avoid:** At sync time, store `syncedAt` as part of a wrapper or as a field added before storage. Two clean options:
  1. Store `{ ...safeStats, syncedAt: new Date().toISOString() }` in KV (Worker adds the field on write)
  2. Create a `UserDataV2` wrapper type: `{ safeStats: SafeStats, timeSeries: SafeTimeSeries, syncedAt: string }` — store as a single enriched record alongside the raw keys

Option 1 is simpler and consistent with existing patterns. The validator `isValidSafeStats()` checks the incoming payload, not the stored shape.

**Warning signs:** Dashboard shows "Data as of undefined" or "Data as of Invalid Date".

### Pitfall 4: v1 POST /sync Stops Working After Phase 10

**What goes wrong:** v1 sync still needs to function. If the route is accidentally shadowed or the `syncedAt` storage format change breaks `getUserData()`, v1 callers break.

**How to avoid:** Keep `routes/sync.ts` and `getUserData()` completely unchanged. The `syncedAt` field can be stored as an augmentation only in the v2 flow — v1 reads remain unchanged.

### Pitfall 5: KV Value Size Limit

**What goes wrong:** Cloudflare KV values have a 25MB limit per value. SafeTimeSeries with 365 days is well under this (~100KB), but it's worth noting.

**How to avoid:** No action needed for expected data volume. Flag only if users sync multi-year datasets. [HIGH confidence — Cloudflare docs state 25MB limit]

---

## Code Examples

### isValidSyncV2Body Validator

```typescript
// Source: mirrors isValidSafeStats pattern from types.ts
export interface SyncV2Body {
  safeStats: SafeStats;
  timeSeries: SafeTimeSeries;
}

export function isValidSyncV2Body(payload: unknown): payload is SyncV2Body {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const p = payload as Record<string, unknown>;
  // Validate safeStats using existing validator
  if (!isValidSafeStats(p.safeStats)) return false;
  // Validate timeSeries shape
  const ts = p.timeSeries;
  if (!ts || typeof ts !== "object" || Array.isArray(ts)) return false;
  const t = ts as Record<string, unknown>;
  if (typeof t.username !== "string" || t.version !== 2) return false;
  if (!Array.isArray(t.days)) return false;
  if (typeof t.generatedAt !== "string") return false;
  return true;
}
```

### KV Helpers for Time-Series

```typescript
// Source: mirrors existing getUserData / putUserData pattern from kv.ts
export async function getTimeSeries(
  kv: KVNamespace,
  username: string
): Promise<SafeTimeSeries | null> {
  const raw = await kv.get(`user:${username}:timeseries`);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as SafeTimeSeries;
  } catch {
    return null;
  }
}

export async function putTimeSeries(
  kv: KVNamespace,
  username: string,
  data: SafeTimeSeries
): Promise<void> {
  await kv.put(`user:${username}:timeseries`, JSON.stringify(data));
}
```

### Updated deleteAllUserData

```typescript
// Source: extends existing deleteAllUserData in kv.ts
export async function deleteAllUserData(
  kv: KVNamespace,
  username: string
): Promise<void> {
  await kv.delete(`user:${username}:data`);
  await kv.delete(`user:${username}:timeseries`); // NEW in Phase 10
  const listed = await kv.list({ prefix: `card:${username}:` });
  await Promise.all(listed.keys.map((k) => kv.delete(k.name)));
}
```

### API Response Envelope (with syncedAt)

```typescript
// GET /u/:username/api/stats response shape
{
  data: SafeStats,       // The full SafeStats payload
  syncedAt: string       // ISO timestamp from when user last synced (stored alongside data)
}

// GET /u/:username/api/timeseries response shape
{
  data: SafeTimeSeries,  // Full time-series with .days[] array
  syncedAt: string       // Same as data.generatedAt for convenience
}

// POST /sync/v2 response shape
{
  ok: true,
  apiVersion: "v2",
  syncedAt: string,      // ISO timestamp of this sync
  username: string,
  variantsInvalidated: number
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| v1: POST /sync with SafeStats only | v2: POST /sync/v2 with { safeStats, timeSeries } | Dashboard gets time-series data |
| No public JSON API | GET /u/:username/api/stats + /api/timeseries | Dashboard can fetch fresh data |
| deleteAllUserData deletes 2 key types | Must delete 3 key types after Phase 10 | Delete without timeseries fix = data leak on resync |

**Deprecated after Phase 10:**
- v1 `POST /sync` — still works, but CLI should show nudge to upgrade. Not removed yet.

---

## Open Questions

1. **SafeTimeSeries type location in Worker**
   - What we know: CLI defines `SafeTimeSeries` in `shipcard/src/cli/safestats.ts`. Worker has no copy yet.
   - What's unclear: Should the Worker import a shared package, or copy the type (as SafeStats already does)?
   - Recommendation: Copy the type into `shipcard-worker/src/types.ts` following the existing pattern (the comment in safestats.ts explicitly says "do NOT import from Worker" — same reasoning applies in reverse).

2. **CORS scope — same-origin or wildcard**
   - What we know: Dashboard will be Phase 11. No dashboard origin is decided yet.
   - What's unclear: Will the dashboard be on the same origin as the Worker (Workers Sites) or a separate domain?
   - Recommendation: Apply `cors()` (wildcard `*`) to `/u/*/api/*` routes now. Easy to tighten later when dashboard origin is known. The data is already public so wildcard CORS is fine.

3. **v1 sync response when v2 data exists**
   - What we know: CONTEXT.md says "Claude's discretion — least-surprise principle".
   - Recommendation: v1 POST /sync should NOT overwrite timeseries. It only writes `user:{username}:data`. Timeseries stays stale until next v2 sync. This is least-surprise: v1 never knew about timeseries, so it shouldn't touch it.

---

## Sources

### Primary (HIGH confidence)
- Existing `shipcard-worker/src/` codebase — ground truth for all patterns
- `shipcard/src/cli/safestats.ts` — `SafeTimeSeries` type definition
- `shipcard/src/cli/commands/sync.ts` — v2 payload shape: `{ safeStats, timeSeries }`
- Context7: `/llmstxt/hono_dev_llms-small_txt` — CORS middleware, routing patterns

### Secondary (MEDIUM confidence)
- Cloudflare KV 25MB value limit — from Cloudflare wrangler config docs via Context7

### Tertiary (LOW confidence)
- None — all critical claims are grounded in the existing codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing codebase is the source of truth
- Architecture: HIGH — additive extension of established patterns
- Pitfalls: HIGH — derived from code analysis, not speculation
- CORS: MEDIUM — pattern verified via Context7 Hono docs, origin scope is TBD

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable domain — Hono + Cloudflare KV APIs are stable)
