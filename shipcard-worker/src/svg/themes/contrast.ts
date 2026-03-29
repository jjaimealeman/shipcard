/**
 * WCAG 2.1 contrast ratio calculator and BYOT color validation.
 *
 * Implements the WCAG 2.1 relative luminance formula:
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 *
 * Uses WCAG 1.4.11 (Non-text Contrast) threshold of 3:1.
 * This is correct for UI components and graphical objects (like SVG cards),
 * NOT the 4.5:1 threshold which applies to body text (WCAG 1.4.3).
 *
 * No external dependencies. Pure functions only.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Linearize an sRGB channel value for WCAG luminance calculation.
 * Input must be in the range [0, 1].
 */
function linearize(v: number): number {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Compute the WCAG 2.1 relative luminance of a hex color.
 * Accepts hex with or without leading `#`.
 * Returns a value in the range [0, 1].
 */
function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate the WCAG contrast ratio between two hex colors.
 * Accepts hex with or without leading `#`.
 * Returns a value between 1 (no contrast) and 21 (maximum contrast).
 *
 * @example
 * contrastRatio("#ffffff", "#000000") // 21
 * contrastRatio("#1e1e2e", "#cdd6f4") // ~11.5 (catppuccin title)
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Input colors for Bring Your Own Theme validation. */
export type ByotColors = {
  /** Card background fill (hex). */
  bg: string;
  /** Card title text color (hex). */
  title: string;
  /** Secondary / label text color (hex). */
  text: string;
  /** Icon color (hex). */
  icon: string;
  /** Card border stroke color (hex). */
  border: string;
};

/** A single field-level contrast error from validateByotContrast(). */
export type ContrastError = {
  /** Name of the field that failed (e.g. "title", "text"). */
  field: string;
  /** Human-readable description including the measured ratio. */
  message: string;
};

/**
 * Validate a set of BYOT colors against WCAG 3:1 minimum contrast.
 *
 * Checks title, text, icon, and border each against bg.
 * Returns an array of field-level errors. Empty array means all checks pass.
 *
 * WCAG 1.4.11 (Non-text Contrast) requires 3:1 for UI components.
 * This is the correct threshold for an SVG stats card, not 4.5:1.
 *
 * @example
 * validateByotContrast({ bg: "#000", title: "#fff", text: "#fff", icon: "#fff", border: "#fff" })
 * // => [] (all pass)
 *
 * validateByotContrast({ bg: "#333", title: "#444", text: "#555", icon: "#666", border: "#777" })
 * // => [{ field: "title", message: "..." }, ...]
 */
export function validateByotContrast(colors: ByotColors): ContrastError[] {
  const MIN_RATIO = 3.0;
  const errors: ContrastError[] = [];

  const pairs: Array<[string, string]> = [
    ["title", colors.title],
    ["text", colors.text],
    ["icon", colors.icon],
    ["border", colors.border],
  ];

  for (const [field, fg] of pairs) {
    const ratio = contrastRatio(fg, colors.bg);
    if (ratio < MIN_RATIO) {
      errors.push({
        field,
        message: `${field} has insufficient contrast against background (${ratio.toFixed(2)}:1, minimum 3:1)`,
      });
    }
  }

  return errors;
}

/**
 * Validate that a string is a 6-character hex color, with or without `#`.
 *
 * @example
 * isValidHex("#1e1e2e") // true
 * isValidHex("1e1e2e")  // true
 * isValidHex("#fff")    // false (3-char shorthand not supported)
 * isValidHex("zzzzzz")  // false
 */
export function isValidHex(hex: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(hex);
}
