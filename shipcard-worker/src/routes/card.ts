/**
 * GET /u/:username — ShipCard SVG card endpoint.
 *
 * Serves cached or freshly rendered SVG cards with anti-camo headers.
 * Unknown usernames get a placeholder card (not a 404 or error response).
 *
 * Query params:
 *   ?theme=catppuccin|dracula|tokyo-night|...  (curated — free, default: catppuccin)
 *   ?theme=dark|light                           (legacy — backward compat)
 *   ?layout=classic|compact|hero                (default: classic)
 *   ?style=github|branded|minimal               (legacy only, for ?theme=dark|light)
 *   ?hide=cost&hide=projects                    (multi-value; valid keys: sessions, toolCalls, projects, cost)
 *   ?bg=1e1e2e&title=cdd6f4&text=cdd6f4&icon=89b4fa&border=313244  (BYOT — PRO only)
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
import {
  getCardCache,
  putCardCache,
  getCardCacheV2,
  putCardCacheV2,
  getUserData,
  isUserPro,
} from "../kv.js";
import {
  renderCard,
  renderPlaceholderCard,
  CURATED_THEME_NAMES,
  resolveCuratedTheme,
  validateByotContrast,
  isValidHex,
} from "../svg/index.js";
import type { LayoutName } from "../svg/index.js";
import type { StyleName, ThemeName, ThemeColors } from "../svg/themes/index.js";
import { resolveTheme } from "../svg/themes/index.js";

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * Build a Response with SVG content and anti-camo Cache-Control headers.
 *
 * CRITICAL: These headers prevent GitHub's camo proxy from caching the SVG
 * for days. Without them, users would see stale cards for hours/days after
 * a sync. This is the single most important correctness requirement.
 */
function svgResponse(
  c: { body: (data: string, status: number, headers: Record<string, string>) => Response },
  svg: string,
  status = 200
): Response {
  return c.body(svg, status, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  });
}

/**
 * Render a simple error SVG card with a title and message list.
 *
 * Used for BYOT validation errors, PRO gate rejections, and partial param errors.
 * Same width as regular cards (495px). Height scales with message count.
 */
function renderErrorSvg(title: string, messages: string[]): string {
  const CARD_WIDTH = 495;
  const TITLE_Y = 32;
  const MSG_START_Y = 58;
  const MSG_LINE_HEIGHT = 20;
  const PADDING_BOTTOM = 20;
  const CARD_HEIGHT = MSG_START_Y + messages.length * MSG_LINE_HEIGHT + PADDING_BOTTOM;

  const bg = "#1e1e2e";
  const border = "#313244";
  const titleColor = "#ff6b6b";
  const textColor = "#cdd6f4";

  const lines: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" `,
    `  viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-labelledby="card-title">`,
    `  <title id="card-title">${title}</title>`,
    `  <style>text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif; }</style>`,
    `  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="4.5" fill="${bg}" stroke="${border}" stroke-width="1"/>`,
    `  <text x="20" y="${TITLE_Y}" font-size="14" font-weight="600" fill="${titleColor}">${escapeXmlLocal(title)}</text>`,
  ];

  messages.forEach((msg, i) => {
    const y = MSG_START_Y + i * MSG_LINE_HEIGHT;
    lines.push(
      `  <text x="20" y="${y}" font-size="12" fill="${textColor}">${escapeXmlLocal(msg)}</text>`
    );
  });

  lines.push(`</svg>`);
  return lines.join("\n");
}

