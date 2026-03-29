/**
 * KV helper module for the ShipCard Worker.
 *
 * Wraps raw KV calls with typed functions and consistent key naming.
 *
 * Key naming scheme:
 *   card:{username}:{theme}:{layout}:{style}              — rendered SVG variant cache (no hide)
 *   card:{username}:{theme}:{layout}:{style}:hide={a,b}   — SVG variant with hidden stats
 *   card:{username}:{layout}:t={theme}                    — v2 curated theme cache
 *   card:{username}:{layout}:t={theme}:hide={a,b}         — v2 curated theme cache with hidden stats
 *   user:{username}:data                                   — SafeStats JSON payload
 *   user:{username}:timeseries                             — SafeTimeSeries JSON payload
 *   token:{token}:username                                 — auth token → username lookup
 */

import type { CommunityMeta, SafeStats, SafeTimeSeries } from "./types.js";
import { isUserProFromD1 } from "./db/subscriptions.js";

// ---------------------------------------------------------------------------
// Card cache (CARDS_KV)
// ---------------------------------------------------------------------------

/**
 * Build the KV key for a rendered SVG card variant.
 * Max 18 base variants per user (3 styles × 2 themes × 3 layouts).
 * When hide params are present, a deterministic suffix is appended so
 * ?hide=cost&hide=models and ?hide=models&hide=cost produce the same key.
 */
function cardKey(
  username: string,
  theme: string,
  layout: string,
  style: string,
  hide: string[] = []
): string {
  const base = `card:${username}:${theme}:${layout}:${style}`;
  if (hide.length === 0) return base;
  const sorted = [...hide].sort().join(",");
  return `${base}:hide=${sorted}`;
}

/**
 * Read a rendered SVG from the card cache.
 * Returns null on cache miss.
 */
export async function getCardCache(
  kv: KVNamespace,
  username: string,
  theme: string,
  layout: string,
  style: string,
  hide: string[] = []
): Promise<string | null> {
  return kv.get(cardKey(username, theme, layout, style, hide));
}

/**
 * Write a rendered SVG to the card cache.
 * No expirationTtl — cache is valid until the next sync invalidates it.
 */
export async function putCardCache(
  kv: KVNamespace,
  username: string,
  theme: string,
  layout: string,
  style: string,
  svg: string,
  hide: string[] = []
): Promise<void> {
  await kv.put(cardKey(username, theme, layout, style, hide), svg);
}

/**
 * Delete all cached SVG variants for a user.
 *
 * Lists all keys with the `card:{username}:` prefix and deletes them.
 * Single-page list is sufficient — max 18 variants (3×2×3) per user,
 * well under the KV list 1000-key limit.
 *
 * @returns Number of cache entries deleted.
 */
export async function invalidateCardVariants(
  kv: KVNamespace,
  username: string
): Promise<number> {
  const listed = await kv.list({ prefix: `card:${username}:` });
  await Promise.all(listed.keys.map((k) => kv.delete(k.name)));
  return listed.keys.length;
}

// ---------------------------------------------------------------------------
// User data (USER_DATA_KV)
// ---------------------------------------------------------------------------

/**
 * Read a user's SafeStats payload from KV.
 * Returns null if the user has no data.
 */
export async function getUserData(
  kv: KVNamespace,
  username: string
): Promise<SafeStats | null> {
  const raw = await kv.get(`user:${username}:data`);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as SafeStats;
  } catch {
    return null;
  }
}

/**
 * Write a user's SafeStats payload to KV.
 *
 * Accepts an optional CommunityMeta object written as KV entry metadata.
 * When provided, kv.list() returns summary stats for all users without
 * requiring individual get() calls — enabling O(1) community page rendering.
 */
export async function putUserData(
  kv: KVNamespace,
  username: string,
  data: SafeStats,
  metadata?: CommunityMeta
): Promise<void> {
  await kv.put(
    `user:${username}:data`,
    JSON.stringify(data),
    metadata ? { metadata } : undefined
  );
}

/**
 * List all users with their community summary stats from a single KV list() call.
 *
 * Filters for keys ending in `:data` to exclude timeseries/token keys and
 * avoids double-counting. Users synced before metadata was introduced will
 * have meta === null — callers must handle this gracefully.
 *
 * @param limit - Max number of KV keys to fetch (default 1000).
 */
export async function listUsers(
  kv: KVNamespace,
  limit = 1000
): Promise<Array<{ username: string; meta: CommunityMeta | null }>> {
  const listed = await kv.list<CommunityMeta>({ prefix: "user:", limit });
  return listed.keys
    .filter((k) => k.name.endsWith(":data"))
    .map((k) => ({
      username: k.name.slice("user:".length, -":data".length),
      meta: k.metadata ?? null,
    }));
}

