/**
 * Engine barrel export.
 *
 * Re-exports everything consumers need from the engine subsystem.
 * Centralizes imports so callers only need: import { ... } from './engine/index.js'
 */

// Aggregator: transforms ParseResult into AnalyticsResult.
export { aggregate } from "./aggregator.js";

// Cost: pricing fetch and calculation.
export {
  getPricing,
  calculateCost,
  formatCost,
  getModelPricing,
  buildPricingMap,
  calcTieredCost,
} from "./cost.js";
export type { PricingMap, ModelPricing } from "./cost.js";

// Filter: date parsing and message filtering.
export { filterByDateRange, parseFilterDate } from "./filter.js";

// Types: all engine output and option types.
export type {
  AnalyticsResult,
  ProjectStats,
  ModelStats,
  EngineOptions,
  TokenCounts,
} from "./types.js";
