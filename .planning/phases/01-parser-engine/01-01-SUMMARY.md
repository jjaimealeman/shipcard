---
phase: 01-parser-engine
plan: 01
subsystem: parser
tags: [typescript, node22, jsonl, streaming, deduplication, glob, readline]

# Dependency graph
requires: []
provides:
  - Typed JSONL entry schema (BaseEntry, UserEntry, AssistantEntry, ContentBlock, ParsedMessage, TokenCounts)
  - Defensive type guards (isUserEntry, isAssistantEntry)
  - Async generator file discovery via Node 22 built-in glob
  - Streaming line-by-line JSONL reader via readline
  - Two-level deduplication: uuid across files + message.id within files (max output_tokens wins)
  - ParseResult aggregate with messages, sessions Map, and error stats
affects: [01-02-engine, 01-03-mcp-cli, phase-02, phase-03]

# Tech tracking
tech-stack:
  added: [typescript@5.x, @types/node@22.x]
  patterns:
    - Async generator pattern for lazy streaming (never buffer entire files)
    - Defensive type guard pattern (isXxx(entry: unknown): entry is Xxx)
    - Two-level dedup: shared Set for uuid, per-file Map for message.id (keep max output_tokens)
    - Optional stats bag pattern for mutable error accumulation across streaming

key-files:
  created:
    - shipcard/package.json
    - shipcard/tsconfig.json
    - shipcard/src/parser/schema.ts
    - shipcard/src/parser/reader.ts
    - shipcard/src/parser/deduplicator.ts
  modified: []

key-decisions:
  - "Node16 module resolution over Bundler — direct Node 22 target, no bundler involved"
  - "Use async iterator form of glob (for await of glob()) not promise form — promise form unreliable per research"
  - "message.id dedup scoped per-file, uuid dedup shared across files — matches how Claude Code writes duplicate entries"
  - "User entries contribute cwd metadata only — ParsedMessages are assistant-only, user entry cwd overrides assistant cwd per session"
  - "stats bag passed by reference for mutable accumulation without breaking async generator interface"

patterns-established:
  - "Async generators: all I/O operations return AsyncGenerator, never arrays/promises of arrays"
  - "Zero runtime deps: only node: built-ins (fs/promises, readline, node:fs)"
  - "Defensive guards: type guards check every required nested field before narrowing"
  - "Dedup pattern: Level 1 = uuid Set (shared, across files), Level 2 = Map keyed on message.id (per-file, keep max output_tokens)"

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 1 Plan 01: Project Scaffolding and Parser Summary

**Streaming JSONL parser with two-level deduplication using Node 22 built-in glob + readline, zero runtime dependencies**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-25T22:05:04Z
- **Completed:** 2026-03-25T22:07:13Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- TypeScript ESM project scaffolded with Node 22+ requirement, strict mode, Node16 module resolution, and declaration output for future npm publishing
- Complete JSONL type system covering all Claude Code entry shapes with defensive type guards that handle missing/malformed fields without crashing
- Streaming file discovery and line-by-line reader using only Node 22 built-in APIs — no buffering, no runtime dependencies
- Two-level deduplication: uuid-level (shared Set across all files) prevents cross-file duplicates; message.id-level (per-file Map, keep max output_tokens) captures only the final streaming chunk per turn
- ParseResult aggregates deduplicated ParsedMessages, per-session metadata (cwd, firstTimestamp, lastTimestamp), and error stats (filesRead, linesSkipped)

## Task Commits

Each task was committed atomically:

1. **Task 1: Project scaffolding and JSONL type definitions** - `983c667` (feat)
2. **Task 2: Streaming JSONL reader and two-level deduplicator** - `9fa91dd` (feat)

**Plan metadata:** _(committed after this SUMMARY.md)_

## Files Created/Modified

- `shipcard/package.json` - Package manifest: ESM, Node 22+, zero runtime deps, TypeScript devDeps
- `shipcard/tsconfig.json` - TypeScript config: ES2022 target, Node16 modules, strict, declaration output
- `shipcard/src/parser/schema.ts` - All JSONL types + ParsedMessage/TokenCounts output types + isUserEntry/isAssistantEntry type guards
- `shipcard/src/parser/reader.ts` - discoverJsonlFiles (glob async iterator) + streamJsonlFile (readline streaming)
- `shipcard/src/parser/deduplicator.ts` - processFile (two-level dedup) + parseAllFiles (full orchestration) + ParseResult type

## Decisions Made

- **Node16 module resolution:** Chosen over Bundler because we're targeting Node 22 directly with no bundler in the pipeline. Declaration maps require explicit .js extensions in imports.
- **glob async iterator form:** `for await (const file of glob(pattern))` — the promise form does not reliably work as a lazy iterator per research findings.
- **message.id dedup scoped per-file:** The uuid dedup handles cross-file duplicates globally. message.id dedup handles streaming chunks within one session file. Scoping message.id dedup per-file avoids false dedup if the same turn ID theoretically appeared in different session files.
- **User entries as metadata only:** User entries don't generate ParsedMessages but their `cwd` field is authoritative for the session — it overrides the cwd from assistant entries for the same session.
- **Stats bag by reference:** Passing `stats: { linesSkipped: number }` by reference allows the async generator to accumulate counts without returning them (generators can only yield, not return values mid-stream).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Parser foundation complete. `parseAllFiles(projectsDir)` is the single entry point for the analytics engine.
- Ready for Plan 01-02: Analytics engine consuming ParsedMessage[] and sessions Map to compute token stats, tool usage frequency, session counts, and model distribution.
- No blockers. `tsc --noEmit` passes cleanly.

---
*Phase: 01-parser-engine*
*Completed: 2026-03-25*
