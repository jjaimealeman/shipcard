/**
 * ShipCard Worker — Hono app entry point.
 *
 * Routes:
 *   GET  /              — landing page (HTML)
 *   GET  /u/:username   — SVG stats card (cached, public)
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
import { landingRoutes } from "./routes/landing.js";

const app = new Hono<AppType>();

// Landing page — product front door
app.route("/", landingRoutes);

// Card serving — public, no auth required
app.route("/u", cardRoutes);

// Auth — GitHub token exchange for Worker-issued bearer token
app.route("/auth", authRoutes);

// Sync — authenticated stat upload and data deletion
app.route("/sync", syncRoutes);

// Configure — browser configurator (no auth, stats passed via hash fragment)
app.route("/configure", configureRoutes);

export default app;
