---
phase: 21-clack-cli
plan: 01
subsystem: cli
tags: [clack, prompts, tty, cli, ux, terminal]

# Dependency graph
requires:
  - phase: 16-project-rename
    provides: shipcard CLI foundation with summary/costs/card commands
provides:
  - TTY-guard Clack wrapper module (clack.ts) as single import point for all CLI UI
  - Clack intro/outro framing on summary, costs, and card read-only commands
  - Safe non-TTY fallback paths for all Clack wrappers
affects:
  - 21-02 (future Clack plans — all commands import from clack.ts)
  - Any future CLI command additions

# Tech tracking
tech-stack:
  added: ["@clack/prompts ^0.x"]
  patterns:
    - "TTY-guard pattern: all Clack calls check isTTY() before executing, non-TTY fallback to stderr/stdout"
    - "Single import point: commands never import from @clack/prompts directly, only from ../clack.js"
    - "Silent try/catch: Clack TTY calls wrapped in try/catch, errors silently fall through to non-TTY path"
    - "Caller-guard pattern: confirm() and createSpinner() require caller to check isTTY() before calling"

key-files:
  created:
    - shipcard/src/cli/clack.ts
  modified:
    - shipcard/package.json
    - shipcard/package-lock.json
    - shipcard/src/cli/commands/summary.ts
    - shipcard/src/cli/commands/costs.ts
    - shipcard/src/cli/commands/card.ts

key-decisions:
  - "All Clack imports centralized in clack.ts — commands never import from @clack/prompts directly"
  - "Silent fallback pattern: try/catch on TTY Clack calls, non-TTY path on any error"
  - "intro() is a no-op in non-TTY (not stderr write) — pipe consumers must see zero framing chrome"
  - "card --local outro omits !flags.json guard (--local and --json are mutually exclusive by command logic)"

patterns-established:
  - "TTY-guard wrapper: isTTY() && !flags.json before any Clack framing call"
  - "Non-TTY log convention: status messages to stderr, data to stdout (matching existing code)"
  - "Additive-only framing: no existing process.stdout.write or process.stderr.write calls modified"

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 21 Plan 01: Clack CLI Foundation Summary

**@clack/prompts installed with a TTY-guard wrapper module (clack.ts) and light intro/outro framing added to summary, costs, and card commands — pipe and JSON output byte-identical to before**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T03:46:02Z
- **Completed:** 2026-03-30T03:48:29Z
- **Tasks:** 2
- **Files modified:** 5 (+ package-lock.json)

## Accomplishments

- Created shipcard/src/cli/clack.ts as the single TTY-guard import point for all Clack UI across the CLI
- All 10 exports (isTTY, intro, outro, note, logSuccess, logStep, logWarn, logError, confirm, createSpinner) implemented with safe non-TTY fallbacks
- summary, costs, and card read-only commands show Clack intro/outro framing in interactive TTY mode with zero impact on JSON or pipe output

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @clack/prompts and create clack.ts TTY guard module** - `92a0e64` (feat)
2. **Task 2: Add Clack framing to summary, costs, and card commands** - `4747393` (feat)

## Files Created/Modified

- `shipcard/src/cli/clack.ts` - Central TTY-guard Clack wrapper module; all commands import from here
- `shipcard/package.json` - Added @clack/prompts as runtime dependency
- `shipcard/src/cli/commands/summary.ts` - Added intro/outro framing guarded by isTTY() && !flags.json
- `shipcard/src/cli/commands/costs.ts` - Added intro/outro framing guarded by isTTY() && !flags.json
- `shipcard/src/cli/commands/card.ts` - Added intro framing at top; outro on --local success path

## Decisions Made

- All Clack imports centralized in clack.ts: future commands must never import from @clack/prompts directly, only from ../clack.js (or ../../cli/clack.js from deeper paths)
- Silent try/catch fallback: Clack TTY calls wrapped in try/catch so any rendering error silently falls through to non-TTY path — ensures robustness in edge-case terminals
- intro() is strictly a no-op in non-TTY (not a stderr write) — pipe consumers and MCP contexts must receive zero UI chrome on stdout or stderr
- card --local outro omits the !flags.json guard because --local and --json are mutually exclusive at the command dispatch level

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

npm audit reported a high-severity vulnerability in path-to-regexp (a transitive dependency of @clack/prompts, not @clack/prompts itself). This is pre-existing in the dep tree and does not affect CLI functionality. Not addressed here — flagged for awareness.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- clack.ts foundation is in place; all subsequent Phase 21 plans (02+) can import from it
- The TTY-guard pattern is established and documented — future command additions should follow the same isTTY() && !flags.json guard pattern
- No blockers for Phase 21 plan 02

---
*Phase: 21-clack-cli*
*Completed: 2026-03-30*
