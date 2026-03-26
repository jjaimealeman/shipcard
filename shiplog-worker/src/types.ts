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
export type AppType = { Bindings: Env };
