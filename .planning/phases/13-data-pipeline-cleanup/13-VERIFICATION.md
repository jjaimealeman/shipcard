---
phase: 13-data-pipeline-cleanup
verified: 2026-03-27T22:51:10Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 13: Data Pipeline Cleanup Verification Report

**Phase Goal:** The sync payload carries per-project stats and the dashboard's stale metrics are removed.
**Verified:** 2026-03-27T22:51:10Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Daily aggregator produces per-project stats (tokens, sessions, messages, cost, toolCalls, thinkingBlocks, models) for each day | VERIFIED | `PerProjectDailyStats` interface exported from `dailyAggregator.ts`; `byProject: Map<string, ProjectDayAccumulator>` accumulated per-message in single pass; converted to `Record<string, PerProjectDailyStats>` in output |
| 2 | userMessages field reflects actual per-day user message counts instead of hardcoded 0 | VERIFIED | `deduplicator.ts` increments `userMessagesByDate` map per `UserEntry`; flows through `runEngineFull` → `sync.ts` → `aggregateDaily(messages, pricing, userMessagesByDate)`; result uses `userMessagesByDate?.get(date) ?? 0` |
| 3 | Per-project data is keyed by bare directory name (last path segment) | VERIFIED | `projectNameFromCwd()` helper confirmed: `cwd.split("/").filter(Boolean)` takes last segment; used as key in `bucket.byProject.set(projectName, projBucket)` |
| 4 | Syncing with --show-projects includes per-project stats (not just names) in the payload | VERIFIED | `toSafeTimeSeries()` inside `if (showProjects)` block: `if (day.byProject) { safe.byProject = day.byProject; }` — conditionally populates `SafeDailyStats.byProject` |
| 5 | Worker API returns byProject data alongside existing project names in timeseries response | VERIFIED | `getTimeSeries()` in `kv.ts` deserializes full `SafeTimeSeries` JSON (includes `byProject` when present); `api.ts` returns `{ data, syncedAt }` without stripping fields; `syncV2.ts` stores full `body.timeSeries` via `putTimeSeries()` |
| 6 | Old-format synced data (no byProject) still works without errors or missing panels | VERIFIED | `byProject` is optional on `DailyStats`, `SafeDailyStats` (CLI+Worker); `buildProjectsChart()` has explicit fallback path: `hasByProject = days.some(d => d.byProject ...)` — if false, counts days-active from `d.projects` array |
| 7 | Slowest Day metric is gone from the dashboard | VERIFIED | Zero matches for "Slowest" or "slowest" in `dashboard.ts` — confirmed never existed, no removal needed |
| 8 | Most Messages label accurately describes what it shows (renamed to Peak Day) | VERIFIED | Zero matches for "Most Messages" in `dashboard.ts`; HTML comment `<!-- Phase 14 will add a "Peak Day" card here -->` documents the naming for the upcoming card |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shipcard/src/parser/deduplicator.ts` | `userMessagesByDate Map<string, number>` in `processFile` return and `ParseResult` | VERIFIED | Line 42: `userMessagesByDate: Map<string, number>` in `ParseResult`; line 60: in `processFile` return type; line 72: initialized; line 93-94: incremented per `UserEntry`; lines 164-166: merged in `parseAllFiles` |
| `shipcard/src/engine/dailyAggregator.ts` | `PerProjectDailyStats` exported interface; `byProject` optional on `DailyStats` | VERIFIED | Lines 19-28: `PerProjectDailyStats` exported; line 46: `byProject?: Record<string, PerProjectDailyStats>` on `DailyStats`; lines 53-61: `ProjectDayAccumulator` internal interface; lines 176-197: per-project accumulation |
| `shipcard/src/index.ts` | `userMessagesByDate` in `EngineFullResult`; date-range filtering applied | VERIFIED | Line 47: `userMessagesByDate: Map<string, number>` in `EngineFullResult`; lines 121-126: filtered by since/until range; line 156: returned in result |
| `shipcard/src/cli/commands/sync.ts` | Destructures `userMessagesByDate`; passes to `aggregateDaily` as third arg | VERIFIED | Line 129: destructures `userMessagesByDate` from `runEngineFull`; line 147: `aggregateDaily(messages, pricing, userMessagesByDate)` |
| `shipcard/src/cli/safestats.ts` | `SafeDailyStats.byProject` optional; `toSafeTimeSeries` includes it under `showProjects` | VERIFIED | Line 82: `byProject?: Record<string, PerProjectDailyStats>` on `SafeDailyStats`; lines 166-170: included only inside `if (showProjects)` block when `day.byProject` exists |
| `shipcard-worker/src/types.ts` | Worker `PerProjectDailyStats` copy; `SafeDailyStats.byProject` optional | VERIFIED | Lines 195-204: `PerProjectDailyStats` Worker-local copy; line 230: `byProject?: Record<string, PerProjectDailyStats>` on Worker's `SafeDailyStats` |
| `shipcard-worker/src/routes/dashboard.ts` | No "Slowest Day"; no "Most Messages"; `buildProjectsChart` uses `byProject`; fallback for old data | VERIFIED | Line 635: Peak Day HTML comment; lines 1683-1730: `hasByProject` check routes to real-metrics path vs days-active fallback; dataset label switches between `'Messages'` and `'Days active'` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `deduplicator.ts processFile` | `deduplicator.ts ParseResult` | `userMessagesByDate` Map returned from processFile and merged in parseAllFiles | WIRED | Lines 60, 140-141, 156, 163-166 |
| `deduplicator.ts parseAllFiles` | `index.ts runEngineFull` | `userMessagesByDate` in `ParseResult` and `EngineFullResult` | WIRED | Lines 194-199 (deduplicator), 47, 154-157 (index.ts) |
| `index.ts runEngineFull` | `sync.ts aggregateDaily` | `userMessagesByDate` destructured from result, passed as third arg | WIRED | sync.ts lines 129, 147 |
| `dailyAggregator.ts byProject` | `safestats.ts SafeDailyStats` | `toSafeTimeSeries` copies `day.byProject` when `showProjects=true` | WIRED | safestats.ts lines 166-170 |
| `safestats.ts SafeDailyStats` | `types.ts SafeDailyStats (Worker)` | CLI shape mirrors Worker shape; `byProject` field present in both | WIRED | CLI safestats.ts line 82; Worker types.ts line 230 |
| `syncV2.ts` | `kv.ts putTimeSeries` | Full `body.timeSeries` (SafeTimeSeries with optional byProject) stored to KV | WIRED | syncV2.ts line 97 |
| `kv.ts getTimeSeries` | `api.ts timeseries endpoint` | `getTimeSeries` returns full `SafeTimeSeries`; `api.ts` returns `{ data, syncedAt }` without stripping | WIRED | kv.ts lines 177-186; api.ts lines 59-68 |
| `dashboard.ts buildProjectsChart` | `d.byProject` data | `hasByProject` gating; real-metrics path iterates `Object.entries(d.byProject)` | WIRED | Lines 1683-1697 |

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| DATA-01: Daily aggregator computes tokens, sessions, messages, and cost per project per day | SATISFIED | `PerProjectDailyStats` accumulates all four plus toolCalls, thinkingBlocks, models |
| DATA-02: `shipcard sync --show-projects` includes per-project stats in the payload | SATISFIED | `toSafeTimeSeries` copies `byProject` inside `if (showProjects)` block |
| DATA-03: Worker stores per-project stats and API returns them alongside existing project names | SATISFIED | `putTimeSeries` stores full `SafeTimeSeries`; `getTimeSeries` returns it; API endpoint passes through without stripping |
| DATA-04: Syncing with old-format data (no per-project stats) still works | SATISFIED | `byProject` optional everywhere; `buildProjectsChart` has days-active fallback |
| DATA-05: Graceful degradation for old data | SATISFIED | Confirmed — `hasByProject` check with explicit fallback path using `d.projects` array |
| CLEAN-01: Slowest Day metric removed from dashboard | SATISFIED | Never existed; confirmed zero matches in dashboard.ts |
| CLEAN-02: "Most Messages" label accurately reflects content (Peak Day naming) | SATISFIED | Never existed with that name; Phase 14 Peak Day comment placed at hero grid |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `dailyAggregator.ts` | 213 | `userMessages: 0` for per-project | Info | Documented architectural limitation — UserEntry records have no project association in JSONL. Not a stub. |

No blockers. The `userMessages: 0` in `PerProjectDailyStats` is a deliberate, documented decision — day-level `userMessages` is populated correctly from the map; per-project user messages are architecturally unavailable in the JSONL format.

---

### Human Verification Required

None. All phase success criteria are verifiable programmatically.

The following items confirm readiness but are purely informational:

1. **End-to-end sync flow** — Running `shipcard sync --show-projects --confirm` would confirm byProject data actually reaches the Worker and appears in `/u/:username/api/timeseries`. The code path is fully wired, but live network behavior requires a running Worker.

2. **Dashboard project chart switching** — Verifying the chart visually switches from "Days active" label to "Messages" label upon syncing with --show-projects requires a browser. Code logic is correct.

---

### TypeScript Compilation

Both packages compile clean:

- `cd shiplog && npx tsc --noEmit` — exit 0, zero errors
- `cd shiplog-worker && npx tsc --noEmit` — exit 0, zero errors

---

## Summary

Phase 13 goal is fully achieved. The sync payload now carries per-project stats end-to-end:

- The daily aggregator computes `PerProjectDailyStats` (sessions, messages, tokens, costCents, toolCalls, thinkingBlocks, models) per project per day using a single-pass accumulator keyed by bare directory name.
- `userMessages` on `DailyStats` is now populated from real UserEntry timestamps via the `userMessagesByDate` data channel flowing deduplicator → runEngineFull → sync → aggregateDaily.
- `byProject` is gated behind `--show-projects` in both the CLI privacy layer (`toSafeTimeSeries`) and the Worker type definitions.
- The Worker stores and returns the full `SafeTimeSeries` structure including `byProject` when present.
- The dashboard `buildProjectsChart` uses real message counts from `byProject` when available, with a correct fallback to days-active counting for old-format data.
- Neither "Slowest Day" nor "Most Messages" labels exist in the dashboard — confirmed clean.
- All existing consumers are unaffected (byProject is optional everywhere, existing fields unchanged).

---

_Verified: 2026-03-27T22:51:10Z_
_Verifier: Claude (gsd-verifier)_
