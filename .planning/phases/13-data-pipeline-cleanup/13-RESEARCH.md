# Phase 13: Data Pipeline + Cleanup - Research

**Researched:** 2026-03-27
**Domain:** TypeScript data aggregation pipeline, Cloudflare KV, Alpine.js dashboard
**Confidence:** HIGH (code-first — all findings from direct source inspection)

## Summary

Phase 13 enriches the daily aggregator and sync payload with per-project stat breakdowns, fixes the hardcoded `userMessages: 0` bug, and removes the planned-but-wrong "Slowest Day" metric and misleading "Most Messages" label.

The codebase is already well-structured for this work. The `dailyAggregator.ts` already has a `projects` array per `DailyStats` (project names from `cwd`). The `SafeTimeSeries` and `SafeDailyStats` types already have `projects?: string[]` gating on `--show-projects`. What Phase 13 adds is per-project metric breakdowns (tokens/sessions/messages/costCents/toolCalls/thinkingBlocks/models) as a map alongside the existing `projects` name list.

The `userMessages` fix is unblocked: `UserEntry` entries in the JSONL files have `timestamp` fields. The `deduplicator.ts` already tracks `userMessageCount` per file but drops timestamps. The fix adds a `Map<string, number>` (date → userMessage count) to `processFile()` and passes it up to `aggregateDaily()`.

The CLEAN-01 and CLEAN-02 work is pure dashboard surgery: remove the "Slowest Day" stat card from the hero grid (grid layout contracts naturally) and relabel "Most Messages" to "Peak Day." Importantly, searching the current codebase reveals these metrics do NOT yet exist in the live code — they are in the v1.1 requirements as planned additions. Phase 13's cleanup task is to prevent their addition or add them correctly under new names.

**Primary recommendation:** Work in three independent streams: (1) fix `userMessages` in `dailyAggregator.ts`, (2) add per-project daily breakdown to `DailyStats`/`SafeDailyStats`/`types.ts`, (3) handle CLEAN-01/CLEAN-02 as a dashboard-only task with no data dependencies.

## Standard Stack

No new libraries needed. This phase is pure TypeScript refactoring within the existing stack.

### Core (already in use)
| Component | Where | Purpose |
|-----------|-------|---------|
| `dailyAggregator.ts` | `shiplog/src/engine/` | Buckets ParsedMessages by UTC date — main target of Phase 13 |
| `safestats.ts` | `shiplog/src/cli/` | Privacy boundary; `toSafeTimeSeries()` maps `DailyStats` → `SafeDailyStats` |
| `types.ts` (worker) | `shiplog-worker/src/` | `SafeDailyStats`, `SafeTimeSeries`, `isValidSyncV2Body()` validator |
| `dashboard.ts` (worker) | `shiplog-worker/src/routes/` | Alpine.js dashboard — target for CLEAN-01/CLEAN-02 |
| `schema.ts` | `shiplog/src/parser/` | `UserEntry.timestamp` is available — enables userMessages fix |
| `deduplicator.ts` | `shiplog/src/parser/` | Already counts userMessages per file; needs date-bucketing added |

### No new dependencies
All work is type extension + logic refactoring within existing modules.

## Architecture Patterns

### Recommended File Touch Map
```
shiplog/src/
├── engine/
│   └── dailyAggregator.ts     # Add per-project breakdown + fix userMessages
├── cli/
│   └── safestats.ts           # Extend SafeDailyStats type + toSafeTimeSeries()
shiplog-worker/src/
├── types.ts                   # Extend SafeDailyStats + update validator
└── routes/
    └── dashboard.ts           # CLEAN-01 + CLEAN-02 (hero grid surgery)
```

### Pattern 1: Per-Project Daily Breakdown

**What:** Add a `Record<string, PerProjectDailyStats>` map to `DailyStats`, keyed by project directory name (last path segment).

**When to use:** Only populated in the safe payload when `showProjects=true` (mirrors existing `projects?: string[]` gate).

**Type shape:**
```typescript
// In dailyAggregator.ts — add to DailyStats
export interface PerProjectDailyStats {
  sessions: number;
  messages: number;
  userMessages: number;
  tokens: TokenCounts;
  costCents: number;
  toolCalls: Record<string, number>;
  thinkingBlocks: number;
  models: Record<string, number>;
}

// DailyStats gets a new optional field:
// byProject?: Record<string, PerProjectDailyStats>
```

