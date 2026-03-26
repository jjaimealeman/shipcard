/**
 * ShipLog Worker — Hono app entry point.
 *
 * Routes:
 *   GET /              — health check
 *   GET /card/:username — SVG stats card (cached, public)
 *
 * Phase 4, Plan 02 will add:
 *   POST /sync         — stat upload (authenticated)
 *   GET  /auth/callback — GitHub OAuth callback
 *   POST /auth/exchange — GitHub token → Worker token exchange
 *   GET  /configure    — browser configurator HTML page
 */

import { Hono } from "hono";
import type { AppType } from "./types.js";
import { cardRoutes } from "./routes/card.js";

const app = new Hono<AppType>();

// Health check
app.get("/", (c) =>
  c.json({ name: "shiplog-worker", status: "ok", version: "0.1.0" })
);

// Card serving — public, no auth required
app.route("/card", cardRoutes);

export default app;
