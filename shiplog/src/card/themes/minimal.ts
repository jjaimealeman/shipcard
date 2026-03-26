/**
 * Minimal theme palettes — typographic, stripped-down aesthetic.
 *
 * Near-monochrome with subtle contrast differences. Feels like a terminal
 * printout or a beautifully typeset page. No accent pop — icons use the same
 * muted tone as text. Border is barely visible. Data speaks for itself.
 */

import type { ThemeColors } from "./types.js";

/**
 * Minimal dark — near-black background, soft white text, whisper-thin border.
 * Terminal-inspired. Reads like a quiet status line.
 */
export const minimalDark: ThemeColors = {
  bg: "#111111",
  border: "#222222",
  title: "#eeeeee",
  text: "#888888",
  value: "#cccccc",
  icon: "#888888",
  footer: "#555555",
};

/**
 * Minimal light — white background, near-black text, hairline border.
 * Typeset-page aesthetic. Would look at home in a docs site or Notion embed.
 */
export const minimalLight: ThemeColors = {
  bg: "#ffffff",
  border: "#e8e8e8",
  title: "#111111",
  text: "#777777",
  value: "#333333",
  icon: "#777777",
  footer: "#aaaaaa",
};