/** Minimal XML escaping for error SVG text (avoids importing escapeXml from svg/xml.ts). */
function escapeXmlLocal(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Normalize a hex color value to include a leading `#`.
 * Accepts "1e1e2e" or "#1e1e2e" → returns "#1e1e2e".
 */
function normalizeHex(hex: string): string {
  return hex.startsWith("#") ? hex : `#${hex}`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const cardRoutes = new Hono<{ Bindings: Env }>();

cardRoutes.get("/:username", async (c) => {
  const username = c.req.param("username");

  // ---------------------------------------------------------------------------
  // Step 1: Parse all params
  // ---------------------------------------------------------------------------
  const themeParam = c.req.query("theme");           // "catppuccin", "dark", "light", etc.
  const styleParam = c.req.query("style");           // legacy: "github", "branded", "minimal"
  const layoutParam = (c.req.query("layout") ?? "classic") as LayoutName;
  // Use plural queries() to capture all ?hide= values (singular query() drops duplicates)
  const hide = c.req.queries("hide") ?? [];

  // BYOT params (all optional — presence of any triggers BYOT mode)
  const bgParam    = c.req.query("bg");
  const titleParam = c.req.query("title");
  const textParam  = c.req.query("text");
  const iconParam  = c.req.query("icon");
  const borderParam = c.req.query("border");

  const byotParams = { bgParam, titleParam, textParam, iconParam, borderParam };
  const byotPresent = Object.values(byotParams).some((v) => v !== undefined);

  // ---------------------------------------------------------------------------
  // Step 2: BYOT mode
  // ---------------------------------------------------------------------------
  if (byotPresent) {
    // 2a. All 5 params must be present
    const missing = (["bg", "title", "text", "icon", "border"] as const).filter(
      (k) => c.req.query(k) === undefined
    );
    if (missing.length > 0) {
      const svg = renderErrorSvg("BYOT Error", [
        "Custom colors require all 5 params: bg, title, text, icon, border",
        `Missing: ${missing.join(", ")}`,
      ]);
      return svgResponse(c, svg, 400);
    }

    // 2b. Validate each param is a valid hex
    const rawColors = {
      bg:     bgParam!,
      title:  titleParam!,
      text:   textParam!,
      icon:   iconParam!,
      border: borderParam!,
    };

    const hexErrors: string[] = [];
    for (const [field, val] of Object.entries(rawColors)) {
      if (!isValidHex(val)) {
        hexErrors.push(`${field}: "${val}" is not a valid 6-character hex color`);
      }
    }
    if (hexErrors.length > 0) {
      const svg = renderErrorSvg("BYOT Error: Invalid hex colors", hexErrors);
      return svgResponse(c, svg, 400);
    }

    // 2c. Normalize to include `#`
    const bg     = normalizeHex(rawColors.bg);
    const title  = normalizeHex(rawColors.title);
    const text   = normalizeHex(rawColors.text);
    const icon   = normalizeHex(rawColors.icon);
    const border = normalizeHex(rawColors.border);

    // 2d. PRO gate — must be checked before contrast (leaks less info if not PRO)
    const isPro = await isUserPro(c.env.DB, username);
    if (!isPro) {
      const svg = renderErrorSvg("ShipCard PRO Required", [
        "Custom colors require ShipCard PRO",
        "Upgrade at: shipcard.dev/upgrade",
      ]);
      return svgResponse(c, svg, 403);
    }

    // 2e. Contrast validation
    const byotColors = { bg, title, text, icon, border };
    const contrastErrors = validateByotContrast(byotColors);
    if (contrastErrors.length > 0) {
      const errorMessages = contrastErrors.map((e) => e.message);
      const svg = renderErrorSvg("BYOT Error: Contrast too low", errorMessages);
      return svgResponse(c, svg, 400);
    }

    // 2f. Build ThemeColors and render — NO caching for BYOT
    const colors: ThemeColors = {
      bg,
      border,
      title,
      text,
      value: title,   // value = title per derivation rule
      icon,
      footer: text,   // footer = text per derivation rule
    };

    const userData = await getUserData(c.env.USER_DATA_KV, username);
    if (userData === null) {
      return svgResponse(c, renderPlaceholderCard(username));
    }

    const svg = renderCard(userData, { layout: layoutParam, colors, hide });
    return svgResponse(c, svg);
  }

  // ---------------------------------------------------------------------------
  // Step 3: Resolve curated or legacy theme
  // ---------------------------------------------------------------------------

  // Detect BYOT vs curated vs legacy
  const isCuratedTheme =
    themeParam != null &&
    (CURATED_THEME_NAMES as string[]).includes(themeParam);

  const isLegacyTheme =
    themeParam === "dark" || themeParam === "light";

  // If no param or unrecognized → default to catppuccin (curated)
  const effectiveTheme: string = isCuratedTheme
    ? themeParam!
    : isLegacyTheme
    ? themeParam!
    : "catppuccin";

  // ---------------------------------------------------------------------------
  // Step 4: Cache + render
  // ---------------------------------------------------------------------------

  const userData = await getUserData(c.env.USER_DATA_KV, username);
  if (userData === null) {
    return svgResponse(c, renderPlaceholderCard(username));
  }

  if (isLegacyTheme) {
    // Legacy path: use old style+theme resolver and old cache keys
    const resolvedStyle = (styleParam ?? "github") as StyleName;
    const resolvedTheme = effectiveTheme as ThemeName;

    const cached = await getCardCache(
      c.env.CARDS_KV,
      username,
      resolvedTheme,
      layoutParam,
      resolvedStyle,
      hide
    );
    if (cached !== null) {
      return svgResponse(c, cached);
    }

    const colors = resolveTheme(resolvedStyle, resolvedTheme);
    const svg = renderCard(userData, { layout: layoutParam, colors, hide });
    await putCardCache(
      c.env.CARDS_KV,
      username,
      resolvedTheme,
      layoutParam,
      resolvedStyle,
      svg,
      hide
    );
    return svgResponse(c, svg);
  }

  // Curated theme path (new default + named curated themes)
  const cached = await getCardCacheV2(
    c.env.CARDS_KV,
    username,
    layoutParam,
    effectiveTheme,
    hide
  );
  if (cached !== null) {
    return svgResponse(c, cached);
  }

  const colors = resolveCuratedTheme(effectiveTheme)!; // always valid (defaulted above)
  const svg = renderCard(userData, { layout: layoutParam, colors, hide });
  await putCardCacheV2(
    c.env.CARDS_KV,
    username,
    layoutParam,
    effectiveTheme,
    svg,
    hide
  );
  return svgResponse(c, svg);
});
