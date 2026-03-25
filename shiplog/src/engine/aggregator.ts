/**
 * Analytics aggregator — transforms ParseResult into AnalyticsResult.
 *
 * Single pass over all ParsedMessages:
 * 1. Derives project name from last cwd path segment.
 * 2. Looks up per-model pricing (with fallback).
 * 3. Accumulates tokens, costs, tool calls into per-project and per-model maps.
 * 4. Builds the final AnalyticsResult from accumulators.
 *
 * Cost is calculated per-message so each message uses its own model's pricing,
 * which is important since a single session may involve multiple models.
 */

import type { ParsedMessage, TokenCounts } from "../parser/schema.js";
import type { ParseResult } from "../parser/deduplicator.js";
import {
  calculateCost,
  formatCost,
  getModelPricing,
  type PricingMap,
} from "./cost.js";
import type { AnalyticsResult, ModelStats, ProjectStats } from "./types.js";

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

/** Increment a named counter in a record, initializing to 0 if absent. */
function incrementCounter(
  record: Record<string, number>,
  key: string,
  amount = 1
): void {
  record[key] = (record[key] ?? 0) + amount;
}

/**
 * Sort a Record<string, number> by value descending, returning a new Record.
 * Ties are broken alphabetically by key.
 */
function sortByCountDesc(record: Record<string, number>): Record<string, number> {
  const entries = Object.entries(record);
  entries.sort(([keyA, countA], [keyB, countB]) => {
    if (countB !== countA) return countB - countA;
    return keyA.localeCompare(keyB);
  });
  return Object.fromEntries(entries);
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

/**
 * Aggregate ParsedMessages into an AnalyticsResult.
 *
 * @param parseResult  Output from parseAllFiles().
 * @param pricing      PricingMap + version string from getPricing().
 */
export function aggregate(
  parseResult: ParseResult,
  pricing: { map: PricingMap; version: string }
): AnalyticsResult {
  const { messages, sessions, stats } = parseResult;
  const { map: pricingMap, version: pricingVersion } = pricing;

  // ---------------------------------------------------------------------------
  // Accumulator declarations
  // ---------------------------------------------------------------------------

  const projectTokens = new Map<string, TokenCounts>();
  const projectSessions = new Map<string, Set<string>>();
  const projectModels = new Map<string, Set<string>>();
  const projectToolCalls = new Map<string, Record<string, number>>();
  const projectCostRaw = new Map<string, number>();

  const modelTokens = new Map<string, TokenCounts>();
  const modelProjectTokens = new Map<string, Map<string, TokenCounts>>();
  const modelProjectCostRaw = new Map<string, Map<string, number>>();
  const modelCostRaw = new Map<string, number>();

  let totalCostRaw = 0;
  const totalTokens: TokenCounts = zeroTokens();
  const totalToolCalls: Record<string, number> = {};

  // Cache getModelPricing calls per model to avoid repeated map lookups.
  const pricingCache = new Map<
    string,
    ReturnType<typeof getModelPricing>
  >();

  // ---------------------------------------------------------------------------
  // Single pass
  // ---------------------------------------------------------------------------

  for (const msg of messages) {
    const { sessionId, model, tokens, toolCalls, cwd } = msg;
    const project = projectNameFromCwd(cwd);

    // --- Pricing (cached per model) ---
    let modelPricing = pricingCache.get(model);
    if (modelPricing === undefined) {
      modelPricing = getModelPricing(model, pricingMap);
      pricingCache.set(model, modelPricing);
    }
    const msgCost = calculateCost(tokens, modelPricing.pricing);

    // --- Total accumulators ---
    addTokens(totalTokens, tokens);
    totalCostRaw += msgCost;
    for (const tool of toolCalls) {
      incrementCounter(totalToolCalls, tool);
    }

    // --- Project accumulators ---
    // tokens
    const pt = projectTokens.get(project);
    if (pt === undefined) {
      projectTokens.set(project, { ...tokens });
    } else {
      addTokens(pt, tokens);
    }

    // sessions
    let ps = projectSessions.get(project);
    if (ps === undefined) {
      ps = new Set<string>();
      projectSessions.set(project, ps);
    }
    ps.add(sessionId);

    // models
    let pm = projectModels.get(project);
    if (pm === undefined) {
      pm = new Set<string>();
      projectModels.set(project, pm);
    }
    pm.add(model);

    // tool calls
    let ptc = projectToolCalls.get(project);
    if (ptc === undefined) {
      ptc = {};
      projectToolCalls.set(project, ptc);
    }
    for (const tool of toolCalls) {
      incrementCounter(ptc, tool);
    }

    // cost
    projectCostRaw.set(project, (projectCostRaw.get(project) ?? 0) + msgCost);

    // --- Model accumulators ---
    // tokens
    const mt = modelTokens.get(model);
    if (mt === undefined) {
      modelTokens.set(model, { ...tokens });
    } else {
      addTokens(mt, tokens);
    }

    // cost
    modelCostRaw.set(model, (modelCostRaw.get(model) ?? 0) + msgCost);

    // model x project tokens
    let mpm = modelProjectTokens.get(model);
    if (mpm === undefined) {
      mpm = new Map<string, TokenCounts>();
      modelProjectTokens.set(model, mpm);
    }
    const mpt = mpm.get(project);
    if (mpt === undefined) {
      mpm.set(project, { ...tokens });
    } else {
      addTokens(mpt, tokens);
    }

    // model x project cost
    let mpc = modelProjectCostRaw.get(model);
    if (mpc === undefined) {
      mpc = new Map<string, number>();
      modelProjectCostRaw.set(model, mpc);
    }
    mpc.set(project, (mpc.get(project) ?? 0) + msgCost);
  }

  // ---------------------------------------------------------------------------
  // Build byProject
  // ---------------------------------------------------------------------------

  const byProject: Record<string, ProjectStats> = {};

  for (const [project, tokens] of projectTokens) {
    byProject[project] = {
      sessions: projectSessions.get(project)?.size ?? 0,
      tokens,
      cost: formatCost(projectCostRaw.get(project) ?? 0),
      models: Array.from(projectModels.get(project) ?? []).sort(),
      toolCalls: projectToolCalls.get(project) ?? {},
    };
  }

  // ---------------------------------------------------------------------------
  // Build byModel
  // ---------------------------------------------------------------------------

  const byModel: Record<string, ModelStats> = {};

  for (const [model, tokens] of modelTokens) {
    const projectMap = modelProjectTokens.get(model) ?? new Map();
    const projectCostMap = modelProjectCostRaw.get(model) ?? new Map();

    const byProjectEntry: ModelStats["byProject"] = {};
    for (const [proj, projTokens] of projectMap) {
      byProjectEntry[proj] = {
        tokens: projTokens,
        cost: formatCost(projectCostMap.get(proj) ?? 0),
      };
    }

    byModel[model] = {
      tokens,
      cost: formatCost(modelCostRaw.get(model) ?? 0),
      byProject: byProjectEntry,
    };
  }

  // ---------------------------------------------------------------------------
  // Build summary
  // ---------------------------------------------------------------------------

  const modelsUsed = Array.from(modelTokens.keys()).sort();
  const projectsTouched = Array.from(projectTokens.keys()).sort();
  const toolCallSummary = sortByCountDesc(totalToolCalls);

  return {
    summary: {
      totalSessions: sessions.size,
      totalTokens,
      totalCost: formatCost(totalCostRaw),
      modelsUsed,
      projectsTouched,
      toolCallSummary,
      pricingVersion,
    },
    byProject,
    byModel,
    meta: {
      filesRead: stats.filesRead,
      linesSkipped: stats.linesSkipped,
    },
  };
}
