/**
 * Curated theme palettes for the ShipCard theme system.
 *
 * 9 named palettes sourced from official theme specifications.
 * Each palette maps directly to ThemeColors (7 fields).
 * Derivation rule: value = title, footer = text.
 *
 * Sources:
 * - Catppuccin: https://github.com/catppuccin/catppuccin (Mocha variant)
 * - Dracula: https://draculatheme.com/contribute
 * - Tokyo Night: tokyo-night-vscode-theme (official JSON)
 * - Nord: https://nordtheme.com/docs/colors-and-palettes
 * - Gruvbox: morhetz/gruvbox (Dark Medium variant)
 * - Solarized: https://ethanschoonover.com/solarized/
 * - One Dark: Atom One Dark / OneDark-Pro
 * - Monokai: Sublime Text original
 */

import type { ThemeColors } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Union of all supported curated theme names. */
export type CuratedThemeName =
  | "catppuccin"
  | "dracula"
  | "tokyo-night"
  | "nord"
  | "gruvbox"
  | "solarized-dark"
  | "solarized-light"
  | "one-dark"
  | "monokai";

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

/** All 9 curated theme palettes keyed by CuratedThemeName. */
export const CURATED_THEMES: Record<CuratedThemeName, ThemeColors> = {
  catppuccin: {
    // Catppuccin Mocha (dark)
    bg: "#1e1e2e", // Base
    border: "#313244", // Surface0
    title: "#cdd6f4", // Text
    text: "#a6adc8", // Subtext0
    value: "#cdd6f4", // Text (same as title)
    icon: "#89b4fa", // Blue
    footer: "#a6adc8", // Subtext0 (same as text)
  },

  dracula: {
    // Official Dracula (https://draculatheme.com)
    bg: "#282a36", // Background
    border: "#44475a", // Selection
    title: "#f8f8f2", // Foreground
    text: "#6272a4", // Comment
    value: "#f8f8f2", // Foreground (same as title)
    icon: "#bd93f9", // Purple
    footer: "#6272a4", // Comment (same as text)
  },

  "tokyo-night": {
    // Tokyo Night VSCode theme
    bg: "#1a1b26", // editor.background
    border: "#29355a", // hover/focus border
    title: "#a9b1d6", // foreground
    text: "#787c99", // muted text
    value: "#a9b1d6", // foreground (same as title)
    icon: "#7aa2f7", // primary blue
    footer: "#787c99", // muted text (same as text)
  },

  nord: {
    // Nord official (https://nordtheme.com)
    bg: "#2e3440", // nord0 Polar Night
    border: "#3b4252", // nord1 Polar Night
    title: "#eceff4", // nord6 Snow Storm
    text: "#d8dee9", // nord4 Snow Storm
    value: "#eceff4", // nord6 (same as title)
    icon: "#88c0d0", // nord8 Frost
    footer: "#d8dee9", // nord4 (same as text)
  },

  gruvbox: {
    // Gruvbox Dark Medium (morhetz/gruvbox)
    bg: "#282828", // dark0
    border: "#3c3836", // dark1
    title: "#ebdbb2", // light1
    text: "#a89984", // light4
    value: "#ebdbb2", // light1 (same as title)
    icon: "#83a598", // blue (bright)
    footer: "#a89984", // light4 (same as text)
  },

  "solarized-dark": {
    // Solarized Dark (ethanschoonover.com/solarized)
    bg: "#002b36", // base03
    border: "#073642", // base02
    title: "#839496", // base0
    text: "#657b83", // base00
    value: "#839496", // base0 (same as title)
    icon: "#268bd2", // blue
    footer: "#657b83", // base00 (same as text)
  },

  "solarized-light": {
    // Solarized Light (ethanschoonover.com/solarized)
    bg: "#fdf6e3", // base3
    border: "#eee8d5", // base2
    title: "#073642", // base02 (darkest for contrast)
    text: "#657b83", // base00
    value: "#073642", // base02 (same as title)
    icon: "#268bd2", // blue
    footer: "#657b83", // base00 (same as text)
  },

  "one-dark": {
    // Atom One Dark / OneDark-Pro
    bg: "#282c34", // editor background
    border: "#3e4452", // line highlight / separator
    title: "#abb2bf", // foreground
    text: "#5c6370", // comment / muted
    value: "#abb2bf", // foreground (same as title)
    icon: "#61afef", // blue
    footer: "#5c6370", // comment (same as text)
  },

  monokai: {
    // Monokai Classic (Sublime Text original)
    bg: "#272822", // editor.background
    border: "#3e3d32", // editor.lineHighlight
    title: "#f8f8f2", // editor.foreground
    text: "#90908a", // line number muted
    value: "#f8f8f2", // editor.foreground (same as title)
    icon: "#a6e22e", // green (syntax keyword)
    footer: "#90908a", // muted (same as text)
  },
};

/** Ordered list of all supported curated theme names. */
export const CURATED_THEME_NAMES = Object.keys(
  CURATED_THEMES
) as CuratedThemeName[];
