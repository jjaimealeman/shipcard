# Phase 16: Agent-Agnostic Architecture - Research

**Researched:** 2026-03-28
**Domain:** TypeScript adapter pattern, directory rename, parser refactor
**Confidence:** HIGH

## Summary

This phase has two parts: (1) rename `shipcard/` → `shipcard/` and `shipcard-worker/` → `shipcard-worker/` as a prerequisite rename, and (2) introduce a `SourceAdapter` interface so the engine only ever sees `ParsedMessage[]` regardless of which agent produced the data.

The codebase is already well-positioned for the adapter refactor. The parser and engine are separated by a clean boundary: `parseAllFiles()` returns `ParseResult` containing `ParsedMessage[]`, and the engine's `aggregate()` only touches `ParsedMessage[]`. The entry point in `src/index.ts` (`runEngineFull`) is the only place that wires parser → engine — that's where the adapter gets plugged in. No changes needed in CLI commands, MCP tools, or the aggregator.

The directory rename is mechanical but high-volume. `shipcard/` is referenced 638+ times across `.planning/` docs and in `shipcard-worker/` source. The rename is a file system operation + sed-style path replacement, not a logic change. It must be done first and verified with a clean build before any adapter work begins.

**Primary recommendation:** Create a minimal `SourceAdapter` interface in `src/adapters/` that wraps the existing `parseAllFiles()`. The interface has two required methods: `discover()` for file paths and `parse()` returning `ParsedMessage[]`. Register `ClaudeCodeAdapter` as the only concrete implementation. Wire it into `runEngineFull()` via an `adapterRegistry` that defaults to `ClaudeCodeAdapter` with no config change required from existing users.

## Standard Stack

This is a pure TypeScript refactor — no new npm dependencies needed.

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| TypeScript interfaces | 5.x (already in use) | `SourceAdapter` contract | Zero-cost abstraction, already the project's type system |
| Node.js ESM modules | 22+ (already required) | Module structure for adapters | Already locked by `"type": "module"` in package.json |
| Existing parser | Current | Becomes `ClaudeCodeAdapter` implementation | Proven, complete, zero behavior change needed |

### Supporting
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `node:fs/promises` glob | Built-in (22+) | File discovery in `ClaudeCodeAdapter` | Already used in `reader.ts` |
| `node:path` | Built-in | Path manipulation in adapters | Already used throughout |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain TypeScript interface | Abstract class | Interface is simpler, matches existing codebase's function-object style (no classes anywhere today) |
| Interface in `src/adapters/` | Interface in `src/parser/` | `src/adapters/` makes the boundary explicit; parser stays as implementation detail |
| Single file `adapters.ts` | Directory `adapters/` | Directory scales better when second adapter arrives |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
shipcard/src/
├── adapters/               # NEW: adapter system
│   ├── interface.ts        # SourceAdapter interface + ParsedMessage re-export
│   ├── registry.ts         # getAdapter(name?) — returns active adapter
│   └── claude-code/        # NEW: ClaudeCodeAdapter
│       └── index.ts        # Wraps existing parser/ modules
├── parser/                 # UNCHANGED: Claude Code parsing internals
│   ├── deduplicator.ts
│   ├── reader.ts
│   └── schema.ts
├── engine/                 # UNCHANGED: aggregation, cost, filter
├── cli/                    # UNCHANGED: commands, args, config
├── mcp/                    # UNCHANGED: MCP server and tools
└── index.ts                # MINIMAL CHANGE: call adapter instead of parseAllFiles()
```

### Pattern 1: SourceAdapter Interface

**What:** A TypeScript interface that every agent adapter must satisfy. Two responsibilities: find the files, parse them into canonical `ParsedMessage[]`.

**When to use:** Any time the engine needs data from any source.

**Example:**
```typescript
// src/adapters/interface.ts
import type { ParsedMessage } from "../parser/schema.js";

export interface SourceAdapter {
  /**
   * Discover source files for this agent.
   * @param sourceDir  Override directory (e.g., EngineOptions.projectsDir)
   * @returns AsyncGenerator of absolute file paths
   */
  discoverFiles(sourceDir?: string): AsyncGenerator<string>;

  /**
   * Parse all source files and return canonical messages.
   * @param sourceDir  Optional override for discovery
   * @returns ParseResult with ParsedMessage[], sessions, stats, userMessagesByDate
   */
  parse(sourceDir?: string): Promise<ParseResult>;
}

