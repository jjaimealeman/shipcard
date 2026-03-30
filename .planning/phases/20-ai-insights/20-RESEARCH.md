# Phase 20: AI Insights - Research

**Researched:** 2026-03-29
**Domain:** Cloudflare Workers AI, cron triggers, insight computation algorithms, KV storage
**Confidence:** HIGH

## Summary

Phase 20 adds pre-computed weekly coding insights to the PRO dashboard. The architecture is hybrid: the CLI already computes daily-level stats (`SafeTimeSeries`) and uploads them on every sync. The Worker's job is to (1) compute insight aggregates from that existing time-series data, (2) run a Workers AI narrative call for PRO users, and (3) store results in KV so the dashboard reads them instantly.

Workers AI is available as a first-party Cloudflare binding — no external API key, no separate billing setup. The `Ai` type is already part of `@cloudflare/workers-types` (bundled with wrangler), so no new npm package is required for the AI inference layer itself. The binding is added in `wrangler.jsonc` and exposed as `env.AI`. The cheapest practical model for short narrative generation is `@cf/meta/llama-3.2-1b-instruct` at ~$0.027/M input tokens + $0.201/M output tokens, with 10,000 free Neurons/day shared across all Workers AI calls.

The cron trigger pattern is well-established in Cloudflare Workers: define a `scheduled()` export alongside the existing `fetch()` export, add `"triggers": { "crons": ["0 * * * *"] }` to `wrangler.jsonc`, and test locally with `wrangler dev --test-scheduled`. The critical design question for Phase 20 is WHERE to trigger the AI narrative: a cron job iterating all PRO users is operationally fragile and expensive at scale. The better pattern is **sync-time trigger**: compute stats insights at sync time (already happening), fire the Workers AI narrative call inside the existing `POST /sync/v2` handler for PRO users, and store results in KV. This eliminates the cron entirely for the narrative layer and matches the CONTEXT.md decision "Insights recompute on every `shipcard sync`."

**Primary recommendation:** Compute all insight stats (peak hours, cost trends, streaks) locally in the Worker from the existing `user:{username}:timeseries` KV data during the `POST /sync/v2` handler. Call Workers AI for the PRO narrative in the same handler (non-blocking via `ctx.waitUntil`). Store results in `user:{username}:insights` KV key. Dashboard reads this key on page load — no LLM call at read time, instant load.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Workers AI binding (`env.AI`) | Built-in (wrangler 4+) | LLM inference for PRO narrative | Zero-dependency, Cloudflare-native, `Ai` type from `@cloudflare/workers-types` |
| Cloudflare KV (`USER_DATA_KV`) | Already bound | Store computed insights | Already used for timeseries; insights are same access pattern |
| Hono (existing) | Already installed | Route handler for insights API endpoint | Already used throughout Worker |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@cloudflare/workers-types` | Already in devDependencies via wrangler | TypeScript `Ai` interface | Compile-time type safety for `env.AI.run()` |
| Alpine.js (existing CDN) | Already in dashboard | Client-side rendering of insights panel | No new dependency; already used for dashboard |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Workers AI for narrative | Anthropic Haiku via fetch() | CONTEXT.md locks Workers AI; also requires API key secret management |
| Sync-time AI call | Cron job iterating all PRO users | Cron requires listing all users from KV (expensive), hard to scope to PRO-only; sync-time is precise and free |
| KV for insights storage | D1 table | KV is simpler for blob JSON; D1 is better for queries — insights are always read as one blob per user |

**Installation:**
```bash
# No new packages needed for Workers AI (binding is built-in via wrangler)
# wrangler.jsonc gets a new "ai" binding block only
```

## Architecture Patterns

### Recommended Project Structure
```
shipcard-worker/src/
├── routes/
│   ├── syncV2.ts           # MODIFY: add insights compute + AI narrative call
│   ├── api.ts              # MODIFY: add GET /u/:username/api/insights endpoint
│   └── dashboard.ts        # MODIFY: add insights panel HTML + JS
├── insights/
│   ├── compute.ts          # NEW: pure functions: computePeakHours(), computeCostTrend(), computeStreak()
│   ├── narrative.ts        # NEW: buildNarrativePrompt() + callWorkersAI()
│   └── types.ts            # NEW: InsightResult, PeakHoursInsight, CostTrendInsight, StreakInsight
└── kv.ts                   # MODIFY: add getInsights() / putInsights() helpers

