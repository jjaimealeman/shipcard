/**
 * Hero layout — one prominently displayed stat, remaining stats below.
 *
 * Width: 495px
 * Height: ~220px
 * The hero stat is displayed at 36px with a large icon.
 * Remaining stats are rendered in a compact row below.
 */

import { escapeXml } from "../xml.js";
import type { CardData } from "../renderer.js";
import type { ThemeColors } from "../themes/index.js";

const CARD_WIDTH = 495;
const PADDING = 20;
const TITLE_Y = 30;
const HERO_SECTION_Y = 55;
const HERO_ICON_SIZE = 28;
const HERO_VALUE_SIZE = 36;
const SECONDARY_START_Y = 155;
const SECONDARY_COL_WIDTH = (CARD_WIDTH - PADDING * 2) / 4;
const SECONDARY_ICON_SIZE = 13;
const CARD_HEIGHT = 220;

function iconSvg(
  pathD: string,
  color: string,
  x: number,
  y: number,
  size: number
): string {
  return (
    `<svg x="${x}" y="${y}" width="${size}" height="${size}" ` +
    `viewBox="0 0 24 24" fill="none" stroke="${escapeXml(color)}" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${escapeXml(pathD)}"/>` +
    `</svg>`
  );
}

/**
 * Render the hero layout to an SVG string.
 *
 * @param heroKey  Key of the stat to elevate as the hero. Defaults to the
 *                 first stat in the list (typically "sessions").
 */
export function renderHero(
  data: CardData,
  theme: ThemeColors,
  heroKey?: string
): string {
  // Separate hero stat from secondary stats
  const heroIndex =
    heroKey !== undefined
      ? data.stats.findIndex((s) => s.key === heroKey)
      : -1;
  const resolvedHeroIndex = heroIndex >= 0 ? heroIndex : 0;

  const hero = data.stats[resolvedHeroIndex];
  const secondaryStats = data.stats.filter((_, i) => i !== resolvedHeroIndex);

  const dateRangeOffset = data.dateRange ? 16 : 0;
  const height = CARD_HEIGHT + dateRangeOffset;

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

  // Title
  lines.push(
    `  <text x="${PADDING}" y="${TITLE_Y}" font-size="16" font-weight="600" ` +
      `fill="${escapeXml(theme.title)}">${escapeXml(data.title)}</text>`
  );

  // Date range
  let heroY = HERO_SECTION_Y;
  if (data.dateRange) {
    lines.push(
      `  <text x="${PADDING}" y="${HERO_SECTION_Y - 6}" font-size="11" ` +
        `fill="${escapeXml(theme.text)}">${escapeXml(data.dateRange)}</text>`
    );
    heroY = HERO_SECTION_Y + dateRangeOffset;
  }

  // Hero stat section
  if (hero !== undefined) {
    // Large icon
    lines.push(iconSvg(hero.icon, theme.icon, PADDING, heroY, HERO_ICON_SIZE));

    // Hero value beside icon
    lines.push(
      `  <text x="${PADDING + HERO_ICON_SIZE + 12}" y="${heroY + HERO_VALUE_SIZE - 4}" ` +
        `font-size="${HERO_VALUE_SIZE}" font-weight="700" ` +
        `fill="${escapeXml(theme.value)}">${escapeXml(hero.value)}</text>`
    );

    // Hero label below value
    lines.push(
      `  <text x="${PADDING}" y="${heroY + HERO_ICON_SIZE + 28}" ` +
        `font-size="14" fill="${escapeXml(theme.text)}">${escapeXml(hero.label)}</text>`
    );
  }

  // Divider line
  const dividerY = SECONDARY_START_Y + dateRangeOffset - 16;
  lines.push(
    `  <line x1="${PADDING}" y1="${dividerY}" x2="${CARD_WIDTH - PADDING}" y2="${dividerY}" ` +
      `stroke="${escapeXml(theme.border)}" stroke-width="1" opacity="0.5"/>`
  );

  // Secondary stats row
  const secondaryY = SECONDARY_START_Y + dateRangeOffset;
  for (let i = 0; i < secondaryStats.length && i < 4; i++) {
    const stat = secondaryStats[i];
    const colX = PADDING + i * SECONDARY_COL_WIDTH;

    lines.push(iconSvg(stat.icon, theme.icon, colX, secondaryY, SECONDARY_ICON_SIZE));

    lines.push(
      `  <text x="${colX}" y="${secondaryY + SECONDARY_ICON_SIZE + 14}" ` +
        `font-size="11" font-weight="600" fill="${escapeXml(theme.value)}">${escapeXml(stat.value)}</text>`
    );

    lines.push(
      `  <text x="${colX}" y="${secondaryY + SECONDARY_ICON_SIZE + 26}" ` +
        `font-size="10" fill="${escapeXml(theme.text)}">${escapeXml(stat.label)}</text>`
    );
  }

  // Footer
  const footerY = height - 8;
  lines.push(
    `  <text x="${CARD_WIDTH - PADDING}" y="${footerY}" font-size="10" ` +
      `text-anchor="end" opacity="0.6" fill="${escapeXml(theme.footer)}">${escapeXml(data.footer)}</text>`
  );

  lines.push(`</svg>`);
  return lines.join("\n");
}
