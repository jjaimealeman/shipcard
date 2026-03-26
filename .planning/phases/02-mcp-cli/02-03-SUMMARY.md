---
phase: 02-mcp-cli
plan: 03
subsystem: packaging
tags: [npm, bin, npx, mcp, cli, chmod, package.json, typescript]

# Dependency graph
requires:
  - phase: 02-01
    provides: CLI entry point at dist/cli/index.js with shebang
  - phase: 02-02
    provides: MCP server entry point at dist/mcp/server.js with shebang
provides:
  - Dual bin entries in package.json (shiplog, shiplog-mcp)
  - Build script that compiles TypeScript and sets 755 permissions on both entry points
  - main/exports fields for programmatic import
  - files field scoping npm publish to dist/ and data/
  - Copy-paste MCP config docs for Claude Code and Cursor
affects: [05-publish, phase-5-npm, readme]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Build script chains: tsc && chmod 755 to handle executable bits post-compile"
    - "npx -y flag required for MCP stdio servers to prevent interactive prompt corruption"

key-files:
  created:
    - shiplog/docs/mcp-config.md
  modified:
    - shiplog/package.json

key-decisions:
  - "chmod 755 in build script (not post-publish hook) — executable bits set at build time, not install time"
  - "Separate bin names (shiplog vs shiplog-mcp) — CLI and MCP server have distinct invocations"
  - "files field includes data/ — pricing snapshot (data/pricing.json) required at runtime"
  - "npx -y documented as required — prevents stdio corruption in MCP transport"

patterns-established:
  - "Dual-entry package pattern: bin.shiplog for CLI users, bin.shiplog-mcp for IDE MCP config"
  - "Build = compile + chmod: TypeScript outputs lose executable bits, build script restores them"

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 2 Plan 3: Package Wiring Summary

**Dual bin entries (shiplog + shiplog-mcp) with chmod-in-build-script pattern and copy-paste MCP config docs for Claude Code and Cursor npx invocation**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-25T23:24:39Z
- **Completed:** 2026-03-25T23:26:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- package.json now has dual bin entries pointing to both compiled entry points
- Build script automatically sets 755 permissions post-tsc so `npm run build` is the only step needed
- Added main, exports, and files fields making the package publish-ready for Phase 5
- Created docs/mcp-config.md with copy-paste JSON for Claude Code (.mcp.json), Cursor (~/.cursor/mcp.json), and global install variants
- All three MCP tools listed with descriptions in the config doc

## Task Commits

Each task was committed atomically:

1. **Task 1: Bin entries, build script, and executable permissions** - `8155068` (feat)
2. **Task 2: MCP config documentation for Claude Code and Cursor** - `c18ce11` (feat)

**Plan metadata:** (docs: complete plan — committed after SUMMARY.md)

## Files Created/Modified

- `shiplog/package.json` - Added bin, main, exports, files fields; updated build script with chmod 755
- `shiplog/docs/mcp-config.md` - Copy-paste MCP config for Claude Code, Cursor, and global install with tool listing

## Decisions Made

- **chmod in build script vs post-install hook:** Set 755 at build time rather than via a postinstall npm hook. TypeScript compilation strips executable bits on output files; the build script is the natural place to restore them since devs run `npm run build` and npx triggers it automatically.
- **Separate bin names:** `shiplog` and `shiplog-mcp` are distinct commands rather than flags. MCP servers run persistently via stdio — they cannot share an entry point with the CLI.
- **files field includes data/:** The pricing snapshot at `data/pricing.json` is a runtime dependency. Without it in the files array, npm publish would omit it and cost calculations would fail for installed users.
- **npx -y documented prominently:** The `-y` flag is not obvious but critical. Without it, npx pauses to confirm the install, writing to stdout and corrupting the MCP JSON-RPC transport.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Package is fully wired for `npx shiplog` CLI invocation and `npx -y shiplog-mcp` MCP server invocation
- Phase 2 (MCP + CLI) is now complete — all 3 plans done
- Phase 3 (card endpoint / Cloudflare Worker) can begin
- Remaining concern from research: SVG rendering via GitHub camo proxy has undocumented restrictions — needs testing in Phase 3

---
*Phase: 02-mcp-cli*
*Completed: 2026-03-25*
