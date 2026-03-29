/**
 * SVG card renderer — dispatches to the correct layout with a resolved theme.
 *
 * This module owns the CardData type (shared by all layout modules),
 * RenderOptions, LayoutName, and the renderSvg() dispatcher.
 */

import { resolveTheme } from "./themes/index.js";
import type { StyleName, ThemeName, ThemeColors } from "./themes/index.js";
import { renderClassic } from "./layouts/classic.js";
import { renderCompact } from "./layouts/compact.js";
import { renderHero } from "./layouts/hero.js";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** A single stat entry to display on the card. */
export interface StatEntry {
  /** Unique key used for hide filtering. */
  key: string;
  /** Human-readable label shown beside the icon. */
  label: string;
  /** Pre-formatted display value (abbreviated, escaped). */
  value: string;
  /**
   * Inline SVG path `d` attribute for a 24x24 viewBox stroke icon.
   * The icon is rendered at 16x16 display size inside a nested <svg>.
   */
  icon: string;
}

/** Data shape passed from renderCard() down to every layout renderer. */
export interface CardData {
  /** Card heading text, e.g. "ShipCard Stats". */
  title: string;
  /** Ordered list of stats to display. */
  stats: StatEntry[];
  /** Footer text — always "ShipCard". */
  footer: string;
  /** Optional date range label shown below the title. */
  dateRange?: string;
}

/** Card layout selection. */
export type LayoutName = "classic" | "compact" | "hero";

/** Options passed to renderSvg(). */
export interface RenderOptions {
  layout: LayoutName;
  style: StyleName;
  theme: ThemeName;
  /**
   * Pre-resolved theme colors to use directly.
   * When provided, `style` and `theme` are ignored for color resolution.
   * Allows the card route to pass curated or BYOT colors without the renderer
   * needing to know about the v2 theme system.
   */
  colors?: ThemeColors;
  /** For hero layout: which stat key to promote as the hero. */
  heroStat?: string;
}

// ---------------------------------------------------------------------------
// Icon paths (Lucide-style 24x24 stroke icons)
// ---------------------------------------------------------------------------

/**
 * Inline SVG path data for stat icons.
 * All paths use stroke-based rendering (no fill), stroke-width 2,
 * stroke-linecap round, stroke-linejoin round.
 */
export const STAT_ICONS: Record<string, string> = {
  // Terminal/monitor icon for sessions
  sessions:
    "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",

  // Wrench/tool icon for tool calls
  toolCalls:
    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",

  // CPU/chip icon for models
  models:
    "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",

  // Folder icon for projects
  projects:
    "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",

  // Dollar sign icon for cost
  cost: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
};

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Render a CardData object to an SVG string using the given layout and theme.
 *
 * This is a pure function — no side effects, no console.log.
 */
export function renderSvg(data: CardData, options: RenderOptions): string {
  const colors: ThemeColors =
    options.colors ?? resolveTheme(options.style, options.theme);

  switch (options.layout) {
    case "compact":
      return renderCompact(data, colors);
    case "hero":
      return renderHero(data, colors, options.heroStat);
    case "classic":
    default:
      return renderClassic(data, colors);
  }
}
