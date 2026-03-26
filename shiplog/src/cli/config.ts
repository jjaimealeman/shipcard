/**
 * ShipLog config management.
 *
 * Manages two config locations:
 *   - ~/.shiplog.json        — display preferences (color, mode)
 *   - ~/.shiplog/config.json — auth credentials (token, username, workerUrl)
 *
 * The auth config is stored separately under ~/.shiplog/ to keep credentials
 * in a dedicated directory (matching conventional tool patterns like ~/.gh/).
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Display config (existing — ~/.shiplog.json)
// ---------------------------------------------------------------------------

export interface ShipLogConfig {
  mode?: "compact" | "sectioned";
  color?: boolean;
}

const DISPLAY_CONFIG_PATH = path.join(os.homedir(), ".shiplog.json");

/**
 * Load the ShipLog display config file from ~/.shiplog.json.
 *
 * Returns an empty object if the file does not exist or is invalid JSON.
 * Never throws.
 */
export async function loadConfig(): Promise<ShipLogConfig> {
  try {
    const raw = await fs.readFile(DISPLAY_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as ShipLogConfig;
  } catch {
    // File not found, permission error, or JSON parse error — all silently ignored.
    return {};
  }
}

// ---------------------------------------------------------------------------
// Auth config (~/.shiplog/config.json)
// ---------------------------------------------------------------------------

/** Auth credentials and preferences persisted in ~/.shiplog/config.json. */
export interface ShiplogAuthConfig {
  /** GitHub username of the authenticated user. */
  username?: string;
  /** Worker-issued bearer token. */
  token?: string;
  /** Worker base URL. Defaults to https://shiplog.workers.dev. */
  workerUrl?: string;
}

const SHIPLOG_DIR = path.join(os.homedir(), ".shiplog");
const AUTH_CONFIG_PATH = path.join(SHIPLOG_DIR, "config.json");

const DEFAULT_WORKER_URL = "https://shiplog.workers.dev";

/**
 * Return the path to the auth config file.
 */
export function getConfigPath(): string {
  return AUTH_CONFIG_PATH;
}

/**
 * Load auth config from ~/.shiplog/config.json.
 *
 * Returns an empty object if the file does not exist or is invalid JSON.
 * Never throws.
 */
export async function loadAuthConfig(): Promise<ShiplogAuthConfig> {
  try {
    const raw = await fs.readFile(AUTH_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as ShiplogAuthConfig;
  } catch {
    return {};
  }
}

/**
 * Save (merge) auth config into ~/.shiplog/config.json.
 *
 * Creates the ~/.shiplog/ directory if it does not exist.
 * Merges the new values with any existing config (existing keys not in
 * the update are preserved).
 */
export async function saveAuthConfig(update: Partial<ShiplogAuthConfig>): Promise<void> {
  // Ensure ~/.shiplog/ directory exists
  await fs.mkdir(SHIPLOG_DIR, { recursive: true });

  // Load existing config, merge, write back
  const existing = await loadAuthConfig();
  const merged: ShiplogAuthConfig = { ...existing, ...update };
  await fs.writeFile(AUTH_CONFIG_PATH, JSON.stringify(merged, null, 2) + "\n", "utf-8");
}

/**
 * Get the worker URL from auth config, falling back to the default.
 */
export async function getWorkerUrl(): Promise<string> {
  const cfg = await loadAuthConfig();
  return cfg.workerUrl ?? DEFAULT_WORKER_URL;
}
