---
phase: 01-parser-engine
plan: 02
subsystem: engine
tags: [litellm, pricing, analytics, aggregator, cost-estimation, tiered-pricing, typescript]

# Dependency graph
requires:
  - phase: 01-parser-engine plan 01
    provides: ParsedMessage, TokenCounts, ParseResult from streaming JSONL parser
provides:
  - AnalyticsResult output shape (summary + byProject + byModel + meta)
  - LiteLLM pricing fetch with 3-layer cache (runtime → disk → network → snapshot)
  - Tiered cost calculation for all 4 token types with 200k threshold
  - analytics aggregator: single-pass production of complete stats
  - Bundled Claude pricing snapshot (19 models, 2026-03-25)
affects: [02-mcp-tools, 03-cli, 04-card-endpoint, 05-distribution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 3-layer cache pattern for external data (runtime → disk → network → bundled fallback)
    - Tiered pricing model: 200k token threshold, all 4 token types covered
    - Single-pass aggregation over message stream to avoid O(n) repeated iterations
    - formatCost with tilde prefix signals estimation ("~$X.XX")
    - getModelPricing fallback to claude-sonnet-4-6 when model not in map

key-files:
  created:
    - shiplog/src/engine/types.ts
    - shiplog/src/engine/cost.ts
    - shiplog/src/engine/aggregator.ts
    - shiplog/data/pricing-snapshot.json
  modified: []

key-decisions:
  - "Pricing snapshot is outside src/ (data/) — not compiled, loaded at runtime via import.meta.url resolution"
  - "PricingMap is Map<string, ModelPricing> for O(1) lookup during aggregation"
  - "Per-message cost calculation (not per-session) so multi-model sessions are priced correctly"
  - "pricingCache in aggregator avoids repeated PricingMap lookups for the same model"
  - "formatCost uses toLocaleString('en-US') for thousands separator on large amounts"

patterns-established:
  - "3-layer cache: module-level runtime var → ~/.shiplog/pricing.json (24h mtime) → fetch → bundled snapshot"
  - "Never throw on pricing failure — fall through to next layer, always return a usable map"
  - "Tiered pricing: calcTieredCost(tokens, baseRate, tieredRate?) handles undefined tieredRate gracefully"
  - "Single accumulator pass: initialize Map entries on first encounter, mutate in-place"
  - "sortByCountDesc for toolCallSummary — sort at build time, not query time"

# Metrics
duration: 3min
completed: 2026-03-25
---

# Phase 1 Plan 2: Analytics Engine Summary

**LiteLLM pricing with 3-layer cache + single-pass aggregator producing AnalyticsResult with per-project and per-model cost breakdowns**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-25T22:10:06Z
- **Completed:** 2026-03-25T22:13:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Complete AnalyticsResult type hierarchy (AnalyticsResult, ProjectStats, ModelStats, EngineOptions)
- LiteLLM pricing client with 3-layer cache — never crashes on failure, always falls back gracefully
- Tiered cost calculation covering all 4 token types (input, output, cacheCreate, cacheRead) with 200k threshold
- Single-pass aggregator that produces full byProject + byModel breakdowns with nested cross-referencing
- Bundled pricing snapshot with 19 Claude models including cache token costs and above_200k rates

## Task Commits

Each task was committed atomically:

1. **Task 1: Engine types, LiteLLM pricing with 3-layer cache** - `7e29477` (feat)
2. **Task 2: Analytics aggregator** - `dc2233b` (feat)

**Plan metadata:** _(docs commit — see below)_

## Files Created/Modified

- `shiplog/src/engine/types.ts` — AnalyticsResult, ProjectStats, ModelStats, EngineOptions output shapes
- `shiplog/src/engine/cost.ts` — getPricing() 3-layer cache, calcTieredCost, calculateCost, getModelPricing, formatCost
- `shiplog/src/engine/aggregator.ts` — aggregate() single-pass over ParsedMessages into AnalyticsResult
- `shiplog/data/pricing-snapshot.json` — bundled Claude model pricing fallback (19 models, 2026-03-25 snapshot)

## Decisions Made

- **Pricing snapshot location:** Stored in `data/pricing-snapshot.json` outside `src/` (not compiled). Loaded at runtime using `import.meta.url` → `path.resolve`. The tsconfig `include: ["src/**/*"]` pattern confirms this is the right call — data files are assets, not code.
- **Map over object for PricingMap:** Using `Map<string, ModelPricing>` instead of a plain object enables O(1) lookups in the aggregator's hot path and avoids prototype pollution concerns.
- **Per-message cost calculation:** Cost is computed per ParsedMessage using that message's model. This correctly handles sessions where multiple models were used (e.g. Claude switches models mid-session).
- **pricingCache in aggregator:** Memoizes `getModelPricing()` calls per model string. Most messages use the same model, so this avoids repeated Map.get() + fallback checks.
- **formatCost with locale-aware thousands separator:** `toLocaleString('en-US')` handles $1,234.56 naturally without manual string manipulation.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Engine is complete and type-checked. `tsc --noEmit` passes with zero errors.
- `aggregate(parseResult, pricing)` is the entry point — takes ParseResult from 01-01's `parseAllFiles()` and `{ map, version }` from `getPricing()`.
- Ready for 01-03 (CLI + MCP tools) to import and call these functions.
- The `EngineOptions` type is pre-defined for the CLI to pass since/until/projectsDir filters — 01-03 will need to implement filtering in the aggregator or parser call.

---
*Phase: 01-parser-engine*
*Completed: 2026-03-25*
