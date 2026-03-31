# Phase 1: Parser + Engine - Research

**Researched:** 2026-03-25
**Domain:** JSONL streaming parser + analytics engine (Node.js / TypeScript, zero external deps)
**Confidence:** HIGH

---

## Summary

Phase 1 builds the foundation that everything else consumes: a streaming JSONL parser that reads Claude Code session files from `~/.claude/projects/`, extracts token counts, tool calls, and session metadata, and feeds an analytics engine that produces cost estimates, project breakdowns, and summary stats.

The core technical challenge is not parsing itself (readline handles that natively) but **deduplication**: Claude Code writes multiple JSONL entries per API message (streaming chunks), and some session files contain full duplicate message histories when `--input-format stream-json` is used. The parser must deduplicate by `uuid` before counting anything.

Cost estimation uses the LiteLLM community pricing JSON (`model_prices_and_context_window.json`) as the upstream source. The `claude-opus-4-6` and `claude-sonnet-4-6` model names in JSONL match LiteLLM keys **directly** — no prefix normalization needed for current Claude Code models. LiteLLM provides all four cache token cost fields needed for accurate estimation. Date filtering (ISO dates + relative shortcuts) can be implemented with a hand-rolled parser since the patterns are finite and well-defined.

**Primary recommendation:** Stream JSONL line-by-line via Node.js `readline`, deduplicate entries by `uuid`, take the final per-message entry by message `id` (highest output_tokens), use `node:fs/promises` glob for file discovery, and implement LiteLLM pricing fetch with a 3-layer cache (runtime → `~/.shipcard/pricing.json` → bundled snapshot).

---

## Standard Stack

The constraint is zero external dependencies beyond the MCP SDK. All solutions must use Node.js built-ins or be hand-rolled.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:readline` | Built-in | Line-by-line JSONL streaming | Zero-dep, handles backpressure, standard pattern |
| `node:fs/promises` | Built-in | File I/O, glob for JSONL discovery | Node 22+ has stable `glob()` async iterator |
| `node:path` | Built-in | Path manipulation, cwd parsing | Cross-platform path handling |
| `node:os` | Built-in | Resolve `~/.claude/projects/` and `~/.shipcard/` | `os.homedir()` works on Linux/macOS/Windows |
| TypeScript | 5.x | Type safety on parsed data | Required per PRD |

### Supporting (for pricing cache)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:https` / `fetch` | Built-in | Fetch LiteLLM pricing JSON | Node 18+ has global `fetch` |
| `node:crypto` | Built-in | Not needed here | N/A |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:readline` | `stream-json` npm package | stream-json is more powerful but violates zero-dep constraint |
| Hand-rolled date parser | `date-fns` / `dayjs` | Both are external deps; our date formats are finite (ISO + 7d/30d/today) |
| `node:fs/promises` glob | `fast-glob` npm | fast-glob has more features; built-in glob is sufficient for `**/*.jsonl` |
| Hand-rolled pricing | `valibot` schema | ccusage uses valibot; we skip runtime validation to stay zero-dep |

**Installation:**
```bash
# No external packages for Phase 1 engine
# MCP SDK will be added in Phase 2
npm install typescript @types/node --save-dev
```

---

## Architecture Patterns

### Recommended Project Structure
```
shipcard/
├── src/
│   ├── parser/
│   │   ├── reader.ts          # File discovery (glob) + readline streaming
│   │   ├── schema.ts          # TypeScript types for JSONL entries
│   │   └── deduplicator.ts    # UUID dedup + message-level dedup
│   ├── engine/
│   │   ├── aggregator.ts      # Session/project/model aggregation
│   │   ├── cost.ts            # LiteLLM pricing fetch + calculation
│   │   ├── filter.ts          # Date range filtering
│   │   └── types.ts           # AnalyticsResult output shape
│   └── index.ts               # Public API: runEngine(options) => AnalyticsResult
├── data/
│   └── pricing-snapshot.json  # Bundled fallback pricing (updated at build time)
├── package.json
└── tsconfig.json
```

### Pattern 1: Streaming JSONL with readline

**What:** Read each JSONL file line by line, parse JSON, skip bad lines, collect entries.
**When to use:** All JSONL file reading. Never buffer whole files.

```typescript
// Source: Node.js built-in readline module
import * as readline from 'node:readline';
import * as fs from 'node:fs';

async function* streamJsonlFile(filePath: string): AsyncGenerator<unknown> {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      yield JSON.parse(trimmed);
    } catch {
      // Count and skip — resilience requirement PARSE-05
    }
  }
}
```

### Pattern 2: Built-in File Discovery

**What:** Discover all JSONL files via `node:fs/promises` glob async iterator.
**When to use:** Initial scan of `~/.claude/projects/**/*.jsonl`.

```typescript
// Source: Node.js 22+ built-in (stable in v22.2.0, available in v24.14.0)
import { glob } from 'node:fs/promises';

