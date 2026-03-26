# Architecture Patterns

**Domain:** Local analytics tool + cloud card endpoint (MCP server / CLI / Cloudflare Worker)
**Researched:** 2026-03-25
**Confidence:** HIGH (MCP SDK verified via official docs + local skill reference; JSONL schema verified from first-hand file inspection; Cloudflare Worker verified via official docs)

---

## Recommended Architecture

ShipLog consists of two deployable artifacts that share nothing at runtime but depend on each other conceptually:

```
┌─────────────────────────────────────────────────────────┐
│  USER MACHINE                                           │
│                                                         │
│  ~/.claude/projects/                                    │
│    <project-slug>/                                      │
│      <session-uuid>.jsonl    ←── Claude Code writes     │
│                                                         │
│  shiplog (npm package)                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │  JSONL Parser / Analytics Engine                │   │
│  │  (pure TypeScript, zero deps)                   │   │
│  │                                                 │   │
│  │  src/parser/   — JSONL → typed events           │   │
│  │  src/engine/   — events → aggregated stats      │   │
│  │  src/types.ts  — shared domain types            │   │
│  └──────────────┬──────────────────────────────────┘   │
│                 │                                       │
│       ┌─────────┴──────────┐                           │
│       ▼                    ▼                           │
│  ┌─────────┐        ┌────────────┐                     │
│  │ MCP     │        │ CLI        │                     │
│  │ Server  │        │ Interface  │                     │
│  │ (stdio) │        │ (process   │                     │
│  │         │        │  argv)     │                     │
│  └────┬────┘        └─────┬──────┘                     │
│       │                   │                            │
│       │      ┌────────────┘                            │
│       │      │  opt-in sync (aggregated only)          │
│       └──────┴──────────────────────────────────────── │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼  HTTPS POST /api/sync
┌─────────────────────────────────────────────────────────┐
│  CLOUDFLARE EDGE                                        │
│                                                         │
│  Worker (src/index.ts)                                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  POST /api/sync    — receive AggregatedStats     │  │
│  │  GET  /api/card/:username  — serve SVG card      │  │
│  │                                                  │  │
│  │  KV: CARD_CACHE                                  │  │
│  │    key: "card:{username}"                        │  │
│  │    value: rendered SVG string                    │  │
│  │    TTL: 3600s (1 hour)                           │  │
│  │                                                  │  │
│  │  KV: STATS_STORE                                 │  │
│  │    key: "stats:{username}"                       │  │
│  │    value: JSON AggregatedStats                   │  │
│  │    TTL: none (persistent, overwritten on sync)   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### Component 1: JSONL Parser (`src/parser/`)

**Responsibility:** Read `.jsonl` files from `~/.claude/projects/` and convert raw lines into typed domain events.

**Input:** File system paths, raw JSON strings per line
**Output:** Typed `ClaudeEvent` union type

**Key observations from first-hand JSONL inspection:**

Each line in a `.jsonl` session file is one of these message types:

| `type` field | Description | Key fields |
|---|---|---|
| `user` | Human or tool result message | `uuid`, `timestamp`, `sessionId`, `message.content`, `promptId` |
| `assistant` | Model response | `uuid`, `timestamp`, `message.model`, `message.usage`, `message.content[]` |
| `progress` | Tool execution event | `toolUseID`, `parentToolUseID`, `data.type` |
| `file-history-snapshot` | File state snapshot | `messageId`, `snapshot` |

**Critical fields for analytics:**

From `assistant` messages:
- `message.model` — string, e.g. `"claude-opus-4-6"` (model identifier)
- `message.usage.input_tokens` — integer
- `message.usage.output_tokens` — integer
- `message.usage.cache_creation_input_tokens` — integer
- `message.usage.cache_read_input_tokens` — integer
- `message.content[]` — array of content blocks, blocks with `type: "tool_use"` contain `name` (tool name) and `input`
- `sessionId` — UUID linking all messages in a session
- `timestamp` — ISO 8601 string
- `cwd` — working directory at time of message (project context)
- `version` — Claude Code version string
- `gitBranch` — active git branch

**File location pattern:**
```
~/.claude/projects/<escaped-path>/<session-uuid>.jsonl
```
Where `<escaped-path>` uses `-` as separator for `/`, e.g. `/home/jaime/www/SaaS` → `-home-jaime-www-SaaS`.

**Does NOT communicate with:** anything. Pure file reader + type transformer.

### Component 2: Analytics Engine (`src/engine/`)

**Responsibility:** Aggregate typed events into `SessionStats` and `ProjectStats` domain objects.

**Input:** Stream of typed events from parser
**Output:** `AggregatedStats` (sessions, tool call counts, model breakdown, token totals, cost estimates)

**Computations:**
- Group events by `sessionId`
- Sum tokens per session from `assistant.message.usage`
- Count tool calls by scanning `assistant.message.content[]` for `type: "tool_use"` blocks
- Estimate cost from model-specific per-token pricing table (hardcoded, not fetched)
- Derive project from `cwd` field

**Does NOT communicate with:** file system (parser handles that), network (engine is pure computation).

### Component 3: MCP Server (`src/mcp-server.ts`)

**Responsibility:** Expose analytics engine results via MCP tools over stdio transport.

**Input:** stdin/stdout (JSON-RPC via MCP protocol)
**Output:** MCP tool responses

**SDK pattern (verified against official docs):**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "shiplog", version: "1.0.0" });

server.registerTool(
  "get_session_stats",
  {
    title: "Get Session Stats",
    description: "Returns analytics for Claude Code sessions",
    inputSchema: z.object({
      days: z.number().optional().describe("Lookback window in days")
    })
  },
  async ({ days }) => {
    const stats = await engine.compute({ days });
    return { content: [{ type: "text", text: JSON.stringify(stats) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Does NOT communicate with:** Cloudflare Worker (that's CLI's job), file system directly (uses engine).

### Component 4: CLI Interface (`src/cli.ts`)

**Responsibility:** Provide terminal interface to the same analytics engine. Also the only component that sends data to the cloud (opt-in).

**Input:** `process.argv`
**Output:** formatted terminal output, or HTTP POST to card endpoint

**Commands:**
- `shiplog summary` — print stats table
- `shiplog costs` — print cost breakdown
- `shiplog card` — sync aggregated stats to cloud + print card URL
- `shiplog card --local` — render SVG locally, no sync

**Does NOT communicate with:** MCP SDK. CLI and MCP server are two separate entry points sharing the engine.

### Component 5: Card Worker (`worker/src/index.ts`)

**Responsibility:** Receive aggregated stats, store in KV, render SVG, serve cards with KV caching.

**Input:** HTTP requests (POST /api/sync, GET /api/card/:username)
**Output:** SVG responses, JSON acknowledgments

**Does NOT communicate with:** local file system, JSONL files. Only receives aggregated stats via API.

---

## Data Flow

### Flow A: Local Analytics (MCP path)

```
~/.claude/projects/**/*.jsonl
  → src/parser/index.ts (readdir + readline)
  → ClaudeEvent[]
  → src/engine/index.ts (aggregate)
  → AggregatedStats
  → src/mcp-server.ts (registerTool handlers)
  → MCP JSON-RPC response over stdout
  → Claude Code / IDE client
