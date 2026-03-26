---
phase: 03-svg-card
plan: 02
subsystem: cli
tags: [typescript, node, cli, svg, git, cross-platform, parseArgs]

# Dependency graph
requires:
  - phase: 03-01
    provides: renderCard() public API and CardOptions type from card/index.ts
  - phase: 02-01
    provides: parseCliArgs() with parseArgs foundation and ParsedCliArgs type
provides:
  - findGitRoot() in card/git.ts via spawnSync — safe git repo root detection
  - openInBrowser() in card/preview.ts — cross-platform fire-and-forget browser preview
  - parseCliArgs() extended with 7 new card flags (layout, style, theme, hide, hero-stat, preview, output)
  - runCard() upgraded to generate SVG via renderCard() when --local, write file, print markdown snippet
  - Updated help text with Card flags section and examples
affects: [04-worker, 05-publish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Flag-to-options mapping: CLI string flags cast to typed union types (LayoutName, StyleName, ThemeName) at call site
    - Fire-and-forget spawn: detached: true + stdio: ignore + unref() for browser opener
    - spawnSync with array args: no shell interpolation, status === 0 check, stdout.trim()
    - kebab-to-camelCase flag mapping: parseArgs "hero-stat" key mapped to heroStat in returned object

key-files:
  created:
    - shiplog/src/card/git.ts
    - shiplog/src/card/preview.ts
  modified:
    - shiplog/src/cli/args.ts
    - shiplog/src/cli/commands/card.ts
    - shiplog/src/cli/index.ts

key-decisions:
  - "Cast CLI string flags to LayoutName/StyleName/ThemeName at renderCard() call site — no runtime validation, invalid values fall through to renderer defaults"
  - "Markdown snippet uses basename of custom output path for portability"
  - "Import LayoutName, StyleName, ThemeName from card/index.ts (re-exported there) — avoids deep internal imports in cli/"

patterns-established:
  - "Card command mode dispatch: --json → JSON, --local → SVG file, default → JSON with hint"
  - "Output path: flags.output ?? join(findGitRoot(), 'shiplog-card.svg') — explicit override wins"
  - "openInBrowser is always fire-and-forget — CLI exits without waiting for browser"

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 3 Plan 02: CLI Integration Summary

**`shiplog card --local` wired to renderCard() with git-root default path, cross-platform browser preview, 7 new CLI flags, and updated help text with card examples**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T00:35:48Z
- **Completed:** 2026-03-26T00:39:39Z
- **Tasks:** 2
- **Files modified:** 5 (3 modified, 2 created)

## Accomplishments

- `findGitRoot()` uses spawnSync array args (no shell injection) with cwd fallback for repos and standalone directories
- `openInBrowser()` dispatches on `process.platform` to `open` / `cmd /c start` / `xdg-open`, always detached + unref'd
- `parseCliArgs()` extended with layout, style, theme, hide (multiple: true), hero-stat→heroStat, preview, output/-o
- `runCard()` generates SVG via `renderCard()` when --local, writes to git root or custom path, prints confirmation + dated markdown snippet
- Help text upgraded with Card flags section documenting all 7 new flags and 3 card examples

## Task Commits

Each task was committed atomically:

1. **Task 1: Git root detection, browser preview, and CLI flag registration** - `f016520` (feat)
2. **Task 2: Card command upgrade and help text update** - `933bfcf` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `shiplog/src/card/git.ts` - findGitRoot() via spawnSync with cwd fallback
- `shiplog/src/card/preview.ts` - openInBrowser() cross-platform darwin/win32/linux, fire-and-forget
- `shiplog/src/cli/args.ts` - ParsedCliArgs.flags extended with 7 new card flags, heroStat mapped from hero-stat
- `shiplog/src/cli/commands/card.ts` - Upgraded runCard() with SVG generation path, --json backward compat, --preview
- `shiplog/src/cli/index.ts` - Card command description updated, Card flags section + examples added

## Decisions Made

- Cast CLI string flags to `LayoutName | undefined`, `StyleName | undefined`, `ThemeName | undefined` at the `renderCard()` call site using `as` — no runtime validation layer added; invalid user values fall through to the renderer's default handling.
- Markdown snippet basename: when `--output /path/to/custom.svg` is set, use `custom.svg` (not `./shiplog-card.svg`) in the embed snippet for portability.
- Import `LayoutName`, `StyleName`, `ThemeName` from `../../card/index.js` (they're re-exported there) rather than reaching into internal modules — keeps cli/ imports clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type error in card.ts Parameters utility**

- **Found during:** Task 2 (card command upgrade)
- **Issue:** Used `Parameters<typeof renderCard>[1]["layout"]` to derive the cast type, but TypeScript resolved the second parameter as `CardOptions | undefined` (due to default parameter) and couldn't index into it.
- **Fix:** Added `import type { LayoutName, StyleName, ThemeName } from "../../card/index.js"` and cast directly to `LayoutName | undefined` etc.
- **Files modified:** shiplog/src/cli/commands/card.ts
- **Verification:** `npx tsc --noEmit` passed with zero errors
- **Committed in:** `933bfcf` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 type bug)
**Impact on plan:** Minor type resolution issue — fix straightforward, no scope change.

## Issues Encountered

None beyond the auto-fixed type error above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 (SVG Card) is complete: card rendering engine (03-01) and CLI integration (03-02) both shipped.
- Phase 4 (Cloudflare Worker) can begin: `renderCard()` API is stable and ready to be called from the Worker.
- `shiplog-card.svg` was generated in the repo root during verification — user may want to add it to their README or gitignore it.
- Blocker from STATE.md still applies: Cloudflare Worker auth strategy (API key vs signed token) decision needed during Phase 4 planning.

---
*Phase: 03-svg-card*
*Completed: 2026-03-26*
