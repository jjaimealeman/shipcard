---
phase: 04-cloud-worker
plan: 03
subsystem: cli-sync
tags: [cloudflare-workers, hono, github-oauth, device-flow, octokit, safestats, privacy, configurator, svg, typescript]

# Dependency graph
requires:
  - phase: 04-cloud-worker
    plan: 02
    provides: "POST /auth/exchange + POST /sync + DELETE /sync Worker endpoints"
  - phase: 04-cloud-worker
    plan: 01
    provides: "KV helpers, SafeStats type, SVG renderer"

provides:
  - GitHub OAuth device flow login (createOAuthDeviceAuth) + Worker token exchange
  - SafeStats privacy boundary function (toSafeStats) — converts AnalyticsResult, strips all private data
  - Auth config persistence in ~/.shipcard/config.json
  - shiplog login CLI command
  - shiplog sync CLI command (preview + configurator, --confirm, --delete modes)
  - GET /configure Worker endpoint — self-contained HTML configurator with live SVG preview

affects:
  - Phase 5 (publishing, docs, onboarding — login/sync are the primary user workflow)

# Tech tracking
tech-stack:
  added:
    - "@octokit/auth-oauth-device ^7.1.5 — GitHub device flow OAuth"
  patterns:
    - "Privacy boundary: toSafeStats() strips projectsTouched names, byProject, meta fields before any cloud transmission"
    - "Auth config in ~/.shipcard/config.json separate from display config ~/.shiplog.json"
    - "Configurator stats passed client-side via URL hash fragment (base64 JSON) — never touches server"
    - "All user-derived SVG values escaped via escXml() before innerHTML insertion"

key-files:
  created:
    - shipcard/src/cli/safestats.ts
    - shipcard/src/cli/commands/login.ts
    - shipcard/src/cli/commands/sync.ts
    - shipcard-worker/src/routes/configure.ts
  modified:
    - shipcard/src/cli/config.ts
    - shipcard/src/cli/args.ts
    - shipcard/src/cli/index.ts
    - shipcard/package.json
    - shipcard-worker/src/types.ts
    - shipcard-worker/src/index.ts

key-decisions:
  - "SafeStats.totalTokens uses cacheCreate (not cacheCreation) — aligned to local TokenCounts field name"
  - "Auth config in ~/.shipcard/config.json (new dir), display config stays at ~/.shiplog.json"
  - "Configurator served as self-contained HTML with inline CSS/JS — no build step, no external deps"
  - "Stats passed to configurator via hash fragment — server never sees the data, privacy preserved"
  - "escXml() used for all user data in SVG output blocks; output section uses DOM API (no innerHTML on user content)"
  - "SHIPLOG_GITHUB_CLIENT_ID is a placeholder constant — user fills in after creating OAuth App"

patterns-established:
  - "toSafeStats() is the single privacy gate — all fields explicitly whitelisted, nothing leaked implicitly"
  - "loadAuthConfig/saveAuthConfig separate from loadConfig (display) — credential isolation"

# Metrics
duration: 8min
completed: 2026-03-26
---

# Phase 4 Plan 3: CLI Login/Sync Summary

**GitHub OAuth device flow + SafeStats privacy boundary + shiplog login/sync CLI commands + Worker-hosted browser configurator completing the full Phase 4 pipeline**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-26T02:12:52Z
- **Completed:** 2026-03-26T02:20:44Z
- **Tasks:** 2
- **Files modified:** 10 (4 created, 6 modified)

## Accomplishments

- `toSafeStats()` privacy boundary converts AnalyticsResult to SafeStats — strips projectsTouched names, byProject breakdown, and all meta fields; only numeric aggregates reach the cloud
- `shiplog login` completes GitHub OAuth device flow via `@octokit/auth-oauth-device`, verifies identity against api.github.com/user, exchanges for Worker bearer token via POST /auth/exchange, persists to ~/.shipcard/config.json
- `shiplog sync` previews payload in terminal (sessions, tokens, cost, models, projects count) and opens browser configurator with stats as base64 hash fragment
- `shiplog sync --confirm` POSTs SafeStats with bearer auth and prints card URL + Markdown/HTML embed snippets
- `shiplog sync --delete` sends DELETE /sync to wipe all user data from cloud
- GET /configure serves a self-contained HTML page with stat toggles, layout/style/theme dropdowns, live SVG preview (classic/compact/hero), localStorage persistence per username, and generated CLI command + embed snippets
- Full Phase 4 pipeline complete: `shiplog login` → `shiplog sync` → configurator → `shiplog sync --confirm` → card served at /card/:username