```

### Flow B: Local Analytics (CLI path)

```
process.argv ["shiplog", "summary"]
  → src/cli.ts (arg dispatch)
  → src/engine/index.ts (same engine)
  → AggregatedStats
  → formatTable(stats)
  → process.stdout
```

### Flow C: Opt-in Card Sync

```
process.argv ["shiplog", "card"]
  → src/cli.ts
  → src/engine/index.ts → AggregatedStats
  → STRIP all raw content (keep only counts/totals)
  → HTTPS POST /api/sync { username, stats: AggregatedStats }
  → Cloudflare Worker
  → KV.put("stats:{username}", JSON.stringify(stats))
  → KV.delete("card:{username}")  ← invalidate cache
  → 200 OK + card URL
  → terminal: "Your card: https://shiplog.dev/api/card/jaime"
```

### Flow D: Card Serving

```
GET /api/card/:username
  → Cloudflare Worker
  → KV.get("card:{username}")
  → HIT: return cached SVG (Content-Type: image/svg+xml)
  → MISS:
      → KV.get("stats:{username}")
      → renderSVG(stats) → SVG string
      → KV.put("card:{username}", svg, { expirationTtl: 3600 })
      → return SVG
```

---

## Patterns to Follow

### Pattern 1: Detect Mode at Entry Point, Not in Engine

**What:** The single npm package exposes two bin commands. Mode detection happens only at the top of the process — not inside the engine.

**Implementation:**

```json
// package.json
{
  "bin": {
    "shiplog": "./dist/cli.js",
    "shiplog-mcp": "./dist/mcp-server.js"
  }
}
```

Two distinct compiled entry points. `cli.js` imports the engine and renders to terminal. `mcp-server.js` imports the engine and attaches stdio transport. The engine has no knowledge of which mode is active.

**Why:** Clean separation. The engine is testable in isolation. No runtime `if (isCLI)` branching polluting business logic.

### Pattern 2: Parser Returns Typed Events, Engine Returns Aggregates

**What:** Never mix parsing and aggregation. Parser produces a stream of typed events. Engine consumes events and produces statistics.

```typescript
// parser returns events
type ClaudeEvent =
  | { type: "assistant"; sessionId: string; model: string; usage: TokenUsage; toolUses: ToolUse[] }
  | { type: "user"; sessionId: string; timestamp: string }
  | { type: "ignored" };

