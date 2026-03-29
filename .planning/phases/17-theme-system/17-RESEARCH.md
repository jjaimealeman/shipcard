# Phase 17: Theme System - Research

**Researched:** 2026-03-28
**Domain:** SVG card theming, WCAG contrast validation, dashboard configurator UX, PRO gating
**Confidence:** HIGH

## Summary

Phase 17 layers a named-theme system over the existing SVG card infrastructure and adds BYOT (Bring Your Own Theme) for PRO users. The Worker already has a working theme registry (`svg/themes/`) with `ThemeColors` (7 fields) and `resolveTheme()`. The new system replaces the current `style`+`theme` two-axis model with a single `?theme=catppuccin` URL param, adds 9 curated palettes as flat TypeScript objects, and extends the card route to accept 5 BYOT hex params for PRO users.

WCAG contrast validation requires only ~15 lines of pure TypeScript implementing the WCAG 2.1 relative luminance formula. No external library is needed. The 3:1 ratio (not 4.5:1) applies because the requirement is for UI components and graphical objects, not body text — this is WCAG 1.4.11, not 1.4.3.

The dashboard configurator currently lives in `configure.ts` as a static HTML page. The new theme section goes into the **dashboard** route (`/u/:username/dashboard`), not the configurator, per the CONTEXT decision for a "dedicated section on the dashboard page."

**Primary recommendation:** Extend `ThemeColors` interface to add a `value` and `footer` derivation rule, keep the 5 BYOT input slots user-facing, and derive `value` from `title` and `footer` from `text` when constructing the full internal palette. This avoids breaking existing layouts while honoring the CONTEXT's 5-slot user model.

## Standard Stack

### Core

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| TypeScript (existing) | project's tsconfig | Palette definitions, contrast checker | Already in use; zero dep addition |
| Hono (existing) | project's package.json | Route parsing for new `?theme=` param | Already used for all routes |
| Cloudflare KV (existing) | runtime | Cache invalidation for new theme variants | Already used for card cache |

### Supporting

| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| WCAG 2.1 contrast formula | standard | Pure TS contrast ratio calculator | Inline in `svg/themes/contrast.ts` |
| No external color library | — | Color parsing + contrast | Hand-roll is 15 lines; dependencies add 0 value |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled contrast checker | `color-contrast-checker` npm package | Package is 2KB, adds a dep; pure formula is ~15 lines, zero risk |
| Inline theme objects | JSON config files | TS objects are type-safe, tree-shaken by wrangler |
| `?style=github&theme=dark` two-axis | Single `?theme=catppuccin` | New model is simpler for users; old model stays for backward compat |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure

```
shipcard-worker/src/svg/themes/
├── types.ts          # ThemeColors interface (extend, don't break)
├── index.ts          # registry: resolveTheme() + new resolveCuratedTheme()
├── contrast.ts       # NEW: WCAG contrast ratio checker (pure TS, ~20 lines)
├── curated.ts        # NEW: all 9 named palettes as ThemeColors objects
├── github.ts         # existing (keep for backward compat)
├── branded.ts        # existing
└── minimal.ts        # existing
```

### Pattern 1: ThemeColors Interface Extension

**What:** The existing interface has 7 fields. CONTEXT specifies 5 BYOT user slots. Reconcile by deriving `value` from `title` (stat numbers use title color) and `footer` from `text` (footer is secondary text).

**When to use:** When constructing a ThemeColors from BYOT inputs.

```typescript
// src/svg/themes/types.ts — existing interface, no breaking change needed
export interface ThemeColors {
  bg: string;
  border: string;
  title: string;
  text: string;
  value: string;   // stat numbers — set equal to title in curated themes
  icon: string;
  footer: string;  // footer text — set equal to text in curated themes
}

// How curated themes handle it: value === title, footer === text (or close)
// How BYOT handles it: value = title input, footer = text input
// This means the 5 BYOT fields map to all 7 internal fields with 2 derivations:
//   value = title (same color for stat numbers as heading)
//   footer = text (same muted color as label text)
```

### Pattern 2: Curated Theme Registry

**What:** 9 named palettes registered in a flat map.