shipcard-worker/
└── wrangler.jsonc          # MODIFY: add "ai" binding block
```

### Pattern 1: Workers AI Binding — wrangler.jsonc
**What:** Add the AI binding alongside existing KV and D1 bindings.
**When to use:** Required before `env.AI.run()` will work.
**Example:**
```jsonc
// Source: https://developers.cloudflare.com/workers-ai/configuration/bindings/
{
  "ai": {
    "binding": "AI"
  }
}
```

### Pattern 2: Workers AI Text Generation — TypeScript
**What:** Call `env.AI.run()` with a messages array for instruct models.
**When to use:** PRO narrative generation inside syncV2 handler.
**Example:**
```typescript
// Source: https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/
// The Ai type comes from @cloudflare/workers-types (no import needed, global)
const response = await env.AI.run(
  "@cf/meta/llama-3.2-1b-instruct",
  {
    messages: [
      { role: "system", content: "You are a concise coding activity analyst." },
      { role: "user", content: buildNarrativePrompt(insights) },
    ],
    max_tokens: 150,
  }
) as { response: string };
const narrative = response.response;
```

### Pattern 3: Non-blocking AI call via ctx.waitUntil
**What:** Fire the Workers AI call after responding to the sync POST — never block the CLI waiting for LLM.
**When to use:** Any AI generation that doesn't need to be in the sync response body.
**Example:**
```typescript
// Source: Cloudflare Workers ExecutionContext docs
syncV2Routes.post("/", authMiddleware, async (c) => {
  // ... existing sync logic ...

  // Non-blocking: compute and store insights after returning 200
  if (isPro) {
    c.executionCtx.waitUntil(
      computeAndStoreInsights(env, username, timeSeries)
    );
  }

  return c.json({ ok: true, apiVersion: "v2", syncedAt, username, variantsInvalidated });
});
```

### Pattern 4: Cron Trigger (available but NOT recommended for this phase)
**What:** Export a `scheduled()` handler alongside `fetch()` for time-based execution.
**When to use:** If a future need arises to recompute insights on a schedule independent of sync (e.g., expiring stale narratives). Not needed for Phase 20.
**Example:**
```typescript
// Source: https://developers.cloudflare.com/workers/configuration/cron-triggers/
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    // Process background insights refresh
    ctx.waitUntil(refreshStaleInsights(env));
  },
};
```
**Note on Hono + scheduled():** Hono's `export default app` style does NOT export a `scheduled()` handler. To add cron support to a Hono Worker, wrap the export:
```typescript
// shipcard-worker/src/index.ts — if cron is added later
export default {
  fetch: app.fetch.bind(app),
  async scheduled(controller, env, ctx) { ... }
};
```

### Pattern 5: Insights KV Storage
**What:** Store computed insights as a single JSON blob per user.
**When to use:** Every sync for PRO users; every sync for free users (limited depth).
**KV key:** `user:{username}:insights`
**Example:**
```typescript
// In kv.ts
export async function putInsights(kv: KVNamespace, username: string, insights: InsightResult): Promise<void> {
  await kv.put(`user:${username}:insights`, JSON.stringify(insights));
}

