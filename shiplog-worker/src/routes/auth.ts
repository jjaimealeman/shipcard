/**
 * Auth routes for the ShipCard Worker.
 *
 * POST /auth/exchange — Converts a GitHub OAuth token into a Worker-issued
 * opaque bearer token. Verifies the GitHub token by calling the GitHub API
 * and confirming the returned login matches the claimed username.
 *
 * No GitHub tokens are stored server-side. Only the Worker-issued opaque
 * token is persisted in KV.
 */

import { Hono } from "hono";
import type { AppType } from "../types.js";
import { putToken } from "../kv.js";

interface ExchangeBody {
  githubToken: string;
  username: string;
}

interface GitHubUser {
  login: string;
}

export const authRoutes = new Hono<AppType>();

/**
 * POST /auth/exchange
 *
 * Accepts: { githubToken: string, username: string }
 * Returns: { token: string, username: string }
 *
 * 1. Calls GitHub API to verify the token and get the authenticated user
 * 2. Confirms the returned login matches the claimed username
 * 3. Generates a Worker-issued opaque token (UUID)
 * 4. Stores token → username in KV with 1-year TTL
 * 5. Returns the Worker token (GitHub token is never stored)
 */
authRoutes.post("/exchange", async (c) => {
  let body: ExchangeBody;
  try {
    body = await c.req.json<ExchangeBody>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { githubToken, username } = body;

  if (!githubToken || typeof githubToken !== "string") {
    return c.json({ error: "githubToken is required" }, 401);
  }

  if (!username || typeof username !== "string") {
    return c.json({ error: "username is required" }, 400);
  }

  // Verify the GitHub token by calling the GitHub API
  let githubUser: GitHubUser;
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "User-Agent": "shipcard-worker/1.0",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (response.status === 401 || response.status === 403) {
      return c.json({ error: "Invalid or expired GitHub token" }, 401);
    }

    if (!response.ok) {
      return c.json({ error: "GitHub API unavailable" }, 502);
    }

    githubUser = (await response.json()) as GitHubUser;
  } catch {
    return c.json({ error: "GitHub API unavailable" }, 502);
  }

  // Verify the GitHub login matches the claimed username (case-insensitive)
  if (githubUser.login.toLowerCase() !== username.toLowerCase()) {
    return c.json({ error: "Username mismatch" }, 403);
  }

  // Generate a Worker-issued opaque token
  const token = crypto.randomUUID();

  // Store the token in KV — GitHub token is NOT stored
  await putToken(c.env.USER_DATA_KV, token, githubUser.login);

  return c.json({ token, username: githubUser.login }, 200);
});
