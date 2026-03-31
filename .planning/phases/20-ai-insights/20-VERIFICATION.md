---
phase: 20-ai-insights
verified: 2026-03-30T02:00:05Z
status: gaps_found
score: 7/11 must-haves verified
gaps:
  - truth: "Cost Trend card shows weekly cost comparison with trend direction indicator"
    status: failed
    reason: "Dashboard template accesses costTrend.weeks and costTrend.direction, but InsightResult stores costTrend.weeklyTotals (array of {weekStart, costCents} objects) and costTrend.trend. Field names don't match — the card always renders its empty-state fallback."
    artifacts:
      - path: "shipcard-worker/src/routes/dashboard.ts"
        issue: "Line 2219: accesses data.costTrend.weeks — field does not exist. Line 2223: accesses data.costTrend.direction — field is named .trend in InsightResult. Line 2221: formatCost called with an object element {weekStart, costCents}, not a number."
      - path: "shipcard-worker/src/insights/types.ts"
        issue: "CostTrendInsight has weeklyTotals: Array<{weekStart:string;costCents:number}> and trend: 'up'|'down'|'flat' — correct, but dashboard doesn't match"
    missing:
      - "Dashboard: change data.costTrend.weeks → data.costTrend.weeklyTotals"
      - "Dashboard: change data.costTrend.direction → data.costTrend.trend"
      - "Dashboard: formatCost call should pass element.costCents (number), not the whole element object"
      - "Dashboard: the mini week row should map over weeklyTotals and access .costCents"

  - truth: "Coding Streak card shows current streak, longest streak, and active days this week"
    status: failed
    reason: "Dashboard accesses data.streak.current and data.streak.longest, but InsightResult stores streak.currentStreak and streak.longestStreak. The card will always show undefined values."
    artifacts:
      - path: "shipcard-worker/src/routes/dashboard.ts"
        issue: "Line 2245: x-text='data.streak.current' — field is named currentStreak. Line 2247: same for streak.current in singular/plural check. Line 2249: x-text='data.streak.longest' — field is named longestStreak."
      - path: "shipcard-worker/src/insights/types.ts"
        issue: "StreakInsight has currentStreak, longestStreak, activeDaysThisWeek — correct, dashboard doesn't match"
    missing:
      - "Dashboard: change data.streak.current → data.streak.currentStreak (both occurrences)"
      - "Dashboard: change data.streak.longest → data.streak.longestStreak"

  - truth: "Peak Activity card shows peak coding hours (if available) or peak days of week"
    status: failed
    reason: "Dashboard treats data.peakHours and data.peakDays as flat arrays, but InsightResult nests them as objects: peakHours = {hourlyTotals, topHours} and peakDays = {topDays}. The conditional data.peakHours.length > 0 will always be falsy (objects don't have .length), and the for-loop iterates data.peakHours.slice(0,3) which is also wrong."
    artifacts:
      - path: "shipcard-worker/src/routes/dashboard.ts"
        issue: "Line 2179: data.peakHours.length > 0 — peakHours is an object {hourlyTotals, topHours}, not an array. Line 2181: x-for in data.peakHours.slice(0,3) — should be data.peakHours.topHours.slice(0,3). Line 2186: data.peakHours[0].totalSessions — should be data.peakHours.topHours[0].totalSessions. Lines 2195-2202: same issue with data.peakDays — should be data.peakDays.topDays."
    missing:
      - "Dashboard: change guard to data.peakHours && data.peakHours.topHours && data.peakHours.topHours.length > 0"
      - "Dashboard: change x-for loop to iterate data.peakHours.topHours.slice(0,3)"
      - "Dashboard: change denominator to data.peakHours.topHours[0].totalSessions"
      - "Dashboard: change peak days guard to data.peakDays && data.peakDays.topDays && data.peakDays.topDays.length > 0"
      - "Dashboard: change x-for loop to iterate data.peakDays.topDays.slice(0,3)"
      - "Dashboard: change denominator to data.peakDays.topDays[0].avgSessions"
      - "Dashboard: change conditional for no-data case to check topDays array"
---

# Phase 20: AI Insights Verification Report