async function* discoverJsonlFiles(projectsDir: string): AsyncGenerator<string> {
  for await (const file of glob(`${projectsDir}/**/*.jsonl`)) {
    yield file;
  }
}
```

**Note:** The glob async iterator form (`for await`) works in Node.js 22+. The promise form (`.then()`) does NOT work — glob returns an AsyncIterable, not a Promise.

### Pattern 3: Two-Level Deduplication

**What:** Claude Code writes multiple JSONL entries per message. Deduplicate at two levels.
**When to use:** Always, before any token counting.

**Level 1 — UUID dedup:** Some sessions contain full duplicate message histories (the `--input-format stream-json` bug, closed as "not planned"). Deduplicate all entries by `uuid` field while streaming.

**Level 2 — Message ID dedup (streaming chunks):** Each API response generates 2-4 JSONL entries sharing the same `message.id`. Earlier entries have `stop_reason: null` with partial token counts. The final entry has `stop_reason` set (`"end_turn"` or `"tool_use"`) with correct counts. **Use the entry with the highest `output_tokens` for the same `message.id`.**

```typescript
// Level 1: Track seen UUIDs across all files in a session
const seenUuids = new Set<string>();

// Level 2: Per-file, accumulate by message.id, keep highest output_tokens
const byMessageId = new Map<string, AssistantEntry>();
for await (const entry of streamJsonlFile(filePath)) {
  if (!isAssistantEntry(entry)) continue;
  if (seenUuids.has(entry.uuid)) continue;
  seenUuids.add(entry.uuid);

  const msgId = entry.message.id;
  const existing = byMessageId.get(msgId);
  const newTokens = entry.message.usage?.output_tokens ?? 0;
  const existingTokens = existing?.message.usage?.output_tokens ?? 0;
  if (!existing || newTokens > existingTokens) {
    byMessageId.set(msgId, entry);
  }
}
```

### Pattern 4: LiteLLM Pricing with 3-Layer Cache

**What:** Fetch pricing once per run, cache to disk for 24h, fall back to bundled snapshot.
**When to use:** Cost estimation (ANLYT-01).

```typescript
// Layer 1: Runtime in-memory cache (already fetched this run)
// Layer 2: ~/.shipcard/pricing.json with mtime check (24h TTL)
// Layer 3: Bundled data/pricing-snapshot.json (always works)

const LITELLM_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

