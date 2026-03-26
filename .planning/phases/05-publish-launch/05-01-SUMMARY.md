---
phase: 05
plan: 01
subsystem: rename
tags: [shipcard, npm, cloudflare-worker, routes, branding]
requires:
  - 04-01
  - 04-02
  - 04-03
provides:
  - "Zero shiplog references in all source files"
  - "npm package name shipcard with bin entries shipcard/shipcard-mcp"
  - "Worker deployed as shipcard serving cards at /u/:username"
  - "shipcard.dev custom domain configured in wrangler.jsonc"
affects:
  - 05-02
  - 05-03
tech-stack:
  added: []
  patterns:
    - "Mechanical find-and-replace rename across multi-package monorepo"
key-files:
  created: []
  modified:
    - shiplog/package.json
    - shiplog/src/cli/config.ts
    - shiplog/src/cli/index.ts
    - shiplog/src/cli/commands/login.ts
    - shiplog/src/cli/commands/sync.ts
    - shiplog/src/cli/commands/card.ts
    - shiplog/src/cli/commands/summary.ts
    - shiplog/src/cli/commands/costs.ts
    - shiplog/src/cli/safestats.ts
    - shiplog/src/engine/cost.ts
    - shiplog/src/engine/types.ts
    - shiplog/src/engine/filter.ts
    - shiplog/src/index.ts
    - shiplog/src/cli/format.ts
    - shiplog/src/cli/args.ts
    - shiplog/src/card/index.ts
    - shiplog/src/card/renderer.ts
    - shiplog/src/card/git.ts
    - shiplog/src/card/preview.ts
    - shiplog/src/card/themes/branded.ts
    - shiplog/src/mcp/server.ts
    - shiplog/src/mcp/tools/summary.ts
    - shiplog/src/mcp/tools/costs.ts
    - shiplog/src/mcp/tools/card.ts
    - shiplog-worker/package.json
    - shiplog-worker/wrangler.jsonc
    - shiplog-worker/src/index.ts
    - shiplog-worker/src/kv.ts
    - shiplog-worker/src/routes/auth.ts
    - shiplog-worker/src/routes/card.ts
    - shiplog-worker/src/routes/configure.ts
    - shiplog-worker/src/routes/sync.ts
    - shiplog-worker/src/svg/index.ts
    - shiplog-worker/src/svg/renderer.ts
    - shiplog-worker/src/svg/themes/branded.ts
    - shiplog-worker/src/auth.ts
    - shiplog-worker/src/types.ts
decisions:
  - "[05-01]: npm package name is shipcard — shiplog was taken"
  - "[05-01]: Card URL path is /u/:username — shorter and cleaner than /card/:username"
  - "[05-01]: Config paths moved to ~/.shipcard/ and ~/.shipcard.json"
  - "[05-01]: MCP tool names use shipcard: prefix (shipcard:summary, shipcard:costs, shipcard:card)"
  - "[05-01]: Worker name in wrangler.jsonc is shipcard with shipcard.dev custom domain"
metrics:
  duration: "7 minutes"
  completed: "2026-03-26"
---

# Phase 5 Plan 01: Rename shiplog to shipcard Summary

**One-liner:** Mechanical rename of all shiplog references to shipcard across both packages — npm name, bin entries, config paths, MCP tool names, Worker routes, and custom domain config.

## What Was Done

Renamed the entire codebase from "shiplog" to "shipcard" in preparation for npm publish and Cloudflare Worker deployment. The npm name "shiplog" was already taken; the product ships as "shipcard" with domain shipcard.dev.

### Task 1: CLI/MCP Package Rename (24 files)

All user-facing strings, config paths, bin entries, and tool names updated:

