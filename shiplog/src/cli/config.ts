/**
 * ShipLog config loader.
 *
 * Reads ~/.shiplog.json and returns a typed config object.
 * Missing or invalid config returns an empty object (no errors thrown).
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShipLogConfig {
  mode?: "compact" | "sectioned";
  color?: boolean;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const CONFIG_PATH = path.join(os.homedir(), ".shiplog.json");

/**
 * Load the ShipLog config file from ~/.shiplog.json.
 *
 * Returns an empty object if the file does not exist or is invalid JSON.
 * Never throws.
 */
export async function loadConfig(): Promise<ShipLogConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
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
