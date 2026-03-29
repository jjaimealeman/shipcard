/**
 * `shipcard slug` command handler.
 *
 * Manages custom card slugs for PRO users via the Worker API.
 *
 * Subcommands:
 *   shipcard slug create <slug> [--theme <name>] [--layout <name>] [--hide <stat>] [--hero-stat <key>]
 *   shipcard slug list [--json]
 *   shipcard slug delete <slug>
 *
 * Client-side validation catches common errors before hitting the API.
 * PRO gate errors (HTTP 403) display an upgrade message and exit with code 1.
 */

import { loadAuthConfig, getWorkerUrl } from "../config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlugFlags {
  theme: string | undefined;
  layout: string | undefined;
  hide: string[];
  heroStat: string | undefined;
  json: boolean;
}

interface SlugConfig {
  theme: string;
  layout: string;
  hide?: string[];
  heroStat?: string;
}

interface SlugRecord {
  slug: string;
  config: string;
  created_at?: number;
}

// ---------------------------------------------------------------------------
// Validation constants (mirrored from worker src/db/slugs.ts)
// ---------------------------------------------------------------------------

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 50;

/** Valid slug: lowercase alphanumeric + hyphens, no leading/trailing hyphens. */
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/** Words that cannot be used as slugs (reserved for routing/app paths). */
const SLUG_RESERVED = new Set([
  'admin', 'api', 'settings', 'config', 'dashboard',
  'billing', 'sync', 'auth', 'webhook', 'community',
  'configure', 'login', 'logout', 'help', 'support',
  'pro', 'free', 'upgrade', 'pricing',
]);

// ---------------------------------------------------------------------------
// Client-side validation
// ---------------------------------------------------------------------------

/**
 * Validates a slug candidate.
 * Returns null if valid, or an error message string if invalid.
 */
function validateSlugLocal(slug: string): string | null {
  if (slug.length < SLUG_MIN_LENGTH) return `Slug must be at least ${SLUG_MIN_LENGTH} characters`;
  if (slug.length > SLUG_MAX_LENGTH) return `Slug must be ${SLUG_MAX_LENGTH} characters or fewer`;
  if (!SLUG_REGEX.test(slug)) {
    return 'Slug must be lowercase alphanumeric with hyphens only (no leading/trailing hyphens)';
  }
  if (SLUG_RESERVED.has(slug)) return `"${slug}" is a reserved word`;
  return null;
}

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

function printSlugHelp(): void {
  process.stdout.write(`shipcard slug — manage custom card slugs (PRO)

Usage:
  shipcard slug create <slug> [flags]
  shipcard slug list [--json]
  shipcard slug delete <slug>

Subcommands:
  create    Create a new custom slug with card configuration
  list      List all your custom slugs
  delete    Delete a custom slug

Flags for create:
  --theme <name>      Card theme (e.g. catppuccin, github-dark)
  --layout <name>     Card layout: classic, compact, hero
  --hide <stat>       Hide a stat (repeatable): sessions, toolCalls, models, projects, cost
  --hero-stat <key>   Hero stat for hero layout

Flags for list:
  --json              Output raw JSON

Examples:
  shipcard slug create my-card --theme catppuccin --layout compact
  shipcard slug create hero-card --layout hero --hero-stat sessions
  shipcard slug list
  shipcard slug list --json
  shipcard slug delete my-card
`);
}

// ---------------------------------------------------------------------------
// Sub-handlers
// ---------------------------------------------------------------------------

async function runSlugCreate(flags: SlugFlags, target: string | undefined): Promise<void> {
  if (!target) {
    process.stderr.write("Usage: shipcard slug create <slug> [flags]\n");
    process.exit(1);
  }

  // Client-side validation for fast feedback
  const validationError = validateSlugLocal(target);
  if (validationError) {
    process.stderr.write(`Invalid slug: ${validationError}\n`);
    process.exit(1);
  }

  const authConfig = await loadAuthConfig();
  const workerUrl = await getWorkerUrl();

  if (!authConfig.token || !authConfig.username) {
    process.stderr.write("Not logged in. Run `shipcard login` first.\n");
    process.exit(1);
  }

  const { username, token } = authConfig;

  // Build SlugConfig from flags
  const slugConfig: SlugConfig = {
    theme: flags.theme ?? 'catppuccin',
    layout: flags.layout ?? 'classic',
  };
  if (flags.hide.length > 0) slugConfig.hide = flags.hide;
  if (flags.heroStat) slugConfig.heroStat = flags.heroStat;

  try {
    const res = await fetch(`${workerUrl}/u/${username}/slugs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "shipcard-cli/2.0",
      },
      body: JSON.stringify({ slug: target, config: slugConfig }),
    });

    if (res.status === 201) {
      const cardUrl = `${workerUrl}/u/${username}/${target}`;
      process.stdout.write(`Slug created: ${target}\n`);
      process.stdout.write(`Card URL: ${cardUrl}\n`);
      process.stdout.write(`Markdown: ![ShipCard Stats](${cardUrl})\n`);
      return;
    }

    if (res.status === 403) {
      process.stderr.write(
        "Custom slugs are a PRO feature.\n" +
        "Upgrade at: shipcard.dev/billing\n"
      );
      process.exit(1);
    }

    if (res.status === 409) {
      let detail = "Slug already exists or slug limit reached";
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error) detail = body.error;
      } catch { /* ignore */ }
      process.stderr.write(`Conflict: ${detail}\n`);
      process.exit(1);
    }

    let detail = "";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) detail = `: ${body.error}`;
    } catch { /* ignore */ }
    process.stderr.write(`Create failed: HTTP ${res.status}${detail}\n`);
    process.exit(1);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Request failed: ${message}\n`);
    process.exit(1);
  }
}

