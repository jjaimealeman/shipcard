---
phase: 21-clack-cli
plan: 02
subsystem: ui
tags: [clack, tty, cli, oauth, github, login]

# Dependency graph
requires:
  - phase: 21-01
    provides: clack.ts TTY-guard module with isTTY, intro, outro, note, logStep, logSuccess, logError, logWarn, createSpinner exports
provides:
  - Login command with full Clack walkthrough in TTY mode
  - Byte-identical non-TTY fallback for pipe/MCP contexts
  - Spinner-guarded polling feedback during GitHub device flow
affects: [21-03, any future command requiring TTY/non-TTY branching patterns]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tty = isTTY() hoisted once, branched at each output point"
    - "spinnerStarted flag to guard spinner.stop() only if spinner.start() was reached"
    - "onVerification callback calls Clack synchronously before spinner.start()"

key-files:
  created: []
  modified:
    - shipcard/src/cli/commands/login.ts

key-decisions:
  - "spinner.start() called inside onVerification callback (after note box shows) — ensures user sees URL before spinner occludes output"
  - "spinnerStarted boolean flag guards spinner.stop() in the catch block — prevents stop() call if onVerification never fired"
  - "Non-TTY onVerification output is byte-identical to original: same four stderr writes in same order"
  - "outro() replaces stdout write in TTY mode — non-TTY still writes 'Logged in as {username}' to stdout for script consumers"

patterns-established:
  - "tty = isTTY() pattern: hoist once at top of runXxx(), branch at every output site — established in login, reusable in any future write command"
  - "Spinner-in-callback pattern: create spinner before auth, start inside callback after displaying info, stop after await resolves"

# Metrics
duration: 1min
completed: 2026-03-30
---

# Phase 21 Plan 02: Login Command Clack Upgrade Summary

**login.ts rewritten with full Clack walkthrough in TTY (intro banner, step indicators, note box with URL+code, spinner while polling, celebratory outro) and byte-identical plain-text fallback in non-TTY**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-30T03:50:58Z
- **Completed:** 2026-03-30T03:52:17Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Login command now shows a full Clack walkthrough in interactive TTY: intro banner, step indicators at each stage, a boxed note with the verification URL and user code, a spinner while polling GitHub for authorization, logSuccess on each milestone (GitHub authorized, ShipCard token saved), and a celebratory outro with the `shipcard sync` next-step hint
- Non-TTY output is byte-identical to the original implementation — same four stderr writes in onVerification, same "Logged in as {username}" on stdout, same exit codes
- Error paths branch on isTTY(): Clack-styled logError/logWarn in TTY, plain stderr in non-TTY
- No direct @clack/prompts import in login.ts; all Clack calls routed through ../clack.js

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade login command with full Clack walkthrough** - `318cec9` (feat)

**Plan metadata:** (included in final docs commit)

## Files Created/Modified

- `shipcard/src/cli/commands/login.ts` - Full Clack walkthrough in TTY, byte-identical fallback in non-TTY

## Decisions Made

- Spinner is created before `createOAuthDeviceAuth()` but started inside `onVerification` callback — this ensures the note box and step display are fully rendered before the spinner occludes the terminal
- `spinnerStarted` boolean flag guards `spinner.stop()` in the catch block — prevents calling stop() if the auth failed before onVerification ever fired (edge case: network error before device code generation)
- `outro()` replaces `process.stdout.write('Logged in as...')` in TTY mode — non-TTY still writes to stdout so pipe/script consumers get the username
- `logSuccess('Authenticated as ${username}')` in TTY mode gives visual confirmation of the identity step without waiting for token exchange

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 21-02 complete: login now has the premium Clack experience that matches the plan's "create-next-app feel" goal
- Plan 21-03 (sync command Clack upgrade) can proceed immediately
- The `tty = isTTY()` branching pattern established here is the canonical template for any future write commands that need TTY/non-TTY output divergence

---
*Phase: 21-clack-cli*
*Completed: 2026-03-30*
