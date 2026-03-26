/**
 * Shared types for the ShipLog Worker.
 *
 * Env defines the KV bindings and secrets available at runtime.
 * SafeStats is the privacy-boundary type — the ONLY shape of user data
 * that ever reaches the cloud. No file paths, no project names, no raw
 * JSONL content, no raw timestamps.
 */

// ---------------------------------------------------------------------------
// Cloudflare Worker environment bindings
// ---------------------------------------------------------------------------

/** Environment bindings injected by the Workers runtime. */
export interface Env {
  /** Card SVG cache — keyed by card:{username}:{theme}:{layout}:{style}. */
  CARDS_KV: KVNamespace;
  /** User data store — SafeStats payloads + auth tokens. */
  USER_DATA_KV: KVNamespace;
  /** GitHub OAuth App client ID (public — safe to hardcode in CLI too). */
  GITHUB_CLIENT_ID: string;
  /** GitHub OAuth App client secret (secret — set via wrangler secret put). */
  GITHUB_CLIENT_SECRET: string;
  /** HMAC key for issuing Worker-scoped bearer tokens. */
  TOKEN_SECRET: string;
}

// ---------------------------------------------------------------------------
// SafeStats — privacy boundary type
// ---------------------------------------------------------------------------

/**
 * Aggregated, anonymized stats that the CLI may upload to the Worker.
 *
 * This is the ONLY user data shape that ever leaves the local machine.
 * Designed to be safe: no file paths, no project names (just a count),
 * no raw JSONL content, no individual timestamps.
 *
 * All fields are required to prevent partial uploads that would render
 * cards with misleadingly incomplete data.
 */
export interface SafeStats {
  /** GitHub username of the card owner. */
  username: string;
  /** Total number of Claude Code sessions analyzed. */
  totalSessions: number;
  /** Aggregated token counts across all sessions. */
  totalTokens: {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
  };
  /** Formatted total cost string, e.g. "~$12.34". */
  totalCost: string;
  /** Unique model identifiers seen (e.g. ["claude-opus-4-5", "claude-sonnet-4-5"]). */
  modelsUsed: string[];
  /** Number of distinct projects (directories) touched — NOT the project names. */
  projectCount: number;
  /** Tool call counts by tool name (e.g. { "Bash": 420, "Read": 311 }). */
  toolCallSummary: Record<string, number>;
  /** Describes the pricing data source, e.g. "LiteLLM snapshot 2026-03-25". */
  pricingVersion: string;
}

// ---------------------------------------------------------------------------
// SafeStats validator
// ---------------------------------------------------------------------------

/**
 * Banned field names that would violate the privacy boundary.
 * Any payload containing these keys is rejected regardless of value.
 */
const BANNED_FIELDS = new Set([
  "path",
  "paths",
  "filePath",
  "projectsDir",
  "cwd",
  "content",
  "rawContent",
  "jsonl",
  "projectsTouched",
  "projectNames",
]);

/**
 * Check whether a string value looks like a file path.
 * File paths start with / (absolute) or ~ (home directory).
 */
function looksLikeFilePath(value: string): boolean {
  return value.startsWith("/") || value.startsWith("~");
}

/**
 * Recursively scan an object for banned field names or file-path string values.
 * Returns true if any violation is found.
 */
function containsPrivacyViolation(obj: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(obj)) {
    // Banned field name check
    if (BANNED_FIELDS.has(key)) return true;

    // File-path string value check (only on string values)
    if (typeof value === "string" && looksLikeFilePath(value)) return true;

    // Recurse into nested objects (but not arrays — no deep nesting in SafeStats)
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      if (containsPrivacyViolation(value as Record<string, unknown>))
        return true;
    }
  }
  return false;
}

/**
 * Type guard that validates an unknown payload is a safe SafeStats object.
 *
 * Validates:
 * - All required fields are present with correct types
 * - No banned field names (path, paths, filePath, projectsDir, cwd, content,
 *   rawContent, jsonl, projectsTouched, projectNames)
 * - No string values that look like file paths (starting with / or ~)
 *
 * CLOUD-04 enforcement: only numeric aggregates + username reach the cloud.
 */
export function isValidSafeStats(payload: unknown): payload is SafeStats {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload))
    return false;

  const p = payload as Record<string, unknown>;

  // Check for privacy violations before structural validation
  if (containsPrivacyViolation(p)) return false;

  // username
  if (typeof p.username !== "string" || p.username.length === 0) return false;

  // totalSessions
  if (typeof p.totalSessions !== "number" || p.totalSessions < 0) return false;

  // totalTokens
  const tt = p.totalTokens;
  if (tt === null || typeof tt !== "object" || Array.isArray(tt)) return false;
  const tokens = tt as Record<string, unknown>;
  if (
    typeof tokens.input !== "number" ||
    typeof tokens.output !== "number" ||
    typeof tokens.cacheCreation !== "number" ||
    typeof tokens.cacheRead !== "number"
  )
    return false;

  // totalCost
  if (typeof p.totalCost !== "string") return false;

  // modelsUsed
  if (
    !Array.isArray(p.modelsUsed) ||
    !p.modelsUsed.every((m) => typeof m === "string")
  )
    return false;

  // projectCount
  if (typeof p.projectCount !== "number" || p.projectCount < 0) return false;

  // toolCallSummary
  const tcs = p.toolCallSummary;
  if (tcs === null || typeof tcs !== "object" || Array.isArray(tcs))
    return false;
  if (
    !Object.values(tcs as Record<string, unknown>).every(
      (v) => typeof v === "number"
    )
  )
    return false;

  // pricingVersion
  if (typeof p.pricingVersion !== "string") return false;

  return true;
}

// ---------------------------------------------------------------------------
// Card query params
// ---------------------------------------------------------------------------

/** Appearance parameters parsed from the card URL query string. */
export type CardQueryParams = {
  theme: string;
  layout: string;
  style: string;
};

// ---------------------------------------------------------------------------
// Hono app type
// ---------------------------------------------------------------------------

/** Hono generic type binding for consistent sub-app typing across routes. */
export type AppType = { Bindings: Env; Variables: { username: string } };
