# Phase 9: CLI Time-Series Extraction - Research

**Researched:** 2026-03-26
**Domain:** TypeScript CLI data pipeline — JSONL parsing, daily aggregation, HTTP v2 sync
**Confidence:** HIGH (all findings from direct source inspection)

## Summary

Phase 9 adds a daily time-series layer alongside the existing all-time aggregation. The
existing parser only produces `ParsedMessage[]` from `AssistantEntry` items — user turns
and thinking blocks are discarded entirely today. A new daily aggregation engine must
group those same `ParsedMessage` records by calendar date, compute `DailyStats` per day,
wrap them in a `SafeTimeSeries` privacy envelope, and extend `shipcard sync` to POST a v2
payload. The Worker gets a new `/sync/v2` endpoint (Phase 10); this phase adds the CLI
side and falls back to the existing `/sync` if the Worker returns 404.

**Primary recommendation:** Build a standalone `dailyAggregator.ts` in `src/engine/`.
Do not modify `aggregator.ts`. Extend `safestats.ts` with the `SafeTimeSeries` type and
a `toSafeTimeSeries()` converter. Extend `sync.ts` to try POST `/sync/v2` then fallback
to `/sync`. Add `--show-projects` to `args.ts` using the existing `parseArgs` pattern.

## Standard Stack

### Core (already in codebase — no new deps needed)
| File / Module | Purpose | Notes |
|---------------|---------|-------|
| `src/parser/deduplicator.ts` | Produces `ParsedMessage[]` | Source of truth for all aggregation |
| `src/engine/aggregator.ts` | All-time aggregation pattern | Mirror this pattern for daily engine |
| `src/engine/cost.ts` | `calculateCost()`, `getModelPricing()`, `getPricing()` | Use directly — no changes needed |
| `src/engine/filter.ts` | `parseFilterDate()` | Date string → `Date` conversion |
| `src/cli/safestats.ts` | Privacy boundary pattern | Mirror `toSafeStats()` for `toSafeTimeSeries()` |
| `src/cli/args.ts` | `parseArgs` from `node:util` | Add `show-projects` boolean flag here |
| `src/cli/commands/sync.ts` | HTTP POST with Bearer auth | Extend for v2 endpoint with fallback |

**Installation:** No new packages required. All tooling is in the existing codebase.

## Architecture Patterns

### Recommended Project Structure (new files only)
```
src/
├── engine/
│   ├── aggregator.ts        (existing — unchanged)
│   └── dailyAggregator.ts   (NEW — daily aggregation engine)
├── cli/
│   ├── safestats.ts         (extend with SafeTimeSeries + toSafeTimeSeries())
│   ├── args.ts              (add --show-projects flag)
│   └── commands/
│       └── sync.ts          (add v2 POST + fallback logic)
└── parser/
    └── deduplicator.ts      (extend to capture userMessages + thinkingBlocks)
```

### Pattern 1: Date-Keyed Accumulator (mirrors aggregator.ts)

**What:** Group `ParsedMessage[]` by ISO date string (`"2026-03-25"`), accumulate fields
per bucket, then convert buckets to `DailyStats[]`.

**When to use:** Any per-day rollup from `ParsedMessage` array.

**Example (mirrors existing aggregator pattern):**
```typescript
// src/engine/dailyAggregator.ts
const dayBuckets = new Map<string, DayAccumulator>();

for (const msg of messages) {
  const date = msg.timestamp.slice(0, 10); // ISO date — fast, no Date object needed
  let bucket = dayBuckets.get(date);
  if (bucket === undefined) {
    bucket = newDayAccumulator();
    dayBuckets.set(date, bucket);
  }
  // accumulate...
}
```

**Key insight:** `msg.timestamp` is an ISO 8601 string (e.g. `"2026-03-25T14:23:01.000Z"`).
Slicing `[0, 10]` gives the UTC date. This is consistent with how filter.ts handles dates.

### Pattern 2: Privacy Envelope (mirrors safestats.ts toSafeStats)

**What:** Separate `DailyStats` (raw, has project paths) from `SafeTimeSeries` (safe for
cloud, no raw paths unless `--show-projects` opted in).

**When to use:** Always before sending data to the Worker.

**Example:**
```typescript
// src/cli/safestats.ts — extend existing file
export interface SafeTimeSeries {
  username: string;
  version: 2;
  days: DailyStats[];   // DailyStats defined in engine/dailyAggregator.ts
  generatedAt: string;
}

export function toSafeTimeSeries(
  days: DailyStats[],
  username: string,
  showProjects: boolean
): SafeTimeSeries {
  return {
    username,
    version: 2,
    days: showProjects ? days : days.map(stripProjectNames),
    generatedAt: new Date().toISOString(),
  };
}
```

