---
phase: 17-theme-system
verified: 2026-03-29T02:00:29Z
status: human_needed
score: 5/5 automated must-haves verified
human_verification:
  - test: "Visit /u/:username?theme=catppuccin and confirm the card renders in the catppuccin palette (dark background, blue-tinted text, blue icons)"
    expected: "Card uses #1e1e2e background, #cdd6f4 title text, #89b4fa icon color"
    why_human: "SVG rendering is visual — can't assert correct color application programmatically without running the Worker"
  - test: "Visit /u/:username?theme=dracula and /u/:username?theme=tokyo-night and /u/:username?theme=nord and /u/:username?theme=gruvbox and /u/:username?theme=monokai — confirm each renders in its own distinct palette"
    expected: "Each card has visually distinct colors matching the named theme's palette"
    why_human: "Visual color verification requires a browser"
  - test: "Open the dashboard at /u/:username/dashboard and scroll to the Theme Configurator section. Click different theme swatches — confirm the card preview image updates to show the selected theme."
    expected: "The preview <img> reloads with the new ?theme= param when a swatch is clicked"
    why_human: "Alpine.js reactivity and img src binding require a live browser to verify"
  - test: "With a free user, open the dashboard Theme Configurator and attempt to type in the BYOT hex fields"
    expected: "Fields are disabled and visually greyed out with a lock overlay showing 'Custom colors require PRO' and an 'Upgrade to PRO' button"
    why_human: "Lock overlay and disabled state require a browser to visually confirm"
  - test: "With a PRO user (set user:{username}:pro = '1' in KV directly), type valid hex values in the BYOT fields (e.g. bg=#1e1e2e, title=#cdd6f4, text=#a6adc8, icon=#89b4fa, border=#313244)"
    expected: "Preview updates to show the BYOT card. Embed code updates to include the hex params."
    why_human: "BYOT preview fetch + embed code generation require live browser + KV with PRO flag set"
  - test: "With a PRO user, type low-contrast BYOT values (e.g. bg=#000000, title=#111111) and observe the field-level error messages"
    expected: "Inline error appears beneath the title field reading something like 'Low contrast (1.x:1, min 3:1)' — preview does NOT update"
    why_human: "Client-side contrast validation display is visual and interactive"
  - test: "Hit /u/:username?bg=1e1e2e&title=cdd6f4&text=a6adc8&icon=89b4fa&border=313244 as a free user (no pro KV key)"
    expected: "Returns a 403 error SVG with text 'ShipCard PRO Required' and 'Upgrade at: shipcard.dev/upgrade'"
    why_human: "Requires a running Worker instance with KV bound"
  - test: "Hit /u/:username?bg=000000&title=111111&text=222222&icon=333333&border=444444 as a PRO user"
    expected: "Returns a 400 error SVG listing per-field contrast failures (title, text, icon, border all fail)"
    why_human: "Requires a running Worker + KV with PRO flag"
  - test: "In the dashboard, switch layout selector between Classic, Compact, Hero while a theme is selected — confirm the preview updates for each layout"
    expected: "Preview img src includes &layout=compact / &layout=hero; the fetched card changes shape"
    why_human: "Layout switching + live preview require browser interaction"
  - test: "Verify the embed code textarea shows correct markdown with the selected theme and layout, and the Copy button copies it to clipboard"
    expected: "Textarea shows '![ShipCard](https://shipcard.dev/u/{username}?theme=catppuccin&layout=classic)' and Copy sets clipboard"
    why_human: "Clipboard API and textarea content need browser"
---

# Phase 17: Theme System Verification Report

