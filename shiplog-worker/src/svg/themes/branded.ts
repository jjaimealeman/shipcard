/**
 * Branded theme palettes — distinctive accent colors with ShipCard identity.
 *
 * Deep navy (#205680) paired with soft pastel blue (#e9fdff).
 * Clean, confident, avoids the AI-purple cliché.
 */

import type { ThemeColors } from "./types.js";

/**
 * Branded dark — deep navy background with soft blue accent.
 * Pops against dark GitHub profiles and dark-mode terminals.
 */
export const brandedDark: ThemeColors = {
  bg: "#0a1929",
  border: "#1a3a5c",
  title: "#e9fdff",
  text: "#7eb8d8",
  value: "#e9fdff",
  icon: "#3d9cd2",
  footer: "#5a8aad",
};

/**
 * Branded light — pastel blue background with deep navy text.
 * Professional, stands out on light-mode READMEs without being loud.
 */
export const brandedLight: ThemeColors = {
  bg: "#e9fdff",
  border: "#b8dce6",
  title: "#205680",
  text: "#3a7a9e",
  value: "#205680",
  icon: "#205680",
  footer: "#5a8aad",
};
