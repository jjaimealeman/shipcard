/**
 * Sync v2 routes for the ShipCard Worker.
 *
 * POST /sync/v2 — Accepts a combined { safeStats, timeSeries } payload from
 * the CLI, stores both in KV under separate keys, invalidates cached card
 * variants, and synchronously re-renders the default card variant.
 *
 * DELETE /sync/v2 is intentionally absent — the existing DELETE /sync
 * handles all key types (data, timeseries, card variants). One delete
 * endpoint is cleaner than duplicating the logic here.
 *
 * All routes require a valid bearer token (authMiddleware).
 */

import { Hono } from "hono";
import type { AppType, CommunityMeta } from "../types.js";
import { isValidSyncV2Body } from "../types.js";
import { authMiddleware } from "../auth.js";
import {
  putUserData,
  putTimeSeries,
  invalidateCardVariants,
  putCardCache,
  incrementCardsServed,
} from "../kv.js";
import { renderCard } from "../svg/index.js";

export const syncV2Routes = new Hono<AppType>();

/**
 * POST /sync/v2
 *
 * Accepts: { safeStats: SafeStats, timeSeries: SafeTimeSeries } JSON payload
 * Returns: { ok: true, apiVersion: "v2", syncedAt: string, username: string, variantsInvalidated: number }
 *
 * Steps:
 * 1. Authenticate via bearer token (authMiddleware)
 * 2. Parse and validate payload with isValidSyncV2Body()
 * 3. Verify payload.safeStats.username matches authenticated username
 * 4. Store SafeStats in user:{username}:data (same key as v1, adds syncedAt)
 * 5. Store SafeTimeSeries in user:{username}:timeseries (new key)
 * 6. Invalidate all cached card variants
 * 7. Synchronously re-render and cache the default variant (dark/classic/github)
 *    to avoid KV eventual consistency issues (Pitfall 2 from research)
 */
syncV2Routes.post("/", authMiddleware, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  // Validate combined v2 payload shape
  if (!isValidSyncV2Body(body)) {
    return c.json({ error: "Invalid v2 sync payload" }, 400);
  }

  // Verify payload username matches authenticated user
  const authenticatedUsername = c.get("username");
  if (
    body.safeStats.username.toLowerCase() !==
    authenticatedUsername.toLowerCase()
  ) {
    return c.json(
      { error: "Username mismatch: payload does not match token" },
      403
    );
  }

  const env = c.env;
  const username = authenticatedUsername;
  const syncedAt = new Date().toISOString();

  // Build community metadata from the validated payload.
  // Written as KV entry metadata so kv.list() returns summary stats for all
  // users in a single call — enables O(1) community page rendering.
  const meta: CommunityMeta = {
    syncedAt,
    totalSessions: body.safeStats.totalSessions,
    totalCost: body.safeStats.totalCost,
    projectCount: body.safeStats.projectCount,
    totalTokens:
      body.safeStats.totalTokens.input +
      body.safeStats.totalTokens.output +
      body.safeStats.totalTokens.cacheCreate +
      body.safeStats.totalTokens.cacheRead,
  };

  // Store SafeStats enriched with syncedAt (same KV key as v1 — compatible reads).
  // TypeScript cast is intentional: SafeStats doesn't declare syncedAt but the
  // field is safely ignored by all consumers that only read known SafeStats keys.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await putUserData(env.USER_DATA_KV, username, { ...body.safeStats, syncedAt } as any, meta);

  // Store SafeTimeSeries in new separate key
  await putTimeSeries(env.USER_DATA_KV, username, body.timeSeries);

  // Invalidate all existing cached card variants
  const variantsInvalidated = await invalidateCardVariants(
    env.CARDS_KV,
    username
  );

  // Synchronously re-render and cache the default card variant.
  // This prevents the next GET /u/:username from reading stale KV data
  // due to Cloudflare KV's eventual consistency model.
  const defaultSvg = renderCard(body.safeStats, {
    theme: "dark",
    layout: "classic",
    style: "github",
  });
  await putCardCache(
    env.CARDS_KV,
    username,
    "dark",
    "classic",
    "github",
    defaultSvg
  );

  // Increment the global cards-served counter for community stats.
  await incrementCardsServed(env.USER_DATA_KV);

  return c.json({ ok: true, apiVersion: "v2", syncedAt, username, variantsInvalidated });
});