## Task Commits

Each task was committed atomically:

1. **Task 1: SafeStats conversion, config persistence, and login command** — `6b83078` (feat)
2. **Task 2: Sync command and Worker-hosted configurator page** — `bb0df7e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `shipcard/src/cli/safestats.ts` — `toSafeStats(result, username): SafeStats` privacy boundary function + SafeStats interface
- `shipcard/src/cli/commands/login.ts` — GitHub device flow + GitHub user fetch + Worker token exchange + config save
- `shipcard/src/cli/commands/sync.ts` — three sync modes: default (preview + browser), --confirm (POST), --delete (DELETE)
- `shipcard-worker/src/routes/configure.ts` — self-contained HTML configurator with SVG renderer, stat toggles, appearance pickers
- `shipcard/src/cli/config.ts` — added ShiplogAuthConfig, loadAuthConfig, saveAuthConfig, getWorkerUrl (new ~/.shipcard/config.json location)
- `shipcard/src/cli/args.ts` — added --confirm and --delete flags
- `shipcard/src/cli/index.ts` — added login/sync routing + updated help text
- `shipcard/package.json` — added @octokit/auth-oauth-device ^7.1.5
- `shipcard-worker/src/types.ts` — fixed SafeStats.totalTokens.cacheCreation -> cacheCreate (field name alignment bug)
- `shipcard-worker/src/index.ts` — registered /configure route

## Decisions Made

- **cacheCreate vs cacheCreation:** The Worker's SafeStats type had `cacheCreation` but the local engine's TokenCounts uses `cacheCreate`. Fixed both to `cacheCreate` so the CLI payload passes the Worker's `isValidSafeStats()` validator.
- **Separate auth config directory:** Auth credentials go in `~/.shipcard/config.json` (new directory), display preferences stay at `~/.shiplog.json`. Mirrors the pattern used by tools like GitHub CLI (`~/.config/gh/`).
- **Configurator uses hash fragment:** Stats data is encoded as base64 JSON in the URL hash (`#...`), so it never reaches the Worker — it's parsed entirely client-side. This preserves the privacy guarantee even for the browser-based preview.
- **SHIPLOG_GITHUB_CLIENT_ID placeholder:** The GitHub OAuth App client ID is a hardcoded constant that the user must fill in after creating their OAuth App at github.com/settings/developers. Documented in the constant's JSDoc comment.
- **Self-contained configurator:** No build step, no external deps, no CDN calls. The entire page is a single TypeScript string constant served as HTML. Works offline once loaded.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SafeStats token field name mismatch (cacheCreation vs cacheCreate)**

- **Found during:** Task 1 (shiplog build failed)
- **Issue:** Worker's `SafeStats` interface used `totalTokens.cacheCreation` but local `TokenCounts` (the actual source) uses `cacheCreate`. The CLI would produce payloads that fail the Worker's `isValidSafeStats()` type guard, causing all syncs to return 400.
- **Fix:** Updated `shipcard-worker/src/types.ts` SafeStats interface and `isValidSafeStats()` validator to use `cacheCreate`; updated `safestats.ts` to match.
- **Files modified:** `shipcard-worker/src/types.ts`, `shipcard/src/cli/safestats.ts`
- **Verification:** Both `npm run build` and `npx tsc --noEmit` pass
- **Committed in:** `6b83078` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential correctness fix — without it, all sync operations would fail with 400 Invalid SafeStats payload. No scope creep.

## Issues Encountered

None beyond the cacheCreation/cacheCreate mismatch documented above.

## User Setup Required

The `SHIPLOG_GITHUB_CLIENT_ID` constant in `shipcard/src/cli/commands/login.ts` must be replaced with the actual GitHub OAuth App client ID before the CLI can authenticate. Steps:

1. Go to https://github.com/settings/developers → OAuth Apps → New OAuth App
2. Set Authorization callback URL to: `https://shiplog.workers.dev/auth/callback`
3. Copy the Client ID
4. Replace `YOUR_GITHUB_OAUTH_APP_CLIENT_ID` in `login.ts`
5. Set `GITHUB_CLIENT_SECRET` in the Worker via `wrangler secret put GITHUB_CLIENT_SECRET`

## Next Phase Readiness

- Phase 4 is complete — all routes working, CLI commands implemented, privacy boundary enforced
- Phase 5 (publish to npm, documentation, onboarding) can proceed
- The Worker needs to be deployed (`wrangler deploy`) before end-to-end testing of login/sync

---
*Phase: 04-cloud-worker*
*Completed: 2026-03-26*