```typescript
// src/svg/themes/curated.ts
import type { ThemeColors } from "./types.js";

export type CuratedThemeName =
  | "catppuccin" | "dracula" | "tokyo-night" | "nord"
  | "gruvbox" | "solarized-dark" | "solarized-light"
  | "one-dark" | "monokai";

export const CURATED_THEMES: Record<CuratedThemeName, ThemeColors> = {
  catppuccin: {
    bg: "#1e1e2e",
    border: "#313244",
    title: "#cdd6f4",
    text: "#a6adc8",
    value: "#cdd6f4",
    icon: "#89b4fa",
    footer: "#a6adc8",
  },
  // ... 8 more
};

export const CURATED_THEME_NAMES = Object.keys(CURATED_THEMES) as CuratedThemeName[];
export const DEFAULT_CURATED_THEME: CuratedThemeName = "catppuccin"; // or keep old behavior
```

### Pattern 3: URL Param Routing (card route change)

**What:** The card route currently reads `?style=` and `?theme=dark|light`. New routing accepts `?theme=catppuccin` (named) or `?bg=...&title=...` (BYOT). The new `?theme=` param namespace collides with the old `dark/light` usage.

**Decision needed (Claude's Discretion):** Old URL `?theme=dark` should either:
- Map to the existing `github` dark palette (backward compat)
- Or be deprecated in favor of `?theme=github-dark`

**Recommendation:** Treat `dark` and `light` as aliases for `github-dark` and `github-light` during a transition, but the new named themes are the primary model going forward. The old `?style=` param can be retired or kept as an alias.

```typescript
// card.ts — new param parsing logic
const themeParam = c.req.query("theme") ?? "catppuccin";
const bgParam = c.req.query("bg");
// If BYOT params present AND user is PRO → byot mode
// If named theme → curated lookup
// If "dark"/"light" legacy → map to github dark/light
```

### Pattern 4: WCAG Contrast Checker

**What:** Pure TypeScript function. WCAG 2.1 formula. No dependencies.

```typescript
// src/svg/themes/contrast.ts

/**
 * Calculate relative luminance of a hex color (WCAG 2.1 formula).
 * Source: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const linearize = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Calculate WCAG contrast ratio between two hex colors.
 * Returns a value between 1 (no contrast) and 21 (max contrast).
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validate a set of BYOT colors for WCAG 3:1 minimum contrast.
 * Returns an array of field-level error messages (empty = pass).
 *
 * WCAG 1.4.11 (Non-text Contrast) requires 3:1 for UI components.
 * This is appropriate for an SVG card (not body text).
 */
export function validateByotContrast(colors: {
  bg: string; title: string; text: string; icon: string; border: string;
}): Array<{ field: string; message: string }> {
  const MIN_RATIO = 3.0;
  const errors: Array<{ field: string; message: string }> = [];
  const pairs: Array<[string, string, string]> = [
    ["title", colors.title, colors.bg],
    ["text", colors.text, colors.bg],
    ["icon", colors.icon, colors.bg],
    ["border", colors.border, colors.bg],
  ];
  for (const [field, fg, bg] of pairs) {
    const ratio = contrastRatio(fg, bg);
    if (ratio < MIN_RATIO) {
      errors.push({
        field,
        message: `${field} has insufficient contrast against background (${ratio.toFixed(2)}:1, minimum 3:1)`,
      });
    }
  }
  return errors;
}
```

### Pattern 5: PRO Gate for BYOT (before Phase 18 Stripe)

**What:** Phase 18 adds real Stripe-backed PRO checks. Phase 17 needs a gate NOW but Stripe doesn't exist yet.

**Recommendation:** Add a `user:{username}:pro` KV key set to `"1"` for PRO users. This is the same KV key Phase 18's Stripe webhook will write. Phase 17 reads it; Phase 18 writes it. Zero migration cost.

```typescript
// kv.ts — add:
export async function isUserPro(kv: KVNamespace, username: string): Promise<boolean> {
  const val = await kv.get(`user:${username}:pro`);
  return val === "1";
}
```

For the dashboard configurator UI: PRO status comes from the session/auth context already present in the dashboard (the dashboard knows the logged-in user). The BYOT section UI disables fields if `isPro === false`.

### Pattern 6: Cache Key Expansion

**What:** The existing cache key includes `style` and `theme`. New keys must include the named theme or BYOT fingerprint.

**Current key:** `card:{username}:{theme}:{layout}:{style}`

**New key (curated):** `card:{username}:{layout}:t={catppuccin}` — drop `style` (deprecated), use `t=` prefix for named themes to disambiguate from old `dark/light` values.

**New key (BYOT):** `card:{username}:{layout}:byot={md5hash}` — hash the 5 color params for a stable cache key. Use a short deterministic hash (e.g., first 8 chars of hex digest).

**Recommendation:** Keep backward compat by not invalidating old `style+theme` keys — they'll just become orphan cache entries that expire when the user next syncs. New theme system writes new key patterns.

```typescript
// Cache key for curated theme
function cardKeyV2(username: string, layout: string, theme: string): string {
  return `card:${username}:${layout}:t=${theme}`;
}

// Cache key for BYOT (hash the 5 colors)
function cardKeyByot(username: string, layout: string, colors: ByotColors): string {
  const fingerprint = simpleHash(`${colors.bg}${colors.title}${colors.text}${colors.icon}${colors.border}`);
  return `card:${username}:${layout}:byot=${fingerprint}`;
}
```

### Anti-Patterns to Avoid

- **Don't add `?theme=` as an alias for `?style=`**: These are different axes. `?theme=` is the new single-axis system. Keep `?style=` working for backward compat but don't conflate the two in new code.
- **Don't put BYOT validation only in the dashboard**: Validate at the card endpoint too. Anyone can construct a BYOT URL directly without using the dashboard.
- **Don't cache BYOT cards without a max-variants guard**: A bad actor could flood KV with millions of BYOT color combinations. Cap BYOT caching or skip caching BYOT cards entirely (render on every request).
- **Don't make the dashboard fetch PRO status on every card preview request**: Read PRO status once when the dashboard page loads, not on each preview fetch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hex color parsing | Custom regex parser | `parseInt(hex.slice(1,3), 16)` built-in | Already standard; no need for library |
| Contrast checking | External `color-contrast-checker` pkg | 15-line pure TS function | Zero dep addition; WCAG formula is stable and simple |
| Theme name validation | Enum switch with fallthrough | `new Set(CURATED_THEME_NAMES).has(name)` | Simple, O(1), self-documenting |
| BYOT color hashing | MD5/SHA256 library | Simple djb2 or sum-of-char-codes | Cache key only needs collision-resistance, not crypto security |

**Key insight:** The theme system is data-heavy (9 palettes × 7 fields) but algorithmically simple. All complexity lives in the validation and routing layers, not in color transformation.

## Common Pitfalls

### Pitfall 1: ThemeColors Interface Mismatch (5 BYOT slots vs 7 internal)
**What goes wrong:** CONTEXT specifies 5 BYOT slots but the existing `ThemeColors` has 7 fields. If the planner treats this as a "replace the interface" task, it will break all 3 existing layouts.
**Why it happens:** The CONTEXT was written thinking about user-facing inputs, not internal data structure.
**How to avoid:** Keep `ThemeColors` at 7 fields. Map BYOT 5→7 by deriving `value = title` and `footer = text`. Document this mapping explicitly in the contrast validator.
**Warning signs:** Any task that removes `value` or `footer` from `ThemeColors` is wrong.

### Pitfall 2: Cache Key Explosion with BYOT
**What goes wrong:** Every unique combination of 5 hex colors creates a new KV entry. 16^30 possible combinations × unlimited users = KV namespace exhaustion.
**Why it happens:** BYOT is infinite-cardinality input.
**How to avoid:** Option A: Don't cache BYOT renders at all (they're already ~1ms to generate). Option B: Cap cache per user (max 10 BYOT variants, evict LRU). **Recommended: skip BYOT caching for Phase 17.** BYOT cards are rare/personal use.
**Warning signs:** KV write in the card handler without a BYOT guard check.

