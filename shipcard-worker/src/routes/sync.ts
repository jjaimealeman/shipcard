/**
 * Sync routes for the ShipCard Worker.
 *
 * POST /sync — Accepts a SafeStats payload from the CLI, stores it in KV,
 * invalidates all cached card variants, and synchronously re-renders the
 * default card variant to avoid KV eventual consistency staleness.
 *
 * DELETE /sync — Removes all user data and card variants from KV.
 * Auth token is preserved so the user can re-sync later without re-authenticating.
 *
 * All routes require a valid bearer token (authMiddleware).
 */

import { Hono } from "hono";
import type { AppType, CommunityMeta } from "../types.js";
import { isValidSafeStats } from "../types.js";
import { authMiddleware } from "../auth.js";
import {
  putUserData,
  deleteAllUserData,
  invalidateCardVariants,
  putCardCache,
  incrementCardsServed,
} from "../kv.js";
import { renderCard, renderRedactedCard } from "../svg/index.js";

export const syncRoutes = new Hono<AppType>();

/**
 * POST /sync
 *
 * Accepts: SafeStats JSON payload
 * Returns: { ok: true, username: string, variantsInvalidated: number }
 *
 * Steps:
 * 1. Authenticate via bearer token (authMiddleware)
 * 2. Parse and validate payload with isValidSafeStats()
 * 3. Verify payload.username matches authenticated username
 * 4. Store data in KV
 * 5. Invalidate all cached card variants
 * 6. Synchronously re-render and cache the default variant (dark/classic/github)
 *    to avoid KV eventual consistency issues (Pitfall 2 from research)
 */
syncRoutes.post("/", authMiddleware, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  // Validate payload shape and privacy boundary
  if (!isValidSafeStats(body)) {
    return c.json({ error: "Invalid SafeStats payload" }, 400);
  }

  // Verify payload username matches authenticated user
  const authenticatedUsername = c.get("username");
  if (body.username.toLowerCase() !== authenticatedUsername.toLowerCase()) {
    return c.json({ error: "Username mismatch: payload does not match token" }, 403);
  }

  const env = c.env;
  const username = authenticatedUsername;
  const syncedAt = new Date().toISOString();

  // Build community metadata for O(1) community page rendering via kv.list().
  // v1 users also get metadata so they appear in community listings immediately.
  const meta: CommunityMeta = {
    syncedAt,
    totalSessions: body.totalSessions,
    totalCost: body.totalCost,
    projectCount: body.projectCount,
    totalTokens:
      body.totalTokens.input +
      body.totalTokens.output +
      body.totalTokens.cacheCreate +
      body.totalTokens.cacheRead,
  };

  // Store the validated SafeStats in KV with community metadata
  await putUserData(env.USER_DATA_KV, username, body, meta);

  // Invalidate all existing cached card variants
  const variantsInvalidated = await invalidateCardVariants(env.CARDS_KV, username);

  // Synchronously re-render and cache the default card variant.
  // This prevents the next GET /card/:username from reading stale KV data
  // due to Cloudflare KV's eventual consistency model.
  const defaultSvg = renderCard(body, {
    theme: "dark",
    layout: "classic",
    style: "github",
  });
  await putCardCache(env.CARDS_KV, username, "dark", "classic", "github", defaultSvg);

  // Increment the global cards-served counter for community stats.
  await incrementCardsServed(env.USER_DATA_KV);

  return c.json({ ok: true, username, variantsInvalidated });
});

/**
 * DELETE /sync
 *
 * Removes all user data and card variants from KV.
 * Auth token is intentionally preserved so the user can re-sync later.
 *
 * Returns: { ok: true, deleted: true, username: string }
 */
syncRoutes.delete("/", authMiddleware, async (c) => {
  const username = c.get("username");
  const env = c.env;

  // Delete SafeStats data and all card variants
  await deleteAllUserData(env.USER_DATA_KV, username);

  // Invalidate any remaining card cache variants (belt and suspenders)
  await invalidateCardVariants(env.CARDS_KV, username);

  // Render and store a redacted card as the default variant.
  // MUST come AFTER deleteAllUserData + invalidateCardVariants — those wipe all
  // card: keys; writing the redacted card first would be immediately erased.
  const redactedSvg = renderRedactedCard(username);
  await putCardCache(env.CARDS_KV, username, "dark", "classic", "github", redactedSvg);

  return c.json({ ok: true, deleted: true, username, redactedCard: true });
});
