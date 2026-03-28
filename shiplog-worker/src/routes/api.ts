/**
 * GET /u/:username/api/stats       — SafeStats JSON (public, CORS-enabled)
 * GET /u/:username/api/timeseries  — SafeTimeSeries JSON (public, CORS-enabled)
 *
 * Both endpoints serve stored KV data with a syncedAt envelope for freshness
 * display ("Data as of yyyy-mm-dd") in the Phase 11 dashboard.
 *
 * CORS wildcard is appropriate: data is already fully public (same access model
 * as the SVG card). Can be tightened to the dashboard origin in Phase 11.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppType } from "../types.js";
import { getUserData, getTimeSeries } from "../kv.js";

export const apiRoutes = new Hono<AppType>();

// Apply wildcard CORS to all routes in this sub-app.
// Handles OPTIONS preflight automatically.
apiRoutes.use("/*", cors());

// ---------------------------------------------------------------------------
// GET /:username/api/stats
// ---------------------------------------------------------------------------

/**
 * Returns the user's SafeStats payload with a syncedAt timestamp.
 *
 * syncedAt is stored alongside SafeStats by POST /sync/v2. For users who
 * synced with the legacy v1 endpoint, syncedAt will be null — this is
 * correct and expected (no timestamp was captured at v1 sync time).
 */
apiRoutes.get("/:username/api/stats", async (c) => {
  const username = c.req.param("username");
  const data = await getUserData(c.env.USER_DATA_KV, username);

  if (data === null) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({
    data,
    syncedAt: (data as unknown as Record<string, unknown>).syncedAt ?? null,
  });
});

// ---------------------------------------------------------------------------
// GET /:username/api/timeseries
// ---------------------------------------------------------------------------

/**
 * Returns the user's SafeTimeSeries payload with a syncedAt timestamp.
 *
 * syncedAt is derived from generatedAt, which is always present in
 * SafeTimeSeries (set by the CLI at sync time). Returns 404 for users
 * who have never performed a v2 sync (no time-series data in KV).
 */
apiRoutes.get("/:username/api/timeseries", async (c) => {
  const username = c.req.param("username");
  const data = await getTimeSeries(c.env.USER_DATA_KV, username);

  if (data === null) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ data, syncedAt: data.generatedAt });
});
