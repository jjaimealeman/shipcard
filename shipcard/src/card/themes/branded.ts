/**
 * Branded theme palettes — distinctive accent colors with ShipCard identity.
 *
 * Developer-tool aesthetic inspired by tools like Linear, Vercel, and VS Code.
 * The violet/indigo accent is ShipCard's signature color — bold on dark,
 * vibrant on light. Pairs well with dark-background profile READMEs.
 */

import type { ThemeColors } from "./types.js";

/**
 * Branded dark — deep navy background with violet accent.
 * Pops against dark GitHub profiles and dark-mode terminals.
 */
export const brandedDark: ThemeColors = {
  bg: "#0f0f23",
  border: "#2d2b55",
  title: "#f0f0ff",
  text: "#9b9bc8",
  value: "#e8e8ff",
  icon: "#7c3aed",
  footer: "#6b6b9a",
};

/**
 * Branded light — clean white with indigo accent.
 * Professional, stands out on light-mode READMEs without being loud.
 */
export const brandedLight: ThemeColors = {
  bg: "#fafafa",
  border: "#e0e0f5",
  title: "#1e1b4b",
  text: "#4c4f6b",
  value: "#1e1b4b",
  icon: "#4f46e5",
  footer: "#7c7da8",
};
