/**
 * Theme registry for SVG card rendering.
 *
 * Provides the ThemeColors interface, style/theme type aliases, and the
 * resolveTheme() function that maps (style, theme) pairs to concrete palettes.
 */

export type { ThemeColors } from "./types.js";
import type { ThemeColors } from "./types.js";

import { githubDark, githubLight } from "./github.js";
import { brandedDark, brandedLight } from "./branded.js";
import { minimalDark, minimalLight } from "./minimal.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Visual style of the card. Controls color palette. */
export type StyleName = "github" | "branded" | "minimal";

/** Dark or light variant of a style. */
export type ThemeName = "dark" | "light";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const REGISTRY: Record<StyleName, Record<ThemeName, ThemeColors>> = {
  github: {
    dark: githubDark,
    light: githubLight,
  },
  branded: {
    dark: brandedDark,
    light: brandedLight,
  },
  minimal: {
    dark: minimalDark,
    light: minimalLight,
  },
};

/**
 * Resolve a (style, theme) pair to a concrete ThemeColors palette.
 *
 * Defaults: style = 'github', theme = 'dark'.
 *
 * @example
 * resolveTheme('branded', 'light') // brandedLight palette
 * resolveTheme('github', 'dark')   // githubDark palette
 */
export function resolveTheme(
  style: StyleName = "github",
  theme: ThemeName = "dark"
): ThemeColors {
  return REGISTRY[style][theme];
}
