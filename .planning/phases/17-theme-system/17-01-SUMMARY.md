---
phase: 17-theme-system
plan: "01"
subsystem: ui
tags: [svg, themes, wcag, contrast, typescript, cloudflare-workers]

# Dependency graph
requires:
  - phase: 16-agent-agnostic-architecture
    provides: renamed worker directory (shipcard-worker), existing ThemeColors interface, resolveTheme() registry
provides:
  - 9 curated theme palettes as typed ThemeColors objects (catppuccin, dracula, tokyo-night, nord, gruvbox, solarized-dark, solarized-light, one-dark, monokai)
  - WCAG 2.1 contrast ratio calculator + BYOT validation (3:1 threshold)
  - resolveCuratedTheme() for named theme lookup
  - resolveThemeV2() for unified legacy + curated resolution
  - RenderOptions.colors for pre-resolved ThemeColors passthrough
  - CardOptions.colors for pre-resolved ThemeColors in renderCard()
affects:
  - 17-02 (card route upgrade - consumes resolveCuratedTheme, resolveThemeV2, validateByotContrast)
  - 17-03 (dashboard theme picker - consumes CURATED_THEME_NAMES and theme data)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Curated palette: flat Record<CuratedThemeName, ThemeColors> objects — type-safe, tree-shaken by wrangler"
    - "WCAG contrast: pure TS linearize -> relativeLuminance -> contrastRatio chain (no deps, ~20 lines)"
    - "Resolver layering: resolveThemeV2() delegates to either curated lookup or legacy resolveTheme() — backward compat guaranteed"
    - "Pre-resolved colors passthrough: RenderOptions.colors bypasses style+theme resolution in renderer"

key-files:
  created:
    - shipcard-worker/src/svg/themes/curated.ts
    - shipcard-worker/src/svg/themes/contrast.ts
  modified:
    - shipcard-worker/src/svg/themes/index.ts
    - shipcard-worker/src/svg/renderer.ts
    - shipcard-worker/src/svg/index.ts

key-decisions:
  - "MIN_RATIO = 3.0 (WCAG 1.4.11 for UI components, not 4.5:1 body text threshold)"
  - "resolveThemeV2() defaults to catppuccin for unknown/missing theme param (not legacy github-dark)"
  - "CURATED_THEME_NAMES uses Object.keys(CURATED_THEMES) to stay automatically in sync"
  - "Re-export all new types from both themes/index.ts and svg/index.ts for clean import boundaries"

patterns-established:
  - "Value derivation: value = title, footer = text in all curated palettes (BYOT 5-slot -> internal 7-field)"
  - "Backward compat: legacy dark/light theme names map through resolveTheme(style, theme) unchanged"
  - "Null return: resolveCuratedTheme(unknown) returns null, not throwing, for safe card route handling"

# Metrics
duration: 2min
completed: 2026-03-29
---

# Phase 17 Plan 01: Theme System Foundation Summary

**9 curated theme palettes (catppuccin through monokai) + WCAG 3:1 contrast validator + renderer ThemeColors passthrough — zero breaking changes to legacy style+theme system**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-29T01:30:25Z
- **Completed:** 2026-03-29T01:32:29Z
- **Tasks:** 2 of 2
- **Files modified:** 5 (2 created, 3 updated)

## Accomplishments

- Created `curated.ts` with all 9 named palettes as verified `ThemeColors` objects sourced from official theme specs
- Created `contrast.ts` with pure-TS WCAG 2.1 luminance formula and `validateByotContrast()` for BYOT field-level error reporting at 3:1 threshold
- Updated theme registry (`themes/index.ts`) with `resolveCuratedTheme()`, `resolveThemeV2()` (unified legacy + curated resolver), and re-exports of all new types
- Updated `renderer.ts` to accept `colors?: ThemeColors` in `RenderOptions`, bypassing legacy resolution when provided
- Updated `svg/index.ts` to propagate `colors` through `CardOptions` → `renderCard()` → `renderSvg()` and re-export all new public symbols

## Task Commits

Each task was committed atomically:

1. **Task 1: Create curated theme palettes and contrast validator** - `ab8c0d2` (feat)
2. **Task 2: Update theme registry and renderer for curated theme support** - `99c2c6b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `shipcard-worker/src/svg/themes/curated.ts` - 9 curated palettes as `Record<CuratedThemeName, ThemeColors>` + `CURATED_THEME_NAMES`
- `shipcard-worker/src/svg/themes/contrast.ts` - WCAG 2.1 `contrastRatio()`, `validateByotContrast()`, `isValidHex()`, `ByotColors`, `ContrastError`
- `shipcard-worker/src/svg/themes/index.ts` - Added `resolveCuratedTheme()`, `resolveThemeV2()`, re-exports for curated + contrast APIs
- `shipcard-worker/src/svg/renderer.ts` - `RenderOptions.colors?: ThemeColors` optional field; `renderSvg()` uses it when provided
- `shipcard-worker/src/svg/index.ts` - `CardOptions.colors?: ThemeColors`; `renderCard()` passes through; re-exports all new public symbols

## Decisions Made

- **MIN_RATIO = 3.0**: WCAG 1.4.11 (Non-text Contrast) applies to UI components and graphics, not body text. Using 4.5:1 would reject valid designer palettes (Solarized, Gruvbox).
- **resolveThemeV2() defaults to catppuccin**: New requests with no/unknown `?theme=` get the best visual default, not legacy github-dark. Old `?theme=dark` still routes to github-dark.
- **Null return from resolveCuratedTheme()**: Returns `null` for unknown names (not throws) so the card route can handle gracefully without try/catch.
- **Re-export at every boundary**: All new types re-exported from both `themes/index.ts` and `svg/index.ts` so Plan 02 (card route) has one clean import point.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — `tsc --noEmit` passed clean on first attempt for both tasks.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 02 (card route upgrade) can now import `resolveCuratedTheme`, `resolveThemeV2`, `validateByotContrast`, `isValidHex`, `ByotColors`, `ContrastError`, `CURATED_THEME_NAMES` from `../svg/index.js`
- Plan 03 (dashboard theme picker) can use `CURATED_THEME_NAMES` and `CURATED_THEMES` palette data for the swatch grid
- No blockers

---
*Phase: 17-theme-system*
*Completed: 2026-03-29*
