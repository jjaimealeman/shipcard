/**
 * Number and string formatting utilities for SVG card display.
 */

/**
 * Abbreviate large numbers for compact display.
 *
 * - >= 1,000,000 → "X.XM"
 * - >= 1,000     → "X.Xk"
 * - else         → raw number as string
 *
 * @example
 * abbreviateNumber(2_300_000) // "2.3M"
 * abbreviateNumber(1_800)     // "1.8k"
 * abbreviateNumber(42)        // "42"
 */
export function abbreviateNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}k`;
  }
  return String(n);
}

/**
 * Pass-through for cost strings — AnalyticsResult already formats as "~$X.XX".
 *
 * Exists as a named export for consistency and to allow future formatting
 * changes in a single place.
 */
export function formatCost(raw: string): string {
  return raw;
}

/**
 * Truncate a string to at most `max` characters.
 *
 * If the string exceeds `max`, it is sliced to `max - 1` characters and the
 * unicode ellipsis character (…) is appended.
 *
 * @example
 * truncate("hello world", 8) // "hello w…"
 * truncate("hi", 8)          // "hi"
 */
export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "\u2026";
}