**Accumulator pattern:** Mirrors the existing `DayAccumulator` structure but nested per-project inside each day bucket. Single pass already iterates by date; add a `Map<string, ProjectDayAccumulator>` inside each `DayAccumulator`.

**Source:** Derived from existing `aggregateDaily()` pattern in `dailyAggregator.ts`.

### Pattern 2: userMessages Fix

**What:** Collect `{date, count}` tuples from `UserEntry` entries during the JSONL parse pass, then bucket them into `aggregateDaily()`.

**The gap:** `deduplicator.ts`'s `processFile()` already calls `isUserEntry(raw)` and increments `userMessageCount` — but throws away the timestamp. The `UserEntry` type has `timestamp: string` (inherited from `BaseEntry`).

**Fix approach:**
```typescript
// In deduplicator.ts — processFile() returns:
// { messages: ParsedMessage[], userMessages: number, userMessagesByDate: Map<string, number> }

if (isUserEntry(raw)) {
  const date = raw.timestamp.slice(0, 10); // "2026-03-25"
  userMessagesByDate.set(date, (userMessagesByDate.get(date) ?? 0) + 1);
  userMessageCount += 1;
  continue;
}
```

**Propagation:** `parseAllFiles()` merges per-file maps into a global `Map<string, number>`. `aggregateDaily()` accepts this map and uses it to populate `bucket.userMessages` instead of hardcoding 0.

**Source:** Direct inspection of `deduplicator.ts` and `schema.ts`.

### Pattern 3: Privacy Gate — byProject in SafeTimeSeries

**What:** `toSafeTimeSeries()` in `safestats.ts` already gates `projects?: string[]` on `showProjects`. Apply the same gate to `byProject`.

```typescript
// In safestats.ts — toSafeTimeSeries():
const safe: SafeDailyStats = {
  // ... existing fields ...
};
if (showProjects) {
  safe.projects = day.projects;
  safe.byProject = day.byProject; // NEW — only when opted in
}
```

**Worker-side:** `SafeDailyStats` in `types.ts` adds `byProject?: Record<string, PerProjectDailyStats>`. The `isValidSyncV2Body()` validator uses structural validation — adding an optional field doesn't break it, but the validator should explicitly accept (not reject) `byProject` when present.

### Pattern 4: CLEAN-01 — Remove Slowest Day

**What:** The "Slowest Day" metric does NOT yet exist in the current codebase (verified by grep). It's a planned v1.1 addition. CLEAN-01 means: do NOT add it, and ensure no planning docs for downstream phases spec it.

If any Phase 14 planning docs reference "Slowest Day", remove those references. The hero grid currently has 4 stat cards (Tenure, Total Tokens, Total Cost, Cost/Session). It stays at 4 cards — no Slowest Day card is added.

### Pattern 5: CLEAN-02 — Peak Day Naming

**What:** The "Most Messages" label is a v1.1 planned metric. Per context decisions, it's relabeled to "Peak Day" before being introduced. When Phase 14 adds the Peak Day stat card, it uses "Peak Day" — not "Most Messages."

CLEAN-02 is a naming decision, not a code removal — the feature hasn't been built yet. The deliverable is confirming the label standard so Phase 14 uses it correctly.

### Pattern 6: API Version Strategy (Claude's Discretion)

**Recommendation: optional fields on v2 (no v3 bump).**

The existing `isValidSyncV2Body()` validator in `types.ts` checks `timeSeries` for `username`, `version === 2`, `days` array, and `generatedAt`. It does NOT validate individual `SafeDailyStats` fields beyond array membership — additional optional fields on each day object pass through without rejection.

The Worker stores the whole `timeSeries` blob via `putTimeSeries()` and returns it raw via `getTimeSeries()`. No field-level parsing happens on individual day objects. Adding `byProject?: Record<...>` and fixing `userMessages` to real values is backward compatible:

- Old data in KV: `byProject` absent, `userMessages: 0` — dashboard reads these safely with `d.byProject || {}` and `d.userMessages || 0`
- New data in KV: `byProject` present when user opted in, `userMessages` has real values
- No version bump needed