async function runSlugList(flags: SlugFlags): Promise<void> {
  const authConfig = await loadAuthConfig();
  const workerUrl = await getWorkerUrl();

  if (!authConfig.token || !authConfig.username) {
    process.stderr.write("Not logged in. Run `shipcard login` first.\n");
    process.exit(1);
  }

  const { username, token } = authConfig;

  try {
    const res = await fetch(`${workerUrl}/u/${username}/slugs`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "shipcard-cli/2.0",
      },
    });

    if (res.status === 403) {
      process.stderr.write(
        "Custom slugs are a PRO feature.\n" +
        "Upgrade at: shipcard.dev/billing\n"
      );
      process.exit(1);
    }

    if (!res.ok) {
      let detail = "";
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error) detail = `: ${body.error}`;
      } catch { /* ignore */ }
      process.stderr.write(`List failed: HTTP ${res.status}${detail}\n`);
      process.exit(1);
    }

    const data = (await res.json()) as { slugs?: SlugRecord[] };
    const slugs = data.slugs ?? [];

    if (flags.json) {
      process.stdout.write(JSON.stringify(slugs, null, 2) + "\n");
      return;
    }

    if (slugs.length === 0) {
      process.stdout.write("No custom slugs yet.\n");
      process.stdout.write("Create one: shipcard slug create <name>\n");
      return;
    }

    process.stdout.write(`Custom slugs for ${username}:\n\n`);
    for (const row of slugs) {
      let config: Partial<SlugConfig> = {};
      try {
        config = JSON.parse(row.config) as Partial<SlugConfig>;
      } catch { /* ignore */ }

      const cardUrl = `${workerUrl}/u/${username}/${row.slug}`;
      const theme = config.theme ?? "default";
      const layout = config.layout ?? "classic";
      process.stdout.write(`  ${row.slug}\n`);
      process.stdout.write(`    Theme: ${theme}  Layout: ${layout}\n`);
      process.stdout.write(`    URL: ${cardUrl}\n\n`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Request failed: ${message}\n`);
    process.exit(1);
  }
}

async function runSlugDelete(flags: SlugFlags, target: string | undefined): Promise<void> {
  void flags; // unused for delete but kept for consistent signature

  if (!target) {
    process.stderr.write("Usage: shipcard slug delete <slug>\n");
    process.exit(1);
  }

  const authConfig = await loadAuthConfig();
  const workerUrl = await getWorkerUrl();

  if (!authConfig.token || !authConfig.username) {
    process.stderr.write("Not logged in. Run `shipcard login` first.\n");
    process.exit(1);
  }

  const { username, token } = authConfig;

  try {
    const res = await fetch(`${workerUrl}/u/${username}/slugs/${target}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "shipcard-cli/2.0",
      },
    });

    if (res.status === 403) {
      process.stderr.write(
        "Custom slugs are a PRO feature.\n" +
        "Upgrade at: shipcard.dev/billing\n"
      );
      process.exit(1);
    }

    if (res.status === 404) {
      process.stderr.write(`Slug not found: ${target}\n`);
      process.exit(1);
    }

    if (!res.ok) {
      let detail = "";
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error) detail = `: ${body.error}`;
      } catch { /* ignore */ }
      process.stderr.write(`Delete failed: HTTP ${res.status}${detail}\n`);
      process.exit(1);
    }

    process.stdout.write(`Slug deleted: ${target}\n`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Request failed: ${message}\n`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main dispatch
// ---------------------------------------------------------------------------

/**
 * Run the `shipcard slug` command.
 *
 * Exit codes:
 *   0 — success
 *   1 — not authenticated, validation error, API error, or PRO required
 */
export async function runSlug(
  flags: SlugFlags,
  subcommand: string | undefined,
  target: string | undefined,
): Promise<void> {
  switch (subcommand) {
    case "create":
      await runSlugCreate(flags, target);
      break;

    case "list":
      await runSlugList(flags);
      break;

    case "delete":
      await runSlugDelete(flags, target);
      break;

    default:
      printSlugHelp();
      // Exit with code 0 for bare `shipcard slug`, non-zero for unknown subcommand
      if (subcommand !== undefined) {
        process.stderr.write(`Unknown slug subcommand: ${subcommand}\n`);
        process.exit(1);
      }
      break;
  }
}