### Pitfall 3: Old `?style=` + `?theme=dark/light` Params Break
**What goes wrong:** Existing embed codes in users' READMEs use `?style=github&theme=dark`. If the card route is rewritten to only accept named themes, these URLs break.
**Why it happens:** The new `?theme=catppuccin` namespace overlaps with old `?theme=dark`.
**How to avoid:** In the card route, check if `theme` value is in `CURATED_THEME_NAMES`. If not, fall back to legacy style+theme resolution. `dark` and `light` → `github` dark/light as backward compat.
**Warning signs:** Removing the legacy `resolveTheme(style, theme)` call path before Phase 17 launch.

### Pitfall 4: WCAG Ratio Wrong (3:1 vs 4.5:1)
**What goes wrong:** Using 4.5:1 (text contrast minimum) instead of the specified 3:1 rejects valid designer palettes. Gruvbox and Solarized in particular have some combinations that pass 3:1 but not 4.5:1.
**Why it happens:** WCAG 4.5:1 is the more-cited requirement; developers default to it.
**How to avoid:** WCAG 1.4.11 (Non-text Contrast) specifies 3:1 for UI components and graphics. The card is a graphic, not a document. Use 3:1. The CONTEXT also explicitly says 3:1.
**Warning signs:** `MIN_RATIO = 4.5` in the contrast validator.