export type { ParsedMessage };
```

**Why two methods:** `discoverFiles` exists separately so the engine can log "files found" in meta without re-parsing. `parse()` is the primary method callers use.

### Pattern 2: ClaudeCodeAdapter as Thin Wrapper

**What:** Wraps the existing `parseAllFiles()` from `deduplicator.ts`. Zero logic changes — just satisfies the interface.

**When to use:** Default adapter; used automatically unless config specifies otherwise.

**Example:**
```typescript
// src/adapters/claude-code/index.ts
import * as os from "node:os";
import { parseAllFiles, discoverJsonlFiles } from "../../parser/index.js";
import type { SourceAdapter } from "../interface.js";
import type { ParseResult } from "../../parser/deduplicator.js";

export const ClaudeCodeAdapter: SourceAdapter = {
  async *discoverFiles(sourceDir?: string): AsyncGenerator<string> {
    const dir = sourceDir ?? `${os.homedir()}/.claude/projects`;
    yield* discoverJsonlFiles(dir);
  },

  async parse(sourceDir?: string): Promise<ParseResult> {
    const dir = sourceDir ?? `${os.homedir()}/.claude/projects`;
    return parseAllFiles(dir);
  },
};
```

Note: function-object style (not class) — consistent with how the existing codebase is written (no classes anywhere in `src/`).

### Pattern 3: Registry with Default

**What:** A registry that returns the active adapter. Defaults to `ClaudeCodeAdapter` with no config required.

**When to use:** In `runEngineFull()` instead of calling `parseAllFiles()` directly.

**Example:**
```typescript
// src/adapters/registry.ts
import { ClaudeCodeAdapter } from "./claude-code/index.js";
import type { SourceAdapter } from "./interface.js";

const ADAPTERS: Record<string, SourceAdapter> = {
  "claude-code": ClaudeCodeAdapter,
};

/**
 * Return the active adapter.
 * Falls back to ClaudeCodeAdapter when no name provided or name unknown.
 */
export function getAdapter(name?: string): SourceAdapter {
  if (name !== undefined && ADAPTERS[name] !== undefined) {
    return ADAPTERS[name];
  }
  return ClaudeCodeAdapter;
}
```

### Pattern 4: Minimal Change to `runEngineFull()`

**What:** Replace the single `parseAllFiles(projectsDir)` call with `getAdapter().parse(projectsDir)`. Everything else stays identical.

**When to use:** This is the only change needed in the existing engine wiring.

**Example:**
```typescript
// src/index.ts — the ONE change
// BEFORE:
const parseResult = await parseAllFiles(projectsDir);

