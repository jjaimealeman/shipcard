---
phase: 16-agent-agnostic-architecture
plan: 01
subsystem: infra
tags: [rename, directory, git-mv, typescript, build]

# Dependency graph
requires:
  - phase: all-prior-phases
    provides: shiplog/ and shiplog-worker/ directories with full source code
provides:
  - shipcard/ directory with all prior source code and git history preserved
  - shipcard-worker/ directory with all prior source code and git history preserved
  - Zero stale shiplog/ path references across source, config, and planning docs
affects:
  - 16-02, 16-03 (all Phase 16 plans that add new adapter code)
  - All future phases that reference package directories

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "git mv for directory renaming: preserves 100% git history across renames"

key-files:
  created: []
  modified:
    - shipcard/ (renamed from shiplog/)
    - shipcard-worker/ (renamed from shiplog-worker/)
    - shipcard-worker/src/types.ts (updated internal comment)
    - CLAUDE.md (updated versioning note)
    - .planning/**/*.md (777 path reference replacements across 63 files)

key-decisions:
  - "Used git mv to rename directories, preserving full git history"
  - "Historical CLI command name 'shiplog' left intact in old phase plans as correct context"
  - "shipcard-worker has no build script (wrangler handles compilation) — verified via tsc --noEmit"

patterns-established:
  - "Rename pattern: git mv + sed for bulk reference replacement in planning docs"

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 16 Plan 01: Rename shiplog to shipcard Summary

**Legacy shiplog/ and shiplog-worker/ directories renamed to shipcard/ and shipcard-worker/ via git mv, preserving full history, with 777 path references updated across 63 planning files.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T23:47:17Z
- **Completed:** 2026-03-28T23:49:11Z
- **Tasks:** 2
- **Files modified:** 83+ (81 renames + 2 content edits + 63 planning doc updates)

## Accomplishments

- Both directories renamed with `git mv` preserving 100% of git history
- All TypeScript source, JSON config, and JSONC wrangler files reference correct names
- 777 path occurrences of `shiplog/` replaced with `shipcard/` across 63 `.planning/` markdown files
- Both packages verified: `shipcard/` builds cleanly with `pnpm build`; `shipcard-worker/` typechecks with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename directories and update source/config references** - `e7b8b96` (feat)
2. **Task 2: Update planning doc references** - `f74e038` (docs)

## Files Created/Modified

- `shipcard/` - Renamed from shiplog/, full source and history preserved
- `shipcard-worker/` - Renamed from shiplog-worker/, full source and history preserved
- `shipcard-worker/src/types.ts` - Updated internal comment: "Do NOT import from shiplog" → "shipcard"
- `CLAUDE.md` - Updated versioning note: shiplog/ → shipcard/, shiplog-worker/ → shipcard-worker/
- `.planning/**/*.md` (63 files) - All shiplog/ and shiplog-worker/ path references replaced

## Decisions Made

- Used `git mv` instead of shell `mv` to preserve git rename tracking across all 81 files
- Left historical `shiplog` CLI command name (e.g., `shiplog summary`, `cd shiplog`) intact in old phase plans — these are accurate historical records of the original CLI command name, not path references
- `shipcard-worker` has no `build` script (wrangler uses `noEmit: true` compilation) — used `tsc --noEmit` to verify TypeScript correctness

## Deviations from Plan

None - plan executed exactly as written.

The only minor discovery: `shipcard-worker/package.json` has no `build` script (uses `wrangler dev/deploy` workflow with noEmit TypeScript). The plan's `pnpm build` instruction for the worker would fail. Handled by using `tsc --noEmit` for typecheck verification instead — this is the correct approach for a Cloudflare Worker project.

## Issues Encountered

None — both packages compiled cleanly after rename.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 16 Plan 02 (adapter architecture) can proceed with correct shipcard/ directory naming from the start
- All future plans in .planning/ already reference the correct shipcard/ paths
- No stale shiplog/ references remain anywhere in source, config, or planning docs

---
*Phase: 16-agent-agnostic-architecture*
*Completed: 2026-03-28*