export async function getInsights(kv: KVNamespace, username: string): Promise<InsightResult | null> {
  const raw = await kv.get(`user:${username}:insights`);
  return raw ? JSON.parse(raw) as InsightResult : null;
}
```

### Anti-Patterns to Avoid
- **Live LLM call on dashboard page load:** CONTEXT.md explicitly forbids this. Never call `env.AI.run()` from the dashboard GET route.
- **Cron job iterating all users:** KV list-based user iteration is expensive and non-atomic. Sync-time compute is simpler and more precise.
- **Storing insights in D1:** Insights are always read as a complete blob per user — no SQL filtering needed. KV is the right tool (same pattern as timeseries).
- **Skipping `ctx.waitUntil`:** If the AI call is awaited directly in the sync handler, it blocks the CLI response. Use `waitUntil` so the CLI gets its 200 immediately.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM inference | Custom fetch to external API | `env.AI.run()` | Cloudflare-native, no key management, included Neurons quota |
| Peak hour computation | Complex bucketing logic | Simple bucket array [0..23] using `SafeDailyStats.date` + hour approximation | TimeSeries already has per-day resolution; hour granularity requires raw JSONL which is local-only |
| Cost trend math | Floating point cost parsing | Work in cents (`costCents`) — already stored as integers in `SafeDailyStats` | Avoids floating point comparison bugs; `costCents` is the canonical field |
| Streak definition | Complex "active day" threshold logic | Simple boolean: `costCents > 0` per day | Any day with any API cost means Claude Code was used; clean, unambiguous |

**Key insight:** The heavy lifting (data aggregation) is already done by the daily aggregator. Insight computation is mostly array reduction over `SafeTimeSeries.days` — not novel algorithms.

## Common Pitfalls

### Pitfall 1: Peak Hours — Data Isn't Available at Hour Granularity
**What goes wrong:** `SafeTimeSeries.days` is bucketed by calendar date (UTC), not by hour. There's no per-hour data in the cloud after Phase 20 because raw JSONL timestamps never leave the user's machine.
**Why it happens:** Privacy boundary — timestamps with project context are stripped at the CLI before upload.
**How to avoid:** Peak "coding hours" must be computed **locally in the CLI** and uploaded as a new field in the `SafeTimeSeries` or as a separate computed summary. The Worker cannot derive hourly data from daily buckets.
**Warning signs:** Planning tasks that reference computing peak hours from `SafeDailyStats.date` on the Worker side — that field is `"2026-03-25"` only, no time component.
**Decision required:** Either (a) compute hourly breakdown in the CLI and add it to the sync payload, or (b) redefine "peak hours" as "peak days of week" which IS derivable from daily data (date parsing → day-of-week).

### Pitfall 2: Workers AI Neurons Quota — Free Tier is 10K/day
**What goes wrong:** 10,000 Neurons/day is the free allocation shared across ALL Workers AI calls on the account. At scale, PRO user syncs could exhaust this.
**Why it happens:** Workers AI bills per-neuron, not per-user. The ShipCard Worker account pays collectively.
**How to avoid:** Use the smallest viable model. `@cf/meta/llama-3.2-1b-instruct` (1B params) is cheapest. Cap `max_tokens` aggressively (100-150 tokens is enough for a 2-3 sentence narrative). Monitor Neuron usage in Cloudflare dashboard.
**Cost estimate:** Llama-3.2-1b at 500 input tokens + 150 output tokens ≈ (500 × 2,457/1M) + (150 × 18,252/1M) = 1.23 + 2.74 = ~4 neurons per PRO sync. At $0.011/1,000 neurons = ~$0.000044/sync. Effectively free until very large scale.

### Pitfall 3: `export default app` Breaks `scheduled()` Export
**What goes wrong:** Hono's `app` object doesn't have a `scheduled` method, so `export default app` can never respond to cron triggers.
**Why it happens:** Hono is designed for HTTP handlers only.
**How to avoid:** If cron is added, replace `export default app` with an explicit object export that delegates `fetch` to Hono and adds `scheduled`. (Phase 20 avoids this entirely by computing at sync-time, not via cron.)

### Pitfall 4: Insights Missing for New Users Until First Sync
**What goes wrong:** First-time visitors see a blank or error state in the insights panel because `user:{username}:insights` doesn't exist yet.
**Why it happens:** Insights are computed at sync time, not on user creation.
**How to avoid:** Dashboard JS handles null gracefully — show skeleton/empty state with "Run `shipcard sync` to generate insights." Not an error. Free user handling is the same: show "Limited to 2-week window, sync to update."

### Pitfall 5: Stale Data Badge Requires `computedAt` Timestamp
**What goes wrong:** "Last updated X days ago" badge has nothing to diff against if the `InsightResult` doesn't store a timestamp.
**Why it happens:** Forgetting to include `computedAt: string` (ISO timestamp) in the stored insights blob.
**How to avoid:** Always write `computedAt: new Date().toISOString()` into the `InsightResult` when storing. Dashboard JS computes `Math.floor((Date.now() - new Date(computedAt)) / 86400000)` for the badge.

### Pitfall 6: Env Type Missing `AI` Binding
**What goes wrong:** TypeScript compile error: `Property 'AI' does not exist on type 'Env'`.
**Why it happens:** `Env` interface in `types.ts` doesn't declare the AI binding.
**How to avoid:** Add `AI: Ai` to the `Env` interface in `shipcard-worker/src/types.ts`. The `Ai` type is globally available from `@cloudflare/workers-types` — no import needed.

## Code Examples

Verified patterns from official sources:

### Workers AI text generation (messages format)
```typescript
// Source: https://developers.cloudflare.com/workers-ai/features/prompting/
const result = await env.AI.run(
  "@cf/meta/llama-3.2-1b-instruct",
  {
    messages: [
      {
        role: "system",
        content: "You are a concise coding activity analyst. Write 2-3 sentences max."
      },
      {
        role: "user",
        content: `Weekly coding summary for ${username}: ${promptData}`
      }
    ],
    max_tokens: 150,
  }
) as { response: string };
```

### Cron trigger wrangler.jsonc config
```jsonc
// Source: https://developers.cloudflare.com/workers/configuration/cron-triggers/
{
  "triggers": {
    "crons": ["0 * * * *"]  // every hour
  }
}
```

### Testing cron triggers locally
```bash
# Source: https://developers.cloudflare.com/workers/examples/multiple-cron-triggers/
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