// AFTER:
const adapter = getAdapter(options?.adapter);
const parseResult = await adapter.parse(projectsDir);
```

`EngineOptions` gains an optional `adapter?: string` field. Since it's optional and defaults to `ClaudeCodeAdapter`, zero behavior change for existing users.

### Pattern 5: Directory Rename Strategy

**What:** `git mv` the two directories. Then update all internal references.

**Files requiring path updates after rename:**
- `shipcard/package.json` — name field (already `@jjaimealeman/shipcard`), no change needed
- `shipcard/tsconfig.json` — no path references, no change needed
- `shipcard-worker/package.json` — name field is already `shipcard-worker`, no change needed
- `shipcard-worker/wrangler.jsonc` — check for any `shiplog` references
- All `.planning/` docs — `shipcard/` path references (638+ occurrences across historical PLANs)
- `CLAUDE.md`, `README.md`, `DEPLOY.md`, `USAGE.md` at project root — scan for references

**Key insight:** The `.planning/` historical PLAN files are read-only history. They document what was built, not what gets executed. Updating them is "open-source pride" hygiene, not functional necessity. Consider a targeted sed pass rather than manual edits.

### Anti-Patterns to Avoid

- **Leaking Claude Code types into the interface:** `SourceAdapter.parse()` returns `ParseResult` (which contains `ParsedMessage[]`). Do NOT put `AssistantEntry`, `UserEntry`, or `BaseEntry` into the interface — those are Claude Code internals.
- **Moving file discovery into the engine:** The engine should not call `glob()`. Discovery belongs to the adapter. The engine receives `ParseResult` and processes it.
- **Adding adapter-specific fields to `ParsedMessage`:** `ParsedMessage` is the canonical normalized shape. Adapter-specific metadata (e.g., Codex's equivalent of `isSidechain`) must be mapped to existing fields or dropped — never added as new fields without updating the interface.
- **Adapter config leaking into `EngineOptions`:** Only `adapter?: string` name lookup. Configuration for the adapter itself (e.g., a non-default projects dir) uses the existing `projectsDir` option — adapters read that from the options they already receive.
- **Updating `.planning/` PLAN files by hand:** There are 638+ occurrences. Use a targeted `sed -i` or shell script to do the rename in bulk. Manual editing is error-prone.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interface registration/DI | Custom service locator, IoC container | Simple `Record<string, SourceAdapter>` in `registry.ts` | Only 1 adapter now; a plain record is sufficient and zero-dependency |
| Auto-detection of JSONL format | Custom ML/heuristic classifier | Probe for known structural fields (e.g., `sessionId`, `isSidechain`) | JSONL formats have deterministic marker fields; a short type guard is enough |
| Config schema evolution | JSON Schema validator, Zod migration | Add `adapter?: string` as optional to existing `ShipcardAuthConfig` | Config is already unvalidated JSON; keeping it simple matches codebase style |

**Key insight:** This refactor adds zero npm dependencies. All patterns are native TypeScript interfaces and existing Node.js built-ins.

## Common Pitfalls

### Pitfall 1: Breaking Behavior on First Build After Rename

**What goes wrong:** `git mv shiplog shipcard` moves the directory but `dist/` still exists with old paths. `node dist/cli/index.js` resolves to old location references.

**Why it happens:** TypeScript compiles to `dist/` relative to `rootDir`. After rename, `rootDir` changes, dist is stale.

**How to avoid:** After `git mv`, run `rm -rf shipcard/dist/ && pnpm build` before any test. Verify with `node dist/cli/index.js --version`.

**Warning signs:** `Cannot find module` errors at runtime when dist exists but paths are wrong.

### Pitfall 2: `ParseResult` vs `ParsedMessage[]` Confusion at Interface Boundary

**What goes wrong:** Defining `SourceAdapter.parse()` to return `ParsedMessage[]` directly instead of `ParseResult`. This loses `sessions`, `stats`, and `userMessagesByDate` that `runEngineFull()` needs.

**Why it happens:** The interface goal is "engine sees `ParsedMessage[]`" but the engine actually needs the full `ParseResult` shape (stats, sessions, userMessagesByDate).

**How to avoid:** `SourceAdapter.parse()` returns `ParseResult` (the same shape already exported from `deduplicator.ts`). The engine's internal contract is still `ParsedMessage[]` for aggregation — it just gets there via `parseResult.messages`.

**Warning signs:** Missing `meta.filesRead`, missing session count, missing `userMessagesByDate` for time-series.

### Pitfall 3: `EngineOptions.adapter` Breaking Existing Users

**What goes wrong:** Making `adapter` a required field, or defaulting to `undefined` and erroring when unset.

**Why it happens:** Incomplete optional typing.

**How to avoid:** `adapter?: string` is optional. `getAdapter(undefined)` returns `ClaudeCodeAdapter`. Existing configs that lack the field work without any migration.

**Warning signs:** Type errors in callers that don't pass `adapter`; users getting "no adapter configured" errors.

### Pitfall 4: Planning Doc Rename Missing Some References

**What goes wrong:** Running sed on `.planning/` but missing edge cases like `shipcard-worker/` vs `shipcard/`, or references in wrangler.jsonc.

**Why it happens:** Multiple patterns: `shipcard/`, `shipcard-worker/`, `"shiplog"`, `shiplog:` in YAML-style plan files.

**How to avoid:** Run `grep -r "shiplog" .planning/ | wc -l` before and after to verify count drops to zero. Also scan `CLAUDE.md`, `README.md`, `DEPLOY.md`, `USAGE.md`.

**Warning signs:** Non-zero grep count after the rename pass.

### Pitfall 5: Version Bump Timing

**What goes wrong:** Bumping to 2.0.0 before the rename+refactor is complete and verified, publishing a broken package.

**Why it happens:** Eager versioning.

**How to avoid:** Bump to 2.0.0 only after build passes and `shipcard --version` prints the right value. Both `shipcard/package.json` and `shipcard-worker/package.json` must be bumped together (per CLAUDE.md versioning rule).

**Warning signs:** Committing version bump before build verification step.

## Code Examples

Verified patterns from the existing codebase:

### Current Engine Entry Point (what changes)
```typescript
// src/index.ts — current wiring (to be replaced)
import { parseAllFiles } from "./parser/deduplicator.js";

// Step 2: Parse all JSONL files.
const parseResult = await parseAllFiles(projectsDir);
```

### How `ParseResult` Flows Through the Engine (unchanged)
```typescript
// src/index.ts — after refactor, everything below this line is IDENTICAL
const filteredParseResult: ParseResult = hasDateFilter
  ? { messages: filteredMessages, sessions: filteredSessions, stats: parseResult.stats, userMessagesByDate: filteredUserMessagesByDate }
  : parseResult;