**Do NOT bump to v3** unless there is a breaking schema change. Optional fields are explicitly backward compatible with the `version: 2` contract.

### Anti-Patterns to Avoid

- **Don't pass `userMessagesByDate` through `ParsedMessage`**: `ParsedMessage` is the output for assistant messages only. User message timestamps must travel through a separate map, not as fields on `ParsedMessage`.
- **Don't add `byProject` to `DailyStats` without making it optional**: Days produced when `--show-projects` is off should have `byProject: undefined` — not an empty object — so the privacy gate is clear.
- **Don't change `isValidSyncV2Body()`'s `version: 2` check**: The version field was designed for breaking changes. Optional fields are not breaking.
- **Don't rebuild all charts when range changes**: The dashboard already uses `patchChart()` for smooth morphs. Per-project data renders in the existing `chartProjects` build path — extend it, don't bypass it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date extraction from ISO timestamp | Custom parsing | `timestamp.slice(0, 10)` | Already the pattern in `dailyAggregator.ts` — consistent, no library needed |
| Project name from cwd | Custom path parsing | `projectNameFromCwd()` in `dailyAggregator.ts` | Already exists, already handles edge cases |
| Name collision disambiguation | Custom algorithm | Existing `projects: string[]` array per day + shortest unique parent suffix at display time | Data layer stores full names; display disambiguation is a dashboard concern |
| Type-safe optional field addition | New validator function | Extend existing `isValidSyncV2Body()` | One validator, not two |

**Key insight:** This phase extends existing patterns, not new ones. Every pattern already exists — add fields to existing types, add accumulators to existing loops.

## Common Pitfalls

### Pitfall 1: Losing userMessagesByDate Across File Boundaries

**What goes wrong:** `processFile()` is called per JSONL file. If `userMessagesByDate` is local to `processFile()`, dates don't merge correctly when the same date spans multiple files.

**Why it happens:** `parseAllFiles()` iterates files and merges `messages[]` from each file. The date-bucketed user message counts need the same merge treatment.

**How to avoid:** Return `userMessagesByDate: Map<string, number>` from `processFile()`. In `parseAllFiles()`, merge all per-file maps into a single `allUserMessagesByDate: Map<string, number>` using `for (const [date, count] of fileResult.userMessagesByDate)` accumulation. Pass the merged map to `aggregateDaily()`.

**Warning signs:** `userMessages` is always 0 even after the fix.

### Pitfall 2: Privacy Validator Rejecting Project Names

**What goes wrong:** The Worker's `containsPrivacyViolation()` in `types.ts` scans for banned fields and strings starting with `/` or `~/`. Project directory names (last path segment like "SaaS" or "shipcard") are safe — they don't start with `/`. But if a project name is accidentally set to the full path, the validator rejects the payload.

**Why it happens:** `projectNameFromCwd()` strips to the last segment correctly. But a bug upstream (using `msg.cwd` directly instead of `projectNameFromCwd(msg.cwd)`) would send full paths.

**How to avoid:** Verify `byProject` keys are always bare directory names (no `/`). Add a test assertion.

**Warning signs:** `isValidSyncV2Body()` returns false; Worker returns 400 on sync.

### Pitfall 3: byProject Breaks Old-Format Graceful Degradation

**What goes wrong:** Dashboard code that does `d.byProject[projectName]` throws when `d.byProject` is undefined on old-format days.

**Why it happens:** Mixing new-format days (with `byProject`) and old-format days (without) in the same time series when a user resyncs with `--show-projects` after previous non-project syncs.

**How to avoid:** All dashboard reads use `d.byProject?.[projectName] ?? fallback`. The existing `hasProjects` computed property already handles this for `projects?: string[]` — apply the same pattern.

**Warning signs:** Dashboard throws JS errors in console when viewing old synced data.

### Pitfall 4: DailyStats Type Drift Between CLI and Worker

**What goes wrong:** `SafeDailyStats` is defined in both `shiplog/src/cli/safestats.ts` (CLI side) and `shiplog-worker/src/types.ts` (Worker side). A comment in `safestats.ts` warns: "Note: SafeStats type mirrors shipcard-worker/src/types.ts — do NOT import from Worker." If only one side is updated, the types drift.