**Phase Goal:** Users can make their card their own by choosing from curated themes, and PRO users can supply custom colors — all visible in the dashboard configurator before embedding.
**Verified:** 2026-03-29T02:00:29Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `?theme=catppuccin` (and 8 other named themes) renders card in that theme's palette | VERIFIED | `resolveCuratedTheme()` in card.ts line 300 returns the curated palette; `renderCard()` passes `colors` through; all 3 layouts receive `ThemeColors` directly |
| 2 | Dashboard configurator shows live theme preview that updates on swatch selection | VERIFIED | Alpine.js `:src="buildPreviewUrl('__USERNAME__')"` binding in dashboard.ts line 1443 updates on `selectedTheme` change; `selectTheme()` method sets state |
| 3 | PRO user with BYOT hex params gets card rendered in those exact colors | VERIFIED | card.ts lines 209-226: hex validated, normalized, PRO-gated, contrast-validated, then `ThemeColors` constructed with `value=title` / `footer=text` derivation and passed to `renderCard()` |
| 4 | BYOT with insufficient contrast is rejected with descriptive error, not silently ignored | VERIFIED | `validateByotContrast()` in contrast.ts returns per-field `ContrastError[]`; card.ts lines 202-207 map `.message` to `renderErrorSvg()`; client-side dashboard also runs inline WCAG 3:1 check with field-level error display |
| 5 | Theme and BYOT color changes apply consistently across classic, compact, and hero layouts | VERIFIED | renderer.ts lines 104-114: single `colors` resolution shared across switch; all 3 layout functions accept `ThemeColors` directly; layout selector in dashboard wired to `selectedLayout` state which drives preview URL |

