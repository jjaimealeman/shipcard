/**
 * ShipLog Worker — Hono app entry point.
 *
 * Routes:
 *   GET  /              — health check
 *   GET  /card/:username — SVG stats card (cached, public)
 *   POST /auth/exchange  — GitHub token → Worker bearer token exchange
 *   POST /sync           — authenticated stat upload
 *   DELETE /sync         — wipe user data (auth token preserved)
 *   GET  /configure      — browser configurator HTML page (no auth)
 */

import { Hono } from "hono";
import type { AppType } from "./types.js";
import { cardRoutes } from "./routes/card.js";
import { authRoutes } from "./routes/auth.js";
import { syncRoutes } from "./routes/sync.js";
import { configureRoutes } from "./routes/configure.js";

const app = new Hono<AppType>();

// Health check
app.get("/", (c) =>
  c.json({ name: "shiplog-worker", status: "ok", version: "0.1.0" })
);

// Card serving — public, no auth required
app.route("/card", cardRoutes);

// Auth — GitHub token exchange for Worker-issued bearer token
app.route("/auth", authRoutes);

// Sync — authenticated stat upload and data deletion
app.route("/sync", syncRoutes);

// Configure — browser configurator (no auth, stats passed via hash fragment)
app.route("/configure", configureRoutes);

export default app;
