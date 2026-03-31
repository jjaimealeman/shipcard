---
phase: 21-clack-cli
plan: 03
subsystem: ui
tags: [clack, prompts, spinner, confirm, tty, sync, slug, cli]

# Dependency graph
requires:
  - phase: 21-01
    provides: clack.ts TTY-guard module with all exports (isTTY, intro, outro, createSpinner, confirm, note, logSuccess, logError, logWarn, logStep)
provides:
  - sync command with Clack spinners for analysis and cloud sync phases in TTY
  - sync --delete with Clack confirm prompt in TTY (non-TTY skips prompt)
  - slug create/list/delete with Clack intro/outro framing in TTY
  - slug delete with Clack confirm prompt in TTY (non-TTY skips prompt)
  - slug list --json with zero Clack framing (strict guard)
affects: [any future CLI command additions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isTTY() guard at subpath level — intro/outro wrap entire sub-handler in TTY, skip entirely in non-TTY"
    - "Parallel branches for TTY vs non-TTY in --confirm paths: identical logic, different output primitives"
    - "useClack local var for compound guards (isTTY() && !flags.json) to avoid repeated conditions"
    - "Spinner stop-before-error pattern: s.stop('Failed') before logError() for clean spinner teardown"

key-files:
  created: []
  modified:
    - shipcard/src/cli/commands/sync.ts
    - shipcard/src/cli/commands/slug.ts

key-decisions:
  - "Sync preview table (Sessions/Tokens/Cost) stays as process.stdout.write — data output is not converted to Clack log calls"
  - "useClack local var computed once per subhandler: isTTY() && !flags.json — avoids repeated compound guard"
  - "Spinner stop called before logError on failure to prevent dangling spinner animation"
  - "slug --json mode bypasses all Clack (intro/outro/logSuccess) regardless of TTY state"

patterns-established:
  - "Spinner teardown before error exit: s.stop('Label') then logError() then process.exit(1)"
  - "Non-TTY branches preserve original process.stderr/stdout writes byte-for-byte"
  - "Confirm prompt gated on isTTY() only — no confirm in non-TTY destructive paths"

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 21 Plan 03: Sync and Slug Clack Upgrade Summary

**Clack spinners (analysis + cloud sync), confirm prompts (delete in TTY), and intro/outro framing added to sync and slug commands — non-TTY and --json paths byte-identical to original**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T03:51:44Z
- **Completed:** 2026-03-30T03:54:30Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments

- sync command shows Clack intro/outro and spinners for both the analysis phase ("Analyzing local stats...") and the cloud sync phase ("Syncing to cloud...") in TTY mode
- sync --delete shows Clack confirm prompt before deletion in TTY; non-TTY proceeds directly matching original behavior
- slug create shows Clack intro/outro framing with logSuccess + note for card URL and embed snippets on success
- slug list shows intro/outro framing in TTY non-JSON; logWarn + logStep for empty state; zero framing on --json
- slug delete shows Clack confirm prompt before deletion in TTY; non-TTY proceeds directly
- All non-TTY code paths preserved byte-for-byte from original implementation

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade sync command with Clack spinners and confirm** - `4e6a088` (feat)
2. **Task 2: Upgrade slug command with Clack framing and confirm** - `b6b07f1` (feat)

## Files Created/Modified

- `shipcard/src/cli/commands/sync.ts` - Clack spinners for analysis/sync, confirm prompt for --delete in TTY, full non-TTY fallback branches
- `shipcard/src/cli/commands/slug.ts` - Clack framing for create/list/delete, confirm for delete in TTY, --json guard with zero Clack output

## Decisions Made

- Sync preview table (Sessions, Tokens, Cost, etc.) stays as raw `process.stdout.write` — converting data output to Clack log calls would break piped consumers that parse the preview
- `useClack` local variable computed once per subhandler (`isTTY() && !flags.json`) avoids repeated compound guard expressions throughout runSlugList
- Spinner's `.stop()` is called before `logError()` on failure paths to prevent dangling spinner animation in terminal
- slug list `--json` bypasses all Clack (intro/outro/logSuccess) regardless of TTY state — `--json` is an explicit machine-readable flag

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 21 is now 3/3 plans complete
- All major CLI commands (summary, costs, card, login, sync, slug) have Clack TTY polish
- Non-TTY output preserved throughout — MCP/pipe consumers unaffected
- Phase 21 complete, ready for any follow-on work

---
*Phase: 21-clack-cli*
*Completed: 2026-03-30*
