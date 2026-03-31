# Phase 06: Worker Card Params - Research

**Researched:** 2026-03-25
**Domain:** Hono query param parsing, KV cache key design, SVG rendering integration
**Confidence:** HIGH

## Summary

Phase 06 closes two integration gaps in the Worker that were identified during the v1 audit: (1) the `?hide=` query param is parsed in the local CLI card but silently dropped by the Worker's `GET /u/:username` route, and (2) `renderRedactedCard()` exists as a fully implemented function in `shipcard-worker/src/svg/index.ts` but is never called — `DELETE /sync` returns a JSON response instead of storing a redacted SVG card.

This phase is entirely internal to `shiplog-worker`. No new libraries, no new dependencies, no schema changes, no KV namespace changes. The work is wiring two missing call sites. The `renderCard()` function already accepts a `hide?: string[]` option via `CardOptions`. The `renderRedactedCard(username)` function is already fully implemented. The planner's job is to write tasks that connect these existing pieces to their missing call sites.

**Primary recommendation:** Wire `?hide=` in `routes/card.ts` (two-line change plus cache key update); call `renderRedactedCard()` in `routes/sync.ts` DELETE handler (replace JSON response with SVG storage + JSON response).

## Standard Stack

No new libraries required for this phase. Everything is already in place.

### Core (already in use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Hono | existing | HTTP routing + query param parsing | Already the Worker's framework |
| Cloudflare KV | platform | Card cache storage | Already bound as CARDS_KV |
| `renderCard()` | internal | SVG generation with hide support | Already accepts `hide?: string[]` |
| `renderRedactedCard()` | internal | Redacted SVG after data deletion | Already implemented, never called |

### Installation
```bash
# No new packages needed
```

## Architecture Patterns

### Existing File Map (what gets modified)
```
shipcard-worker/src/
├── routes/
│   ├── card.ts        # MODIFY: parse ?hide= param, pass to renderCard(), update cache key
│   └── sync.ts        # MODIFY: DELETE handler — call renderRedactedCard(), store in KV
├── svg/
│   └── index.ts       # READ ONLY: renderCard() + renderRedactedCard() already correct
└── kv.ts              # READ ONLY: putCardCache() + deleteAllUserData() already correct
```

### Pattern 1: Parsing `?hide=` as a Repeated Query Param
**What:** The `hide` param must support multiple values: `?hide=cost&hide=sessions`. Hono's `c.req.query()` returns the first value only for repeated params. Use `c.req.queries()` (plural) to get all values as a `string[] | undefined`.

**When to use:** Any time multiple values of the same key are expected.

**Example:**
```typescript
// Source: Hono docs — c.req.queries() returns string[] | undefined
const hide = c.req.queries("hide") ?? [];
```

**Verified:** HIGH confidence — Hono's `queries()` method (plural) is the documented approach for multi-value params. This is distinct from `query()` (singular) which returns only the first occurrence.

### Pattern 2: Cache Key Must Include `hide` for Correctness
**What:** The current cache key is `card:{username}:{theme}:{layout}:{style}`. If `hide` params are added but NOT included in the cache key, a user requesting `?hide=cost` could get a cached card that includes cost (or vice versa). The cache key must encode the hide params.

**Decision required:** Two valid approaches:
1. **Sorted join in cache key:** `card:{username}:{theme}:{layout}:{style}:hide={sorted-hide}` — simple, deterministic
2. **Skip cache for hide variants:** Always render fresh when `hide` is non-empty — avoids cache key complexity but slower

**Recommendation:** Option 1 (sorted join). The KV key namespace has plenty of room. Sort the hide array before joining so `?hide=cost&hide=sessions` and `?hide=sessions&hide=cost` map to the same key. Max 5 stats can be hidden → bounded key space.

**Example cache key with hide:**
```typescript
// Sort for determinism; join with comma; append only if non-empty
const hideKey = hide.length > 0 ? `:hide=${[...hide].sort().join(",")}` : "";
const cacheKey = `card:${username}:${theme}:${layout}:${style}${hideKey}`;
```

**Note:** This means `getCardCache()` and `putCardCache()` in `kv.ts` either need a `hide` parameter added, or the card route handles the key directly. The cleanest approach: add an optional `hide?: string[]` param to both functions in `kv.ts` and update the `cardKey()` helper there.

### Pattern 3: DELETE /sync — Store Redacted Card, Return JSON
**What:** After wiping user data, `DELETE /sync` should store a redacted SVG in `CARDS_KV` for the user and return the existing JSON success response. The redacted card is a visual signal that data was intentionally removed — not a broken image.

