---
phase: 16-agent-agnostic-architecture
plan: 02
subsystem: api
tags: [adapter-pattern, typescript, source-adapter, claude-code, engine]

# Dependency graph
requires:
  - phase: 16-01
    provides: shipcard/ directory with full parser in src/parser/
  - phase: 01-parser-engine
    provides: parseAllFiles() and discoverJsonlFiles() in src/parser/
provides:
  - SourceAdapter interface (name, id, discoverFiles, parse)
  - ClaudeCodeAdapter wrapping existing parser modules
  - Adapter registry with getAdapter() defaulting to claude-code
  - runEngineFull() calling adapter.parse() — no direct parser imports
  - EngineOptions.adapter? field for future adapter selection
  - Both packages at v2.0.0
affects:
  - future-adapters (cursor, copilot, codex) — add to registry only, zero engine changes

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Adapter pattern: SourceAdapter interface + registry + getAdapter() for agent-agnostic parsing"
    - "Thin delegation: adapters wrap existing modules, no logic duplication"
    - "Function-object style for adapters (not classes)"

key-files:
  created:
    - shipcard/src/adapters/interface.ts
    - shipcard/src/adapters/registry.ts
    - shipcard/src/adapters/claude-code/index.ts
  modified:
    - shipcard/src/engine/types.ts
    - shipcard/src/index.ts
    - shipcard/package.json
    - shipcard-worker/package.json

key-decisions:
  - "Function-object style for ClaudeCodeAdapter (matches codebase conventions, no class overhead)"
  - "ParseResult re-exported from adapters/interface.ts so consumers never reach into parser internals"
  - "Adapter defaults to claude-code when EngineOptions.adapter is undefined — zero breaking changes"
  - "v2.0.0 bumped in both package.json files simultaneously per versioning rules"

patterns-established:
  - "Adapter pattern: new agents add adapter + register in registry — engine/CLI untouched"
  - "Registry defaults: getAdapter() with no argument returns the primary adapter"
  - "Clean import boundaries: engine imports from adapters/interface.ts, not parser/"

# Metrics
duration: 8min
completed: 2026-03-28
---

# Phase 16 Plan 02: Adapter Architecture Summary

**SourceAdapter interface + ClaudeCodeAdapter thin wrapper wired into runEngineFull() via registry — engine now fully agent-agnostic at v2.0.0**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-28T23:52:00Z
- **Completed:** 2026-03-28T23:53:42Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- SourceAdapter interface defines the contract all future agent adapters must satisfy
- ClaudeCodeAdapter wraps existing parser modules with zero behavior change — full delegation
- runEngineFull() now calls adapter.parse() via getAdapter(), zero direct parser imports
- Both packages bumped to v2.0.0 marking the v2.0 architecture milestone

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SourceAdapter interface and adapter registry** - `8a5ea81` (feat)
2. **Task 2: Wrap existing parser as ClaudeCodeAdapter** - `fe988c5` (feat)
3. **Task 3: Wire adapter into engine entry point and bump version** - `f0c8710` (feat)

## Files Created/Modified

- `shipcard/src/adapters/interface.ts` - SourceAdapter interface + ParseResult re-export
- `shipcard/src/adapters/registry.ts` - getAdapter() and listAdapters() registry
- `shipcard/src/adapters/claude-code/index.ts` - ClaudeCodeAdapter function-object wrapping parser
- `shipcard/src/engine/types.ts` - Added optional adapter field to EngineOptions
- `shipcard/src/index.ts` - runEngineFull() uses getAdapter() instead of parseAllFiles()
- `shipcard/package.json` - Bumped to 2.0.0
- `shipcard-worker/package.json` - Bumped to 2.0.0

## Decisions Made

- **Function-object style for ClaudeCodeAdapter** — matches codebase conventions (no class keyword anywhere in the codebase), simpler and tree-shakeable
- **ParseResult re-exported from adapters/interface.ts** — engine and consumers import from the adapter layer, never reaching into parser internals. Clean import boundary enforced.
- **Default adapter is "claude-code"** — EngineOptions.adapter is optional, getAdapter() with no argument returns ClaudeCodeAdapter. Zero breaking changes to existing API.
- **v2.0.0 simultaneous bump** — Both shipcard and shipcard-worker versioned identically per CLAUDE.md versioning rules.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled clean on first attempt, CLI smoke test passed immediately.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Adapter system ready for future agents (Cursor, Copilot, Codex, etc.)
- Adding a second adapter requires: create adapter file + add to ADAPTERS registry in registry.ts
- Engine, CLI, MCP tools all consume ParseResult through adapter.parse() — zero changes needed elsewhere
- Phase 16 complete: both plans (rename + adapter) done

---
*Phase: 16-agent-agnostic-architecture*
*Completed: 2026-03-28*
