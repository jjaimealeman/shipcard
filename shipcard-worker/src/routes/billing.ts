/**
 * Billing routes for the ShipCard Worker.
 *
 * All billing actions use GET + GitHub OAuth redirect flow. The dashboard
 * is public (no login, no cookies), so billing routes authenticate the user
 * by redirecting through GitHub OAuth before proceeding to Stripe.
 *
 * Flow:
 *   Upgrade:  GET /billing/checkout → GitHub OAuth → GET /billing/checkout/callback → Stripe Checkout
 *   Manage:   GET /billing/portal → GitHub OAuth → GET /billing/portal/callback → Stripe Customer Portal
 *   Confirm:  GET /billing/welcome — post-checkout confirmation page (no auth)
 *
 * Auth design: The `state` param in the GitHub OAuth URL carries billing intent
 * as a base64url-encoded JSON object. After OAuth, the callback verifies identity
 * via the GitHub token exchange and proceeds to the Stripe action.
 *
 * No Bearer tokens, no authMiddleware, no cookies.
 */

import { Hono } from "hono";
import type { AppType } from "../types.js";
import { getStripe } from "../stripe.js";
import { getSubscription } from "../db/subscriptions.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BillingState {
  action: "checkout" | "portal";
  interval?: "month" | "year"; // only for checkout
  nonce: string; // random string for CSRF-like replay protection
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Encode billing state as a base64url string (no padding).
 * Used as the OAuth `state` param to carry intent through the redirect.
 */
function encodeBillingState(state: BillingState): string {
  return btoa(JSON.stringify(state))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Decode billing state from a base64url string.
 * Returns null if the string is invalid or unparseable.
 */
function decodeBillingState(encoded: string): BillingState | null {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(padded)) as BillingState;
  } catch {
    return null;
  }
}

/**
 * Exchange a GitHub OAuth code for an access token.
 * Returns the access token string, or null on failure.
 */
async function exchangeGitHubCode(
  code: string,
  redirectUri: string,
  env: AppType["Bindings"],
): Promise<string | null> {
  const resp = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as { access_token?: string };
  return data.access_token || null;
}

/**
 * Fetch the authenticated GitHub user's login (username) from an access token.
 * Returns the username string, or null on failure.
 */
async function getGitHubUsername(accessToken: string): Promise<string | null> {
  const resp = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "shipcard-worker/1.0",
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!resp.ok) return null;
  const user = (await resp.json()) as { login: string };
  return user.login || null;
}

// ---------------------------------------------------------------------------
// Route app
// ---------------------------------------------------------------------------

export const billingRoutes = new Hono<AppType>();

/**
 * GET /billing/checkout
 *
 * Starts the upgrade-to-PRO flow by redirecting to GitHub OAuth.
 * After OAuth, GitHub redirects back to /billing/checkout/callback.
 *
 * Query params:
 *   interval — "month" (default) or "year"
 */
billingRoutes.get("/checkout", async (c) => {
  const rawInterval = c.req.query("interval");
  const interval: "month" | "year" =
    rawInterval === "year" ? "year" : "month";

  const origin = new URL(c.req.url).origin;
  const redirectUri = `${origin}/billing/checkout/callback`;

  const state: BillingState = {
    action: "checkout",
    interval,
    nonce: crypto.randomUUID(),
  };

  const params = new URLSearchParams({
    client_id: c.env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    state: encodeBillingState(state),
    scope: "read:user",
  });

  return c.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`,
    302,
  );
});

/**
 * GET /billing/checkout/callback
 *
 * GitHub OAuth callback for the checkout flow.
 * Exchanges the code for a GitHub token, verifies the user identity,
 * then creates a Stripe Checkout session and redirects to it.
 */
billingRoutes.get("/checkout/callback", async (c) => {
  const code = c.req.query("code");
  const stateParam = c.req.query("state");
  const origin = new URL(c.req.url).origin;

  // Decode and validate state
  if (!code || !stateParam) {
    return c.redirect(`/?error=auth_failed`, 302);
  }

  const billingState = decodeBillingState(stateParam);
  if (!billingState || billingState.action !== "checkout") {
    return c.redirect(`/?error=auth_failed`, 302);
  }

  const redirectUri = `${origin}/billing/checkout/callback`;

  // Exchange code for GitHub access token
  const accessToken = await exchangeGitHubCode(code, redirectUri, c.env);
  if (!accessToken) {
    return c.redirect(`/?error=auth_failed`, 302);
  }

  // Fetch GitHub username
  const username = await getGitHubUsername(accessToken);
  if (!username) {
    return c.redirect(`/?error=auth_failed`, 302);
  }

  try {
    const stripe = getStripe(c.env);
    const db = c.env.DB;

    // Select price ID based on billing interval
    const interval = billingState.interval ?? "month";
    const priceId =
      interval === "year"
        ? c.env.STRIPE_PRO_ANNUAL_PRICE_ID
        : c.env.STRIPE_PRO_MONTHLY_PRICE_ID;

    // Look up existing subscription to reuse Stripe customer
    const existingSub = await getSubscription(db, username);

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { username } },
      customer: existingSub?.stripe_customer_id?.startsWith("cus_") ? existingSub.stripe_customer_id : undefined,
      success_url: `${origin}/billing/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/u/${username}/dashboard`,
    });

    if (!session.url) {
      return c.redirect(`/u/${username}/dashboard?error=checkout_failed`, 302);
    }

    return c.redirect(session.url, 302);
  } catch (err) {
    console.error("Checkout failed:", err);
    return c.redirect(`/u/${username}/dashboard?error=checkout_failed`, 302);
  }
});

/**
 * GET /billing/portal
 *
 * Starts the manage-subscription flow by redirecting to GitHub OAuth.
 * After OAuth, GitHub redirects back to /billing/portal/callback.
 */
billingRoutes.get("/portal", async (c) => {
  const origin = new URL(c.req.url).origin;
  const redirectUri = `${origin}/billing/portal/callback`;

  const state: BillingState = {
    action: "portal",
    nonce: crypto.randomUUID(),
  };

  const params = new URLSearchParams({
    client_id: c.env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    state: encodeBillingState(state),
    scope: "read:user",
  });

  return c.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`,
    302,
  );
});

