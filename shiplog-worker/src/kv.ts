/**
 * KV helper module for the ShipCard Worker.
 *
 * Wraps raw KV calls with typed functions and consistent key naming.
 *
 * Key naming scheme:
 *   card:{username}:{theme}:{layout}:{style}              — rendered SVG variant cache (no hide)
 *   card:{username}:{theme}:{layout}:{style}:hide={a,b}   — SVG variant with hidden stats
 *   user:{username}:data                                   — SafeStats JSON payload
 *   user:{username}:timeseries                             — SafeTimeSeries JSON payload
 *   token:{token}:username                                 — auth token → username lookup
 */

import type { SafeStats, SafeTimeSeries } from "./types.js";

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
 */
export async function putUserData(
  kv: KVNamespace,
  username: string,
  data: SafeStats
): Promise<void> {
  await kv.put(`user:${username}:data`, JSON.stringify(data));
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

