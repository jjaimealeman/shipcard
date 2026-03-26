/**
 * KV helper module for the ShipLog Worker.
 *
 * Wraps raw KV calls with typed functions and consistent key naming.
 *
 * Key naming scheme:
 *   card:{username}:{theme}:{layout}:{style}  — rendered SVG variant cache
 *   user:{username}:data                       — SafeStats JSON payload
 *   token:{token}:username                     — auth token → username lookup
 */

import type { SafeStats } from "./types.js";

// ---------------------------------------------------------------------------
// Card cache (CARDS_KV)
// ---------------------------------------------------------------------------

/**
 * Build the KV key for a rendered SVG card variant.
 * Max 18 variants per user (3 styles × 2 themes × 3 layouts).
 */
function cardKey(
  username: string,
  theme: string,
  layout: string,
  style: string
): string {
  return `card:${username}:${theme}:${layout}:${style}`;
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
  style: string
): Promise<string | null> {
  return kv.get(cardKey(username, theme, layout, style));
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
  svg: string
): Promise<void> {
  await kv.put(cardKey(username, theme, layout, style), svg);
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
 * Delete all data for a user: SafeStats payload + all card variants.
 * Used by `shiplog sync --delete`.
 */
export async function deleteAllUserData(
  kv: KVNamespace,
  username: string
): Promise<void> {
  await kv.delete(`user:${username}:data`);
  const listed = await kv.list({ prefix: `card:${username}:` });
  await Promise.all(listed.keys.map((k) => kv.delete(k.name)));
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

/**
 * Revoke an auth token by deleting its KV entry.
 */
export async function deleteToken(
  kv: KVNamespace,
  token: string
): Promise<void> {
  await kv.delete(`token:${token}:username`);
}