### Pattern 3: HTTP v2 with 404 Fallback

**What:** Try POST to `/sync/v2`; if Worker returns 404, fall back to existing `/sync`
with the v1 `SafeStats` payload.

**When to use:** In `runSync()` when `flags.confirm` is true.

**Example:**
```typescript
// src/cli/commands/sync.ts
async function postV2(workerUrl: string, token: string, payload: SafeTimeSeries): Promise<Response> {
  return fetch(`${workerUrl}/sync/v2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "shipcard-cli/1.0",
    },
    body: JSON.stringify(payload),
  });
}

// In runSync --confirm branch:
const v2res = await postV2(workerUrl, token, safeTimeSeries);
if (v2res.status === 404) {
  // Worker doesn't have v2 yet — fall back to v1
  await postV1(workerUrl, token, safeStats);
}
```

### Pattern 4: Adding a Boolean CLI Flag (mirrors args.ts pattern)

**What:** Add `show-projects` to `parseArgs` options and to `ParsedCliArgs.flags`.

**Example — three places to change in args.ts:**
```typescript
// 1. Add to ParsedCliArgs.flags interface:
showProjects: boolean;

// 2. Add to parseArgs options:
"show-projects": { type: "boolean", default: false },

// 3. Add to the flags return object:
showProjects: (flags["show-projects"] as boolean | undefined) ?? false,
```

**Note:** `strict: false` is already set, so adding a new flag won't break anything.
The CLI entry point (`cli/index.ts`) passes `mergedFlags` through to `runSync`, so
`showProjects` will arrive in `SyncFlags` automatically once added to `ParsedCliArgs`.
`SyncFlags` in `sync.ts` also needs `showProjects: boolean` added.

### Anti-Patterns to Avoid

- **Mutating aggregator.ts:** Don't touch the existing aggregator. Daily aggregation is
  an additive parallel path, not a replacement.
- **Creating a Date object per message for date bucketing:** `msg.timestamp.slice(0, 10)`
  is O(1) string slice vs `new Date(msg.timestamp).toISOString().slice(0, 10)` which
  allocates a Date object for every message. The timestamp is already ISO format.
- **Passing costCents as a float:** `DailyStats.costCents` is integer cents. Use
  `Math.round(rawCostDollars * 100)` when storing. The `calculateCost()` function returns
  dollars (floating point).
- **Putting project-path stripping in DailyStats construction:** Keep `DailyStats` rich
  with project paths internally; strip in `toSafeTimeSeries()` unless `showProjects` is
  true. This mirrors the `projectCount` vs `projectsTouched` split in SafeStats.
- **Touching the browser configurator path:** The `--show-projects` flag and v2 payload
  only apply in the `--confirm` code path. The default (browser configurator) path
  should remain v1 `SafeStats`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cost calculation per day | Custom cost formula | `calculateCost()` + `getModelPricing()` from `cost.ts` | Handles tiered pricing, cache tokens, fallback model |
| Date string parsing | Custom date parser | `msg.timestamp.slice(0, 10)` for UTC date bucketing; `parseFilterDate()` for flag inputs | Already handles ISO, relative (`7d`), and `today` formats |
| HTTP with auth | Custom fetch wrapper | Inline `fetch()` matching the existing pattern in `sync.ts` | Simple enough; consistent with existing code |
| Pricing lookup cache | Custom cache | `getPricing()` already has 3-layer cache (runtime/disk/network) | Re-use the same `pricing` object returned by `getPricing()` |

## Common Pitfalls

### Pitfall 1: UserEntry and ThinkingBlock Counts Are Not in ParsedMessage

**What goes wrong:** The planner may assume `ParsedMessage` already carries
`userMessages` and `thinkingBlocks` counts. It does not — both are discarded today.

**Why it happens:**
- `deduplicator.ts` line 83: `continue; // user entries don't produce ParsedMessages`
- `deduplicator.ts` line 116-118: Only `tool_use` blocks are extracted from content.
  `ThinkingBlock` items (type `"thinking"`) are present in `AssistantEntry.message.content`
  but the content filter only picks `block.type === "tool_use"`.

