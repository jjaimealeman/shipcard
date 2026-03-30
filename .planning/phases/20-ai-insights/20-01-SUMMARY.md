---
phase: 20-ai-insights
plan: 01
subsystem: api
tags: [cloudflare-workers-ai, insights, compute, typescript, llama]

# Dependency graph
requires:
  - phase: 18-stripe-subscriptions
    provides: Env interface with Stripe bindings (types.ts base)
  - phase: 19-pro-card-features
    provides: SafeTimeSeries + SafeDailyStats types used as insight input
provides:
  - InsightResult, PeakHoursInsight, PeakDaysInsight, CostTrendInsight, StreakInsight type interfaces
  - computePeakHours, computePeakDays, computeCostTrend, computeStreak, computeAllInsights pure functions
  - buildNarrativePrompt and callWorkersAI for Workers AI LLM integration
  - AI: Ai binding in Env interface and wrangler.jsonc
affects:
  - 20-02 (syncV2 route: calls computeAllInsights + callWorkersAI)
  - 20-03 (KV helpers: putInsights/getInsights use InsightResult)
  - 20-04 (dashboard UI: renders InsightResult fields)

# Tech tracking
tech-stack:
  added:
    - "@cf/meta/llama-3.2-1b-instruct via Workers AI binding (no npm package)"
  patterns:
    - "Pure compute functions: all insight functions are side-effect-free, input→output only"
    - "Optional peakHours: undefined return when hourlyActivity not in payload (privacy-safe)"
    - "costCents integer arithmetic throughout: never floating point for cost comparisons"
    - "getWeekStart() uses (dow + 6) % 7 for Mon=0 ISO week offset"

key-files:
  created:
    - shipcard-worker/src/insights/types.ts
    - shipcard-worker/src/insights/compute.ts
    - shipcard-worker/src/insights/narrative.ts
  modified:
    - shipcard-worker/src/types.ts
    - shipcard-worker/wrangler.jsonc

key-decisions:
  - "BaseAiTextGenerationModels type cast rejected by tsc — used string literal directly (correct per Ai.run() generic signature)"
  - "hourlyActivity?: number[] added to SafeDailyStats in Worker types.ts (optional, mirrors CLI change in dailyAggregator.ts)"
  - "peakHours returns undefined when no hourlyActivity data — caller handles gracefully (no crash on old payloads)"

patterns-established:
  - "Insight compute: import SafeDailyStats from ../types.js, output types from ./types.js"
  - "Workers AI call: ai.run('@cf/meta/llama-3.2-1b-instruct', { messages, max_tokens: 150 })"
  - "AI binding: AI: Ai in Env interface + ai.binding in wrangler.jsonc"

# Metrics
duration: 8min
completed: 2026-03-29
---

# Phase 20 Plan 01: Insight Types and Compute Summary

**Pure insight computation engine: 5 typed functions transform SafeTimeSeries days into peak hours, peak days, cost trends, and streaks, plus Workers AI llama-3.2-1b-instruct narrative integration with Cloudflare native binding.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-30T01:43:20Z
- **Completed:** 2026-03-30T01:51:00Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments
- Created complete type definitions for all 4 insight sub-types plus InsightResult
- Implemented 5 pure compute functions (peakHours, peakDays, costTrend, streak, allInsights)
- Built Workers AI narrative module with prompt construction and callWorkersAI()
- Wired AI binding into both Env interface and wrangler.jsonc
- Added optional `hourlyActivity` to SafeDailyStats to support future hourly granularity data

## Task Commits

1. **Task 1: Create insight types and pure compute functions** - `512c592` (feat)
2. **Task 2: Create Workers AI narrative module and add AI binding** - `692bf2c` (feat)

**Plan metadata:** `[pending docs commit]` (docs: complete plan)

## Files Created/Modified
- `shipcard-worker/src/insights/types.ts` - InsightResult and sub-interfaces
- `shipcard-worker/src/insights/compute.ts` - All 5 pure compute functions + getWeekStart helper
- `shipcard-worker/src/insights/narrative.ts` - buildNarrativePrompt + callWorkersAI
- `shipcard-worker/src/types.ts` - Added AI: Ai to Env, hourlyActivity? to SafeDailyStats
- `shipcard-worker/wrangler.jsonc` - Added ai binding block

## Decisions Made

- **BaseAiTextGenerationModels was the wrong cast type** — tsc rejected it. Used the model string literal directly as `"@cf/meta/llama-3.2-1b-instruct"` which satisfies the `Name extends keyof AiModels` generic constraint on `Ai.run()`. The correct ambient type is `BaseAiTextGeneration` but it's the value type, not the key type.
- **hourlyActivity added to SafeDailyStats** — The plan describes computePeakHours() consuming `day.hourlyActivity`. The field doesn't exist in the current type, but the dailyAggregator.ts already has an uncommitted change adding it. Added the optional field to the Worker's copy of the type (Worker maintains its own copy per existing comment).
- **peakHours returns undefined not empty object** — When no days have hourlyActivity, returning undefined is cleaner than `{ hourlyTotals: [], topHours: [] }`. Callers can safely check `if (insights.peakHours)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed BaseAiTextGenerationModels type cast**
- **Found during:** Task 2 (narrative module)
- **Issue:** Plan specified `"@cf/meta/llama-3.2-1b-instruct" as BaseAiTextGenerationModels` but this type doesn't exist. tsc error: "Cannot find name 'BaseAiTextGenerationModels'. Did you mean 'BaseAiTextGeneration'?"
- **Fix:** Removed the cast entirely — the string literal is used directly as it satisfies `keyof AiModels` generic constraint
- **Files modified:** shipcard-worker/src/insights/narrative.ts
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 692bf2c (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added hourlyActivity to SafeDailyStats**
- **Found during:** Task 1 (compute.ts references day.hourlyActivity)
- **Issue:** SafeDailyStats in types.ts didn't have hourlyActivity field; compute.ts would fail to compile
- **Fix:** Added `hourlyActivity?: number[]` as optional field to SafeDailyStats
- **Files modified:** shipcard-worker/src/types.ts
- **Verification:** `npx tsc --noEmit` exits 0 with full type safety
- **Committed in:** 512c592 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 missing critical type field)
**Impact on plan:** Both necessary for compilation. No scope creep.

## Issues Encountered

None beyond the type fixes documented as deviations.

## Next Phase Readiness

- Insight engine is complete and type-safe
- Ready for Plan 02: syncV2 route integration (call computeAllInsights, fire callWorkersAI via ctx.waitUntil)
- Ready for Plan 03: KV helpers (putInsights/getInsights using InsightResult)
- InsightResult has computedAt field for "last updated" badges in dashboard

---
*Phase: 20-ai-insights*
*Completed: 2026-03-29*