**When to use:** Immediately after `deleteAllUserData()` in the DELETE handler.

**Example flow:**
```typescript
// After deleteAllUserData():
const redactedSvg = renderRedactedCard(username);
await putCardCache(env.CARDS_KV, username, "dark", "classic", "github", redactedSvg);
// Note: putCardCache with hide=[] stores at the base key — correct for "any card request gets the redacted version"
return c.json({ ok: true, deleted: true, username });
```

**Consideration:** Should all hide variants be pre-populated with the redacted card? No — the redacted card shows no stats at all, so `?hide=cost` is irrelevant after deletion. Only the default (no-hide) key needs to be populated. Any request with `?hide=` params will miss the cache and fall through to... userData being null → `renderPlaceholderCard()`.

**Edge case:** After DELETE, `getUserData()` returns null. So `GET /u/:username` without a cached redacted card falls through to `renderPlaceholderCard()`, not `renderRedactedCard()`. The correct fix is to cache the redacted card in `CARDS_KV` after DELETE, so the next GET hits the cache before reaching the userData lookup. This means `deleteAllUserData()` in `kv.ts` must NOT delete the card cache — or the DELETE route must re-populate the redacted card AFTER calling `deleteAllUserData()`.

**Verified sequence:**
```
DELETE /sync →
  1. deleteAllUserData(USER_DATA_KV, username)   // wipes userData + all card cache
  2. renderRedactedCard(username)                 // generate redacted SVG
  3. putCardCache(CARDS_KV, username, "dark", "classic", "github", redactedSvg)
     // re-populates cache with redacted card at the default key
  4. return JSON { ok: true, deleted: true, username }
```

This sequence works because `deleteAllUserData()` already deletes all card cache variants (it calls `kv.list({ prefix: "card:{username}:" })` and deletes all). Step 3 then writes just the default-key redacted card back in.

### Anti-Patterns to Avoid
- **Using `c.req.query("hide")` (singular):** Only returns the first `?hide=` value, silently drops others.
- **Not sorting hide params before cache key:** `?hide=cost&hide=sessions` and `?hide=sessions&hide=cost` would cache separately — wasted KV writes.
- **Caching the redacted card BEFORE deleteAllUserData:** The delete wipes all card cache keys, including the one just written.
- **Returning a 204/error from DELETE /sync:** Existing behavior returns JSON — keep that. Only add the SVG storage as a side effect.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-value query params | Custom URL parsing | `c.req.queries("hide")` | Hono already handles this correctly |
| SVG redacted card rendering | New SVG template | `renderRedactedCard()` already in svg/index.ts | Already implemented and exported |
| Cache invalidation on delete | New KV listing logic | `deleteAllUserData()` already handles it | Already lists and deletes all card variants |

**Key insight:** All three pieces (hide-aware renderCard, renderRedactedCard, KV cache) exist and are correct. The only work is wiring call sites.

## Common Pitfalls

### Pitfall 1: Cache Key Mismatch Causes Stale Served Cards
**What goes wrong:** `?hide=cost` request hits a cached card that shows cost. User sees wrong card.
**Why it happens:** Cache key does not encode the hide params.
**How to avoid:** Include sorted hide params in the cache key. Update `cardKey()` in `kv.ts` or handle in the route.
**Warning signs:** Test by requesting `?hide=cost` twice — second request should also hide cost, not show a full card.

### Pitfall 2: DELETE Order — Wipe Then Write
**What goes wrong:** Redacted card is stored, then `deleteAllUserData()` is called, wiping it.
**Why it happens:** Wrong operation order in the DELETE handler.
**How to avoid:** Call `deleteAllUserData()` FIRST, then `putCardCache()` with the redacted SVG.
**Warning signs:** GET /u/:username after DELETE shows placeholder instead of redacted card.

### Pitfall 3: `renderRedactedCard` Not Imported in sync.ts
**What goes wrong:** TypeScript compile error.
**Why it happens:** `renderRedactedCard` is exported from `svg/index.ts` but `sync.ts` only imports `renderCard`.
**How to avoid:** Add `renderRedactedCard` to the import from `"../svg/index.js"` in sync.ts.
**Warning signs:** tsc error at build time.

### Pitfall 4: `?hide=` with No Values After DELETE
**What goes wrong:** After DELETE, `GET /u/:username?hide=cost` misses the redacted card cache (stored at the no-hide key) and falls through to userData=null → placeholder card instead of redacted card.
**Why it happens:** Cache key mismatch — redacted card stored at base key, request has a hide key.
**How to avoid:** Accept this behavior as correct. The redacted card signals intentional deletion; hide params are irrelevant when data is gone. Placeholder is an acceptable fallback for hide-parameterized requests post-delete. Alternatively, store the redacted card at all key variants — overkill.
**Recommendation:** Accept the fallthrough to placeholder for hide-parameterized requests post-delete. Document this behavior.

