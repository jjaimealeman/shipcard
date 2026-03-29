/**
 * D1 query helpers for custom card slug management.
 *
 * All functions take a D1Database as the first param (function-object style,
 * no classes). Used by slug API routes, CLI commands, and dashboard.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Row shape matching the card_slugs table. */
export interface CardSlug {
  id: number;
  username: string;
  slug: string;
  /** Saved card configuration as a JSON string. */
  config: string;
  created_at: number;
  updated_at: number;
}

/** Parsed card configuration stored in card_slugs.config. */
export interface SlugConfig {
  theme: string;
  layout: string;
  hide?: string[];
  heroStat?: string;
  colors?: {
    bg: string;
    title: string;
    text: string;
    icon: string;
    border: string;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 50;
export const SLUG_MAX_PER_USER = 5;

/** Valid slug: lowercase alphanumeric + hyphens, no leading/trailing hyphens. */
export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/** Words that cannot be used as slugs (reserved for routing/app paths). */
export const SLUG_RESERVED = new Set([
  'admin', 'api', 'settings', 'config', 'dashboard',
  'billing', 'sync', 'auth', 'webhook', 'community',
  'configure', 'login', 'logout', 'help', 'support',
  'pro', 'free', 'upgrade', 'pricing',
]);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates a slug candidate.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateSlug(slug: string): string | null {
  if (slug.length < SLUG_MIN_LENGTH) return 'Slug must be at least 3 characters';
  if (slug.length > SLUG_MAX_LENGTH) return 'Slug must be 50 characters or fewer';
  if (!SLUG_REGEX.test(slug)) {
    return 'Slug must be lowercase alphanumeric with hyphens only (no leading/trailing hyphens)';
  }
  if (SLUG_RESERVED.has(slug)) return `"${slug}" is a reserved word`;
  return null;
}

// ---------------------------------------------------------------------------
// Slug queries
// ---------------------------------------------------------------------------

/**
 * Returns all slugs for a user, ordered by creation time ascending.
 */
export async function getUserSlugs(
  db: D1Database,
  username: string,
): Promise<CardSlug[]> {
  const result = await db
    .prepare('SELECT * FROM card_slugs WHERE username = ? ORDER BY created_at ASC')
    .bind(username)
    .all<CardSlug>();

  return result.results ?? [];
}

/**
 * Returns a single slug row by username + slug, or null if not found.
 */
export async function getSlug(
  db: D1Database,
  username: string,
  slug: string,
): Promise<CardSlug | null> {
  const row = await db
    .prepare('SELECT * FROM card_slugs WHERE username = ? AND slug = ?')
    .bind(username, slug)
    .first<CardSlug>();

  return row ?? null;
}

/**
 * Returns the number of slugs owned by a user.
 * Used to enforce the SLUG_MAX_PER_USER cap before creating a new slug.
 */
export async function countUserSlugs(
  db: D1Database,
  username: string,
): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) as count FROM card_slugs WHERE username = ?')
    .bind(username)
    .first<{ count: number }>();

  return row?.count ?? 0;
}

// ---------------------------------------------------------------------------
// Slug writes
// ---------------------------------------------------------------------------

/**
 * Creates a new slug for the given user.
 * The config object is JSON-serialized before storage.
 * Throws if the (username, slug) pair already exists.
 */
export async function createSlug(
  db: D1Database,
  username: string,
  slug: string,
  config: SlugConfig,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO card_slugs (username, slug, config)
       VALUES (?, ?, ?)`,
    )
    .bind(username, slug, JSON.stringify(config))
    .run();
}

/**
 * Deletes a slug by username + slug.
 * No-op if the slug does not exist.
 */
export async function deleteSlug(
  db: D1Database,
  username: string,
  slug: string,
): Promise<void> {
  await db
    .prepare('DELETE FROM card_slugs WHERE username = ? AND slug = ?')
    .bind(username, slug)
    .run();
}
