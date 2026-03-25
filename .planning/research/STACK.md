# Technology Stack

**Project:** ShipLog
**Researched:** 2026-03-25
**Research Mode:** Ecosystem — Stack dimension

---

## Recommended Stack

### Core: MCP Server + Local Tool

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@modelcontextprotocol/sdk` | `^1.28.0` | MCP server runtime, stdio transport, tool/resource registration | Official Anthropic SDK, v1.28.0 released 2026-03-25. Only viable choice — no real alternatives for MCP protocol compliance. |
| `zod` | `^3.25.0` (or `^4.0.0`) | Schema validation for MCP tool inputs | Required peer dependency of MCP SDK. SDK internally uses zod/v4 but maintains backwards compat with v3.25+. Use v3.25+ to avoid breaking changes. |
| Node.js | `>=22` | Runtime | LTS 22 (Jod) is current recommendation, supported until April 2027. 30% faster startup vs Node 20, native ESM/CJS interop stable in 22.12+. Node 20 is acceptable fallback (EOL April 2026). |
| TypeScript | `^5.x` | Language | Standard for npm-published tooling. Required for MCP SDK type safety. |
| `commander` | `^13.x` | CLI argument parsing | 152M weekly downloads. Minimal API, zero runtime deps beyond Node builtins, 22ms startup. Faster and lighter than yargs (42ms). Right size for 3 CLI commands. |

### Build Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `tsup` | `^8.x` | TypeScript bundler for npm package | Zero-config, powered by esbuild (100x faster than tsc). Standard for dual ESM/CJS npm packages in 2025. Outputs `.d.ts`, `.mjs`, `.cjs` correctly. |

### Cloudflare Worker

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `wrangler` | `^4.x` (latest ~4.47.x) | Deploy and develop Cloudflare Worker | Current major version. Use `wrangler.jsonc` format (supported since v3.91.0, now recommended default). Run `wrangler types` to generate typed bindings. |
| `@cloudflare/workers-types` | via `wrangler types` | TypeScript types for Worker runtime APIs | Don't install static package — Cloudflare recommends generating types with `wrangler types` to match your specific compatibility date and flags. |
| Cloudflare Workers KV | platform service | Edge cache for SVG cards | KV `put(key, value, { expirationTtl: N })` for TTL-based card expiration (min 60 seconds). Global edge distribution eliminates cold-start/rate-limit issues that plagued github-readme-stats on Vercel. |

### SVG Card Generation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TypeScript string templates | built-in | SVG generation | **Zero dependencies.** SVG is XML/text — template literals are the right tool. No DOM required. No headless browser. This is how github-readme-stats and all comparable card generators work. Add typed helper functions for elements (`rect()`, `text()`, `viewBox()`). |

---

## Package Architecture: Dual MCP + CLI from One npm Package

This is the core structural decision. ShipLog needs one `npm install` that serves two purposes:

```
shiplog/
  src/
    engine/          # Pure analytics logic (no MCP, no CLI deps)
      parser.ts      # JSONL file reader — fs + readline (Node.js built-ins only)
      analyzer.ts    # Cost/session aggregation
      cards.ts       # SVG generation
    mcp/
      server.ts      # McpServer + StdioServerTransport
      tools.ts       # Three tool registrations (uses engine/)
    cli/
      index.ts       # Commander app with 3 commands (uses engine/)
    index.ts         # MCP entry point (#!/usr/bin/env node)
    cli.ts           # CLI entry point (#!/usr/bin/env node)
  worker/
    index.ts         # Cloudflare Worker (separate deploy target)
  package.json
  wrangler.jsonc
  tsup.config.ts
```

**package.json bin field:**
```json
{
  "bin": {
    "shiplog": "./dist/index.js",
    "shiplog-cli": "./dist/cli.js"
  },
  "exports": {
    ".": "./dist/index.js"
  }
}
```

**MCP config users drop into Claude settings:**
```json
{
  "mcpServers": {
    "shiplog": {
      "command": "npx",
      "args": ["-y", "shiplog"]
    }
  }
}
```

The `engine/` layer has zero deps beyond Node.js built-ins — this satisfies the "zero external deps beyond MCP SDK" constraint, since `commander` and `zod` are the only additions, and `commander` is only in the CLI entry point.

---

## JSONL Parser: Built-in Node.js Only

**Use `node:readline` + `node:fs` streams. No external libraries.**

```typescript
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

async function* parseJsonl<T>(filePath: string): AsyncGenerator<T> {
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.trim()) yield JSON.parse(line) as T;
  }
}
```

This pattern handles `~/.claude/projects/` files efficiently — they're small enough that streaming is overkill, but the pattern scales to large files without memory issues. No `stream-json` or other library needed.

---

## MCP Server Pattern (Verified Against v1.28.0 Docs)

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'shiplog',
  version: '1.0.0',
});

server.registerTool(
  'shiplog:summary',
  {
    title: 'ShipLog Summary',
    description: 'Sessions, tool calls, models used, projects, and estimated cost',
    inputSchema: z.object({
      days: z.number().optional().describe('Number of days to look back (default: 30)'),
    }),
  },
  async ({ days = 30 }) => {
    // engine call here
    return { content: [{ type: 'text', text: JSON.stringify(summary) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Key import paths**: `.../sdk/server/mcp.js` and `.../sdk/server/stdio.js` — note the `.js` extension required for ESM.

---

## Cloudflare Worker Pattern (Verified Against Wrangler v4 Docs)

**wrangler.jsonc:**
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "shiplog-cards",
  "main": "./worker/index.ts",
  "compatibility_date": "2025-03-01",
  "kv_namespaces": [
    {
      "binding": "CARDS_KV",
      "id": "<your-kv-namespace-id>"
    }
  ]
}
```