### Insights type shape (recommended)
```typescript
// In shipcard-worker/src/insights/types.ts
export interface PeakDaysInsight {
  topDays: Array<{ dayOfWeek: number; label: string; avgSessions: number }>;
  // dayOfWeek: 0=Sun, 1=Mon ... 6=Sat
}

export interface CostTrendInsight {
  weeklyTotals: Array<{ weekStart: string; costCents: number }>;
  // Free: 2 entries (current + prev week); PRO: 4 entries
  trend: "up" | "down" | "flat";  // last week vs second-to-last
  deltaPercent: number;           // positive = up, negative = down
}

export interface StreakInsight {
  currentStreak: number;   // consecutive days with costCents > 0 ending today
  longestStreak: number;   // all-time longest streak in available window
  activeDaysThisWeek: number;
}

export interface InsightResult {
  username: string;
  computedAt: string;        // ISO timestamp — used for "Last updated X days ago"
  isPro: boolean;
  windowDays: number;        // 14 for free, 28 for PRO
  peakDays: PeakDaysInsight;
  costTrend: CostTrendInsight;
  streak: StreakInsight;
  narrative?: string;        // Workers AI generated text — PRO only, may be undefined
  narrativeError?: boolean;  // true if AI call failed — dashboard shows stats without narrative
}
```

### Streak algorithm
```typescript
// Computes current streak from SafeTimeSeries days (sorted ascending)
// Active day = costCents > 0 (any Claude Code usage)
export function computeStreak(days: SafeDailyStats[]): StreakInsight {
  const activeDates = new Set(days.filter(d => d.costCents > 0).map(d => d.date));

  // Current streak: walk backwards from today
  let current = 0;
  const today = new Date().toISOString().slice(0, 10);
  let cursor = today;
  while (activeDates.has(cursor)) {
    current++;
    const prev = new Date(cursor);
    prev.setUTCDate(prev.getUTCDate() - 1);
    cursor = prev.toISOString().slice(0, 10);
  }

  // Longest streak: linear scan
  let longest = 0;
  let run = 0;
  let prevDate: string | null = null;
  for (const day of days.sort((a, b) => a.date.localeCompare(b.date))) {
    if (day.costCents <= 0) { longest = Math.max(longest, run); run = 0; prevDate = null; continue; }
    if (prevDate === null) { run = 1; }
    else {
      const expected = new Date(prevDate);
      expected.setUTCDate(expected.getUTCDate() + 1);
      run = expected.toISOString().slice(0, 10) === day.date ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
    prevDate = day.date;
  }

  const thisWeekStart = getWeekStart(today); // Monday
  const activeDaysThisWeek = days.filter(d =>
    d.date >= thisWeekStart && d.date <= today && d.costCents > 0
  ).length;

  return { currentStreak: current, longestStreak: longest, activeDaysThisWeek };
}
```

