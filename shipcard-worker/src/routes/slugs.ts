/**
 * Slug CRUD API routes for the ShipCard Worker.
 *
 * POST   /u/:username/slugs          — Create a custom slug (PRO only)
 * GET    /u/:username/slugs          — List all slugs for a user (PRO only)
 * DELETE /u/:username/slugs/:slug    — Delete a slug (PRO only)
 *
 * All routes require:
 *   1. Bearer token auth (authMiddleware)
 *   2. Authenticated username must match :username param
 *   3. User must have an active PRO subscription
 */

import { Hono } from "hono";
import type { AppType } from "../types.js";
import { authMiddleware } from "../auth.js";
import { isUserPro } from "../kv.js";
import {
  createSlug,
  getUserSlugs,
  deleteSlug,
  validateSlug,
  countUserSlugs,
  SLUG_MAX_PER_USER,
} from "../db/slugs.js";
import type { SlugConfig } from "../db/slugs.js";

export const slugRoutes = new Hono<AppType>();

// ---------------------------------------------------------------------------
// POST /:username/slugs — Create a custom slug
// ---------------------------------------------------------------------------

/**
 * Creates a new custom slug for a PRO user.
 *
 * Body: { slug: string, config: SlugConfig }
 *
 * Guards (in order):
 *   1. Auth middleware (bearer token)
 *   2. Username must match authenticated user
 *   3. User must be PRO — returns 403 with upgrade URL otherwise
 *   4. Slug must pass validateSlug() — returns 400 with descriptive error
 *   5. Slug count must be below SLUG_MAX_PER_USER — returns 409 if at limit
 *   6. Slug must not already exist — catches D1 unique constraint, returns 409
 *
 * Returns 201: { ok: true, slug: string, url: string }
 */
slugRoutes.post("/:username/slugs", authMiddleware, async (c) => {
  const username = c.req.param("username");
  const authenticatedUsername = c.get("username");

  // Verify the authenticated user is acting on their own account
  if (username.toLowerCase() !== authenticatedUsername.toLowerCase()) {
    return c.json({ error: "Forbidden: username mismatch" }, 403);
  }

  // PRO gate
  const isPro = await isUserPro(c.env.DB, username);
  if (!isPro) {
    return c.json(
      {
        error: "Custom slugs are a PRO feature",
        upgrade_url: "https://shipcard.dev/billing/checkout",
      },
      403
    );
  }

  // Parse body
  let body: { slug: string; config: SlugConfig };
  try {
    body = await c.req.json<{ slug: string; config: SlugConfig }>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.slug || typeof body.slug !== "string") {
    return c.json({ error: "slug is required" }, 400);
  }

  if (!body.config || typeof body.config !== "object") {
    return c.json({ error: "config is required" }, 400);
  }

  // Validate slug format and reserved words
  const validationError = validateSlug(body.slug);
  if (validationError !== null) {
    return c.json({ error: validationError }, 400);
  }

  // Enforce per-user slug cap
  const slugCount = await countUserSlugs(c.env.DB, username);
  if (slugCount >= SLUG_MAX_PER_USER) {
    return c.json(
      {
        error: `Maximum of ${SLUG_MAX_PER_USER} custom slugs reached`,
        limit: SLUG_MAX_PER_USER,
      },
      409
    );
  }

  // Create slug — catch unique constraint violations
  try {
    await createSlug(c.env.DB, username, body.slug, body.config);
  } catch (err) {
    // D1 unique constraint: UNIQUE constraint failed: card_slugs.username, card_slugs.slug
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE constraint") || msg.includes("unique constraint")) {
      return c.json({ error: "Slug already exists", slug: body.slug }, 409);
    }
    throw err;
  }

  return c.json(
    { ok: true, slug: body.slug, url: `/u/${username}/${body.slug}` },
    201
  );
});

// ---------------------------------------------------------------------------
// GET /:username/slugs — List slugs
// ---------------------------------------------------------------------------

/**
 * Returns all custom slugs for the authenticated PRO user.
 *
 * Returns 200: { slugs: Array<CardSlug & { config: SlugConfig }> }
 * Each row has config parsed from JSON string to object.
 */
slugRoutes.get("/:username/slugs", authMiddleware, async (c) => {
  const username = c.req.param("username");
  const authenticatedUsername = c.get("username");

  // Verify the authenticated user is acting on their own account
  if (username.toLowerCase() !== authenticatedUsername.toLowerCase()) {
    return c.json({ error: "Forbidden: username mismatch" }, 403);
  }

  const rows = await getUserSlugs(c.env.DB, username);

  return c.json({
    slugs: rows.map((r) => ({ ...r, config: JSON.parse(r.config) as SlugConfig })),
  });
});

// ---------------------------------------------------------------------------
// DELETE /:username/slugs/:slug — Delete a slug
// ---------------------------------------------------------------------------

/**
 * Deletes a custom slug for the authenticated PRO user.
 * Also removes the KV-cached card for the slug so stale content is purged.
 *
 * Returns 200: { ok: true, deleted: string }
 */
slugRoutes.delete("/:username/slugs/:slug", authMiddleware, async (c) => {
  const username = c.req.param("username");
  const slug = c.req.param("slug");
  const authenticatedUsername = c.get("username");

  // Verify the authenticated user is acting on their own account
  if (username.toLowerCase() !== authenticatedUsername.toLowerCase()) {
    return c.json({ error: "Forbidden: username mismatch" }, 403);
  }

  // Delete from D1
  await deleteSlug(c.env.DB, username, slug);

  // Purge the KV card cache entry for this slug
  await c.env.CARDS_KV.delete(`card:${username}:slug:${slug}`);

  return c.json({ ok: true, deleted: slug });
});
