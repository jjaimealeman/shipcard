---
phase: 01-parser-engine
verified: 2026-03-25T22:24:20Z
status: passed
score: 5/5 must-haves verified
---

# Phase 1: Parser Engine Verification Report

**Phase Goal:** Developers can run the engine against real JSONL files and get accurate, resilient analytics output
**Verified:** 2026-03-25T22:24:20Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | Engine reads all JSONL from `~/.claude/projects/` and produces typed session data without crashing on unknown fields | VERIFIED | Ran against 2,154 real files, 441 sessions, 0 lines skipped. Type guards in `schema.ts` silently skip non-user/non-assistant entries. |
| 2   | Output includes accurate session count, total tokens (input/output/cache), models used, tool call counts, and projects from cwd | VERIFIED | Output confirmed: 441 sessions, all four token types populated, 57 projects derived from cwd last segment, tool call summary sorted by count. |
| 3   | Cost display shows `~$X.XX` format with `pricingVersion` field | VERIFIED | `project.cost` = `~$348.45`, `model.cost` = `~$2,660.35`, `summary.totalCost` = `~$3,352.18`. `pricingVersion` = `"LiteLLM cached 2026-03-25"`. |
| 4   | Date range filtering with `--since` / `--until` narrows results | VERIFIED | `since: '7d'` produced 52 sessions vs 441 total. `since: '2026-03-01', until: '2026-03-15'` produced 80 sessions. `meta.dateRange` populated correctly. |
| 5   | Engine serializes all output to JSON when requested | VERIFIED | `JSON.stringify(result)` produces valid JSON. `AnalyticsResult` uses no Maps, Sets, Dates, or class instances. |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `shipcard/src/parser/schema.ts` | Types + type guards | VERIFIED | 141 lines. Exports `TokenCounts`, `ParsedMessage`, `isUserEntry`, `isAssistantEntry`. Defensive guards check every nested field. |
| `shipcard/src/parser/reader.ts` | File discovery + streaming | VERIFIED | 54 lines. `discoverJsonlFiles` uses Node 22 `glob`. `streamJsonlFile` streams line-by-line, skips blank lines, increments `linesSkipped` on parse failure. |
| `shipcard/src/parser/deduplicator.ts` | Two-level dedup | VERIFIED | 178 lines. Level 1: uuid Set shared across files. Level 2: `bestByMessageId` keeps highest `output_tokens` per `message.id`. `parseAllFiles` builds sessions map. |
| `shipcard/src/engine/types.ts` | Output shapes | VERIFIED | 99 lines. Exports `AnalyticsResult`, `ProjectStats`, `ModelStats`, `EngineOptions`. All cost fields typed as `string` (formatted `~$X.XX`). `pricingVersion` field present. |
| `shipcard/src/engine/cost.ts` | Pricing with 3-layer cache | VERIFIED | 372 lines. Layer 1: module-level `runtimeCache`. Layer 2: `~/.shipcard/pricing.json` with 24h mtime check. Layer 3: LiteLLM network fetch with disk write. Fallback: bundled snapshot. `formatCost` always prepends `~$`. |
| `shipcard/src/engine/aggregator.ts` | Single-pass aggregation | VERIFIED | 273 lines. Single `for` loop over messages. Accumulates project tokens/sessions/models/toolCalls/cost, model tokens/cost, and model×project breakdown. Calls `formatCost` on all outputs. |
| `shipcard/src/engine/filter.ts` | Date filtering | VERIFIED | 98 lines. `parseFilterDate` handles ISO (`2026-03-01`), relative (`7d`, `30d`), and keyword (`today`). `filterByDateRange` applies since (inclusive) and until (exclusive). |
| `shipcard/src/index.ts` | Public API entry point | VERIFIED | 127 lines. `runEngine` orchestrates all 7 steps. Wires parser → filter → pricing → aggregator. Attaches `meta.dateRange` when filtering applied. Re-exports all consumer types. |
| `shipcard/data/pricing-snapshot.json` | Bundled fallback | VERIFIED | Exists. 20 model entries including `claude-sonnet-4-6`. `_meta.snapshot_date` = `"2026-03-25"`. Used as Layer 4 fallback when network unavailable. |