### Day-of-week peak computation (from daily dates)
```typescript
// Works on server side — no hour granularity needed
export function computePeakDays(days: SafeDailyStats[]): PeakDaysInsight {
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const buckets: { totalSessions: number; count: number }[] = Array.from({ length: 7 }, () => ({ totalSessions: 0, count: 0 }));

  for (const day of days) {
    if (day.costCents <= 0) continue;
    const dow = new Date(day.date + "T12:00:00Z").getUTCDay(); // noon UTC avoids DST edge
    buckets[dow].totalSessions += day.sessions;
    buckets[dow].count++;
  }

  const topDays = buckets
    .map((b, i) => ({ dayOfWeek: i, label: DAY_LABELS[i], avgSessions: b.count > 0 ? b.totalSessions / b.count : 0 }))
    .sort((a, b) => b.avgSessions - a.avgSessions)
    .slice(0, 3);

  return { topDays };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External LLM API (Haiku/GPT) | Workers AI native binding | CF Workers AI GA (2024) | No API key management, billed in Neurons |
| `tinyllama-1.1b` (deprecated) | `llama-3.2-1b-instruct` | 2025 | Better quality, same cost tier |
| AI SDK wrapper (`workers-ai-provider`) | Direct `env.AI.run()` | N/A for this use case | AI SDK adds complexity; direct run() is simpler for one-shot generation |
| `export default app` for Hono | Explicit `{ fetch, scheduled }` object if cron needed | N/A | Hono's default export works for HTTP; cron requires wrapping |

**Deprecated/outdated:**
- `tinyllama-1.1b-chat-v1.0`: Deprecated — use `llama-3.2-1b-instruct` instead.
- `@cf/meta/llama-2-7b-chat-int8`: Old generation — use llama-3.x series.

## Open Questions

1. **Peak hours vs peak days — user expectation**
   - What we know: The CONTEXT.md says "peak coding hours" but the privacy model prevents hour-granularity data from reaching the Worker. The CLI has raw timestamps pre-upload.
   - What's unclear: Does the user mean literal clock hours (6pm, 9am) or peak days of week?
   - Recommendation: Plan two options — (A) add `hourlyActivity: number[]` (24 buckets) to the CLI's `SafeTimeSeries` payload (minor privacy addition, no project names), or (B) reframe as "peak days" for Phase 20 and defer true hourly to a future enhancement. Option A gives the WakaTime-style insight the user wants. **Recommend Option A** — include hourly buckets in sync payload, compute locally in CLI from raw timestamps before upload.

2. **Narrative AI call failure handling**
   - What we know: Workers AI can fail (quota exceeded, model unavailable).
   - What's unclear: Should a failed narrative call retry, or just store `narrativeError: true` and show the stats without narrative?
   - Recommendation: Store `narrativeError: true` — don't retry. Dashboard shows numerical insights normally; narrative card shows "Narrative temporarily unavailable." Prevents silent data loss.

3. **Free user window boundary — what "2-week window" means**
   - What we know: CONTEXT.md says free = 2-week window. User has all historical data in `SafeTimeSeries`.
   - What's unclear: Is the window "last 14 calendar days" or "current week + previous full week"?
   - Recommendation: "Last 14 calendar days from today" is simpler and always gives exactly 2 weeks of data. Mon-Sun boundaries create edge cases at week start.

## Sources

### Primary (HIGH confidence)
- Cloudflare Workers AI Docs — https://developers.cloudflare.com/workers-ai/ — pricing, models, binding config, prompting format
- Cloudflare Cron Triggers — https://developers.cloudflare.com/workers/configuration/cron-triggers/ — wrangler.jsonc format, scheduled() handler, test commands
- Workers AI Pricing — https://developers.cloudflare.com/workers-ai/platform/pricing/ — Neuron costs per model, free tier limits
- Codebase review — `shipcard-worker/src/types.ts`, `kv.ts`, `routes/syncV2.ts`, `routes/dashboard.ts`, `engine/dailyAggregator.ts` — existing patterns, type shapes, storage keys

### Secondary (MEDIUM confidence)
- Workers AI model list — https://developers.cloudflare.com/workers-ai/models/ — llama-3.2-1b/3b confirmed current, tinyllama confirmed deprecated

### Tertiary (LOW confidence)
- Streak algorithm pattern (WebSearch): standard consecutive-day counting, confirmed internally viable against `SafeDailyStats.costCents` field

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Workers AI binding is official CF docs; no npm install needed
- Architecture: HIGH — sync-time compute pattern derived from existing `syncV2.ts` + `ctx.waitUntil` is standard Workers pattern
- Pitfalls: HIGH — peak hours limitation is a hard technical constraint from the privacy model (verified against `SafeDailyStats` type shape); remaining pitfalls derived from CF docs
- Open questions: Honest gaps that the planner must make decisions on before tasks are written

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (30 days — Workers AI pricing/models are stable; cron triggers are stable)
