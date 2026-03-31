/**
 * Public SVG card API for the ShipCard Worker.
 *
 * `renderCard(stats, options?)` is the single entry point — it transforms
 * a SafeStats payload into a complete, GitHub-compatible SVG string.
 *
 * Unlike the CLI package's card/index.ts (which accepts AnalyticsResult),
 * this module accepts SafeStats — the privacy-boundary type that is the
 * only shape of user data that reaches the cloud.
 */

import type { SafeStats } from "../types.js";
import { renderSvg, STAT_ICONS } from "./renderer.js";
import { abbreviateNumber, formatCost } from "./format.js";
import { escapeXml } from "./xml.js";

export type { LayoutName, RenderOptions } from "./renderer.js";
export type { StyleName, ThemeName, ThemeColors, CuratedThemeName } from "./themes/index.js";
export { CURATED_THEME_NAMES } from "./themes/index.js";
export {
  resolveCuratedTheme,
  validateByotContrast,
  isValidHex,
  type ByotColors,
  type ContrastError,
} from "./themes/index.js";

import type { LayoutName } from "./renderer.js";
import type { StyleName, ThemeName, ThemeColors } from "./themes/index.js";

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
   * Pre-resolved theme colors to use directly.
   * When provided, `style` and `theme` are ignored for color resolution.
   * Use this to pass curated or BYOT colors from the card route.
   */
  colors?: ThemeColors;
  /**
   * Stat keys to exclude from the card.
   * Valid keys: 'sessions', 'toolCalls', 'projects', 'cost'.
   */
  hide?: string[];
  /** For hero layout: which stat key to promote as the hero stat. */
  heroStat?: string;
  /** Whether this user has an active PRO subscription. Renders a gold badge. */
  isPro?: boolean;
}

// ---------------------------------------------------------------------------
// Stat definitions
// ---------------------------------------------------------------------------

/** Build the ordered stat list from a SafeStats payload. */
function buildStats(
  stats: SafeStats,
  hide: string[]
): Array<{ key: string; label: string; value: string; icon: string }> {
  const hideSet = new Set(hide);

  // Total tool calls = sum of all tool call counts
  const totalToolCalls = Object.values(stats.toolCallSummary).reduce(
    (sum, count) => sum + count,
    0
  );

  const allStats = [
    {
      key: "sessions",
      label: "Sessions",
      value: abbreviateNumber(stats.totalSessions),
      icon: STAT_ICONS.sessions,
    },
    {
      key: "toolCalls",
      label: "Tool Calls",
      value: abbreviateNumber(totalToolCalls),
      icon: STAT_ICONS.toolCalls,
    },
    {
      key: "projects",
      label: "Projects",
      value: abbreviateNumber(stats.projectCount),
      icon: STAT_ICONS.projects,
    },
    {
      key: "cost",
      label: "Est. Cost",
      value: formatCost(stats.totalCost),
      icon: STAT_ICONS.cost,
    },
  ];

  return allStats.filter((stat) => !hideSet.has(stat.key));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Transform a SafeStats payload into a complete SVG card string.
 *
 * Pure function — no side effects, no file I/O, no console.log.
 *
 * @param stats    SafeStats payload from the Worker's KV store.
 * @param options  Optional card appearance overrides.
 * @returns        Complete SVG string, ready to serve as image/svg+xml.
 */
export function renderCard(
  stats: SafeStats,
  options: CardOptions = {}
): string {
  const {
    layout = "classic",
    style = "github",
    theme = "dark",
    colors,
    hide = [],
    heroStat,
    isPro = false,
  } = options;

  const builtStats = buildStats(stats, hide);

  const cardData = {
    title: "ShipCard Stats",
    stats: builtStats,
    footer: "Get yours at shipcard.dev",
  };

  return renderSvg(cardData, { layout, style, theme, colors, heroStat, isPro });
}

/**
 * Render a placeholder SVG card for users who haven't set up ShipCard yet.
 *
 * Used when GET /card/:username has no user data in KV.
 * Returns a valid SVG (not a 404) — prevents broken image icons in READMEs.
 */
export function renderPlaceholderCard(username: string): string {
  const CARD_WIDTH = 495;
  const CARD_HEIGHT = 100;
  const bg = "#0d1117";
  const border = "#30363d";
  const title = "#e6edf3";
  const text = "#8b949e";
  const accent = "#58a6ff";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" `,
    `viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-labelledby="card-title">`,
    `  <title id="card-title">ShipCard — ${escapeXml(username)}</title>`,
    `  <style>`,
    `    text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif; }`,
    `  </style>`,
    `  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="4.5" `,
    `    fill="${bg}" stroke="${border}" stroke-width="1"/>`,
    `  <text x="20" y="35" font-size="15" font-weight="600" fill="${escapeXml(title)}">`,
    `    ${escapeXml(username)} hasn&apos;t set up ShipCard yet`,
    `  </text>`,
    `  <text x="20" y="58" font-size="12" fill="${escapeXml(text)}">`,
    `    Track your Claude Code sessions and share your stats.`,
    `  </text>`,
    `  <text x="20" y="78" font-size="12" fill="${escapeXml(accent)}">`,
    `    https://shipcard.dev`,
    `  </text>`,
    `</svg>`,
  ].join("\n");
}

/**
 * Render a redacted SVG card for users who deleted their data.
 *
 * Appears after `shipcard sync --delete`. Looks intentional — not broken,
 * not an error state — clearly "this data was removed".
 */
export function renderRedactedCard(username: string): string {
  const CARD_WIDTH = 495;
  const CARD_HEIGHT = 160;
  const bg = "#ffffff";
  const border = "#cccccc";
  const title = "#111111";
  const text = "#888888";

  const placeholderStats = [
    { label: "Sessions", value: "--- sessions" },
    { label: "Tool Calls", value: "--- calls" },
    { label: "Est. Cost", value: "$X.XX" },
  ];

  const lines: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" `,
    `viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-labelledby="card-title">`,
    `  <title id="card-title">ShipCard — ${escapeXml(username)} (data removed)</title>`,
    `  <style>`,
    `    text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif; }`,
    `  </style>`,
    `  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="4.5" `,
    `    fill="${bg}" stroke="${border}" stroke-width="1"/>`,
    `  <text x="20" y="35" font-size="16" font-weight="600" fill="${escapeXml(title)}">`,
    `    ShipCard Stats`,
    `  </text>`,
    `  <text x="20" y="55" font-size="11" fill="${escapeXml(text)}">`,
    `    ${escapeXml(username)} — data removed`,
    `  </text>`,
  ];

  placeholderStats.forEach((stat, i) => {
    const y = 80 + i * 22;
    lines.push(
      `  <text x="20" y="${y}" font-size="12" fill="${escapeXml(text)}">${escapeXml(stat.label)}</text>`,
      `  <text x="475" y="${y}" font-size="12" font-weight="600" text-anchor="end" fill="${escapeXml(title)}">${escapeXml(stat.value)}</text>`
    );
  });

  lines.push(
    `  <text x="${CARD_WIDTH / 2}" y="${CARD_HEIGHT - 8}" font-size="10" `,
    `    text-anchor="middle" opacity="0.4" fill="${escapeXml(text)}">ShipCard</text>`,
    `</svg>`
  );

  return lines.join("\n");
}