### Pitfall 5: Dashboard Configurator vs Dashboard Page
**What goes wrong:** Phase 17 adds theme controls to the wrong page. The `/configure` page and the `/u/:username/dashboard` page are separate routes. CONTEXT says "dedicated section on the dashboard page."
**Why it happens:** The `/configure` route already has theme-like controls (dark/light/style toggles).
**How to avoid:** Add the new theme section to `dashboard.ts`, NOT `configure.ts`. The configure page (`/configure`) is a legacy/CLI-facing page. The dashboard (`/u/:username/dashboard`) is the authenticated user's home.
**Warning signs:** Any task that modifies `configure.ts` for the new theme picker.

### Pitfall 6: BYOT Dashboard Fields Active for Free Users
**What goes wrong:** Free users can inspect the DOM and manually un-grey the BYOT fields, then submit BYOT params to the card endpoint.
**Why it happens:** The PRO gate is only enforced in the dashboard UI, not the Worker.
**How to avoid:** The BYOT validation MUST run server-side in the card route handler. Even if a free user constructs `?bg=1e1e2e&title=cdd6f4...`, the Worker must check PRO status and reject with a `403 + SVG error card` if not PRO.
**Warning signs:** PRO check only in dashboard JS, not in the card route handler.

## Code Examples

### Complete WCAG 3:1 Contrast Validator

```typescript
// src/svg/themes/contrast.ts
// Source: WCAG 2.1 spec https://www.w3.org/TR/WCAG21/#dfn-relative-luminance

function linearize(v: number): number {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export type ByotColors = {
  bg: string; title: string; text: string; icon: string; border: string;
};

export type ContrastError = { field: string; message: string };

export function validateByotContrast(colors: ByotColors): ContrastError[] {
  const MIN = 3.0;
  const errors: ContrastError[] = [];
  for (const [field, fg] of [
    ["title", colors.title],
    ["text", colors.text],
    ["icon", colors.icon],
    ["border", colors.border],
  ] as const) {
    const ratio = contrastRatio(fg, colors.bg);
    if (ratio < MIN) {
      errors.push({
        field,
        message: `${field} has insufficient contrast against background (${ratio.toFixed(2)}:1, minimum 3:1)`,
      });
    }
  }
  return errors;
}
```

### Complete 9-Theme Palette Reference

All palettes researched from official theme sources:

