/**
 * XML escaping utilities for safe SVG string interpolation.
 *
 * All user-controlled strings must be passed through escapeXml() before
 * being interpolated into SVG markup to prevent injection.
 */

/**
 * Escape a string for safe inclusion in XML/SVG attribute values and text nodes.
 *
 * Replacement order is critical: `&` must be replaced first to prevent
 * double-encoding (e.g. `<` → `&lt;` → `&amp;lt;`).
 */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