- **package.json:** name `shipcard`, bin entries `shipcard` and `shipcard-mcp`
- **config.ts:** paths now `~/.shipcard.json` (display) and `~/.shipcard/config.json` (auth); constant renamed `SHIPCARD_DIR`; default worker URL `https://shipcard.dev`
- **index.ts:** help text uses `shipcard`, default output file `shipcard-card.svg`
- **login.ts:** constant `SHIPCARD_GITHUB_CLIENT_ID`, User-Agent `shipcard-cli/1.0`, callback URL references `shipcard.dev`
- **sync.ts:** card URL now uses `/u/${username}` path, error messages reference `shipcard login`
- **mcp/server.ts:** server name `shipcard`, startup log messages updated
- **mcp/tools:** tool names `shipcard:summary`, `shipcard:costs`, `shipcard:card` with matching titles
- **card/index.ts:** title `ShipCard Stats`, footer `ShipCard`
- **engine/cost.ts:** `SHIPCARD_DIR`, pricing cache at `~/.shipcard/pricing.json`
- All doc comments across engine, cli, card subdirectories updated

### Task 2: Worker Package Rename + Route Update (13 files)

Two concurrent changes: rename + route prefix change from `/card` to `/u`:

- **wrangler.jsonc:** name `shipcard`, added `routes` array with `shipcard.dev` custom domain
- **index.ts:** health check returns `name: "shipcard"`, route mount changed from `/card` to `/u`
- **routes/card.ts:** JSDoc updated `GET /u/:username`
- **routes/configure.ts:** HTML title, header, CLI commands, localStorage key, card URLs all updated to shipcard/`/u/`
- **svg/index.ts:** card titles/footers `ShipCard`, placeholder text updated, GitHub URL replaced with `https://shipcard.dev`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| npm package name `shipcard` | "shiplog" already taken on npm registry |
| Card route `/u/:username` | Shorter than `/card/:username`, cleaner for README embeds |
| Config dir `~/.shipcard/` | Consistent with new product name, separates from any prior installs |
| MCP prefix `shipcard:` | Distinguishes tools from other MCP servers in Claude config |
| Worker name `shipcard` | Matches npm package name for consistency |
| Directory names unchanged | `shiplog/` and `shiplog-worker/` dirs kept — only npm name matters for publish |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended rename scope beyond plan's file list**

- **Found during:** Task 1 verification grep
- **Issue:** Plan listed 14 specific files, but grep revealed additional files with shiplog references: `engine/types.ts`, `engine/filter.ts`, `index.ts`, `cli/format.ts`, `cli/args.ts`, `card/index.ts`, `card/renderer.ts`, `card/git.ts`, `card/preview.ts`, `card/themes/branded.ts`
- **Fix:** Updated all additional files to achieve the must_have criterion of zero occurrences
- **Files modified:** 10 additional files in shiplog/src/ beyond plan's list
- **Commit:** 5ff8ee9

**2. [Rule 3 - Blocking] Extended Worker rename to additional files**

- **Found during:** Task 2 verification grep
- **Issue:** Worker had shiplog references in `svg/renderer.ts`, `svg/themes/branded.ts`, `svg/index.ts` (partial), `routes/sync.ts`, `auth.ts`, `types.ts` beyond plan's listed files
- **Fix:** Updated all additional files
- **Files modified:** 6 additional files in shiplog-worker/src/
- **Commit:** b67bc72

## Verification Results

All must_have criteria confirmed:
- `grep -ri "shiplog" shiplog/src/ shiplog/package.json shiplog-worker/src/ shiplog-worker/wrangler.jsonc shiplog-worker/package.json` returns empty
- `grep -c "shipcard" shiplog/package.json` returns 4 (name + description + 2 bin entries)
- `grep 'route.*"/u"' shiplog-worker/src/index.ts` returns `app.route("/u", cardRoutes)`
- `grep "custom_domain" shiplog-worker/wrangler.jsonc` returns `"custom_domain": true`
- `grep "shipcard.dev" shiplog-worker/wrangler.jsonc` returns the pattern entry

## Next Phase Readiness

- npm publish can proceed: package name is `shipcard`, bin entries correct
- Worker deploy can proceed: wrangler.jsonc has `name: shipcard` and `shipcard.dev` custom domain
- Still pending: fill `SHIPCARD_GITHUB_CLIENT_ID` with real OAuth App client ID before publish
- Still pending: replace KV namespace ID placeholders in wrangler.jsonc before deploy
