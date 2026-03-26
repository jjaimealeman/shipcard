/**
 * Classic layout — single-column, github-readme-stats style.
 *
 * Width: 495px
 * Height: dynamic (base 70px + 30px per visible stat)
 * Suitable for most GitHub profile READMEs.
 */

import { escapeXml } from "../xml.js";
import type { CardData } from "../renderer.js";
import type { ThemeColors } from "../themes/index.js";

const CARD_WIDTH = 495;
const PADDING = 20;
const TITLE_Y = 35;
const STATS_START_Y = 60;
const STAT_ROW_HEIGHT = 30;
const FOOTER_MARGIN = 20;
const ICON_SIZE = 16;

/**
 * Build an inline 16x16 icon SVG element from a 24x24 viewBox path.
 * Uses stroke rendering — no fill. Icon color comes from theme.
 */
function iconSvg(pathD: string, color: string, x: number, y: number): string {
  return (
    `<svg x="${x}" y="${y}" width="${ICON_SIZE}" height="${ICON_SIZE}" ` +
    `viewBox="0 0 24 24" fill="none" stroke="${escapeXml(color)}" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${escapeXml(pathD)}"/>` +
    `</svg>`
  );
}

/**
 * Render the classic single-column layout to an SVG string.
 */
export function renderClassic(data: CardData, theme: ThemeColors): string {
  const statCount = data.stats.length;
  const statsHeight = statCount * STAT_ROW_HEIGHT;
  const dateRangeOffset = data.dateRange ? 18 : 0;
  const height =
    STATS_START_Y + dateRangeOffset + statsHeight + FOOTER_MARGIN + 20;

  const lines: string[] = [];

  // SVG root
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${height}" ` +
      `viewBox="0 0 ${CARD_WIDTH} ${height}" role="img" aria-labelledby="card-title">`
  );

  // Accessibility title
  lines.push(`  <title id="card-title">${escapeXml(data.title)}</title>`);

  // Styles
  lines.push(`  <style>`);
  lines.push(
    `    text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif; }`
  );
  lines.push(`  </style>`);

  // Background rect
  lines.push(
    `  <rect width="${CARD_WIDTH}" height="${height}" rx="4.5" ` +
      `fill="${escapeXml(theme.bg)}" stroke="${escapeXml(theme.border)}" stroke-width="1"/>`
  );

  // Title
  lines.push(
    `  <text x="${PADDING}" y="${TITLE_Y}" font-size="18" font-weight="600" ` +
      `fill="${escapeXml(theme.title)}">${escapeXml(data.title)}</text>`
  );

  // Date range subtitle (if present)
  let statsY = STATS_START_Y;
  if (data.dateRange) {
    lines.push(
      `  <text x="${PADDING}" y="${STATS_START_Y}" font-size="12" ` +
        `fill="${escapeXml(theme.text)}">${escapeXml(data.dateRange)}</text>`
    );
    statsY = STATS_START_Y + dateRangeOffset + 4;
  }

  // Stat rows
  for (let i = 0; i < data.stats.length; i++) {
    const stat = data.stats[i];
    const rowY = statsY + i * STAT_ROW_HEIGHT;
    const textBaseline = rowY + ICON_SIZE - 2;
    const valueX = CARD_WIDTH - PADDING;

    // Icon
    lines.push(iconSvg(stat.icon, theme.icon, PADDING, rowY));

    // Label
    lines.push(
      `  <text x="${PADDING + ICON_SIZE + 8}" y="${textBaseline}" ` +
        `font-size="13" fill="${escapeXml(theme.text)}">${escapeXml(stat.label)}</text>`
    );

    // Value (right-aligned)
    lines.push(
      `  <text x="${valueX}" y="${textBaseline}" font-size="13" font-weight="600" ` +
        `text-anchor="end" fill="${escapeXml(theme.value)}">${escapeXml(stat.value)}</text>`
    );
  }

  // Footer
  const footerY = height - 10;
  lines.push(
    `  <text x="${CARD_WIDTH / 2}" y="${footerY}" font-size="10" ` +
      `text-anchor="middle" opacity="0.6" fill="${escapeXml(theme.footer)}">${escapeXml(data.footer)}</text>`
  );

  lines.push(`</svg>`);

  return lines.join("\n");
}