async function getPricing(): Promise<PricingMap> {
  // Try runtime cache first
  if (runtimeCache) return runtimeCache;

  // Try disk cache
  const diskCached = await tryDiskCache();
  if (diskCached) return (runtimeCache = diskCached);

  // Try live fetch
  try {
    const res = await fetch(LITELLM_URL);
    const data = await res.json();
    const pricing = buildPricingMap(data);
    await writeDiskCache(pricing); // non-blocking, ignore failures
    return (runtimeCache = pricing);
  } catch {
    // Fall back to bundled snapshot
    return (runtimeCache = BUNDLED_PRICING);
  }
}
```

### Pattern 5: Hand-Rolled Date Filter

**What:** Parse `--since` / `--until` flags supporting ISO dates and relative shortcuts.
**When to use:** Date range filtering (ANLYT-02).

Supported formats (finite set, no library needed):
- `2026-03-01` → parse with `new Date()`
- `today` → start of today in local time
- `7d` → 7 days ago from now
- `30d` → 30 days ago from now

```typescript
function parseFilterDate(input: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(input + 'T00:00:00');
  }
  if (input === 'today') {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  }
  const relMatch = input.match(/^(\d+)d$/);
  if (relMatch) {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(relMatch[1], 10));
    d.setHours(0,0,0,0);
    return d;
  }
  throw new Error(`Unrecognized date format: ${input}. Use YYYY-MM-DD, today, 7d, or 30d.`);
}
```

### JSONL Entry Types to Handle

From direct inspection of real Claude Code JSONL files:

| `type` field | Handle? | Notes |
|---|---|---|
| `user` | Yes (for `cwd`, `sessionId`, `timestamp`) | First user entry per session has the cwd |
| `assistant` | Yes (primary token/tool data) | Has `message.usage` and `message.content` |
| `system` | Skip | Not relevant for analytics |
| `file-history-snapshot` | Skip | File backup metadata |
| `progress` | Skip | Agent progress updates |
| `queue-operation` | Skip | Internal queue events |
| `last-prompt` | Skip | Prompt caching marker |

### Anti-Patterns to Avoid

- **Loading entire JSONL into memory:** Some session files can be large. Always stream line-by-line.
- **Counting all assistant entries without dedup:** Output tokens will be massively overcounted. Every multi-response session will be double/triple-counted.
- **Using `stop_reason` as the dedup signal:** More reliable to use max `output_tokens` per `message.id`. Some sessions end abruptly without a terminal `stop_reason`.
- **Model name prefix normalization:** Current Claude Code models (`claude-opus-4-6`, `claude-sonnet-4-6`) match LiteLLM keys directly. Don't add prefix logic unless a model fails lookup.
- **Blocking file reads during output:** Run the full analytics pass first, then output. Don't interleave streaming with printing.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File globbing | Custom `readdir` recursion | `node:fs/promises` glob | Built-in, handles symlinks correctly, async iterator |
| Line-by-line file reading | Manual buffer splitting | `node:readline` | Handles newline edge cases, backpressure, encoding |
| Model pricing data | Custom pricing table | LiteLLM JSON + disk cache | 2,594+ models, updated multiple times daily, already validated by ccusage (12K stars) |
| HTTP cache management | Custom TTL logic | File mtime check + `Date.now()` | Simple, no deps, plenty sufficient for 24h TTL |

**Key insight:** Node.js built-ins cover 100% of the I/O layer. The only "hard" problems are deduplication logic (which must be custom) and pricing (which must use LiteLLM). Everything else is application logic.

---

## Common Pitfalls

### Pitfall 1: Streaming Chunk Double-Counting

**What goes wrong:** Each API response produces 2-4 JSONL lines with the same `message.id`. If counted naively, output tokens are inflated 2-4x and tool calls are counted multiple times per message.

**Why it happens:** Claude Code writes a new line per streaming event, not per completed response. Earlier lines have `stop_reason: null` with partial `output_tokens` (as low as `1`).

**How to avoid:** Group by `message.id`, keep the entry with the highest `output_tokens`. This is the final completed response.

**Warning signs:** Output token % is suspiciously low relative to total tokens (should be roughly 5-20% of cache tokens). Tool calls appear higher than expected.

### Pitfall 2: Full-Session Duplicate Histories

**What goes wrong:** Sessions run with `--input-format stream-json` (SDK usage) have entire conversation histories duplicated in the JSONL file.

**Why it happens:** Claude Code bug (closed as "not planned" — GitHub #5034). Rewrites full history on each message.

**How to avoid:** Track all `uuid` fields seen across a session file. Skip any entry whose `uuid` was already processed.

**Warning signs:** Session "feels" like it has way more messages than expected.

### Pitfall 3: Subagent Token Attribution

**What goes wrong:** Subagent JSONL files (in `{session-id}/subagents/*.jsonl`) have the same `sessionId` as the parent but are in separate files. If you only read `*.jsonl` directly under the project folder, you miss subagent tokens.

**How to avoid:** The glob pattern `~/.claude/projects/**/*.jsonl` captures subagent files automatically. Verify by checking the `isSidechain: true` flag — subagent entries have this set.

**Warning signs:** Sessions you know were agent-heavy show very few tool calls.

### Pitfall 4: LiteLLM Model Key Mismatch

**What goes wrong:** New Claude models may not yet be in LiteLLM, or the model name in JSONL may not match any LiteLLM key.

**Why it happens:** LiteLLM is community-maintained and may lag new Anthropic model releases by hours to days.

**How to avoid:** Implement an unknown-model fallback: use `claude-sonnet-4-6` pricing as the conservative default. Flag the cost with "estimated from default" in output. Log which models triggered the fallback.

**Warning signs:** Total cost is lower than expected, unknown model names in session data.

### Pitfall 5: node:fs/promises glob API Confusion

**What goes wrong:** Calling `glob(...).then(...)` throws `TypeError: glob(...).then is not a function`. The built-in glob is an AsyncIterable, not a Promise.

**Why it happens:** Unlike `readdir`, the glob API returns an async iterator, not a resolved array.

**How to avoid:** Always use `for await (const file of glob(pattern)) { ... }`. Verified working on Node.js v24.14.0.

### Pitfall 6: Missing Cache Token Costs

**What goes wrong:** Cost estimate ignores `cache_creation_input_tokens` and `cache_read_input_tokens`. For Claude Code sessions (heavy caching), this understates real cost significantly.

**Why it happens:** Cache costs aren't part of basic token cost formulas. Easy to miss.

**How to avoid:** LiteLLM provides `cache_creation_input_token_cost` and `cache_read_input_token_cost` for all current Claude models. Always include all four token types in cost calculation.

---

## Code Examples

### Complete JSONL Entry Type Definitions

```typescript
// Based on direct inspection of real Claude Code JSONL files

