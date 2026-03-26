---
phase: 07-auth-verify-docs
plan: 01
status: complete
started: 2026-03-26T06:24:00Z
completed: 2026-03-26T06:55:00Z
duration: ~31 min
---

## What was built

Renamed npm package from `@jjaimealeman/shipcard` to unscoped `shipcard` across all files, and verified the full OAuth device flow end-to-end (login → sync → card served).

## Deliverables

| File | Change |
|------|--------|
| shiplog/package.json | `"name": "shipcard"` (unscoped) |
| README.md | Updated install/npx commands to unscoped `shipcard` |
| USAGE.md | Updated MCP config to `-p shipcard` |
| shiplog/docs/mcp-config.md | All `@jjaimealeman/shipcard` → `shipcard` |
| shiplog-worker/src/types.ts | Fixed `looksLikeFilePath` — `~` → `~/` to avoid rejecting cost strings |

## Commits

| Hash | Description |
|------|-------------|
| `691dd71` | feat(07-01): rename package to unscoped shipcard + update all docs |
| `4a3fdde` | fix(07-01): tighten SafeStats file-path check from ~ to ~/ |

## Deviations

- **SafeStats validator bug found during OAuth testing:** The `looksLikeFilePath()` check in the Worker's `isValidSafeStats()` rejected cost strings like `"~$3,414.02"` because they start with `~`. Fixed by tightening the check to `~/` (actual home directory paths only). This was a latent bug from Phase 4 that only surfaced with real data.
- **~/.shipcard/config.json didn't exist:** User had to create the directory manually. The `saveAuthConfig()` function creates it, but there was no pre-existing config. Login flow worked correctly once the directory existed.
- **First login attempt failed with "fetch failed":** Transient network error calling `api.github.com/user` after device flow. Succeeded on retry.

## Verification

- Human-verified: OAuth device flow (login → sync → card render) works end-to-end against local Worker
- `grep -r "@jjaimealeman"` returns zero results across all .md and .json files
- Build passes cleanly

## Notes

- User flagged `<synthetic>` model name and long model strings on card — to be addressed in a near-future phase (card display improvements, not Phase 7 scope)
- Production deploy still needed (`wrangler deploy`) to push the SafeStats fix live
