/**
 * LiteLLM pricing fetch with 3-layer cache and tiered cost calculation.
 *
 * Layer 1 — Runtime: module-level variable, lives for process lifetime.
 * Layer 2 — Disk:    ~/.shiplog/pricing.json, valid for 24 hours (mtime check).
 * Layer 3 — Network: fetch from LiteLLM GitHub raw URL, writes to disk cache.
 * Fallback — Bundle: data/pricing-snapshot.json shipped with the package.
 *
 * Cost is always estimated (token counts are approximate due to streaming
 * dedup), so every formatted cost value carries a tilde prefix: "~$X.XX".
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import * as os from "node:os";
import * as path from "node:path";
import * as url from "node:url";

import type { TokenCounts } from "../parser/schema.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LITELLM_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const SHIPLOG_DIR = path.join(os.homedir(), ".shiplog");
export const PRICING_CACHE_PATH = path.join(SHIPLOG_DIR, "pricing.json");

/** Tiered pricing threshold in tokens. */
const TIER_THRESHOLD = 200_000;

/** Fallback model when a model is not found in the pricing map. */
const DEFAULT_MODEL = "claude-sonnet-4-6";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelPricing {
  input_cost_per_token: number;
  output_cost_per_token: number;
  input_cost_per_token_above_200k_tokens?: number;
  output_cost_per_token_above_200k_tokens?: number;
  cache_creation_input_token_cost?: number;
  cache_read_input_token_cost?: number;
  cache_creation_input_token_cost_above_200k_tokens?: number;
  cache_read_input_token_cost_above_200k_tokens?: number;
}

/** O(1) lookup map from model name to pricing. */
export type PricingMap = Map<string, ModelPricing>;

// ---------------------------------------------------------------------------
// Runtime cache (Layer 1)
// ---------------------------------------------------------------------------

let runtimeCache:
  | { map: PricingMap; version: string }
  | undefined = undefined;

// ---------------------------------------------------------------------------
// Pricing map builder
// ---------------------------------------------------------------------------

/**
 * Parse the raw LiteLLM JSON object into a PricingMap.
 * Only entries that have `input_cost_per_token` are included.
 */
export function buildPricingMap(raw: Record<string, unknown>): PricingMap {
  const map: PricingMap = new Map();

  for (const [key, value] of Object.entries(raw)) {
    // Skip the _meta key we inject in the snapshot.
    if (key === "_meta") continue;
    if (value === null || typeof value !== "object") continue;

    const entry = value as Record<string, unknown>;
    if (typeof entry["input_cost_per_token"] !== "number") continue;

    const pricing: ModelPricing = {
      input_cost_per_token: entry["input_cost_per_token"] as number,
      output_cost_per_token:
        typeof entry["output_cost_per_token"] === "number"
          ? (entry["output_cost_per_token"] as number)
          : 0,
    };

    if (typeof entry["input_cost_per_token_above_200k_tokens"] === "number") {
      pricing.input_cost_per_token_above_200k_tokens =
        entry["input_cost_per_token_above_200k_tokens"] as number;
    }
    if (typeof entry["output_cost_per_token_above_200k_tokens"] === "number") {
      pricing.output_cost_per_token_above_200k_tokens =
        entry["output_cost_per_token_above_200k_tokens"] as number;
    }
    if (typeof entry["cache_creation_input_token_cost"] === "number") {
      pricing.cache_creation_input_token_cost =
        entry["cache_creation_input_token_cost"] as number;
    }
    if (typeof entry["cache_read_input_token_cost"] === "number") {
      pricing.cache_read_input_token_cost =
        entry["cache_read_input_token_cost"] as number;
    }
    if (
      typeof entry["cache_creation_input_token_cost_above_200k_tokens"] ===
      "number"
    ) {
      pricing.cache_creation_input_token_cost_above_200k_tokens =
        entry["cache_creation_input_token_cost_above_200k_tokens"] as number;
    }
    if (
      typeof entry["cache_read_input_token_cost_above_200k_tokens"] ===
      "number"
    ) {
      pricing.cache_read_input_token_cost_above_200k_tokens =
        entry["cache_read_input_token_cost_above_200k_tokens"] as number;
    }

    map.set(key, pricing);
  }

  return map;
}

