/**
 * GitHub theme palettes — muted colors that blend naturally into GitHub READMEs.
 *
 * Colors match GitHub's own dark/light UI palette so the card feels native
 * on GitHub profile READMEs and repository documentation.
 */

import type { ThemeColors } from "./types.js";

/** Matches GitHub's dark mode (#0d1117 background). */
export const githubDark: ThemeColors = {
  bg: "#0d1117",
  border: "#30363d",
  title: "#e6edf3",
  text: "#8b949e",
  value: "#e6edf3",
  icon: "#58a6ff",
  footer: "#8b949e",
};

/** Matches GitHub's light mode (white background). */
export const githubLight: ThemeColors = {
  bg: "#ffffff",
  border: "#d0d7de",
  title: "#1f2328",
  text: "#656d76",
  value: "#1f2328",
  icon: "#0969da",
  footer: "#656d76",
};