```typescript
// src/svg/themes/curated.ts — verified hex values

catppuccin: {  // Catppuccin Mocha (dark)
  bg: "#1e1e2e",    // Base
  border: "#313244", // Surface0
  title: "#cdd6f4",  // Text
  text: "#a6adc8",   // Subtext0
  value: "#cdd6f4",  // Text (same as title)
  icon: "#89b4fa",   // Blue
  footer: "#a6adc8", // Subtext0 (same as text)
},

dracula: {  // Official Dracula (https://draculatheme.com)
  bg: "#282a36",    // Background
  border: "#44475a", // Selection
  title: "#f8f8f2",  // Foreground
  text: "#6272a4",   // Comment
  value: "#f8f8f2",  // Foreground
  icon: "#bd93f9",   // Purple
  footer: "#6272a4", // Comment
},

"tokyo-night": {  // Tokyo Night VSCode theme
  bg: "#1a1b26",    // editor.background
  border: "#29355a", // hover/focus border
  title: "#a9b1d6",  // foreground
  text: "#787c99",   // muted text
  value: "#a9b1d6",  // foreground
  icon: "#7aa2f7",   // primary blue
  footer: "#787c99", // muted text
},

nord: {  // Nord official (https://nordtheme.com)
  bg: "#2e3440",    // nord0 Polar Night
  border: "#3b4252", // nord1 Polar Night
  title: "#eceff4",  // nord6 Snow Storm
  text: "#d8dee9",   // nord4 Snow Storm
  value: "#eceff4",  // nord6
  icon: "#88c0d0",   // nord8 Frost
  footer: "#d8dee9", // nord4
},

gruvbox: {  // Gruvbox Dark Medium (morhetz/gruvbox)
  bg: "#282828",    // dark0
  border: "#3c3836", // dark1
  title: "#ebdbb2",  // light1
  text: "#a89984",   // light4
  value: "#ebdbb2",  // light1
  icon: "#83a598",   // blue (bright)
  footer: "#a89984", // light4
},

"solarized-dark": {  // Solarized Dark (ethanschoonover.com/solarized)
  bg: "#002b36",    // base03
  border: "#073642", // base02
  title: "#839496",  // base0
  text: "#657b83",   // base00
  value: "#839496",  // base0
  icon: "#268bd2",   // blue
  footer: "#657b83", // base00
},

"solarized-light": {  // Solarized Light
  bg: "#fdf6e3",    // base3
  border: "#eee8d5", // base2
  title: "#073642",  // base02 (darkest for contrast)
  text: "#657b83",   // base00
  value: "#073642",  // base02
  icon: "#268bd2",   // blue
  footer: "#657b83", // base00
},

"one-dark": {  // Atom One Dark / OneDark-Pro
  bg: "#282c34",    // editor background
  border: "#3e4452", // line highlight / separator
  title: "#abb2bf",  // foreground
  text: "#5c6370",   // comment / muted
  value: "#abb2bf",  // foreground
  icon: "#61afef",   // blue
  footer: "#5c6370", // comment
},

monokai: {  // Monokai Classic (Sublime Text original)
  bg: "#272822",    // editor.background
  border: "#3e3d32", // editor.lineHighlight
  title: "#f8f8f2",  // editor.foreground
  text: "#90908a",   // line number muted
  value: "#f8f8f2",  // editor.foreground
  icon: "#a6e22e",   // green (syntax keyword)
  footer: "#90908a", // muted
},
```

### PRO KV Gate

```typescript
// kv.ts — add to existing module
export async function isUserPro(kv: KVNamespace, username: string): Promise<boolean> {
  const val = await kv.get(`user:${username}:pro`);
  return val === "1";
}

// card.ts — BYOT guard in the route handler
const hasByot = bgParam || titleParam || textParam || iconParam || borderParam;
if (hasByot) {
  const isPro = await isUserPro(c.env.USER_DATA_KV, username);
  if (!isPro) {
    // Render error SVG: "BYOT requires PRO — shipcard.dev/upgrade"
    return svgResponse(c, renderByotProError(username));
  }
  // validate contrast, render BYOT card
}
```

### Dashboard Theme Picker (Claude's Discretion: Swatch Grid)

Based on the 9 themes having distinct visual personalities, a swatch grid (3×3) beats a dropdown for discoverability. Each swatch shows the theme's bg color as background, title color as a sample text line, and icon color as a small dot accent.