/**
 * Delete all data for a user: SafeStats payload + time-series payload + all card variants.
 * Used by `shipcard sync --delete`.
 */
export async function deleteAllUserData(
  kv: KVNamespace,
  username: string
): Promise<void> {
  await kv.delete(`user:${username}:data`);
  await kv.delete(`user:${username}:timeseries`);
  const listed = await kv.list({ prefix: `card:${username}:` });
  await Promise.all(listed.keys.map((k) => kv.delete(k.name)));
}

// ---------------------------------------------------------------------------
// Time-series data (USER_DATA_KV)
// ---------------------------------------------------------------------------

/**
 * Read a user's SafeTimeSeries payload from KV.
 * Returns null if the user has no time-series data or on JSON parse error.
 */
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

/**
 * Write a user's SafeTimeSeries payload to KV.
 * No expirationTtl — cache is valid until the next sync overwrites it.
 */
export async function putTimeSeries(
  kv: KVNamespace,
  username: string,
  data: SafeTimeSeries
): Promise<void> {
  await kv.put(`user:${username}:timeseries`, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Auth tokens (USER_DATA_KV)
// ---------------------------------------------------------------------------

/**
 * Look up the username associated with an auth token.
 * Returns null if the token is not found or has expired.
 */
export async function getTokenUsername(
  kv: KVNamespace,
  token: string
): Promise<string | null> {
  return kv.get(`token:${token}:username`);
}

/**
 * Store an auth token → username mapping with a 1-year TTL.
 */
export async function putToken(
  kv: KVNamespace,
  token: string,
  username: string
): Promise<void> {
  await kv.put(`token:${token}:username`, username, {
    expirationTtl: 60 * 60 * 24 * 365, // 1 year
  });
}

// ---------------------------------------------------------------------------
// Cards-served counter (USER_DATA_KV)
// ---------------------------------------------------------------------------

/** KV key for the global cards-served counter. */
const CARDS_SERVED_KEY = "meta:cards_served";

/**
 * Read the current cards-served count.
 * Returns 0 if the counter has not been initialized yet.
 */
export async function getCardsServedCount(kv: KVNamespace): Promise<number> {
  const val = await kv.get(CARDS_SERVED_KEY);
  return val ? parseInt(val, 10) : 0;
}

/**
 * Increment the global cards-served counter by 1.
 * Called on every successful sync (both v1 and v2) to track total syncs.
 */
export async function incrementCardsServed(kv: KVNamespace): Promise<void> {
  const current = await getCardsServedCount(kv);
  await kv.put(CARDS_SERVED_KEY, String(current + 1));
}

// ---------------------------------------------------------------------------
// PRO subscription gate (D1)
// ---------------------------------------------------------------------------

/**
 * Check whether a user has an active PRO subscription.
 *
 * Reads from D1 via isUserProFromD1() for strong consistency.
 * Treats 'active' and 'past_due' as PRO (grace period for payment failures).
 *
 * Phase 18 (Stripe Subscriptions) writes subscription state via webhook.
 * Phase 17 (Theme System) reads it for BYOT gating.
 */
export async function isUserPro(
  db: D1Database,
  username: string
): Promise<boolean> {
  return isUserProFromD1(db, username);
}

// ---------------------------------------------------------------------------
// V2 card cache — curated themes (CARDS_KV)
// ---------------------------------------------------------------------------

/**
 * Build the v2 KV key for a curated-theme rendered SVG card.
 *
 * Uses `t=` prefix to disambiguate curated theme keys from legacy keys.
 * Key format: card:{username}:{layout}:t={theme}[:{hide suffix}]
 */
function cardKeyV2(
  username: string,
  layout: string,
  theme: string,
  hide: string[] = []
): string {
  const base = `card:${username}:${layout}:t=${theme}`;
  if (hide.length === 0) return base;
  const sorted = [...hide].sort().join(",");
  return `${base}:hide=${sorted}`;
}

/**
 * Read a rendered SVG from the v2 curated theme card cache.
 * Returns null on cache miss.
 */
export async function getCardCacheV2(
  kv: KVNamespace,
  username: string,
  layout: string,
  theme: string,
  hide: string[] = []
): Promise<string | null> {
  return kv.get(cardKeyV2(username, layout, theme, hide));
}

/**
 * Write a rendered SVG to the v2 curated theme card cache.
 * No expirationTtl — cache is valid until the next sync invalidates it.
 */
export async function putCardCacheV2(
  kv: KVNamespace,
  username: string,
  layout: string,
  theme: string,
  svg: string,
  hide: string[] = []
): Promise<void> {
  await kv.put(cardKeyV2(username, layout, theme, hide), svg);
}