**Phase Goal:** PRO users see pre-computed weekly coding insights on their dashboard that update automatically on each sync.
**Verified:** 2026-03-30T02:00:05Z
**Status:** gaps_found — 3 data field mismatches between API types and dashboard templates
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PRO dashboard shows weekly insights panel (peak coding hours, cost trends, activity streaks) | PARTIAL | Panel exists and renders, but 3 cards show empty/fallback due to field name mismatches |
| 2 | Insights are pre-computed at sync time (not live LLM on page load) | VERIFIED | syncV2 calls computeAllInsights + putInsights; dashboard fetches /api/insights endpoint; no LLM call in dashboard route |
| 3 | After `shipcard sync`, insights reflect latest data (better than cron) | VERIFIED | syncV2 handler computes on every POST /sync/v2; PRO users get AI narrative via ctx.waitUntil (non-blocking) |
| 4 | Free users see real data with limited depth (14-day window, no upgrade banners in panel) | VERIFIED | computeAllInsights uses windowDays=14 for free; no upgrade text inside the insights panel block (lines 2142–2263) |
| 5 | Dashboard shows an Insights section with 3 insight cards | VERIFIED | Section exists at dashboard.ts:2142–2263 with Peak Activity, Cost Trend, Coding Streak cards |
| 6 | Peak Activity card shows peak coding hours or peak days of week | FAILED | Card exists but accesses data.peakHours as array (it's an object); both peakHours and peakDays checks fail |
| 7 | Cost Trend card shows weekly cost comparison with trend direction | FAILED | Card accesses costTrend.weeks (actual: weeklyTotals) and costTrend.direction (actual: trend); always shows empty state |
| 8 | Coding Streak card shows current streak, longest streak, active days | FAILED | Card accesses streak.current/streak.longest (actual: currentStreak/longestStreak); displays undefined |
| 9 | PRO users see AI narrative card when narrative data exists | VERIFIED | template x-if="data.narrative" at line 2165; narrative-card renders correctly when present |
| 10 | Users who have never synced see empty state (not error) | VERIFIED | 404 response sets empty=true, shows "Run shipcard sync" message |
| 11 | Stale data shows "Last updated X days ago" badge | VERIFIED | staleDays computed from computedAt; badge renders when staleDays > 3 |

**Score:** 7/11 truths verified (3 truths failed due to same root cause: Alpine template field name mismatches)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shipcard-worker/src/insights/types.ts` | InsightResult and sub-interfaces | VERIFIED | 54 lines, all 5 interfaces exported |
| `shipcard-worker/src/insights/compute.ts` | computePeakHours, computePeakDays, computeCostTrend, computeStreak, computeAllInsights | VERIFIED | 248 lines, all 5 functions + getWeekStart helper exported |
| `shipcard-worker/src/insights/narrative.ts` | buildNarrativePrompt, callWorkersAI | VERIFIED | 86 lines, both functions exported, llama-3.2-1b-instruct, max_tokens:150 |
| `shipcard-worker/src/types.ts` | AI: Ai in Env, hourlyActivity in SafeDailyStats | VERIFIED | AI: Ai at line 37, hourlyActivity?: number[] at line 248 |
| `shipcard-worker/wrangler.jsonc` | ai binding block | VERIFIED | "ai" block present at line 30 |
| `shipcard-worker/src/kv.ts` | getInsights(), putInsights() | VERIFIED | Both exported at lines 211 and 228 |
| `shipcard-worker/src/routes/syncV2.ts` | computeAllInsights wired, ctx.waitUntil for PRO AI | VERIFIED | Lines 164-184: computeAllInsights called, putInsights stores immediately, waitUntil fires narrative for PRO |
| `shipcard-worker/src/routes/api.ts` | GET /:username/api/insights endpoint | VERIFIED | Route at line 74, getInsights from kv.ts |
| `shipcard-worker/src/routes/dashboard.ts` | Insights panel HTML + Alpine | PARTIAL | Section exists but 3 cards have field name mismatches |
| `shipcard/src/engine/dailyAggregator.ts` | hourlyActivity 24-bucket computation | VERIFIED | Lines 45, 72, 143, 176, 239 confirm field and population |
| `shipcard/src/cli/safestats.ts` | hourlyActivity in SafeDailyStats, passthrough in toSafeTimeSeries | VERIFIED | Lines 80, 169-170 confirm optional field and conditional passthrough |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `compute.ts` | `types.ts` | imports InsightResult and sub-interfaces | VERIFIED | Import block at lines 10-16 |
| `narrative.ts` | `types.ts` | imports InsightResult for prompt building | VERIFIED | Line 11: import type { InsightResult } |
| `syncV2.ts` | `compute.ts` | calls computeAllInsights | VERIFIED | Line 28 import, line 164 call |
| `syncV2.ts` | `narrative.ts` | calls callWorkersAI inside ctx.waitUntil | VERIFIED | Line 29 import, line 177 call |
| `syncV2.ts` | `kv.ts` | stores via putInsights | VERIFIED | Line 26 import, lines 171 and 184 calls |
| `api.ts` | `kv.ts` | reads via getInsights | VERIFIED | Line 15 import, line 76 call |
| `dashboard.ts` | `/api/insights` | fetch() in Alpine init | VERIFIED | insightsPanel() fetches /:username/api/insights at init |
| `dashboard.ts` | `InsightResult.costTrend` | costTrend.weeklyTotals + trend | FAILED | Dashboard uses .weeks and .direction — wrong field names |
| `dashboard.ts` | `InsightResult.streak` | currentStreak, longestStreak | FAILED | Dashboard uses .current and .longest — wrong field names |
| `dashboard.ts` | `InsightResult.peakHours` | peakHours.topHours array | FAILED | Dashboard treats peakHours as flat array, not {topHours} object |
| `dashboard.ts` | `InsightResult.peakDays` | peakDays.topDays array | FAILED | Dashboard treats peakDays as flat array, not {topDays} object |
| `dailyAggregator.ts` | `safestats.ts` | hourlyActivity in DailyStats → SafeDailyStats | VERIFIED | DailyStats.hourlyActivity populates SafeDailyStats.hourlyActivity via toSafeTimeSeries |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| PRO dashboard shows weekly insights panel | PARTIAL | 3 of 3 insight cards show empty/fallback due to field name mismatches |
| Insights pre-computed at sync time | SATISFIED | syncV2 pipeline fully wired |
| Insights update after `shipcard sync` | SATISFIED | Every sync recomputes and stores InsightResult |
| Free users see real data (14-day window, no upgrade banners in panel) | SATISFIED | windowDays=14 for free, no upgrade text inside panel block |
| AI narrative for PRO users | SATISFIED | waitUntil pattern, narrative renders correctly in template |

### Anti-Patterns Found

| File | Lines | Pattern | Severity | Impact |
|------|-------|---------|----------|--------|
| `shipcard-worker/src/routes/dashboard.ts` | 2219–2233 | `costTrend.weeks` / `costTrend.direction` field names don't match API | Blocker | Cost Trend card always shows empty fallback "No cost data yet." |
| `shipcard-worker/src/routes/dashboard.ts` | 2245–2249 | `streak.current` / `streak.longest` field names don't match API | Blocker | Streak card shows undefined for all numeric values |
| `shipcard-worker/src/routes/dashboard.ts` | 2179–2211 | `data.peakHours` / `data.peakDays` treated as arrays — they are objects | Blocker | Peak Activity card condition `peakHours.length > 0` is always falsy; shows "No activity data yet." |

### Human Verification Required

None — the field name mismatches are structural and verifiable programmatically. All three cards will silently show empty/fallback states due to the data shape mismatches between InsightResult and the Alpine template field accesses.

### Gaps Summary

All three gaps share the same root cause: a disconnect between the InsightResult type shape (defined in `types.ts`) and the Alpine template field accesses in `dashboard.ts`. The computation engine, sync pipeline, KV storage, and API endpoint are all correct. The bug is entirely in the dashboard template rendering layer.

**Root cause:** The CostTrendInsight, StreakInsight, PeakHoursInsight, and PeakDaysInsight types use verbose field names (`weeklyTotals`, `trend`, `currentStreak`, `longestStreak`, `topHours`, `topDays`), but the dashboard Alpine template accesses shorter, informal aliases (`weeks`, `direction`, `current`, `longest`, and flat arrays). TypeScript does not catch this because the Alpine templates are string literals inside the HTML.

**Impact:** A user who syncs will see the Insights section render the section heading and the empty state fallback for all 3 numeric cards. The PRO narrative card (if generated) will render correctly since it accesses `data.narrative` directly. The empty-state ("Run shipcard sync") will not show because `data` is not null — only the card internals are broken.

**Fix scope:** Approximately 15–20 lines in `dashboard.ts` only. No changes needed to types, compute, kv, syncV2, or api.ts.

---

_Verified: 2026-03-30T02:00:05Z_
_Verifier: Claude (gsd-verifier)_