```html
<!-- Theme swatch grid in dashboard HTML -->
<div class="theme-swatches" x-data="themeState">
  <template x-for="theme in THEMES">
    <button
      class="theme-swatch"
      :class="{ active: selectedTheme === theme.name }"
      :style="`background: ${theme.bg}; border-color: ${theme.border}`"
      @click="selectTheme(theme.name)"
    >
      <span :style="`color: ${theme.title}`">Aa</span>
      <span class="swatch-dot" :style="`background: ${theme.icon}`"></span>
    </button>
  </template>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `?style=github&theme=dark` two-axis | `?theme=catppuccin` single named param | Phase 17 | Simpler URLs, richer palette variety |
| 3 styles × 2 variants = 6 options | 9 curated + unlimited BYOT | Phase 17 | Developer-grade theming |
| No contrast enforcement | WCAG 3:1 hard block on BYOT | Phase 17 | Prevents unreadable cards |

**Deprecated/outdated:**
- `?style=` param: Still works for backward compat but is the "legacy" path. New embed codes should use `?theme=`.
- `github`, `branded`, `minimal` style names: Preserved as legacy but no new themes are added to this axis.

## Open Questions

1. **Default theme behavior**
   - What we know: The current default renders with `githubDark`. The CONTEXT leaves this as Claude's Discretion.
   - What's unclear: Should `?theme=` (no value / invalid value) silently fall back to Catppuccin or to the legacy GitHub dark?
   - Recommendation: Fall back to `catppuccin` for new requests with no `?theme=`, keep `?theme=dark` as alias for legacy GitHub dark. This gives new users the "best" default while not breaking existing embeds.

2. **BYOT caching strategy**
   - What we know: KV is bounded. BYOT has infinite color combinations.
   - What's unclear: The CONTEXT doesn't specify whether BYOT renders are cached.
   - Recommendation: Skip KV caching for BYOT renders in Phase 17. The render is ~1-2ms. Cache can be added in Phase 18 if perf data shows it matters.

3. **Dashboard theme section location**
   - What we know: CONTEXT says "dedicated section on the dashboard page." The dashboard (`/u/:username/dashboard`) is a large Alpine.js page.
   - What's unclear: Where in the dashboard layout does the theme section live (above charts? below configurator?)?
   - Recommendation: Place it between the stat summary row and the activity chart section — it's a card configuration concern, above data-heavy sections.

4. **One Dark `?theme=one-dark` vs `one_dark`**
   - What we know: URL params can't contain spaces; hyphens are URL-safe.
   - What's unclear: Kebab-case or underscore for multi-word theme names?
   - Recommendation: Use kebab-case consistently: `tokyo-night`, `one-dark`, `solarized-dark`, `solarized-light`. This matches how these themes are conventionally referenced.

## Sources

### Primary (HIGH confidence)
- Official Catppuccin GitHub (https://github.com/catppuccin/catppuccin) — Mocha hex values
- Official Dracula spec (https://draculatheme.com/contribute) — all named colors
- Official Nord docs (https://nordtheme.com/docs/colors-and-palettes) — all 16 colors
- Tokyo Night VSCode theme raw JSON (https://raw.githubusercontent.com/tokyo-night/tokyo-night-vscode-theme/master/themes/tokyo-night-color-theme.json) — bg/fg/accent
- Monokai Pro VSCode config (https://gist.github.com/brayevalerien/cb94ac685ebc186f359deae113b6710c) — bg `#272822`, fg `#f8f8f2`
- Gruvbox DeepWiki (https://deepwiki.com/morhetz/gruvbox/3.1-color-palette) — dark0 `#282828`, accent colors
- Solarized official (https://ethanschoonover.com/solarized/) — all base+accent hex values
- W3C WCAG 2.1 spec — relative luminance formula, contrast ratio formula
- W3C WCAG 2.1 SC 1.4.11 (https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html) — 3:1 applies to UI components

### Secondary (MEDIUM confidence)
- Existing ShipCard Worker codebase — `ThemeColors` interface, `resolveTheme()`, card route, kv.ts
- One Dark colors from OneDark-Pro GitHub/marketplace — bg `#282c34`, fg `#abb2bf`, blue `#61afef`

### Tertiary (LOW confidence)
- Gruvbox blue `#83a598` as icon color — community-consistent but "blue" accent choice is Claude's judgment, not official requirement

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing TypeScript/Hono/KV
- Architecture: HIGH — extends existing `ThemeColors` cleanly; contrast formula is WCAG-specified
- Theme hex values: HIGH for 7/9 themes (official sources verified); MEDIUM for One Dark and Gruvbox icon choice
- Pitfalls: HIGH — all identified from direct codebase inspection of existing types/routes

**Research date:** 2026-03-28
**Valid until:** 2026-09-28 (stable; theme palettes and WCAG formula don't change)