// engine aggregates
interface AggregatedStats {
  sessions: SessionStat[];
  totalTokens: TokenTotals;
  modelBreakdown: Record<string, number>;
  toolCallCounts: Record<string, number>;
  estimatedCostUsd: number;
  generatedAt: string;
}
```

**Why:** Testable in isolation. JSONL schema changes only affect parser. Cost formula changes only affect engine.

### Pattern 3: Cloudflare Worker — KV Double Layer

**What:** Two KV namespaces with different semantics.

| Namespace | Key Pattern | TTL | Purpose |
|---|---|---|---|
| `STATS_STORE` | `stats:{username}` | None | Persistent aggregated stats (source of truth) |
| `CARD_CACHE` | `card:{username}` | 3600s | Rendered SVG cache |

On sync: update STATS_STORE, delete CARD_CACHE entry (explicit invalidation, not TTL reliance).
On card request: check CARD_CACHE first, render from STATS_STORE on miss.

**Why:** Stats are permanent and small (a few KB of JSON). Cards are derived and expensive to render (SVG string manipulation). Separating them allows cache invalidation without losing user data.

### Pattern 4: Privacy Boundary in CLI, Not Engine

**What:** The analytics engine computes full statistics including conversation content references. The CLI sync command is responsible for stripping all non-aggregate data before transmission.

```typescript
// Before sending to Cloudflare:
const safeStats = {
  totalSessions: stats.sessions.length,
  totalTokens: stats.totalTokens,
  modelBreakdown: stats.modelBreakdown,
  toolCallCounts: stats.toolCallCounts,
  estimatedCostUsd: stats.estimatedCostUsd,
  // NOT included: session details, cwd paths, timestamps, content
};
```

**Why:** Privacy boundary should be explicit code, not assumed. This makes it auditable — open-source users can read exactly what leaves their machine.

### Pattern 5: SVG as Template String, Not DOM

**What:** Generate SVG by building a template string with inline CSS. No DOM, no canvas, no external renderer.

```typescript
function renderCard(stats: SafeStats): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
    <style>
      text { font-family: "Segoe UI", sans-serif; fill: #cdd6f4; }
    </style>
    <rect width="400" height="200" rx="10" fill="#1e1e2e"/>
    <text x="20" y="40" font-size="16">${escapeXml(stats.username)}'s ShipLog</text>
    <text x="20" y="80" font-size="24">${stats.totalSessions} sessions</text>
    ...
  </svg>`;
}
```

**Why:** Cloudflare Workers have no DOM. Template strings work in all runtimes. Zero dependencies. Predictable output. github-readme-stats uses this same pattern.

**Security note:** Always XML-escape user-controlled values (`escapeXml()`) to prevent SVG injection.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Single Entry Point with Mode Flag

**What:** One `index.ts` that does `if (process.argv.includes('--mcp')) startMcpServer() else startCli()`

**Why bad:** Muddies the entry point. MCP clients (Claude Desktop, Cursor) spawn the process and don't control argv reliably across platforms. Two separate compiled files with separate `bin` entries is the standard pattern for dual-mode npm packages.

**Instead:** Separate `cli.ts` and `mcp-server.ts` entry points, both importing from shared `engine/`.

### Anti-Pattern 2: Parsing JSONL in the Engine

**What:** Engine directly reads files and accumulates as it parses.

**Why bad:** Makes the engine impossible to test without the file system. Schema changes require touching aggregation logic.

**Instead:** Parser is a separate module that yields typed events. Engine is a pure function over events.

### Anti-Pattern 3: Shipping Raw JSONL or Session Content to Cloud

**What:** Sending session file paths, prompt content, or cwd paths to the card endpoint.

**Why bad:** Privacy violation. Even "aggregated stats" that include cwd paths expose project names. The trust model of an open-source tool depends on this boundary being visible.

**Instead:** Explicit stripping at sync boundary (see Pattern 4). The `SafeStats` type has only numeric aggregates.

### Anti-Pattern 4: Rendering SVG on Every Card Request

**What:** No caching — re-render SVG string on every GET /api/card/:username.

**Why bad:** Cards will be embedded in GitHub READMEs that get hit constantly. Without KV caching, every pageview hits the Worker compute path and makes a KV read of the stats. KV writes are limited to 1 per second per key.

**Instead:** Render once on sync (or on first miss), cache SVG string in KV with 1-hour TTL. Cards are stale-by-design (like github-readme-stats).

### Anti-Pattern 5: Monorepo for a Two-File Cloud Artifact

**What:** Setting up Turborepo + pnpm workspaces for what is a single npm package + single Worker file.

**Why bad:** Significant complexity overhead. Cloudflare's pnpm monorepo support has known issues with workspace dependency resolution (workers-sdk issue #10941). The shared code between local tool and Worker is zero — they have different runtimes (Node.js vs Workers runtime) and different type surfaces.

**Instead:** Flat repository layout with two independent deployment roots.

---

## Project Structure Recommendation

```
shiplog/
├── package.json               # npm package: shiplog
├── tsconfig.json
├── src/
│   ├── types.ts               # Shared domain types (ClaudeEvent, AggregatedStats, SafeStats)
│   ├── parser/
│   │   └── index.ts           # JSONL reader → ClaudeEvent stream
│   ├── engine/
│   │   └── index.ts           # ClaudeEvent[] → AggregatedStats (pure)
│   ├── pricing.ts             # Model pricing table (hardcoded constants)
│   ├── mcp-server.ts          # McpServer entry point (bin: shiplog-mcp)
│   └── cli.ts                 # CLI entry point (bin: shiplog)
├── worker/
│   ├── wrangler.jsonc         # Cloudflare Worker config
│   ├── package.json           # Separate package (worker has own deps)
│   └── src/
│       ├── index.ts           # Worker fetch handler
│       ├── svg.ts             # renderCard() template function
│       └── types.ts           # Worker-specific types (Env, SafeStats)
└── tests/
    ├── parser.test.ts
    ├── engine.test.ts
    └── fixtures/
        └── sample-session.jsonl  # Real JSONL excerpt for tests
```

**Why flat with `worker/` subdirectory (not monorepo):**
- Local tool (Node.js runtime) and Worker (V8 isolate) share no code at runtime
- Worker has its own `package.json` for wrangler devDependencies
- Single `npm publish` from root publishes the local tool only
- Worker is deployed via `cd worker && wrangler deploy` — independent lifecycle
- No Turborepo, no workspace hoisting issues, no shared build graph

---

## Scalability Considerations

| Concern | At launch (100 users) | At 10K users | At 100K users |
|---|---|---|---|
| Card KV reads | Negligible | Hot-key caching works well (KV optimized for this) | Still fine — KV designed for high-read hot keys |
| Stats KV writes | 1/sync per user | 1/sync per user — no fan-out | Rate limiting needed: 1 write/sec per key limit |
| SVG render cost | Negligible | Negligible (cached) | Negligible (cached) |
| Local parsing | Bound by disk I/O | N/A (local) | N/A (local) |
| JSONL file size | Small (MB) | N/A (local) | Session files can grow to 100MB+ — streaming parser needed, not full load |

**Critical note on JSONL file sizes:** GitHub issue #22365 on anthropics/claude-code documents large session files causing OOM. The parser must use Node.js `readline` streaming interface, not `JSON.parse(fs.readFileSync(...))`.

---

## Build Order (Phase Dependencies)

```
Phase 1: JSONL Parser + Types
  → No dependencies. Pure file I/O + type definitions.
  → Can be built and tested independently against fixture files.

Phase 2: Analytics Engine
  → Depends on: parser types (Phase 1)
  → Pure computation. Testable with fixture events.

Phase 3: CLI Interface
  → Depends on: engine (Phase 2), pricing table
  → Validation point: real JSONL files → real numbers

Phase 4: MCP Server
  → Depends on: engine (Phase 2), @modelcontextprotocol/sdk
  → Wrap same engine in MCP tool registration + stdio transport

Phase 5: Cloudflare Worker (card endpoint)
  → Depends on: SafeStats type (defined in Phase 2)
  → Independently deployable. Worker tests can use mock stats.
  → Does NOT depend on the npm package.
```

The local tool (Phases 1-4) and the Worker (Phase 5) are deployable independently. Phase 5 can start in parallel with Phase 3-4 once the `SafeStats` interface is locked.

---

## Cloudflare Worker Configuration

```jsonc
// worker/wrangler.jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "shiplog-card",
  "main": "src/index.ts",
  "compatibility_date": "2026-03-25",
  "kv_namespaces": [
    {
      "binding": "STATS_STORE",
      "id": "<NAMESPACE_ID_PROD>"
    },
    {
      "binding": "CARD_CACHE",
      "id": "<NAMESPACE_ID_PROD_CACHE>"
    }
  ]
}
```

```typescript
// worker/src/index.ts — minimal typed handler
export interface Env {
  STATS_STORE: KVNamespace;
  CARD_CACHE: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/sync") {
      return handleSync(request, env);
    }

    const cardMatch = url.pathname.match(/^\/api\/card\/(.+)$/);
    if (cardMatch) {
      return handleCard(cardMatch[1], env);
    }

    return new Response("Not Found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;
```

---

## Sources

- MCP TypeScript SDK official docs: https://ts.sdk.modelcontextprotocol.io/documents/server.html (HIGH confidence)
- MCP build server guide: https://modelcontextprotocol.io/docs/develop/build-server (HIGH confidence)
- Local MCP builder skill (node_mcp_server.md): `/home/jaime/.claude/skills/jja-mcp-builder/reference/node_mcp_server.md` (HIGH confidence — verified against official SDK)
- Cloudflare KV write docs: https://developers.cloudflare.com/kv/api/write-key-value-pairs/ (HIGH confidence)
- Cloudflare Workers get-started: https://developers.cloudflare.com/workers/get-started/guide/ (HIGH confidence)
- Cloudflare wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/ (HIGH confidence)
- JSONL file schema: first-hand inspection of `/home/jaime/.claude/projects/-home-jaime-www--github-SaaS/*.jsonl` (HIGH confidence — source of truth)
- github-readme-stats SVG architecture: https://deepwiki.com/anuraghazra/github-readme-stats/3.1-stats-card (MEDIUM confidence — third-party analysis)
- Workers monorepo pnpm issue: https://github.com/cloudflare/workers-sdk/issues/10941 (MEDIUM confidence — GitHub issue, community-verified)
- Large JSONL OOM issue: https://github.com/anthropics/claude-code/issues/22365 (MEDIUM confidence — GitHub issue)
