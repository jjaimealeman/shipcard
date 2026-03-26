/**
 * Shared type definitions for the theme system.
 *
 * Kept in a separate file to avoid circular imports between the theme
 * registry (index.ts) and individual palette modules.
 */

/** CSS color values for every visual slot in a card. */
export interface ThemeColors {
  /** Card background fill. */
  bg: string;
  /** Card border stroke. */
  border: string;
  /** Card title text. */
  title: string;
  /** Secondary/label text. */
  text: string;
  /** Stat value text (emphasized). */
  value: string;
  /** Inline icon color / stroke. */
  icon: string;
  /** Footer text. */
  footer: string;
}
