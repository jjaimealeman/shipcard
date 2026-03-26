/**
 * Public card API for ShipCard SVG card generation.
 *
 * `renderCard(result, options?)` is the single entry point — it transforms
 * an AnalyticsResult into a complete, GitHub-compatible SVG string.
 */

import type { AnalyticsResult } from "../engine/types.js";
import { renderSvg } from "./renderer.js";
import { STAT_ICONS } from "./renderer.js";
import { abbreviateNumber, formatCost, truncate } from "./format.js";

export type { LayoutName, RenderOptions } from "./renderer.js";
export type { StyleName, ThemeName } from "./themes/index.js";

import type { LayoutName } from "./renderer.js";
import type { StyleName, ThemeName } from "./themes/index.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Options for renderCard(). All fields are optional — sensible defaults apply. */
export interface CardOptions {
  /** Card layout style. Default: 'classic'. */
  layout?: LayoutName;
  /** Visual color style. Default: 'github'. */
  style?: StyleName;
  /** Dark or light variant. Default: 'dark'. */
  theme?: ThemeName;
  /**
   * Stat keys to exclude from the card.
   * Valid keys: 'sessions', 'toolCalls', 'models', 'projects', 'cost'.
   */
  hide?: string[];
  /** For hero layout: which stat key to promote as the hero stat. */
  heroStat?: string;
}

// ---------------------------------------------------------------------------
// Stat definitions (ordered for display)
// ---------------------------------------------------------------------------

const MAX_MODELS_LENGTH = 40;

/** Build the ordered stat list from an AnalyticsResult. */
function buildStats(
  result: AnalyticsResult,
  hide: string[]
): Array<{ key: string; label: string; value: string; icon: string }> {
  const hideSet = new Set(hide);

  // Total tool calls = sum of all tool call counts
  const totalToolCalls = Object.values(result.summary.toolCallSummary).reduce(
    (sum, count) => sum + count,
    0
  );

  const modelsDisplay = truncate(
    result.summary.modelsUsed.join(", ") || "none",
    MAX_MODELS_LENGTH
  );

  const allStats = [
    {
      key: "sessions",
      label: "Sessions",
      value: abbreviateNumber(result.summary.totalSessions),
      icon: STAT_ICONS.sessions,
    },
    {
      key: "toolCalls",
      label: "Tool Calls",
      value: abbreviateNumber(totalToolCalls),
      icon: STAT_ICONS.toolCalls,
    },
    {
      key: "models",
      label: "Models",
      value: modelsDisplay,
      icon: STAT_ICONS.models,
    },
    {
      key: "projects",
      label: "Projects",
      value: abbreviateNumber(result.summary.projectsTouched.length),
      icon: STAT_ICONS.projects,
    },
    {
      key: "cost",
      label: "Est. Cost",
      value: formatCost(result.summary.totalCost),
      icon: STAT_ICONS.cost,
    },
  ];

  return allStats.filter((stat) => !hideSet.has(stat.key));
}

/** Build a human-readable date range label from AnalyticsResult.meta.dateRange. */
function buildDateRange(
  dateRange: AnalyticsResult["meta"]["dateRange"]
): string | undefined {
  if (dateRange === undefined) return undefined;
  const { since, until } = dateRange;
  if (since !== undefined && until !== undefined) {
    return `${since} – ${until}`;
  }
  if (since !== undefined) {
    return `Since ${since}`;
  }
  if (until !== undefined) {
    return `Until ${until}`;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Transform an AnalyticsResult into a complete SVG card string.
 *
 * Pure function — no side effects, no file I/O, no console.log.
 *
 * @param result   Output from runEngine().
 * @param options  Optional card appearance overrides.
 * @returns        Complete SVG string, ready to write to a file or serve.
 */
export function renderCard(
  result: AnalyticsResult,
  options: CardOptions = {}
): string {
  const { layout = "classic", style = "github", theme = "dark", hide = [], heroStat } =
    options;

  const stats = buildStats(result, hide);
  const dateRange = buildDateRange(result.meta.dateRange);

  const cardData = {
    title: "ShipCard Stats",
    stats,
    footer: "ShipCard",
    dateRange,
  };

  return renderSvg(cardData, { layout, style, theme, heroStat });
}