**How to avoid:** Update `SafeDailyStats` in both files in the same task. The new `PerProjectDailyStats` type can be defined in both as an inline interface — no shared import.

**Warning signs:** TypeScript compiles both sides individually but the Worker rejects payloads at runtime because its `isValidSyncV2Body()` has the old shape.

### Pitfall 5: Per-Project Accumulator Initialization

**What goes wrong:** Inside `aggregateDaily()`, if `byProject` map entry isn't initialized before the inner loop, `undefined + 1` produces `NaN`.

**Why it happens:** The `DayAccumulator` pattern requires initializing sub-accumulators before incrementing.

**How to avoid:** Use the same `get-or-init` pattern already in `dailyAggregator.ts`:
```typescript
let projAcc = bucket.byProject.get(project);
if (projAcc === undefined) {
  projAcc = { sessions: new Set(), messages: 0, ... };
  bucket.byProject.set(project, projAcc);
}
```

## Code Examples

### userMessages Fix — processFile() Change
```typescript
// Source: shiplog/src/parser/deduplicator.ts (modified)
// Return type change: add userMessagesByDate

export async function processFile(
  filePath: string,
  seenUuids: Set<string>,
  stats: { linesSkipped: number }
): Promise<{
  messages: ParsedMessage[];
  userMessages: number;
  userMessagesByDate: Map<string, number>;  // NEW
}> {
  const userMessagesByDate = new Map<string, number>(); // NEW
  let userMessageCount = 0;

  // ... existing loop ...
  if (isUserEntry(raw)) {
    const date = raw.timestamp.slice(0, 10); // "2026-03-25"  NEW
    userMessagesByDate.set(date, (userMessagesByDate.get(date) ?? 0) + 1); // NEW
    userMessageCount += 1;
    continue;
  }
  // ...
  return { messages, userMessages: userMessageCount, userMessagesByDate }; // updated
}
```

### Merging userMessagesByDate in parseAllFiles()
```typescript
// Source: shiplog/src/parser/deduplicator.ts (modified)
const allUserMessagesByDate = new Map<string, number>(); // NEW

for await (const filePath of discoverJsonlFiles(projectsDir)) {
  stats.filesRead += 1;
  const fileResult = await processFile(filePath, seenUuids, stats);
  allMessages.push(...fileResult.messages);
  stats.userMessages += fileResult.userMessages;
  // NEW: merge date-bucketed user messages
  for (const [date, count] of fileResult.userMessagesByDate) {
    allUserMessagesByDate.set(date, (allUserMessagesByDate.get(date) ?? 0) + count);
  }
}
// Pass allUserMessagesByDate to aggregateDaily()
```

### aggregateDaily() signature update
```typescript
// Source: shiplog/src/engine/dailyAggregator.ts (modified)
export function aggregateDaily(
  messages: ParsedMessage[],
  pricing: { map: PricingMap; version: string },
  userMessagesByDate?: Map<string, number>  // NEW optional param
): DailyStats[] {
  // ... existing loop ...
  // When building result:
  result.push({
    // ...
    userMessages: userMessagesByDate?.get(date) ?? 0, // was hardcoded 0
    // ...
  });
}
```

### Per-Project Accumulator Inside DayAccumulator
```typescript
// Source: shiplog/src/engine/dailyAggregator.ts (new structure)
interface ProjectDayAccumulator {
  sessions: Set<string>;
  messages: number;
  tokens: TokenCounts;
  costRaw: number;
  toolCalls: Record<string, number>;
  thinkingBlocks: number;
  models: Record<string, number>;
}

interface DayAccumulator {
  // ... existing fields ...
  byProject: Map<string, ProjectDayAccumulator>; // NEW
}

// Init per project inside the main loop:
let projAcc = bucket.byProject.get(project);
if (projAcc === undefined) {
  projAcc = {
    sessions: new Set<string>(),
    messages: 0,
    tokens: zeroTokens(),
    costRaw: 0,
    toolCalls: {},
    thinkingBlocks: 0,
    models: {},
  };
  bucket.byProject.set(project, projAcc);
}
projAcc.sessions.add(msg.sessionId);
projAcc.messages += 1;
addTokens(projAcc.tokens, msg.tokens);
projAcc.costRaw += msgCost;
projAcc.thinkingBlocks += msg.thinkingBlocks;
for (const tool of msg.toolCalls) {
  projAcc.toolCalls[tool] = (projAcc.toolCalls[tool] ?? 0) + 1;
}
const totalTok = msg.tokens.input + msg.tokens.output;
projAcc.models[msg.model] = (projAcc.models[msg.model] ?? 0) + totalTok;
```

