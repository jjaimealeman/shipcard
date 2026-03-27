/**
 * Daily aggregation engine — groups ParsedMessages into DailyStats by UTC date.
 *
 * Mirrors the pattern in aggregator.ts but buckets by date (msg.timestamp.slice(0, 10))
 * instead of computing all-time totals. Used by the dashboard for per-day charts,
 * heatmaps, and trend analysis.
 *
 * Cost is stored as integer cents (Math.round(dollars * 100)) for safe integer arithmetic
 * in time-series charts.
 */

import type { ParsedMessage, TokenCounts } from "../parser/schema.js";
import { calculateCost, getModelPricing, type PricingMap } from "./cost.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyStats {
  date: string;              // ISO date "2026-03-25" (UTC)
  sessions: number;          // unique session count for this day
  messages: number;          // assistant messages (ParsedMessage count)
  // TODO: per-day user message counting requires tracking UserEntry timestamps
  userMessages: number;      // user messages for this day (0 until per-day tracking added)
  thinkingBlocks: number;    // sum of thinkingBlocks across all messages this day
  tokens: {
    input: number;
    output: number;
    cacheCreate: number;
    cacheRead: number;
  };
  costCents: number;         // Math.round(costDollars * 100) — integer cents
  models: Record<string, number>;    // model name -> total tokens used that day
  toolCalls: Record<string, number>; // tool name -> call count that day
  projects: string[];        // unique project names (last path segment) this day
}

// ---------------------------------------------------------------------------
// Internal accumulator (not exported)
// ---------------------------------------------------------------------------

interface DayAccumulator {
  sessions: Set<string>;
  messages: number;
  thinkingBlocks: number;
  tokens: TokenCounts;
  costRaw: number;
  models: Record<string, number>;
  toolCalls: Record<string, number>;
  projects: Set<string>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Zero-value TokenCounts for initializing accumulators. */
function zeroTokens(): TokenCounts {
  return { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 };
}

/** Mutate `acc` by adding all fields from `delta`. */
function addTokens(acc: TokenCounts, delta: TokenCounts): void {
  acc.input += delta.input;
  acc.output += delta.output;
  acc.cacheCreate += delta.cacheCreate;
  acc.cacheRead += delta.cacheRead;
}

/** Extract project name from a cwd path (last non-empty path segment). */
function projectNameFromCwd(cwd: string): string {
  const segments = cwd.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "unknown";
}

// ---------------------------------------------------------------------------
// aggregateDaily
// ---------------------------------------------------------------------------

/**
 * Group ParsedMessages into DailyStats[] bucketed by UTC date.
 *
 * @param messages  Deduplicated ParsedMessages from parseAllFiles().
 * @param pricing   PricingMap + version string from getPricing().
 * @returns         DailyStats[] sorted ascending by date.
 */
export function aggregateDaily(
  messages: ParsedMessage[],
  pricing: { map: PricingMap; version: string }
): DailyStats[] {
  const { map: pricingMap } = pricing;

  // Map from ISO date string -> DayAccumulator.
  const byDate = new Map<string, DayAccumulator>();

  // Cache getModelPricing calls per model to avoid repeated map lookups.
  const pricingCache = new Map<string, ReturnType<typeof getModelPricing>>();

  // ---------------------------------------------------------------------------
  // Single pass — bucket each message by UTC date
  // ---------------------------------------------------------------------------

  for (const msg of messages) {
    const date = msg.timestamp.slice(0, 10); // "2026-03-25"

    // Get or create accumulator for this date.
    let bucket = byDate.get(date);
    if (bucket === undefined) {
      bucket = {
        sessions: new Set<string>(),
        messages: 0,
        thinkingBlocks: 0,
        tokens: zeroTokens(),
        costRaw: 0,
        models: {},
        toolCalls: {},
        projects: new Set<string>(),
      };
      byDate.set(date, bucket);
    }

    // --- Pricing (cached per model) ---
    let modelPricing = pricingCache.get(msg.model);
    if (modelPricing === undefined) {
      modelPricing = getModelPricing(msg.model, pricingMap);
      pricingCache.set(msg.model, modelPricing);
    }
    const msgCost = calculateCost(msg.tokens, modelPricing.pricing);

    // --- Accumulate ---
    bucket.sessions.add(msg.sessionId);
    bucket.messages += 1;
    bucket.thinkingBlocks += msg.thinkingBlocks;
    addTokens(bucket.tokens, msg.tokens);
    bucket.costRaw += msgCost;

    // models: total tokens per model (input + output as proxy for "used")
    const totalTokens = msg.tokens.input + msg.tokens.output;
    bucket.models[msg.model] = (bucket.models[msg.model] ?? 0) + totalTokens;

    // toolCalls: count per tool name
    for (const tool of msg.toolCalls) {
      bucket.toolCalls[tool] = (bucket.toolCalls[tool] ?? 0) + 1;
    }

    // projects: unique project names from cwd
    bucket.projects.add(projectNameFromCwd(msg.cwd));
  }

  // ---------------------------------------------------------------------------
  // Convert accumulators to DailyStats[], sorted ascending by date
  // ---------------------------------------------------------------------------

  const result: DailyStats[] = [];

  for (const [date, bucket] of byDate) {
    result.push({
      date,
      sessions: bucket.sessions.size,
      messages: bucket.messages,
      userMessages: 0, // TODO: per-day user message counting requires tracking UserEntry timestamps
      thinkingBlocks: bucket.thinkingBlocks,
      tokens: { ...bucket.tokens },
      costCents: Math.round(bucket.costRaw * 100),
      models: bucket.models,
      toolCalls: bucket.toolCalls,
      projects: Array.from(bucket.projects).sort(),
    });
  }

  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}
