/**
 * Compact layout — two-column grid for denser stat display.
 *
 * Width: 495px
 * Height: ~160px for 5 stats (shorter than classic)
 * Left column: stats at index 0, 2, 4 (first, third, fifth)
 * Right column: stats at index 1, 3 (second, fourth)
 */

import { escapeXml } from "../xml.js";
import type { CardData } from "../renderer.js";
import type { ThemeColors } from "../themes/index.js";

const CARD_WIDTH = 495;
const PADDING = 20;
const TITLE_Y = 32;
const STATS_START_Y = 52;
const CELL_HEIGHT = 44;
const COL_WIDTH = (CARD_WIDTH - PADDING * 2) / 2;
const ICON_SIZE = 14;
const FOOTER_PADDING = 14;

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
 * Render the compact two-column grid layout to an SVG string.
 */
export function renderCompact(data: CardData, theme: ThemeColors): string {
  const leftStats = data.stats.filter((_, i) => i % 2 === 0);
  const rightStats = data.stats.filter((_, i) => i % 2 === 1);
  const rowCount = Math.max(leftStats.length, rightStats.length);
  const dateRangeOffset = data.dateRange ? 16 : 0;
  const height =
    STATS_START_Y + dateRangeOffset + rowCount * CELL_HEIGHT + FOOTER_PADDING;

  const lines: string[] = [];

  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${height}" ` +
      `viewBox="0 0 ${CARD_WIDTH} ${height}" role="img" aria-labelledby="card-title">`
  );

  lines.push(`  <title id="card-title">${escapeXml(data.title)}</title>`);

  lines.push(`  <style>`);
  lines.push(
    `    text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif; }`
  );
  lines.push(`  </style>`);

  lines.push(
    `  <rect width="${CARD_WIDTH}" height="${height}" rx="4.5" ` +
      `fill="${escapeXml(theme.bg)}" stroke="${escapeXml(theme.border)}" stroke-width="1"/>`
  );

  lines.push(
    `  <text x="${PADDING}" y="${TITLE_Y}" font-size="16" font-weight="600" ` +
      `fill="${escapeXml(theme.title)}">${escapeXml(data.title)}</text>`
  );

  // Date range subtitle
  let gridY = STATS_START_Y;
  if (data.dateRange) {
    lines.push(
      `  <text x="${PADDING}" y="${STATS_START_Y}" font-size="11" ` +
        `fill="${escapeXml(theme.text)}">${escapeXml(data.dateRange)}</text>`
    );
    gridY = STATS_START_Y + dateRangeOffset + 2;
  }

  // Render both columns
  const renderColumn = (stats: typeof data.stats, colX: number): void => {
    for (let i = 0; i < stats.length; i++) {
      const stat = stats[i];
      const cellY = gridY + i * CELL_HEIGHT;
      const labelY = cellY + ICON_SIZE;
      const valueY = cellY + ICON_SIZE + 16;

      // Icon + label on one line
      lines.push(iconSvg(stat.icon, theme.icon, colX, cellY));
      lines.push(
        `  <text x="${colX + ICON_SIZE + 6}" y="${labelY}" ` +
          `font-size="11" fill="${escapeXml(theme.text)}">${escapeXml(stat.label)}</text>`
      );

      // Value below
      lines.push(
        `  <text x="${colX}" y="${valueY}" ` +
          `font-size="14" font-weight="600" fill="${escapeXml(theme.value)}">${escapeXml(stat.value)}</text>`
      );
    }
  };

  renderColumn(leftStats, PADDING);
  renderColumn(rightStats, PADDING + COL_WIDTH);

  // Footer
  const footerY = height - 6;
  lines.push(
    `  <text x="${CARD_WIDTH - PADDING}" y="${footerY}" font-size="10" ` +
      `text-anchor="end" opacity="0.6" fill="${escapeXml(theme.footer)}">${escapeXml(data.footer)}</text>`
  );

  lines.push(`</svg>`);
  return lines.join("\n");
}