const pricing = await getPricing();
const result = aggregate(filteredParseResult, pricing);
```

### Current `ParsedMessage` Shape (canonical — never changes)
```typescript
// src/parser/schema.ts — this is the shared vocabulary all adapters normalize to
export interface ParsedMessage {
  sessionId: string;
  timestamp: string;
  model: string;
  tokens: TokenCounts;
  toolCalls: string[];
  thinkingBlocks: number;
  cwd: string;
  isSidechain: boolean;
}
```

### `EngineOptions` Extension (minimal addition)
```typescript
// src/engine/types.ts — add one optional field
export interface EngineOptions {
  projectsDir?: string;
  since?: string;
  until?: string;
  json?: boolean;
  adapter?: string;  // NEW: adapter name; defaults to "claude-code" when undefined
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `parseAllFiles()` called directly in `runEngineFull()` | `getAdapter().parse()` called in `runEngineFull()` | Phase 16 | Single wiring point — adapters plug in here |
| `shipcard/` directory | `shipcard/` directory | Phase 16 (rename) | Consistent naming throughout codebase |
| Parser owns file discovery | Adapter owns file discovery | Phase 16 | Each agent knows where its files live |

**Deprecated/outdated:**
- `shipcard/` directory path: replaced by `shipcard/` — all references must be updated
- `shipcard-worker/` directory path: replaced by `shipcard-worker/`
- Direct `parseAllFiles()` import in `src/index.ts`: replaced by `getAdapter().parse()`

## Open Questions

1. **Where does `ParseResult` type live after the adapter boundary?**
   - What we know: `ParseResult` is currently exported from `src/parser/deduplicator.ts` and used in `src/index.ts`
   - What's unclear: Should `SourceAdapter.parse()` return the existing `ParseResult` type, or define a new type in `src/adapters/interface.ts`?
   - Recommendation: Re-use the existing `ParseResult` type from `src/parser/deduplicator.ts`. It has exactly what `runEngineFull()` needs. Defining a parallel type creates unnecessary duplication. Import it in `src/adapters/interface.ts` and re-export.

2. **Does `ClaudeCodeAdapter` live under `src/adapters/claude-code/` or in `src/parser/`?**
   - What we know: Adapter wraps `parseAllFiles()` from `src/parser/`; moving parser files is not required
   - What's unclear: Whether to co-locate adapter with the parser it wraps, or keep adapters as a separate layer
   - Recommendation: `src/adapters/claude-code/index.ts` that imports from `src/parser/`. Keep `src/parser/` as pure implementation internals. The adapter layer is the public boundary.

3. **Should the `agentName` be surfaced in `AnalyticsResult`?**
   - What we know: Context says "agent name visibility on card/dashboard at Claude's discretion"
   - What's unclear: Where in `AnalyticsResult` it belongs (`summary.adapter`? `meta.adapter`?)
   - Recommendation: Add `meta.adapter: string` to `AnalyticsResult`. It's metadata about the data source, not an analytics metric. Value is the adapter name string (e.g., `"claude-code"`). This makes it visible for card display without polluting the summary stats.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `shipcard/src/` — all parser, engine, CLI, MCP source files read
- `shipcard/package.json` + `tsconfig.json` — build configuration verified
- `.planning/phases/16-agent-agnostic-architecture/16-CONTEXT.md` — user decisions read
- `.planning/REQUIREMENTS.md` — ARCH-01, ARCH-02, ARCH-03 requirements verified

### Secondary (MEDIUM confidence)
- TypeScript Handbook interface patterns — standard TypeScript interface-vs-abstract-class tradeoffs; well-established

### Tertiary (LOW confidence)
- None — all claims are based on direct codebase inspection or standard TypeScript patterns

## Metadata

**Confidence breakdown:**
- Directory rename: HIGH — mechanical operation, scope fully known from grep (638 refs in .planning, known source files)
- SourceAdapter interface design: HIGH — codebase structure fully read, boundary is clear, pattern is simple TypeScript
- ClaudeCodeAdapter wrapper: HIGH — existing `parseAllFiles()` signature is exactly what the adapter needs to wrap
- Registry/wiring: HIGH — single change point in `src/index.ts` identified
- Pitfalls: HIGH — all pitfalls derived from actual code paths in the codebase, not speculation

**Research date:** 2026-03-28
**Valid until:** Stable — this is a pure refactor of a controlled codebase with no external dependency changes