---

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `index.ts` | `parser/deduplicator.ts` | `parseAllFiles()` import | WIRED | `import { parseAllFiles }` at line 13; called at line 59 |
| `index.ts` | `engine/filter.ts` | `filterByDateRange()` import | WIRED | `import { filterByDateRange }` at line 14; called at line 71 |
| `index.ts` | `engine/cost.ts` | `getPricing()` import | WIRED | `import { getPricing }` at line 15; called at line 109 |
| `index.ts` | `engine/aggregator.ts` | `aggregate()` import | WIRED | `import { aggregate }` at line 16; called at line 112 |
| `aggregator.ts` | `engine/cost.ts` | `calculateCost`, `formatCost`, `getModelPricing` | WIRED | All three called within single-pass loop |
| `deduplicator.ts` | `reader.ts` | `discoverJsonlFiles`, `streamJsonlFile` | WIRED | `discoverJsonlFiles` iterated at line 141; `streamJsonlFile` called at line 66 |
| `cost.ts` | `data/pricing-snapshot.json` | `loadBundledSnapshot` via `import.meta.url` | WIRED | Path resolved relative to file; `_meta.snapshot_date` read for version string |
| `filter.ts` | `index.ts` | sessions map rebuilt after filtering | WIRED | Lines 78–99 rebuild sessions from filtered messages before passing to aggregator |

---

### Requirements Coverage

| Requirement | Status | Notes |
| ----------- | ------ | ----- |
| PARSE-01: Discover JSONL files under projects dir | SATISFIED | `discoverJsonlFiles` uses Node 22 `glob` with `**/*.jsonl` pattern |
| PARSE-02: Stream files without buffering | SATISFIED | `streamJsonlFile` uses `readline` + `createReadStream`, yields one entry at a time |
| PARSE-03: Skip unknown/corrupt lines without crashing | SATISFIED | `try/catch` in `streamJsonlFile`, non-user/non-assistant entries silently ignored |
| PARSE-04: UUID-level deduplication across files | SATISFIED | `seenUuids` Set shared across all files in `parseAllFiles` |
| PARSE-05: Message.id deduplication for streaming chunks | SATISFIED | `bestByMessageId` map keeps entry with highest `output_tokens` per `message.id` |
| PARSE-06: Derive project from cwd | SATISFIED | `projectNameFromCwd` takes last non-empty path segment |
| PARSE-07: Track session metadata (first/last timestamp, cwd) | SATISFIED | `sessions` Map built in `parseAllFiles` and `deduplicator.processFile` |
| ANLYT-01: Session count | SATISFIED | `summary.totalSessions = sessions.size` (confirmed: 441 from real data) |
| ANLYT-02: Token counts (input/output/cache) | SATISFIED | All four token types aggregated; confirmed from real run |
| ANLYT-03: Models used | SATISFIED | `modelsUsed` array sorted, deduplicated |
| ANLYT-04: Tool call counts | SATISFIED | `toolCallSummary` sorted by count desc; `byProject.toolCalls` unsorted per spec |
| ANLYT-05: Cost per project and model with `~` label | SATISFIED | `formatCost` always produces `~$X.XX`; `pricingVersion` in summary |
| ANLYT-06: Date range filtering | SATISFIED | `filterByDateRange` applied before aggregation; `meta.dateRange` attached when used |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `engine/cost.ts` | 161 | `return undefined` | Info | Legitimate early-return in `loadBundledSnapshot` error handler — not a stub |

No blockers or warnings. The single `return undefined` is the correct pattern for an error-path fallback function.

---

### Human Verification Required

None. All success criteria are verifiable programmatically and were confirmed by running the engine against 2,154 real JSONL files.

---

## Gaps Summary

No gaps. All 5 observable truths verified, all 9 required artifacts pass all three levels (exists, substantive, wired), all 8 key links confirmed wired. TypeScript compiles clean (`tsc --noEmit` exits 0). Engine produced valid, JSON-serializable output on real data.

---

_Verified: 2026-03-25T22:24:20Z_
_Verifier: Claude (gsd-verifier)_