**How to avoid:**
- For `userMessages`: Count `UserEntry` items seen per session/day inside `processFile()`.
  This requires either (a) adding a parallel counter to `ParseResult.stats` or
  (b) doing a second pass in the daily aggregator by reading `UserEntry` count from
  the raw `ParseResult` (but `ParseResult` doesn't expose this today).
  Simplest approach: add `userMessages` to `ParseResult.stats` in `deduplicator.ts`.
- For `thinkingBlocks`: The `AssistantEntry.message.content` array already contains
  `ThinkingBlock` objects. Add a count when building `ParsedMessage` in `processFile()`.
  Add `thinkingBlocks: number` to `ParsedMessage` in `schema.ts`.

**Warning signs:** `DailyStats.userMessages` always 0; `DailyStats.thinkingBlocks` always 0.

### Pitfall 2: Session Count Per Day vs. Total Sessions

**What goes wrong:** Counting sessions naively (unique sessionIds touching that day) will
double-count sessions that span midnight — a session active on day 1 and day 2 would
appear in both days' session counts. The approved plan's `DailyStats.sessions` likely means
"unique sessions with at least one message on that date", which is the correct interpretation.

**How to avoid:** Use a `Set<string>` per day bucket for `sessionIds`, same as
`projectSessions` in `aggregator.ts`. Call `.size` at emit time.

### Pitfall 3: costCents Integer Truncation Error

**What goes wrong:** `Math.floor(cost * 100)` loses sub-cent fractions on small costs.
For days with minimal activity this matters: `$0.005` floors to `0` cents, not `1` cent.

**How to avoid:** Use `Math.round()` not `Math.floor()`.

### Pitfall 4: v2 Fallback Not Triggered on Non-404 Errors

**What goes wrong:** Fallback to v1 should only happen on 404 (Worker doesn't have v2
route yet). Other errors (401, 500) should NOT fall back — they indicate real problems.

**How to avoid:** Check `v2res.status === 404` specifically, not `!v2res.ok`.

### Pitfall 5: SyncFlags Interface Out of Sync with ParsedCliArgs

**What goes wrong:** `runSync(flags: SyncFlags)` gets its type from `sync.ts`, but the
flag values flow from `parseCliArgs()` in `args.ts`. If `showProjects` is added to
`args.ts` but not to `SyncFlags`, TypeScript will error. If added to `SyncFlags` but not
`args.ts`, the value will always be `undefined`.

**How to avoid:** Update both in the same task — `ParsedCliArgs.flags` in `args.ts` AND
`SyncFlags` in `sync.ts`.

## Code Examples

Verified patterns from direct source inspection:

### Extracting ThinkingBlock Count from AssistantEntry Content
```typescript
// Source: schema.ts (ThinkingBlock type) + deduplicator.ts (content filter pattern)
// In processFile(), when building the ParsedMessage:
const content = entry.message.content;
const toolCalls = content
  .filter((block) => block.type === "tool_use")
  .map((block) => (block as { type: "tool_use"; name: string }).name);
const thinkingBlocks = content.filter((block) => block.type === "thinking").length;

messages.push({
  // existing fields...
  toolCalls,
  thinkingBlocks, // NEW field to add to ParsedMessage
});
```

### Date Bucketing from ParsedMessage.timestamp
```typescript
// timestamp format confirmed: ISO 8601 string (e.g. "2026-03-25T14:23:01.000Z")
// UTC date slice is consistent with filter.ts UTC comparisons
const date = msg.timestamp.slice(0, 10); // "2026-03-25"
```

### Cost to Integer Cents
```typescript
// Source: cost.ts calculateCost() returns number (dollars, floating point)
// For DailyStats.costCents:
const costDollars = calculateCost(tokens, modelPricing.pricing);
const costCents = Math.round(costDollars * 100); // integer cents
```

### Project Name Extraction (reuse from aggregator.ts)
```typescript
// Source: aggregator.ts projectNameFromCwd() — copy or export this function
function projectNameFromCwd(cwd: string): string {
  const segments = cwd.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "unknown";
}
```

### Model Token Tracking for DailyStats.models
```typescript
// DailyStats.models is Record<string, number> (model → token count)
// Use total tokens (sum of all four types) per model, matching aggregator pattern
const totalTokens = tokens.input + tokens.output + tokens.cacheCreate + tokens.cacheRead;
incrementCounter(dayBucket.models, model, totalTokens);
```

### Adding Flag to args.ts (complete three-part change)
```typescript
// 1. ParsedCliArgs.flags interface — add:
showProjects: boolean;

// 2. parseArgs options — add (note: parseArgs uses kebab-case, interface uses camelCase):
"show-projects": { type: "boolean", default: false },

// 3. flags return object — add:
showProjects: (flags["show-projects"] as boolean | undefined) ?? false,
```

### HTTP Fallback Pattern
```typescript
// In runSync() --confirm branch, after building safeTimeSeries and safeStats:
let syncSucceeded = false;

try {
  const v2res = await fetch(`${workerUrl}/sync/v2`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "shipcard-cli/1.0" },
    body: JSON.stringify(safeTimeSeries),
  });
  if (v2res.status === 404) {
    // Worker doesn't have v2 yet — fall back silently
    const v1res = await fetch(`${workerUrl}/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "shipcard-cli/1.0" },
      body: JSON.stringify(safeStats),
    });
    if (!v1res.ok) { /* handle error */ }
  } else if (!v2res.ok) {
    /* handle error — don't fall back */
  }
} catch (err) { /* handle network error */ }
```

## State of the Art

| Old Approach | Current Approach | Impact for Phase 9 |
|--------------|------------------|--------------------|
| No user message counting | Skip UserEntry (line 83 in deduplicator.ts) | Must add userMessages tracking |
| No thinking block counting | content filter skips ThinkingBlock | Must add thinkingBlocks count to ParsedMessage |
| Single aggregate per sync | SafeStats all-time payload | Must add parallel DailyStats array path |

## Open Questions

1. **UTC vs. local time for date bucketing**
   - What we know: `msg.timestamp` is ISO 8601 (confirmed UTC `Z` suffix from JSONL inspection).
     `filter.ts` uses local time for `parseFilterDate` (`T00:00:00` without `Z`).
   - What's unclear: Should `DailyStats.date` bucket by UTC or local time? A session at
     11:30 PM Mountain Time is 2026-03-26T06:30:00Z — which day does it belong to?
   - Recommendation: Use UTC (`timestamp.slice(0, 10)`) for consistency with the raw
     timestamps already in the data. Document this choice. Local-time bucketing would
     require a timezone offset lookup per message.

2. **UserEntry counting: ParseResult.stats vs. ParsedMessage addition**
   - What we know: `ParseResult.stats` only has `filesRead` and `linesSkipped` today.
     `UserEntry` items are counted per session but not exposed in the output.
   - What's unclear: Is per-day user message count needed at the session level or just
     globally? The `DailyStats` type requires `userMessages` per day.
   - Recommendation: Add `userMessages: number` to `ParseResult.stats` (global count is
     enough for the aggregator to distribute; or add to `ParsedMessage` as a parallel
     field). The simplest approach: add a `userMessagesBySession: Map<string, number>` to
     `ParseResult` so the daily aggregator can look up per-session per-day user counts.
     Simpler still: just count `UserEntry` instances per day directly in `processFile`.

3. **DailyStats exported from engine vs. cli**
   - What we know: `SafeTimeSeries.days` is typed as `DailyStats[]`.
   - What's unclear: Where should `DailyStats` be defined — `engine/dailyAggregator.ts`
     or `cli/safestats.ts`? The `SafeTimeSeries` type mirrors the Worker's expected shape.
   - Recommendation: Define `DailyStats` in `engine/dailyAggregator.ts` (it's an engine
     output type, analogous to `AnalyticsResult`). Import it in `cli/safestats.ts`.

## Sources

### Primary (HIGH confidence — direct source inspection)
- `/home/jaime/www/_github/SaaS/shiplog/src/parser/deduplicator.ts` — Full parser, UserEntry skip, ThinkingBlock skip confirmed
- `/home/jaime/www/_github/SaaS/shiplog/src/parser/schema.ts` — ParsedMessage fields, ContentBlock types, ThinkingBlock type confirmed
- `/home/jaime/www/_github/SaaS/shiplog/src/engine/aggregator.ts` — Aggregation pattern, cost accumulation, projectNameFromCwd
- `/home/jaime/www/_github/SaaS/shiplog/src/engine/cost.ts` — calculateCost(), formatCost(), getModelPricing() signatures confirmed
- `/home/jaime/www/_github/SaaS/shiplog/src/engine/filter.ts` — parseFilterDate() date format handling confirmed
- `/home/jaime/www/_github/SaaS/shiplog/src/cli/safestats.ts` — toSafeStats() pattern, SafeStats interface, privacy boundary approach confirmed
- `/home/jaime/www/_github/SaaS/shiplog/src/cli/commands/sync.ts` — HTTP fetch pattern, SyncFlags, auth header, fallback structure
- `/home/jaime/www/_github/SaaS/shiplog/src/cli/args.ts` — parseArgs usage, flag registration pattern, ParsedCliArgs interface
- `/home/jaime/www/_github/SaaS/shiplog/src/cli/index.ts` — Command dispatch, mergedFlags flow to runSync confirmed
- `/home/jaime/www/_github/SaaS/shiplog/src/index.ts` — runEngine() orchestration, ParseResult flow confirmed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all code inspected directly
- Architecture: HIGH — patterns derived from existing working code in the same codebase
- Pitfalls: HIGH — identified from actual code gaps (confirmed user/thinking skips, type mismatches)
- Open questions: MEDIUM — UTC/local ambiguity and UserEntry structure are genuine design decisions

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable codebase, no external deps added)
