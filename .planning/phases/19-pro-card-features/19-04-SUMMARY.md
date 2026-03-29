---
phase: 19-pro-card-features
plan: 04
subsystem: cli
tags: [typescript, cli, slug, pro, api-client, validation]

# Dependency graph
requires:
  - phase: 19-02
    provides: Worker slug API endpoints (POST/GET/DELETE /u/:username/slugs)
provides:
  - CLI slug subcommands: create, list, delete
  - Client-side slug validation mirroring worker constants
  - ParsedCliArgs extended with subcommand and target positionals
affects: [19-05, future-cli-subcommands]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CLI subcommand dispatch via positionals[1] and positionals[2]
    - Mirror server-side validation constants client-side for fast feedback
    - PRO gate: 403 response shows upgrade message + non-zero exit

key-files:
  created:
    - shipcard/src/cli/commands/slug.ts
  modified:
    - shipcard/src/cli/args.ts
    - shipcard/src/cli/index.ts

key-decisions:
  - "subcommand/target added to ParsedCliArgs as positionals[1]/[2] for generic subcommand dispatch pattern"
  - "Slug validation constants mirrored from worker (not imported) to keep CLI zero-dependency on worker package"
  - "runSlugDelete accepts SlugFlags param for consistent function signature despite not using flags"

patterns-established:
  - "Subcommand pattern: command (positionals[0]) + subcommand (positionals[1]) + target (positionals[2])"
  - "PRO gate handling: HTTP 403 always prints upgrade URL and exits with code 1"
  - "Client-side validation before API call: fast feedback without network round-trip"

# Metrics
duration: 2min
completed: 2026-03-29
---

# Phase 19 Plan 04: CLI Slug Subcommands Summary

**`shipcard slug create/list/delete` subcommands with client-side validation and PRO gate handling via Worker API calls**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-29T17:07:00Z
- **Completed:** 2026-03-29T17:10:13Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended `ParsedCliArgs` with `subcommand` (positionals[1]) and `target` (positionals[2]) fields for generic subcommand dispatch
- Created `slug.ts` with `runSlug` export dispatching to `runSlugCreate`, `runSlugList`, `runSlugDelete`
- Mirrored worker's SLUG_MIN/MAX/REGEX/RESERVED constants for instant client-side validation before API calls
- Wired `slug` case into `index.ts` dispatch with `subcommand` and `target` passed through
- Updated HELP_TEXT with slug command description and examples

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend arg parser with subcommand and target positionals** - `25808d3` (feat)
2. **Task 2: Create slug command handler + wire into CLI dispatch** - `b561fa3` (feat)

**Plan metadata:** (docs: complete CLI slug subcommands plan) — pending

## Files Created/Modified

- `shipcard/src/cli/commands/slug.ts` - Slug subcommand handler: create/list/delete with validation and PRO gate
- `shipcard/src/cli/args.ts` - Added `subcommand` and `target` fields to `ParsedCliArgs` interface
- `shipcard/src/cli/index.ts` - Import `runSlug`, add `slug` case, pass `subcommand`/`target`, update HELP_TEXT

## Decisions Made

- **subcommand/target in ParsedCliArgs**: Added as `positionals[1]`/`positionals[2]` rather than a slug-specific shape. This is a generic pattern reusable by any future command that needs subcommand dispatch.
- **Validation constants mirrored (not imported)**: The CLI has zero dependency on the worker package. Duplicating the small constants block keeps the separation clean and ensures CLI remains self-contained.
- **runSlugDelete signature includes SlugFlags**: Kept for consistency with other sub-handlers. Flagged with `void flags` to suppress TS unused-variable warnings.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CLI slug management complete; PRO users can manage custom slugs from the terminal
- The subcommand/target positionals pattern in `ParsedCliArgs` is available for any future command needing subcommand dispatch
- Plan 19-05 (if it exists) can proceed

---
*Phase: 19-pro-card-features*
*Completed: 2026-03-29*