## Code Examples

Verified patterns from the existing codebase:

### Parsing hide param in card.ts (current state)
```typescript
// Source: shipcard-worker/src/routes/card.ts (current — missing hide)
const theme = (c.req.query("theme") ?? "dark") as ThemeName;
const layout = (c.req.query("layout") ?? "classic") as LayoutName;
const style = (c.req.query("style") ?? "github") as StyleName;
// hide is NOT parsed here — the gap being fixed
```

### After fix: add hide param parsing
```typescript
// Add after existing param parsing
const hide = c.req.queries("hide") ?? [];
```

### Passing hide to renderCard (current state)
```typescript
// Source: shipcard-worker/src/routes/card.ts line 76
const svg = renderCard(userData, { theme, layout, style });
// hide not passed — the gap being fixed
```

### After fix
```typescript
const svg = renderCard(userData, { theme, layout, style, hide });
```

### renderRedactedCard signature (already correct)
```typescript
// Source: shipcard-worker/src/svg/index.ts line 183
export function renderRedactedCard(username: string): string { ... }
```

### DELETE /sync current state (the gap)
```typescript
// Source: shipcard-worker/src/routes/sync.ts lines 92-103
syncRoutes.delete("/", authMiddleware, async (c) => {
  const username = c.get("username");
  const env = c.env;
  await deleteAllUserData(env.USER_DATA_KV, username);
  await invalidateCardVariants(env.CARDS_KV, username);
  return c.json({ ok: true, deleted: true, username });
});
// renderRedactedCard never called — gap being fixed
```

### cardKey helper (kv.ts current state)
```typescript
// Source: shipcard-worker/src/kv.ts lines 22-29
function cardKey(username: string, theme: string, layout: string, style: string): string {
  return `card:${username}:${theme}:${layout}:${style}`;
}
// No hide encoding — needs update
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `/card/:username` path | `/u/:username` path | Phase 05 | Shorter URL, already deployed |
| No cache (Phase 03) | KV card cache (Phase 04) | Phase 04 | hide params must be in cache key |

**Deprecated/outdated:**
- Route `/card/:username`: replaced by `/u/:username` per Phase 05 decision — do not reference the old path.

## Open Questions

1. **Should `kv.ts` `cardKey()` be updated, or should the hide-key encoding live in `routes/card.ts`?**
   - What we know: `kv.ts` owns the key format; `routes/card.ts` currently passes all key components to `kv.ts` helpers.
   - What's unclear: Whether `getCardCache()` and `putCardCache()` should gain an optional `hide?: string[]` param, or if the route computes a raw key string and uses `kv.put()` directly.
   - Recommendation: Add `hide?: string[]` param to `getCardCache()` and `putCardCache()` in `kv.ts`, update `cardKey()` there. Keeps key format centralized.

2. **Should `deleteAllUserData()` in `kv.ts` remain unchanged?**
   - What we know: It already deletes all card cache variants via prefix listing.
   - What's unclear: Whether to add redacted-card re-population inside `deleteAllUserData()` or keep it in the route handler.
   - Recommendation: Keep it in the route handler. `deleteAllUserData()` is a pure deletion function — side-effecting it with a write would violate single responsibility. The DELETE route handler should own the sequence.

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `shipcard-worker/src/routes/card.ts` — current param parsing and renderCard call
- Direct codebase read: `shipcard-worker/src/routes/sync.ts` — DELETE handler missing renderRedactedCard call
- Direct codebase read: `shipcard-worker/src/svg/index.ts` — renderRedactedCard fully implemented, renderCard accepts hide
- Direct codebase read: `shipcard-worker/src/kv.ts` — cardKey(), getCardCache(), putCardCache() signatures

### Secondary (MEDIUM confidence)
- Hono docs: `c.req.queries()` (plural) for multi-value query params — standard Hono API, consistent with framework conventions

### Tertiary (LOW confidence)
- None needed — this phase has no external dependencies to research

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new libraries; existing code fully read
- Architecture: HIGH — All functions and their signatures are known from direct codebase inspection
- Pitfalls: HIGH — Derived from direct analysis of the existing code paths, not speculation

**Research date:** 2026-03-25
**Valid until:** Stable — internal codebase changes only, no external dependencies