// ---------------------------------------------------------------------------
// Bundled snapshot loader
// ---------------------------------------------------------------------------

/**
 * Load the bundled pricing snapshot from data/pricing-snapshot.json.
 * Uses import.meta.url to resolve the path regardless of cwd.
 */
async function loadBundledSnapshot(): Promise<
  { map: PricingMap; version: string } | undefined
> {
  try {
    // Resolve relative to this file: ../../data/pricing-snapshot.json
    const thisDir = path.dirname(url.fileURLToPath(import.meta.url));
    const snapshotPath = path.resolve(
      thisDir,
      "../../data/pricing-snapshot.json"
    );
    const raw = JSON.parse(
      await readFile(snapshotPath, { encoding: "utf8" })
    ) as Record<string, unknown>;

    const meta = raw["_meta"] as Record<string, unknown> | undefined;
    const snapshotDate =
      typeof meta?.["snapshot_date"] === "string"
        ? meta["snapshot_date"]
        : "unknown";

    return {
      map: buildPricingMap(raw),
      version: `LiteLLM snapshot ${snapshotDate}`,
    };
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// 3-layer cache
// ---------------------------------------------------------------------------

/**
 * Resolve pricing data using the 3-layer cache strategy.
 *
 * Never throws — falls back through layers and ultimately to the bundled
 * snapshot. Returns a map and a version string describing the data source.
 */
export async function getPricing(): Promise<{
  map: PricingMap;
  version: string;
}> {
  // Layer 1: Runtime cache.
  if (runtimeCache !== undefined) {
    return runtimeCache;
  }

  // Layer 2: Disk cache (~/.shiplog/pricing.json).
  try {
    const fileStat = await stat(PRICING_CACHE_PATH);
    const ageMs = Date.now() - fileStat.mtimeMs;
    if (ageMs < CACHE_TTL_MS) {
      const raw = JSON.parse(
        await readFile(PRICING_CACHE_PATH, { encoding: "utf8" })
      ) as Record<string, unknown>;
      const cacheDate = new Date(fileStat.mtime).toISOString().slice(0, 10);
      const result = {
        map: buildPricingMap(raw),
        version: `LiteLLM cached ${cacheDate}`,
      };
      runtimeCache = result;
      return result;
    }
    // Cache exists but is stale — fall through to network fetch.
  } catch {
    // File doesn't exist or unreadable — fall through.
  }

  // Layer 3: Network fetch from LiteLLM.
  try {
    const response = await fetch(LITELLM_URL);
    if (response.ok) {
      const raw = (await response.json()) as Record<string, unknown>;
      // Write to disk cache (best-effort).
      try {
        await mkdir(SHIPLOG_DIR, { recursive: true });
        await writeFile(PRICING_CACHE_PATH, JSON.stringify(raw), {
          encoding: "utf8",
        });
      } catch {
        // Disk write failed — not fatal, continue with in-memory result.
      }
      const result = { map: buildPricingMap(raw), version: "LiteLLM live" };
      runtimeCache = result;
      return result;
    }
  } catch {
    // Network unavailable or fetch failed — fall through to bundled snapshot.
  }

  // Fallback: Bundled pricing snapshot.
  const bundled = await loadBundledSnapshot();
  if (bundled !== undefined) {
    runtimeCache = bundled;
    return bundled;
  }

  // Absolute last resort: empty map (costs will be $0.00).
  // This should never happen in practice since the snapshot is bundled.
  return { map: new Map(), version: "unavailable" };
}

// ---------------------------------------------------------------------------
// Tiered cost calculation
// ---------------------------------------------------------------------------

/**
 * Calculate cost for a given token count with optional tiered pricing.
 *
 * @param tokens    Number of tokens to price.
 * @param baseRate  Cost per token for the first TIER_THRESHOLD tokens.
 * @param tieredRate  Cost per token above TIER_THRESHOLD (falls back to baseRate if undefined).
 */
export function calcTieredCost(
  tokens: number,
  baseRate: number,
  tieredRate?: number
): number {
  if (tokens <= 0) return 0;

  const effectiveTieredRate = tieredRate ?? baseRate;

  if (tokens <= TIER_THRESHOLD) {
    return tokens * baseRate;
  }

  const belowThreshold = TIER_THRESHOLD * baseRate;
  const aboveThreshold = (tokens - TIER_THRESHOLD) * effectiveTieredRate;
  return belowThreshold + aboveThreshold;
}

/**
 * Calculate total estimated cost for a set of token counts using model pricing.
 *
 * Covers all four token types (input, output, cacheCreate, cacheRead) with
 * tiered rates where available.
 */
export function calculateCost(
  tokens: TokenCounts,
  pricing: ModelPricing
): number {
  const inputCost = calcTieredCost(
    tokens.input,
    pricing.input_cost_per_token,
    pricing.input_cost_per_token_above_200k_tokens
  );

  const outputCost = calcTieredCost(
    tokens.output,
    pricing.output_cost_per_token,
    pricing.output_cost_per_token_above_200k_tokens
  );

  const cacheCreateCost = calcTieredCost(
    tokens.cacheCreate,
    pricing.cache_creation_input_token_cost ?? 0,
    pricing.cache_creation_input_token_cost_above_200k_tokens
  );

  const cacheReadCost = calcTieredCost(
    tokens.cacheRead,
    pricing.cache_read_input_token_cost ?? 0,
    pricing.cache_read_input_token_cost_above_200k_tokens
  );

  return inputCost + outputCost + cacheCreateCost + cacheReadCost;
}

// ---------------------------------------------------------------------------
// Model lookup
// ---------------------------------------------------------------------------

/**
 * Look up pricing for a model. Falls back to DEFAULT_MODEL if not found.
 *
 * @returns pricing — the ModelPricing to use
 *          isDefault — true when the fallback model was used
 */
export function getModelPricing(
  model: string,
  map: PricingMap
): { pricing: ModelPricing; isDefault: boolean } {
  const direct = map.get(model);
  if (direct !== undefined) {
    return { pricing: direct, isDefault: false };
  }

  // Try fallback.
  const fallback = map.get(DEFAULT_MODEL);
  if (fallback !== undefined) {
    return { pricing: fallback, isDefault: true };
  }

  // Absolute fallback: hardcoded Sonnet 4.6 pricing so we never return nothing.
  return {
    pricing: {
      input_cost_per_token: 3e-6,
      output_cost_per_token: 1.5e-5,
      input_cost_per_token_above_200k_tokens: 6e-6,
      output_cost_per_token_above_200k_tokens: 2.25e-5,
      cache_creation_input_token_cost: 3.75e-6,
      cache_read_input_token_cost: 3e-7,
      cache_creation_input_token_cost_above_200k_tokens: 7.5e-6,
      cache_read_input_token_cost_above_200k_tokens: 6e-7,
    },
    isDefault: true,
  };
}

// ---------------------------------------------------------------------------
// Cost formatting
// ---------------------------------------------------------------------------

/**
 * Format a cost amount in dollars as an estimated cost string.
 *
 * The tilde prefix signals that the value is an estimate.
 *
 * Examples:
 *   0.000001 → "~$0.00"
 *   0.005    → "~$0.01"
 *   47.2     → "~$47.20"
 *   1234.56  → "~$1,234.56"
 */
export function formatCost(amount: number): string {
  if (amount < 0) amount = 0;

  // Use locale string for thousands separators on large amounts.
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `~$${formatted}`;
}