**worker/index.ts:**
```typescript
export interface Env {
  CARDS_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const username = url.pathname.split('/').pop();

    // Check KV cache first
    const cached = await env.CARDS_KV.get(`card:${username}`);
    if (cached) {
      return new Response(cached, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Generate and cache
    const svg = generateCard(/* stats */);
    await env.CARDS_KV.put(`card:${username}`, svg, { expirationTtl: 3600 });

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  },
};
```

**No Hono needed** — the Worker serves one route (`/api/card/:username`). Native fetch handler is 20 lines. Hono adds complexity with zero benefit for a single-route Worker.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| CLI parsing | `commander` | `yargs` | Yargs adds 2x startup time (42ms vs 22ms), more deps, unnecessary for 3 commands |
| CLI parsing | `commander` | `oclif` | oclif is for large multi-command CLIs with plugins — massive overkill |
| SVG generation | string templates | `svg-builder` / `svgdom` | Any SVG library adds deps + bundle size for what is ultimately string concatenation. Stats cards are simple enough that templates are cleaner. |
| SVG generation | string templates | `jsdom` / headless browser | Absurd overhead for Worker context; incompatible with zero-dep constraint |
| Worker framework | native fetch | `hono` | Single route doesn't justify a framework. Hono would add a dependency for no architectural gain. |
| Worker framework | native fetch | `itty-router` | Same reason as Hono — routing library for one endpoint is wasteful. |
| Build tool | `tsup` | plain `tsc` | `tsc` alone won't produce dual ESM/CJS with correct exports map. tsup handles this in one config line. |
| JSONL parsing | `node:readline` | `stream-json` | External dep for what built-in `readline` handles natively. The JSONL files are per-project and not multi-GB. |
| MCP SDK | `@modelcontextprotocol/sdk` | `fastmcp` | fastmcp is a community wrapper, not official. MCP spec compliance requires the official SDK. |

---

## Installation

```bash
# Local npm package (shiplog itself)
npm install @modelcontextprotocol/sdk zod commander

# Dev dependencies
npm install -D typescript tsup @types/node

# Cloudflare Worker dev (in worker/ or separate workspace)
npm install -D wrangler

# After creating wrangler.jsonc, generate TypeScript types:
npx wrangler types
```

---

## Confidence Notes

| Claim | Confidence | Basis |
|-------|------------|-------|
| MCP SDK v1.28.0 | HIGH | Official GitHub releases page, confirmed today 2026-03-25 |
| McpServer + registerTool() API | HIGH | Official docs/server.md via WebFetch |
| Import paths (.../server/mcp.js, .../server/stdio.js) | HIGH | docs/server.md code examples |
| Zod v3.25+ or v4 compatibility | HIGH | MCP SDK GitHub issue #802, confirmed by multiple sources |
| Wrangler v4.x is current | MEDIUM | WebSearch shows v4.47.x in active use, no official NPM fetch due to 403 |
| KV expirationTtl API | HIGH | Official Cloudflare KV write docs — min 60s, value in seconds |
| `wrangler types` preferred over @cloudflare/workers-types | HIGH | Official Cloudflare Workers TypeScript docs |
| commander vs yargs recommendation | HIGH | Multiple benchmarks, npm stats (152M vs 30M weekly downloads) |
| tsup as standard build tool | HIGH | Multiple authoritative sources confirming 2025 standard |
| SVG as pure string templates | HIGH | Pattern used by github-readme-stats (67K stars), all comparable projects |
| Node.js 22 LTS recommendation | HIGH | Official Node.js LTS schedule — 22 extends to April 2027 |

---

## Sources

- MCP TypeScript SDK releases: https://github.com/modelcontextprotocol/typescript-sdk/releases
- MCP server docs (docs/server.md): https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md
- Cloudflare KV write API: https://developers.cloudflare.com/kv/api/write-key-value-pairs/
- Cloudflare Workers KV get-started: https://developers.cloudflare.com/kv/get-started/
- Cloudflare Workers TypeScript: https://developers.cloudflare.com/workers/languages/typescript/
- Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- Workers best practices (updated 2026-02-15): https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- tsup documentation: https://tsup.egoist.dev/
- commander vs yargs comparison: https://www.pkgpulse.com/blog/how-to-build-cli-nodejs-commander-yargs-oclif
- Dual ESM/CJS publishing: https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing
- github-readme-stats (SVG pattern reference): https://github.com/anuraghazra/github-readme-stats
