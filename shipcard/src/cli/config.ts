/**
 * ShipCard config management.
 *
 * Manages two config locations:
 *   - ~/.shipcard.json        — display preferences (color, mode)
 *   - ~/.shipcard/config.json — auth credentials (token, username, workerUrl)
 *
 * The auth config is stored separately under ~/.shipcard/ to keep credentials
 * in a dedicated directory (matching conventional tool patterns like ~/.gh/).
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Display config (existing — ~/.shipcard.json)
// ---------------------------------------------------------------------------

export interface ShipCardConfig {
  mode?: "compact" | "sectioned";
  color?: boolean;
}

const DISPLAY_CONFIG_PATH = path.join(os.homedir(), ".shipcard.json");

/**
 * Load the ShipCard display config file from ~/.shipcard.json.
 *
 * Returns an empty object if the file does not exist or is invalid JSON.
 * Never throws.
 */
export async function loadConfig(): Promise<ShipCardConfig> {
  try {
    const raw = await fs.readFile(DISPLAY_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as ShipCardConfig;
  } catch {
    // File not found, permission error, or JSON parse error — all silently ignored.
    return {};
  }
}

// ---------------------------------------------------------------------------
// Auth config (~/.shipcard/config.json)
// ---------------------------------------------------------------------------

/** Auth credentials and preferences persisted in ~/.shipcard/config.json. */
export interface ShipcardAuthConfig {
  /** GitHub username of the authenticated user. */
  username?: string;
  /** Worker-issued bearer token. */
  token?: string;
  /** Worker base URL. Defaults to https://shipcard.dev. */
  workerUrl?: string;
}

const SHIPCARD_DIR = path.join(os.homedir(), ".shipcard");
const AUTH_CONFIG_PATH = path.join(SHIPCARD_DIR, "config.json");

const DEFAULT_WORKER_URL = "https://shipcard.dev";

/**
 * Return the path to the auth config file.
 */
export function getConfigPath(): string {
  return AUTH_CONFIG_PATH;
}

/**
 * Load auth config from ~/.shipcard/config.json.
 *
 * Returns an empty object if the file does not exist or is invalid JSON.
 * Never throws.
 */
export async function loadAuthConfig(): Promise<ShipcardAuthConfig> {
  try {
    const raw = await fs.readFile(AUTH_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as ShipcardAuthConfig;
  } catch {
    return {};
  }
}

/**
 * Save (merge) auth config into ~/.shipcard/config.json.
 *
 * Creates the ~/.shipcard/ directory if it does not exist.
 * Merges the new values with any existing config (existing keys not in
 * the update are preserved).
 */
export async function saveAuthConfig(update: Partial<ShipcardAuthConfig>): Promise<void> {
  // Ensure ~/.shipcard/ directory exists
  await fs.mkdir(SHIPCARD_DIR, { recursive: true });

  // Load existing config, merge, write back
  const existing = await loadAuthConfig();
  const merged: ShipcardAuthConfig = { ...existing, ...update };
  await fs.writeFile(AUTH_CONFIG_PATH, JSON.stringify(merged, null, 2) + "\n", "utf-8");
}

/**
 * Get the worker URL from auth config, falling back to the default.
 */
export async function getWorkerUrl(): Promise<string> {
  const cfg = await loadAuthConfig();
  return cfg.workerUrl ?? DEFAULT_WORKER_URL;
}