/**
 * GET /billing/portal/callback
 *
 * GitHub OAuth callback for the portal flow.
 * Exchanges the code for a GitHub token, verifies the user identity,
 * then creates a Stripe Customer Portal session and redirects to it.
 */
billingRoutes.get("/portal/callback", async (c) => {
  const code = c.req.query("code");
  const stateParam = c.req.query("state");
  const origin = new URL(c.req.url).origin;

  // Decode and validate state
  if (!code || !stateParam) {
    return c.redirect(`/?error=auth_failed`, 302);
  }

  const billingState = decodeBillingState(stateParam);
  if (!billingState || billingState.action !== "portal") {
    return c.redirect(`/?error=auth_failed`, 302);
  }

  const redirectUri = `${origin}/billing/portal/callback`;

  // Exchange code for GitHub access token
  const accessToken = await exchangeGitHubCode(code, redirectUri, c.env);
  if (!accessToken) {
    return c.redirect(`/?error=auth_failed`, 302);
  }

  // Fetch GitHub username
  const username = await getGitHubUsername(accessToken);
  if (!username) {
    return c.redirect(`/?error=auth_failed`, 302);
  }

  try {
    const stripe = getStripe(c.env);
    const db = c.env.DB;

    // Require an existing subscription to open the portal
    const sub = await getSubscription(db, username);
    if (!sub) {
      return c.redirect(
        `/u/${username}/dashboard?error=no_subscription`,
        302,
      );
    }

    // Create Stripe Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/u/${username}/dashboard`,
    });

    return c.redirect(portalSession.url, 302);
  } catch {
    return c.redirect(`/u/${username}/dashboard?error=portal_failed`, 302);
  }
});

/**
 * GET /billing/welcome
 *
 * Post-checkout confirmation page. Stripe redirects here after a successful
 * checkout session. No auth required — Stripe provides session_id.
 *
 * Query params:
 *   session_id — Stripe Checkout session ID (provided by Stripe)
 */
billingRoutes.get("/welcome", async (c) => {
  const sessionId = c.req.query("session_id");

  // Try to resolve the username from the session for a personalized dashboard link
  let dashboardLink = "/";
  let dashboardLinkText = "your dashboard";

  if (sessionId) {
    try {
      const stripe = getStripe(c.env);
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });
      const username =
        (session.subscription as { metadata?: { username?: string } } | null)
          ?.metadata?.username ??
        (session.metadata?.username);
      if (username) {
        dashboardLink = `/u/${username}/dashboard`;
        dashboardLinkText = `${username}'s dashboard`;
      }
    } catch {
      // Non-critical — fall through to generic link
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to PRO — ShipCard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Poppins', sans-serif;
      background: #0d1117;
      color: #e6edf3;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 2.5rem 3rem;
      max-width: 520px;
      width: 100%;
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: #f97316;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
    }
    h1 span { color: #f97316; }
    .subtitle {
      color: #8b949e;
      font-size: 0.95rem;
      margin-bottom: 2rem;
      line-height: 1.6;
    }
    .features {
      list-style: none;
      text-align: left;
      margin-bottom: 2rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .features li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.95rem;
    }
    .features li::before {
      content: '';
      width: 20px;
      height: 20px;
      min-width: 20px;
      border-radius: 50%;
      background: #f97316;
      display: flex;
      align-items: center;
      justify-content: center;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white' width='12' height='12'%3E%3Cpath d='M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center;
    }
    .btn {
      display: inline-block;
      background: #f97316;
      color: #fff;
      font-family: 'Poppins', sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      text-decoration: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.85; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">PRO Activated</div>
    <h1>Welcome to <span>PRO</span>!</h1>
    <p class="subtitle">Your subscription is active. Here's what you've unlocked:</p>
    <ul class="features">
      <li>Custom themes — full color control with BYOT</li>
      <li>Custom slugs — personalized card URLs</li>
      <li>AI insights — smart analysis of your coding patterns</li>
    </ul>
    <a href="${dashboardLink}" class="btn">Go to ${dashboardLinkText}</a>
  </div>
</body>
</html>`;

  return c.html(html, 200);
});