### Dashboard: Per-Project null-safe reads
```javascript
// Source: shiplog-worker/src/routes/dashboard.ts (pattern for new code)
// All per-project reads must be null-safe for backward compatibility:
const projStats = day.byProject?.[projectName] ?? null;
const projSessions = projStats?.sessions ?? 0;
const projCostCents = projStats?.costCents ?? 0;
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `userMessages: 0` hardcoded | Per-day user message counting from `UserEntry.timestamp` | Messages donut chart shows real "You vs Claude" split |
| `projects: string[]` only in daily stats | `byProject: Record<string, PerProjectDailyStats>` optional | Per-project dashboard panels become possible |
| "Most Messages" (planned label) | "Peak Day" | Aligns with Phase 14 multi-metric design intent |
| "Slowest Day" (planned panel) | Removed / never added | Dashboard layout stays clean; dead metric eliminated |

## Open Questions

1. **userMessages disambiguation: isSidechain entries**
   - What we know: `UserEntry` has `isSidechain: boolean`. Sidechain messages may be tool responses, not true user messages.
   - What's unclear: Should sidechain `UserEntry` entries count toward `userMessages`?
   - Recommendation: Mirror the existing behavior — `deduplicator.ts` currently counts all `UserEntry` items regardless of sidechain. Keep consistent. If the Messages donut shows inflated "You" count, revisit in a later phase.

2. **Project name collision handling at display time**
   - What we know: Context decisions say "add shortest unique parent suffix only when two projects share the same name." The data layer stores bare directory names.
   - What's unclear: Whether the collision disambiguation logic belongs in `dailyAggregator.ts` (transforms keys) or in the dashboard JS (renders display names while keeping data keys stable).
   - Recommendation: Keep data keys as bare directory names (e.g., `"SaaS"`, `"blog"`). Dashboard displays the bare name and adds disambiguation only at render time. This keeps the data layer simple and avoids key collisions in `byProject` maps.

3. **isValidSyncV2Body(): should it validate byProject contents?**
   - What we know: The current validator checks `timeSeries.days` is an array but doesn't validate individual day fields.
   - What's unclear: Whether to add explicit `byProject` validation or accept unknown fields.
   - Recommendation: Accept unknown/optional fields silently in the validator. Adding strict `byProject` validation creates a maintenance burden every time the schema evolves. The privacy scan (`containsPrivacyViolation()`) already catches path leakage.

## Sources

### Primary (HIGH confidence)
- Direct source inspection — `shiplog/src/engine/dailyAggregator.ts` — full file read
- Direct source inspection — `shiplog/src/cli/safestats.ts` — full file read
- Direct source inspection — `shiplog-worker/src/types.ts` — full file read
- Direct source inspection — `shiplog/src/parser/deduplicator.ts` — full file read
- Direct source inspection — `shiplog/src/parser/schema.ts` — full file read
- Direct source inspection — `shiplog-worker/src/kv.ts` — full file read
- Direct source inspection — `shiplog-worker/src/routes/dashboard.ts` — read + grep
- Direct source inspection — `shiplog-worker/src/routes/syncV2.ts` — full file read
- Grep verification — "Slowest Day" and "Most Messages" do not exist in current codebase

### Secondary (MEDIUM confidence)
- `.planning/phases/13-data-pipeline-cleanup/13-CONTEXT.md` — locked decisions from discussion phase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — code directly inspected, no external dependencies
- Architecture: HIGH — all patterns derived from existing code, not external sources
- Pitfalls: HIGH — identified from direct inspection of type gaps, TODO comments, and known dual-type drift pattern
- CLEAN-01/CLEAN-02: HIGH — grep confirmed neither metric exists yet; purely additive naming decision

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable codebase, no fast-moving dependencies)
