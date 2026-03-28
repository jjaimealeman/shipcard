---
phase: 09
plan: "02"
name: safetimeseries-privacy-v2-sync
subsystem: cli-sync
tags: [typescript, cli, sync, privacy, time-series, cloudflare-worker]

depends-on:
  requires: [09-01]
  provides:
    - SafeTimeSeries type and toSafeTimeSeries converter in safestats.ts
    - SafeDailyStats interface (DailyStats with optional projects)
    - --show-projects flag in CLI args
    - runEngineFull() exporting both AnalyticsResult and ParsedMessage[]
    - sync command v2 endpoint with 404-based graceful fallback
  affects: [Phase 10 Worker v2 endpoint, dashboard time-series display]

tech-stack:
  added: []
  patterns:
    - Privacy-by-default time-series envelope (projects stripped unless --show-projects)
    - Graceful degradation via 404 fallback (v2 → v1 on old Worker)
    - runEngineFull() avoids double-parse for consumers needing raw messages

key-files:
  created: []
  modified:
    - shiplog/src/cli/safestats.ts
    - shiplog/src/cli/args.ts
    - shiplog/src/cli/commands/sync.ts
    - shiplog/src/cli/index.ts
    - shiplog/src/index.ts

decisions:
  - id: privacy-by-default
    choice: "projects stripped from SafeDailyStats unless --show-projects explicitly set"
    rationale: "Privacy-first default; project names are identifying, user must opt in"
  - id: 404-fallback-only
    choice: "Only 404 triggers v1 fallback; other errors (401, 500) exit with message"
    rationale: "404 means Worker not upgraded yet; other errors are real failures that should surface"
  - id: run-engine-full
    choice: "runEngineFull() returns both AnalyticsResult + ParsedMessage[] from single parse"
    rationale: "Daily aggregation needs raw messages; double-parse would be wasteful and incorrect"
  - id: combined-v2-payload
    choice: "POST /sync/v2 sends { safeStats, timeSeries } — both v1 and v2 data in one request"
    rationale: "Worker can validate/store both; backward-compatible with future Worker v2 logic"
  - id: parsed-message-reexport
    choice: "ParsedMessage re-exported from src/index.ts"
    rationale: "External consumers (CLI sync command) need the type without deep imports into parser/"

metrics:
  duration: "~4 min"
  completed: "2026-03-26"
---

# Phase 9 Plan 02: SafeTimeSeries Privacy Envelope & v2 Sync Summary

**One-liner:** Added SafeTimeSeries privacy wrapper (projects stripped by default), --show-projects CLI flag, and upgraded sync command to POST /sync/v2 with graceful 404 fallback to /sync v1.

## What Was Built

### Task 1: SafeTimeSeries type + toSafeTimeSeries + --show-projects flag

`shiplog/src/cli/safestats.ts` extended with three new exports (existing SafeStats and toSafeStats untouched):

- `SafeDailyStats` — mirrors DailyStats but with `projects?: string[]` (optional, omitted by default)
- `SafeTimeSeries` — wraps `SafeDailyStats[]` with `username`, `version: 2`, and `generatedAt: string`
- `toSafeTimeSeries(days, username, showProjects)` — converts DailyStats[] → SafeTimeSeries, stripping project names unless `showProjects=true`

`shiplog/src/cli/args.ts` updated with:
- `showProjects: boolean` added to `ParsedCliArgs.flags` interface
- `"show-projects": { type: "boolean", default: false }` in parseArgs options
- `showProjects: (flags["show-projects"] as boolean | undefined) ?? false` in the flags return object

### Task 2: runEngineFull + v2 sync with 404 fallback

`shiplog/src/index.ts` refactored:
- New `EngineFullResult` interface: `{ result: AnalyticsResult; messages: ParsedMessage[] }`
- New `runEngineFull(options?)` — identical implementation to old `runEngine` but returns both result and filtered messages
- `runEngine` simplified to delegate to `runEngineFull` and return just `result`
- `ParsedMessage` added to re-exports (was missing)

`shiplog/src/cli/commands/sync.ts` upgraded:
- `SyncFlags` interface gains `showProjects: boolean`
- Import changed from `runEngine` to `runEngineFull`
- After engine run, `aggregateDaily(messages, pricing)` + `toSafeTimeSeries(...)` builds the v2 payload
- Sync preview now shows `Days: N` line; when `--show-projects`, shows project names; otherwise shows count with "(names hidden)"
- `--confirm` path: tries `POST /sync/v2` with `{ safeStats, timeSeries }` payload first
  - 404 → logs "Worker v2 not available, using v1..." and falls back to `POST /sync` with SafeStats only
  - Non-404 error → exits with error message (no fallback)
  - Network failure → exits with error message (no fallback)

`shiplog/src/cli/index.ts` updated with `--show-projects` in the Sync flags help section.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Privacy default | projects omitted from SafeDailyStats | Project names are identifying; user must explicitly opt in |
| Fallback trigger | 404 only triggers v1 fallback | Other errors (401, 500) are real failures that should surface |
| Engine refactor | runEngineFull returns ParsedMessage[] | Avoids double-parse; daily aggregation needs raw messages |
| v2 payload shape | `{ safeStats, timeSeries }` combined | Worker can validate/store both; clean versioned contract |
| ParsedMessage re-export | Added to src/index.ts | Clean import path for CLI consumers |

## Deviations from Plan

None — plan executed exactly as written.

## TypeScript Compile Status

`npx tsc --noEmit` and `npm run build` pass with zero errors after both tasks.

## Next Phase Readiness

- Phase 10 (Worker v2 endpoint) can now accept `POST /sync/v2` with `{ safeStats, timeSeries }` payload
- Until Worker is upgraded, existing deployments handle requests transparently via 404 fallback
- `SafeTimeSeries` shape is stable and ready for Worker v2 KV storage implementation
- `--show-projects` flag is wired end-to-end and ready for user-facing documentation
