/**
 * ShipCard Worker — Hono app entry point.
 *
 * Routes:
 *   GET    /                          — landing page (HTML)
 *   GET    /community                 — community leaderboard (HTML)
 *   GET    /u/:username/dashboard     — full analytics dashboard (public)
 *   GET    /u/:username               — SVG stats card (cached, public)
 *   GET    /u/:username/api/stats      — SafeStats JSON (public)
 *   GET    /u/:username/api/timeseries — SafeTimeSeries JSON (public)
 *   POST   /auth/exchange             — GitHub token → Worker bearer token exchange
 *   POST   /sync/v2                   — v2 stat + time-series upload ({ safeStats, timeSeries })
 *   POST   /sync                      — authenticated stat upload (v1)
 *   DELETE /sync                      — wipe user data (auth token preserved)
 *   GET    /configure                 — browser configurator HTML page (no auth)
 *   GET    /billing/checkout           — Start checkout (redirects to GitHub OAuth)
 *   GET    /billing/checkout/callback  — GitHub OAuth callback → Stripe Checkout
 *   GET    /billing/portal             — Start portal (redirects to GitHub OAuth)
 *   GET    /billing/portal/callback    — GitHub OAuth callback → Stripe Customer Portal
 *   GET    /billing/welcome            — Post-checkout confirmation page
 *   POST   /webhook/stripe            — Stripe webhook event handler
 */

import { Hono } from "hono";
import { trimTrailingSlash } from "hono/trailing-slash";
import type { AppType } from "./types.js";
import { apiRoutes } from "./routes/api.js";
import { cardRoutes } from "./routes/card.js";
import { authRoutes } from "./routes/auth.js";
import { syncRoutes } from "./routes/sync.js";
import { syncV2Routes } from "./routes/syncV2.js";
import { configureRoutes } from "./routes/configure.js";
import { landingRoutes } from "./routes/landing.js";
import { communityRoutes } from "./routes/community.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { billingRoutes } from "./routes/billing.js";
import { webhookRoutes } from "./routes/webhook.js";

const app = new Hono<AppType>();

// Strip trailing slashes — /u/username/ → /u/username (prevents 404s)
app.use(trimTrailingSlash());

// Landing page — product front door
app.route("/", landingRoutes);

// Community leaderboard — /community
app.route("/community", communityRoutes);

// Dashboard — full analytics dashboard at /u/:username/dashboard
// MUST be before apiRoutes and cardRoutes so /:username/dashboard
// is matched before /:username/api/* and /:username single-segment patterns.
app.route("/u", dashboardRoutes);

// JSON API — public, CORS-enabled; MUST be before cardRoutes so
// /:username/api/* paths are matched before /:username catches all.
app.route("/u", apiRoutes);

// Card serving — public, no auth required
app.route("/u", cardRoutes);

// Auth — GitHub token exchange for Worker-issued bearer token
app.route("/auth", authRoutes);

// Sync v2 — MUST be mounted before /sync so Hono matches /sync/v2 specifically
app.route("/sync/v2", syncV2Routes);

// Sync v1 — authenticated stat upload and data deletion
app.route("/sync", syncRoutes);

// Configure — browser configurator (no auth, stats passed via hash fragment)
app.route("/configure", configureRoutes);

// Billing — checkout + portal via GitHub OAuth redirect flow
app.route("/billing", billingRoutes);

// Webhook — Stripe subscription lifecycle events (no auth, verified by signature)
app.route("/webhook", webhookRoutes);

export default app;
