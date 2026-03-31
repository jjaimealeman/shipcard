/**
 * Theme registry for SVG card rendering.
 *
 * Provides the ThemeColors interface, style/theme type aliases, and the
 * resolveTheme() function that maps (style, theme) pairs to concrete palettes.
 *
 * Also exports curated theme support (v2 system) and contrast validation,
 * while preserving full backward compatibility with the legacy style+theme model.
 */

export type { ThemeColors } from "./types.js";
import type { ThemeColors } from "./types.js";

import { githubDark, githubLight } from "./github.js";
import { brandedDark, brandedLight } from "./branded.js";
import { minimalDark, minimalLight } from "./minimal.js";
import {
  CURATED_THEMES,
  CURATED_THEME_NAMES,
  type CuratedThemeName,
} from "./curated.js";

// Re-export curated theme types for external consumers
export type { CuratedThemeName };
export { CURATED_THEME_NAMES };

// Re-export contrast utilities for external consumers
export {
  contrastRatio,
  validateByotContrast,
  isValidHex,
  type ByotColors,
  type ContrastError,
} from "./contrast.js";

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
 * UNCHANGED — backward compat guaranteed.
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

/**
 * Look up a named curated theme by name.
 * Returns null if the name is not in the curated registry.
 *
 * @example
 * resolveCuratedTheme("catppuccin") // catppuccin palette
 * resolveCuratedTheme("invalid")    // null
 */
export function resolveCuratedTheme(name: string): ThemeColors | null {
  return (CURATED_THEMES as Record<string, ThemeColors>)[name] ?? null;
}

/**
 * Unified theme resolver supporting both legacy style+theme and v2 curated names.
 *
 * Resolution order:
 * 1. If `theme` is a curated name (e.g. "catppuccin") → return curated palette
 * 2. If `theme` is "dark" or "light" → legacy path: resolveTheme(style ?? "github", theme)
 * 3. Otherwise → default to catppuccin (new default for unknown values)
 *
 * Backward compat: old URLs using `?theme=dark` or `?theme=light` still work.
 * New URLs using `?theme=catppuccin` work naturally.
 *
 * @example
 * resolveThemeV2({ theme: "catppuccin" })         // catppuccin palette
 * resolveThemeV2({ theme: "dark", style: "github" }) // githubDark palette
 * resolveThemeV2({ theme: "dark" })               // githubDark palette (github default)
 * resolveThemeV2({})                              // catppuccin (default)
 */
export function resolveThemeV2(params: {
  theme?: string;
  style?: string;
  legacyTheme?: string;
}): ThemeColors {
  const { theme, style } = params;

  // 1. Named curated theme
  if (theme && (CURATED_THEME_NAMES as string[]).includes(theme)) {
    return CURATED_THEMES[theme as CuratedThemeName];
  }

  // 2. Legacy dark/light
  if (theme === "dark" || theme === "light") {
    return resolveTheme(
      (style as StyleName | undefined) ?? "github",
      theme
    );
  }

  // 3. Default: catppuccin
  return CURATED_THEMES["catppuccin"];
}
