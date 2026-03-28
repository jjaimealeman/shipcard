---
phase: 03-svg-card
plan: 01
subsystem: ui
tags: [svg, typescript, card-rendering, themes, layouts, xml-escaping]

# Dependency graph
requires:
  - phase: 01-parser-engine
    provides: AnalyticsResult type (input to renderCard())
  - phase: 02-mcp-cli
    provides: EngineOptions, runEngine() to produce AnalyticsResult at runtime
provides:
  - renderCard(result, options) public API in shipcard/src/card/index.ts
  - Three layouts: classic (single-column), compact (two-column grid), hero (big stat + details)
  - Three styles x two themes: github/branded/minimal each with dark/light variant
  - escapeXml() for all user-controlled string interpolation into SVG
  - abbreviateNumber(), formatCost(), truncate() formatters
  - ThemeColors interface and resolveTheme() registry
affects:
  - 03-02 (CLI card command wires renderCard() into shiplog card)
  - 04-worker (Cloudflare Worker uses renderCard() to serve remote cards)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inline SVG path icons (Lucide-style 24x24 stroke, no npm icon package)
    - ThemeColors interface with types.ts to avoid circular imports
    - Layout functions as pure (data, colors) => string — no class instances
    - CardData intermediate type separating AnalyticsResult from SVG concerns

key-files:
  created:
    - shipcard/src/card/xml.ts
    - shipcard/src/card/format.ts
    - shipcard/src/card/themes/types.ts
    - shipcard/src/card/themes/index.ts
    - shipcard/src/card/themes/github.ts
    - shipcard/src/card/themes/branded.ts
    - shipcard/src/card/themes/minimal.ts
    - shipcard/src/card/layouts/classic.ts
    - shipcard/src/card/layouts/compact.ts
    - shipcard/src/card/layouts/hero.ts
    - shipcard/src/card/renderer.ts
    - shipcard/src/card/index.ts
  modified: []

key-decisions:
  - "ThemeColors defined in themes/types.ts (not themes/index.ts) to prevent circular imports between registry and palette modules"
  - "Five stat icons defined as inline SVG path d strings in renderer.ts STAT_ICONS map — no npm icon dependency"
  - "CardData intermediate type defined in renderer.ts — clean separation between AnalyticsResult (engine concern) and SVG rendering (card concern)"
  - "Compact layout uses index parity (odd/even) not explicit column arrays for column assignment"
  - "Hero layout defaults to first stat in list (sessions) when heroKey not found"
  - "Classic height is dynamic (70px base + 30px per stat); compact and hero use fixed/formula heights"

patterns-established:
  - "Pure layout functions: (data: CardData, theme: ThemeColors) => string — no side effects, no class state"
  - "All user-controlled strings go through escapeXml() before SVG interpolation"
  - "SVG string built as string[] lines array joined at end — readable, no template literal hell"
  - "Icon rendered as nested <svg x y width height viewBox> with a single <path d/> child"
  - "Inline icon SVG uses fill=none + stroke for GitHub camo proxy compatibility"

# Metrics
duration: 5min
completed: 2026-03-26
---

# Phase 3 Plan 1: Card Rendering Engine Summary

**SVG card rendering engine with 3 layouts (classic/compact/hero) x 6 theme combinations (github/branded/minimal x dark/light), XML escaping, number formatters, and renderCard() public API transforming AnalyticsResult to embeddable SVG**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-26T00:28:19Z
- **Completed:** 2026-03-26T00:32:51Z
- **Tasks:** 2
- **Files created:** 12

## Accomplishments

- Complete theme system: ThemeColors interface, 3 styles x 2 variants = 6 palettes, resolveTheme() registry
- Three visually distinct SVG layouts: classic (single-column dynamic height), compact (two-column grid), hero (large stat + secondary row)
- renderCard() public API: transforms AnalyticsResult, applies hide filter, abbreviates numbers, formats cost, produces GitHub-compatible SVG
- All user-controlled strings XML-escaped (& first, no double-encoding risk)

## Task Commits

1. **Task 1: Utilities and theme system** - `8374281` (feat)
2. **Task 2: Layouts, renderer, and public card API** - `842ba05` (feat)

**Plan metadata:** (pending — docs commit)

## Files Created/Modified

- `shipcard/src/card/xml.ts` - escapeXml() with &-first replacement order
- `shipcard/src/card/format.ts` - abbreviateNumber(), formatCost(), truncate()
- `shipcard/src/card/themes/types.ts` - ThemeColors interface (isolated to prevent circular imports)
- `shipcard/src/card/themes/index.ts` - StyleName, ThemeName, resolveTheme() registry
- `shipcard/src/card/themes/github.ts` - GitHub dark/light palettes (matches GitHub UI colors)
- `shipcard/src/card/themes/branded.ts` - Branded dark/light palettes (violet/indigo dev-tool aesthetic)
- `shipcard/src/card/themes/minimal.ts` - Minimal dark/light palettes (near-monochrome typographic)
- `shipcard/src/card/layouts/classic.ts` - renderClassic(): single-column, dynamic height, right-aligned values
- `shipcard/src/card/layouts/compact.ts` - renderCompact(): two-column grid, stacked label+value cells
- `shipcard/src/card/layouts/hero.ts` - renderHero(): 36px hero stat + compact secondary row with divider
- `shipcard/src/card/renderer.ts` - CardData type, STAT_ICONS map, RenderOptions, renderSvg() dispatcher
- `shipcard/src/card/index.ts` - renderCard() public API, CardOptions type, stat building from AnalyticsResult

## Decisions Made

- **ThemeColors in types.ts:** Palette modules (github.ts, branded.ts, minimal.ts) need to import ThemeColors. Putting ThemeColors in index.ts would create a circular import (index.ts imports palettes, palettes import index.ts). Isolated to `themes/types.ts` — both sides import from there.
- **Inline SVG icons:** No npm icon package. Five stat icons defined as SVG path `d` strings in STAT_ICONS map in renderer.ts. Zero extra dependencies.
- **CardData intermediate type:** renderCard() transforms AnalyticsResult into CardData before passing to renderSvg(). Keeps the engine/card boundary clean — layouts never see AnalyticsResult directly.
- **Dynamic vs. fixed heights:** Classic uses dynamic height (70px + 30px per stat) to accommodate the hide option cleanly. Compact and hero use calculated heights.

## Deviations from Plan

None - plan executed exactly as written.

The only structural decision was extracting ThemeColors to `themes/types.ts` to prevent a circular import that would have occurred if the interface lived in `themes/index.ts`. This is a straightforward structural refinement, not a deviation.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `renderCard(result, options?)` is ready for Plan 03-02 to wire into `shiplog card --local` CLI command
- All six theme combinations verified working
- hide option works (removes stat from SVG entirely)
- All three layouts produce distinct SVG heights and structures
- No blockers for 03-02

---
*Phase: 03-svg-card*
*Completed: 2026-03-26*
