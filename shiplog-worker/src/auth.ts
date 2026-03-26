/**
 * Bearer token auth middleware for the ShipCard Worker.
 *
 * Validates the `Authorization: Bearer <token>` header by looking up the
 * token in USER_DATA_KV. On success, sets `username` in the Hono context
 * so downstream handlers know which user is authenticated.
 */

import { type MiddlewareHandler } from "hono";
import type { AppType } from "./types.js";
import { getTokenUsername } from "./kv.js";

/**
 * Hono middleware that enforces bearer token authentication.
 *
 * - Missing or malformed Authorization header → 401
 * - Token not found in KV → 401
 * - Valid token → sets c.var.username and calls next()
 */
export const authMiddleware: MiddlewareHandler<AppType> = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authorization header required" }, 401);
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return c.json({ error: "Bearer token is empty" }, 401);
  }

  const username = await getTokenUsername(c.env.USER_DATA_KV, token);

  if (!username) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("username", username);
  await next();
};