**Score:** 5/5 truths verified (automated checks)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shipcard-worker/src/svg/themes/curated.ts` | 9 curated palettes + CuratedThemeName + CURATED_THEME_NAMES | VERIFIED | 147 lines; exports `CURATED_THEMES` (Record with all 9 palettes), `CuratedThemeName` union type, `CURATED_THEME_NAMES` array; each palette has exactly 7 fields |
| `shipcard-worker/src/svg/themes/contrast.ts` | WCAG contrast calculator + BYOT validation | VERIFIED | 132 lines; exports `contrastRatio`, `validateByotContrast`, `isValidHex`, `ByotColors`, `ContrastError`; MIN_RATIO = 3.0; full WCAG luminance chain |
| `shipcard-worker/src/svg/themes/index.ts` | Updated registry with curated + legacy resolution | VERIFIED | Imports from curated.ts and contrast.ts; re-exports all new symbols; `resolveCuratedTheme()` and `resolveThemeV2()` added; `resolveTheme()` unchanged |
| `shipcard-worker/src/svg/renderer.ts` | RenderOptions.colors for pre-resolved ThemeColors | VERIFIED | `colors?: ThemeColors` field on RenderOptions (line 59); `renderSvg()` uses `options.colors ?? resolveTheme(...)` (line 104) |
| `shipcard-worker/src/svg/index.ts` | CardOptions.colors + re-exports of all new symbols | VERIFIED | `colors?: ThemeColors` on `CardOptions` (line 48); `renderCard()` passes it through; re-exports `CURATED_THEME_NAMES`, `resolveCuratedTheme`, `validateByotContrast`, `isValidHex`, `ByotColors`, `ContrastError` |
| `shipcard-worker/src/kv.ts` | isUserPro() + v2 cache key functions | VERIFIED | `isUserPro()` reads `user:{username}:pro` key; `cardKeyV2()`, `getCardCacheV2()`, `putCardCacheV2()` added; all existing functions preserved |
| `shipcard-worker/src/routes/card.ts` | Updated card route with curated, BYOT, legacy, error SVGs | VERIFIED | 311 lines; full rewrite implementing 4-step flow: parse params → BYOT mode (hex validate → PRO gate → contrast) → curated/legacy resolution → cache+render; `renderErrorSvg()` helper; BYOT skips cache |
| `shipcard-worker/src/routes/dashboard.ts` | Theme Configurator section with swatch grid, BYOT inputs, live preview, embed code | VERIFIED | 2977 lines; Theme Configurator at line 1241 with: 9-theme inline `THEMES` array, `selectedTheme` / `selectedLayout` state, `updateByot()` with client-side WCAG check, `buildPreviewUrl()` using `window.location.origin`, `buildEmbedCode()` with hardcoded shipcard.dev, copy button; `isUserPro` imported and `__IS_PRO__` injected server-side at line 2971-2975 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `curated.ts` | `themes/types.ts` | `ThemeColors` import | WIRED | `import type { ThemeColors } from "./types.js"` line 19 |
| `themes/index.ts` | `curated.ts` | `CURATED_THEMES` import | WIRED | `import { CURATED_THEMES, CURATED_THEME_NAMES, type CuratedThemeName } from "./curated.js"` lines 17-21 |
| `themes/index.ts` | `contrast.ts` | re-exports | WIRED | `export { contrastRatio, validateByotContrast, isValidHex, ... } from "./contrast.js"` lines 28-34 |
| `renderer.ts` | `themes/index.ts` | `ThemeColors` + `resolveTheme` | WIRED | `import type { StyleName, ThemeName, ThemeColors }` + `options.colors ?? resolveTheme(...)` line 104 |
| `svg/index.ts` | `renderer.ts` | `renderSvg()` call with `colors` | WIRED | `renderSvg(cardData, { layout, style, theme, colors, heroStat })` line 139 |
| `card.ts` | `svg/index.ts` | `CURATED_THEME_NAMES`, `resolveCuratedTheme`, `validateByotContrast`, `isValidHex` | WIRED | Imported at lines 29-33; all 4 functions used in route handler |
| `card.ts` | `kv.ts` | `isUserPro`, `getCardCacheV2`, `putCardCacheV2` | WIRED | Imported at lines 19-25; `isUserPro` called at line 191; v2 cache functions called at lines 289-308 |
| `dashboard.ts` | `kv.ts` | `isUserPro()` for PRO flag | WIRED | `import { isUserPro }` line 18; called at line 2971; injected into HTML at line 2975 |
| `dashboard.ts` | `card.ts` (runtime) | `buildPreviewUrl()` fetching `/u/:username` | WIRED | `window.location.origin + _buildCardPath(username)` builds URL to card endpoint; `<img :src>` triggers browser fetch |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| THEME-01: 8-10 curated themes selectable | VERIFIED | 9 themes: catppuccin, dracula, tokyo-night, nord, gruvbox, solarized-dark, solarized-light, one-dark, monokai |
| THEME-02: Theme via `?theme=catppuccin` URL param | VERIFIED | card.ts handles `CURATED_THEME_NAMES` check + `resolveCuratedTheme()` |
| THEME-03: Theme preview in dashboard configurator | VERIFIED | Swatch grid with `:src` binding; needs human visual confirmation |
| THEME-04: PRO user custom colors via bg/title/text/icon/border params | VERIFIED | Full BYOT flow in card.ts + dashboard BYOT fields |
| THEME-05: BYOT validated for WCAG 3:1 contrast | VERIFIED | `validateByotContrast()` server-side + inline client validation |
| THEME-06: Theme system across all 3 layouts | VERIFIED | `renderSvg()` resolves single `colors` object dispatched to classic/compact/hero |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `dashboard.ts` | 1277 | Client-side linearize uses `0.04045` threshold | Info | Differs from server-side `0.03928` in contrast.ts. Both are valid implementations (IEC vs older WCAG spec). Affects only colors extremely close to the 3:1 boundary — not a user-visible issue. |
| `dashboard.ts` | 1268 | `isValidHex()` in client requires `#` prefix | Info | Client validates `/^#[0-9a-fA-F]{6}$/` while server-side `isValidHex()` accepts with or without `#`. Client then strips `#` before URL-encoding. No behavioral mismatch — client always normalizes. |

No blocker or warning anti-patterns found. Zero TODO/FIXME/placeholder comments in the 5 new/modified files. TypeScript compiles clean (`tsc --noEmit` exits 0).

### Human Verification Required

The automated structural checks pass fully. The 10 items below require a running Worker + browser to confirm the visual and interactive layer.