interface BaseEntry {
  uuid: string;
  parentUuid: string | null;
  sessionId: string;
  timestamp: string; // ISO 8601
  type: string;
  isSidechain: boolean;  // true = subagent entry
}

interface UserEntry extends BaseEntry {
  type: 'user';
  cwd: string;           // Use first entry per session for project name
  version: string;       // Claude Code version
  message: {
    role: 'user';
    content: string | unknown[];
  };
}

interface AssistantEntry extends BaseEntry {
  type: 'assistant';
  cwd: string;
  requestId: string;
  message: {
    id: string;           // Dedup key (multiple entries share this)
    model: string;        // e.g. "claude-opus-4-6"
    role: 'assistant';
    stop_reason: 'end_turn' | 'tool_use' | null;
    content: ContentBlock[];
    usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown };
```

### LiteLLM Cost Calculation (Validated Against ccusage)

```typescript
// Source: Validated against ryoppippi/ccusage pricing.ts
// Tiered pricing for Claude models: 200k token threshold

const TIERED_THRESHOLD = 200_000;

function calcTieredCost(
  tokens: number | undefined,
  baseRate: number | undefined,
  tieredRate: number | undefined,
): number {
  if (!tokens || tokens <= 0) return 0;
  if (tokens > TIERED_THRESHOLD && tieredRate != null) {
    const below = Math.min(tokens, TIERED_THRESHOLD);
    const above = tokens - TIERED_THRESHOLD;
    return (below * (baseRate ?? 0)) + (above * tieredRate);
  }
  return tokens * (baseRate ?? 0);
}

function calculateCost(
  tokens: { input: number; output: number; cacheCreate?: number; cacheRead?: number },
  pricing: ModelPricing,
): number {
  return (
    calcTieredCost(tokens.input, pricing.input_cost_per_token, pricing.input_cost_per_token_above_200k_tokens) +
    calcTieredCost(tokens.output, pricing.output_cost_per_token, pricing.output_cost_per_token_above_200k_tokens) +
    calcTieredCost(tokens.cacheCreate, pricing.cache_creation_input_token_cost, pricing.cache_creation_input_token_cost_above_200k_tokens) +
    calcTieredCost(tokens.cacheRead, pricing.cache_read_input_token_cost, pricing.cache_read_input_token_cost_above_200k_tokens)
  );
}
```

### Project Name Derivation

```typescript
// Source: Direct inspection of ~/.claude/projects/ directory structure

function deriveProjectName(cwd: string): string {
  // Examples:
  // "/home/jaime/www/_github/SaaS" → "SaaS"
  // "/home/jaime/www/_github/915website.com" → "915website.com"
  // "/home/jaime/.config/zsh" → "zsh"
  return cwd.split('/').filter(Boolean).pop() ?? 'unknown';
}

function deriveProjectSlug(dirName: string): string {
  // ~/.claude/projects/ folders use encoded cwd:
  // "-home-jaime-www--github-SaaS" → "/home/jaime/www/_github/SaaS"
  // This is the folder name; display name comes from cwd field in first entry
  return dirName;
}
```

### Analytics Output Shape

```typescript
// Based on CONTEXT.md decisions

interface AnalyticsResult {
  summary: {
    totalSessions: number;
    totalTokens: { input: number; output: number; cacheCreate: number; cacheRead: number };
    totalCost: string;        // "~$47.20"
    modelsUsed: string[];
    projectsTouched: string[];
    toolCallSummary: Record<string, number>;  // { "Bash": 312, "Read": 201, ... }
    pricingVersion: string;   // "LiteLLM snapshot 2026-03-25" or "LiteLLM live"
  };
  byProject: Record<string, ProjectStats>;
  byModel: Record<string, ModelStats>;
  meta: {
    filesRead: number;
    linesSkipped: number;     // PARSE-05: report skipped unparseable lines
    dateRange?: { since?: string; until?: string };
  };
}

interface ProjectStats {
  sessions: number;
  tokens: TokenCounts;
  cost: string;             // "~$31.50"
  models: string[];
  toolCalls: Record<string, number>;
}

interface ModelStats {
  tokens: TokenCounts;
  cost: string;
  byProject: Record<string, { tokens: TokenCounts; cost: string }>;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `readFileSync` + split | `readline` streaming | Node.js 12+ | Memory-safe for large files |
| `glob` npm package | `node:fs/promises` glob | Node.js 22.2.0 (stable) | Zero-dep file discovery |
| Custom pricing tables | LiteLLM community JSON | 2024 (ccusage validated 2025) | 2,594 models, daily updates |
| `moment.js` date parsing | Hand-rolled or `date-fns` | ~2020 | moment.js deprecated/heavy |

**Deprecated/outdated:**
- `moment.js`: Do not use. Deprecated, 300KB. Hand-roll the 4 date formats needed.
- `@anthropic-ai/sdk` for JSONL parsing: Not needed. JSONL is Claude Code's local storage format, not an API concern.
- Custom token counting: Token counts come directly from JSONL `usage` fields — don't compute them.

---

## Open Questions

1. **Live file handling strategy**
   - What we know: Files actively being written (mtime < 5 minutes) are valid JSONL; Claude Code appends lines continuously.
   - What's unclear: Should we read live files or skip them? Partial lines at file end are possible but readline handles EOF gracefully.
   - Recommendation: Read live files. Readline stops at EOF cleanly. Partial last line triggers JSON.parse catch and is skipped. The 1-2 lines potentially missed are not worth the complexity of exclusion logic.

2. **Subagent token attribution**
   - What we know: Subagent entries have `isSidechain: true` and the same `sessionId` as the parent. They're in separate files under `{session-id}/subagents/`.
   - What's unclear: Should subagent tokens be reported separately or merged into parent session?
   - Recommendation: Merge into parent session (CONTEXT.md decision). The `**/*.jsonl` glob captures them automatically. Sum all entries for a given `sessionId` regardless of which file they came from.

3. **Output token accuracy on older sessions**
   - What we know: A Claude Code bug (GitHub #22686, duplicate of #22671) caused some session files to record only intermediate streaming values (`output_tokens: 1`) without the final completed values.
   - What's unclear: How many sessions are affected and whether this was fixed in a specific Claude Code version. Issue was closed as "not planned" initially but was a duplicate.
   - Recommendation: The "max output_tokens per message.id" dedup strategy extracts the best available data. If a session was written during the bug window and no final entry exists, max tokens is still more accurate than a naive sum.

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `/home/jaime/.claude/projects/**/*.jsonl` — JSONL schema, entry types, message.id duplication, stop_reason distribution, subagent structure
- `https://raw.githubusercontent.com/ryoppippi/ccusage/main/packages/internal/src/pricing.ts` — Complete pricing implementation, schema, tiered pricing logic, model normalization
- `https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json` — Live pricing data, verified `claude-opus-4-6` and `claude-sonnet-4-6` keys exist with all cache token costs

### Secondary (MEDIUM confidence)
- `https://deepwiki.com/ryoppippi/ccusage/4.1-data-processing` — ccusage deduplication by messageId confirmed
- Node.js v24.14.0 runtime testing — `node:fs/promises` glob as async iterator (verified working)
- GitHub issue #22686 + #5034 (anthropics/claude-code) — Streaming chunk dedup issue documented, dedup-by-uuid for session duplicates

### Tertiary (LOW confidence)
- WebSearch: `simple-date-parse` / `chrono-node` for date parsing — Not needed given finite date format set

---

## Metadata

**Confidence breakdown:**
- JSONL schema: HIGH — verified against 2,147 real files on this machine
- Deduplication strategy: HIGH — directly observed 104 multi-entry messages, confirmed stop_reason pattern
- LiteLLM pricing: HIGH — direct API fetch, verified model key matches
- Node.js built-in glob: HIGH — tested on Node v24.14.0 (async iterator form only)
- Architecture patterns: HIGH — derived from validated ccusage reference implementation
- Date parsing: HIGH — hand-rolled approach confirmed sufficient for finite format set
- Live file handling: MEDIUM — readline behavior at EOF tested indirectly, not a hard-tested edge case

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable domain; LiteLLM pricing structure unlikely to change, JSONL schema changes monitored by jja-cc-updates skill)
