# 2026-03-26 - Publish @jjaimealeman/shipcard@0.2.0 to npm

**Keywords:** [DEPLOYMENT] [CONFIG]
**Session:** Late night / early morning, Duration (~30 minutes)
**Commit:** 7948189

## What Changed

- File: `shiplog/package.json`
  - Renamed package from unscoped `shipcard` to `@jjaimealeman/shipcard` (npm rejected unscoped name as too similar to `ship-card`)
  - Bumped version from 0.1.0 to 0.2.0

## Why

npm's name similarity policy blocked publishing as unscoped `shipcard`. Scoped under `@jjaimealeman/shipcard` with `--access public`. Version bump to 0.2.0 reflects MCP card SVG output, dead code cleanup, and doc fixes since 0.1.0.

## Issues Encountered

- npm rejected unscoped `shipcard` — "too similar to existing package ship-card"
- `npx -p @jjaimealeman/shipcard shipcard` doesn't work on npm v24 (known bin resolution bug with scoped packages) — global install works fine
- `~/.shipcard/config.json` had stale `workerUrl: localhost:8787` from dev session, caused login failures until corrected to `https://shipcard.dev`

## Dependencies

No dependencies added.

## Testing Notes

- Published and verified: `npm install -g @jjaimealeman/shipcard` installs, `shipcard --version` returns 0.2.0
- `shipcard login` completes GitHub device flow and exchanges token with shipcard.dev
- `shipcard sync` opens configurator with live card preview

## Next Steps

- [ ] Add `*.tgz` to .gitignore to prevent accidental commits of npm tarballs
- [ ] Launch on Reddit (r/ClaudeAI, r/ClaudeCode, r/vibecoding)
- [ ] Complete v1 milestone archive

---

**Branch:** develop
**Issue:** N/A
**Impact:** MEDIUM - first successful public npm publish + working E2E auth flow