#### 1. Named themes render correct palettes

**Test:** Visit `/u/:username?theme=catppuccin`, `/u/:username?theme=dracula`, and at least 3 other named themes
**Expected:** Each card visually matches the named theme's color palette
**Why human:** SVG color rendering is visual; cannot assert pixel-level correctness programmatically

#### 2. Dashboard swatch grid updates live preview

**Test:** Open `/u/:username/dashboard`, scroll to Theme Configurator, click different theme swatches
**Expected:** The card preview image updates immediately to show the selected theme's colors
**Why human:** Alpine.js `:src` reactivity + browser img re-fetch

#### 3. Free user BYOT lock state

**Test:** Open dashboard as a free user, inspect BYOT section
**Expected:** Fields are greyed out (opacity 0.35), disabled, with lock overlay showing upgrade CTA
**Why human:** Visual lock state + Alpine.js `x-show` / `disabled` attribute rendering

#### 4. PRO user BYOT live preview

**Test:** Set `user:{username}:pro = "1"` in KV; open dashboard; type valid hex colors in all 5 BYOT fields
**Expected:** Preview updates to show the custom-colored card; embed code updates with hex params
**Why human:** Requires KV with PRO flag + browser + live card Worker

#### 5. BYOT client-side contrast error display

**Test:** As PRO user, type bg=#000000, title=#111111 (near-identical colors)
**Expected:** Inline error appears beneath the title field before preview updates
**Why human:** Client-side validation + DOM error display

#### 6. Server-side BYOT PRO gate (403 error SVG)

**Test:** Hit `/u/:username?bg=1e1e2e&title=cdd6f4&text=a6adc8&icon=89b4fa&border=313244` without PRO flag in KV
**Expected:** Response is a 403 SVG card with "ShipCard PRO Required" and upgrade URL
**Why human:** Requires running Worker + KV

#### 7. Server-side BYOT contrast rejection (400 error SVG)

**Test:** Hit `/u/:username?bg=000000&title=111111&text=222222&icon=333333&border=444444` as PRO user
**Expected:** 400 SVG with per-field contrast error messages
**Why human:** Requires running Worker + KV with PRO flag

#### 8. Layout selector updates preview

**Test:** In dashboard, switch between Classic/Compact/Hero while a theme is selected
**Expected:** Preview image reflects the selected layout
**Why human:** Alpine.js state change + img src rebuild require browser

#### 9. Embed code generation and copy

**Test:** Select a theme, change layout, click Copy button
**Expected:** Clipboard contains `![ShipCard](https://shipcard.dev/u/{username}?theme={theme}&layout={layout})`
**Why human:** Clipboard API requires browser

#### 10. Legacy backward compatibility

**Test:** Visit `/u/:username?theme=dark` and `/u/:username?style=branded&theme=light`
**Expected:** Card renders in the legacy github-dark and branded-light palettes respectively (no regression)
**Why human:** Visual palette comparison + requires running Worker

### Summary

All 5 automated must-haves are verified: the curated theme palettes exist and are correctly wired, the contrast validator implements WCAG 3:1 accurately, the card route handles curated/BYOT/legacy modes correctly with proper PRO gating and error SVGs, BYOT skips cache, and the dashboard configurator has a fully wired Alpine.js component with swatch grid, BYOT inputs (PRO-gated server-side), live preview via `window.location.origin`, and copyable embed code.

The phase goal is structurally complete. Human verification is required to confirm the visual layer (theme palette rendering, dashboard interactivity, error SVG appearance, BYOT live preview flow).

One implementation note: the ROADMAP success criteria listed `solarized` as a single theme name, but the implementation delivers two (`solarized-dark` and `solarized-light`), bringing the total to 9 curated themes. This matches the RESEARCH spec and PLAN frontmatter, which explicitly specified both variants. The ROADMAP was using shorthand.

---
_Verified: 2026-03-29T02:00:29Z_
_Verifier: Claude (gsd-verifier)_
