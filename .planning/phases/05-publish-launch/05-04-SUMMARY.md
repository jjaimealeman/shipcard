---
phase: 05-publish-launch
plan: 04
subsystem: infra
tags: [npm, cloudflare-workers, wrangler, oauth]

requires:
  - phase: 05-publish-launch (01, 02, 03)
    provides: renamed codebase, verified build, README docs
provides:
  - Published @jjaimealeman/shipcard@0.1.0 on npm
  - Deployed shipcard Worker to shipcard.dev
  - KV namespaces provisioned (CARDS_KV, USER_DATA_KV)
  - GitHub OAuth App configured for device flow login
affects: []

tech-stack:
  added: []
  patterns: [scoped-npm-package, granular-access-token-publish]

key-files:
  created: []
  modified:
    - shiplog/package.json
    - shiplog-worker/wrangler.jsonc
    - shiplog/src/cli/args.ts
    - shiplog/src/cli/index.ts

key-decisions:
  - "Scoped to @jjaimealeman/shipcard — npm rejected 'shipcard' (too similar to existing 'ship-card')"
  - "Granular access token with 2FA bypass for npm publish — user lost authenticator app access"
  - "npx MCP config uses -p flag to install scoped package then run shipcard-mcp bin"

patterns-established:
  - "Scoped npm publish: npm publish --access public with granular token"

duration: ~15min
completed: 2026-03-26
---

# Plan 04: Dry Run Publish Chain Summary

**Published @jjaimealeman/shipcard@0.1.0 to npm, deployed Worker to shipcard.dev with KV + OAuth**

## Performance

- **Duration:** ~15 min (including manual deploy steps)
- **Started:** 2026-03-26T04:30:00Z
- **Completed:** 2026-03-26T05:10:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Tarball verified locally: both bin entries work, npx works, correct contents
- Worker deployed to shipcard.dev with real KV namespace IDs
- GitHub OAuth App created with device flow enabled
- Package published to npm as @jjaimealeman/shipcard@0.1.0

## Task Commits

1. **Task 1: Pack tarball + test local install** - `b80732e` (fix: added --version flag)
2. **Task 2: Deploy + publish (checkpoint)** - `0b21d0f` (fix: scoped package name), `ca92d25` (chore: KV IDs)

## Files Created/Modified
- `shiplog/package.json` - Scoped to @jjaimealeman/shipcard
- `shiplog-worker/wrangler.jsonc` - Real KV namespace IDs
- `shiplog/src/cli/args.ts` - Added --version/-v flag
- `shiplog/src/cli/index.ts` - Version dispatch

## Decisions Made
- Scoped package name required — npm name similarity check blocked "shipcard"
- Used granular access token with 2FA bypass for publish
- npx MCP config: `["-y", "-p", "@jjaimealeman/shipcard", "shipcard-mcp"]`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] --version flag missing**
- **Found during:** Task 1 (tarball testing)
- **Issue:** `shipcard --version` printed help text instead of version
- **Fix:** Added --version/-v to arg parser and version dispatch in CLI entry
- **Committed in:** b80732e

**2. [Checkpoint] npm name collision**
- **Found during:** Task 2 (npm publish)
- **Issue:** npm rejected "shipcard" as too similar to existing "ship-card"
- **Fix:** Scoped to @jjaimealeman/shipcard, updated all docs
- **Committed in:** 0b21d0f

---

**Total deviations:** 2 (1 auto-fixed bug, 1 publish-time discovery)
**Impact on plan:** Scoped name changes npx invocation syntax but all functionality preserved.

## Issues Encountered
- npm 2FA enforcement required granular access token workaround
- Wrangler auto-appended duplicate KV entries when creating namespaces (cleaned up manually)

## User Setup Required
None — all external services configured during checkpoint.

## Next Phase Readiness
- This is the final phase — milestone complete
- Package live on npm, Worker live on shipcard.dev

---
*Phase: 05-publish-launch*
*Completed: 2026-03-26*
