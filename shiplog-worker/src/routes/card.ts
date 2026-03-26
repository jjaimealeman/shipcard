/**
 * GET /u/:username — ShipCard SVG card endpoint.
 *
 * Serves cached or freshly rendered SVG cards with anti-camo headers.
 * Unknown usernames get a placeholder card (not a 404 or error response).
 *
 * Query params:
 *   ?theme=dark|light      (default: dark)
 *   ?layout=classic|compact|hero  (default: classic)
 *   ?style=github|branded|minimal (default: github)
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
import { getCardCache, putCardCache, getUserData } from "../kv.js";
import {
  renderCard,
  renderPlaceholderCard,
} from "../svg/index.js";
import type { StyleName, ThemeName, LayoutName } from "../svg/index.js";

// ---------------------------------------------------------------------------
// Response helper
// ---------------------------------------------------------------------------

/**
 * Build a Response with SVG content and anti-camo Cache-Control headers.
 *
 * CRITICAL: These headers prevent GitHub's camo proxy from caching the SVG
 * for days. Without them, users would see stale cards for hours/days after
 * a sync. This is the single most important correctness requirement.
 */
function svgResponse(
  c: { body: (data: string, status: number, headers: Record<string, string>) => Response },
  svg: string,
  status = 200
): Response {
  return c.body(svg, status, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const cardRoutes = new Hono<{ Bindings: Env }>();

cardRoutes.get("/:username", async (c) => {
  const username = c.req.param("username");

  // Parse appearance query params with defaults
  const theme = (c.req.query("theme") ?? "dark") as ThemeName;
  const layout = (c.req.query("layout") ?? "classic") as LayoutName;
  const style = (c.req.query("style") ?? "github") as StyleName;

  // 1. Check KV card cache first
  const cached = await getCardCache(c.env.CARDS_KV, username, theme, layout, style);
  if (cached !== null) {
    return svgResponse(c, cached);
  }

  // 2. Cache miss — fetch user data
  const userData = await getUserData(c.env.USER_DATA_KV, username);

  // 3. Unknown user → placeholder card (not a 404)
  if (userData === null) {
    const placeholder = renderPlaceholderCard(username);
    return svgResponse(c, placeholder);
  }

  // 4. Render the card from user data
  const svg = renderCard(userData, { theme, layout, style });

  // 5. Store rendered SVG in KV cache (no TTL — valid until next sync)
  await putCardCache(c.env.CARDS_KV, username, theme, layout, style, svg);

  return svgResponse(c, svg);
});
