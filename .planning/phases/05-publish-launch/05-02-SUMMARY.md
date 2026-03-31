---
phase: 05-publish-launch
plan: 02
subsystem: infra
tags: [npm, typescript, build, license, tarball, shipcard]

# Dependency graph
requires:
  - phase: 05-01
    provides: package rename to shipcard, bin entries, files field with dist/ and data/
provides:
  - MIT LICENSE file at project root and shipcard/ package directory
  - "license: MIT" field in package.json
  - Verified clean TypeScript build with zero errors post-rename
  - Confirmed npm tarball contents: dist/, data/pricing-snapshot.json, LICENSE
  - Both bin entry files with shebangs (#!/usr/bin/env node) and chmod 755
affects: [05-03, 05-04]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - LICENSE
    - shipcard/LICENSE
  modified:
    - shipcard/package.json

key-decisions:
  - "LICENSE placed in both repo root and shipcard/ — npm auto-includes LICENSE from package root, so shipcard/LICENSE is what ends up in the published tarball"
  - "license: MIT added to package.json to satisfy npm registry metadata requirement"

patterns-established: []

# Metrics
duration: 1min
completed: 2026-03-26
---

# Phase 5 Plan 02: Build Verification + MIT License Summary

**MIT LICENSE added, clean TypeScript build confirmed post-rename, npm tarball verified to include dist/, data/pricing-snapshot.json, and LICENSE with no src/ or node_modules/ leakage**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-26T03:39:39Z
- **Completed:** 2026-03-26T03:40:55Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Created MIT LICENSE (Copyright 2025 Jaime Aleman) at repo root and copied to shipcard/ package directory
- Added `"license": "MIT"` to shipcard/package.json
- Ran `npm run build` — zero TypeScript errors, confirming the 05-01 rename was complete and consistent
- Verified dist/cli/index.js and dist/mcp/server.js have `#!/usr/bin/env node` shebangs and `-rwxr-xr-x` executable bits
- npm pack dry run confirmed all required files present (155 total), no source or dev artifacts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LICENSE file and verify build + tarball** - `d0f33f7` (feat)

**Plan metadata:** (pending)

## Files Created/Modified

- `LICENSE` - MIT License, Copyright 2025 Jaime Aleman
- `shipcard/LICENSE` - Copy for npm package root (auto-included by npm pack)
- `shipcard/package.json` - Added `"license": "MIT"` field

## Decisions Made

- LICENSE placed in both repo root and `shipcard/` — npm only auto-includes LICENSE files at the package root (where package.json lives), which is `shipcard/`. The repo-root LICENSE serves git/GitHub display purposes.
- `"license": "MIT"` added to package.json to satisfy npm registry metadata and OSI identifier standard.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] LICENSE added to shipcard/ package directory, not just repo root**
- **Found during:** Task 1 (tarball inspection)
- **Issue:** Plan said "Create LICENSE at project root" but npm pack runs from `shipcard/` — the LICENSE would not appear in the tarball if only placed at the repo root
- **Fix:** Copied LICENSE to `shipcard/LICENSE` after creating it at repo root
- **Files modified:** `shipcard/LICENSE`
- **Verification:** `npm pack --dry-run` output shows `1.1kB LICENSE` in tarball contents
- **Committed in:** d0f33f7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was essential — without it the published package would ship without a LICENSE file, violating PUB-03. No scope creep.

## Issues Encountered

None - build passed cleanly on first run, confirming the 05-01 rename was thorough.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- npm package is publish-ready: clean build, correct tarball contents, MIT license included
- Both bin executables (`shipcard` and `shipcard-mcp`) verified with shebangs and executable bits
- Ready for 05-03 (npm publish) and 05-04 (Worker deploy)
- Blocker from STATE.md still active: SHIPCARD_GITHUB_CLIENT_ID placeholder must be replaced with real OAuth App client ID before Worker deploy

---
*Phase: 05-publish-launch*
*Completed: 2026-03-26*
