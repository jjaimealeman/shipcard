# Phase 2: MCP + CLI - Research

**Researched:** 2026-03-25
**Domain:** Node.js CLI with hand-rolled argv parsing + MCP stdio server via @modelcontextprotocol/sdk
**Confidence:** HIGH

---

## Summary

Phase 2 layers two interfaces on top of the Phase 1 engine: a terminal CLI (`shiplog summary`, `shiplog costs`, `shiplog card`) and an MCP server exposing three tools via stdio transport. Both interfaces are thin shells over `runEngine()` — they call the engine, format the result, and exit. No business logic lives here.

The key technical decisions are already locked: hand-rolled `process.argv` parsing via `node:util.parseArgs()` (zero new dependencies), and MCP via `@modelcontextprotocol/sdk` with `McpServer` + `StdioServerTransport`. Zod is required as a peer dependency of the MCP SDK and must be added as a runtime dependency. The zero-dep constraint means `zod` and `@modelcontextprotocol/sdk` are the only new runtime deps — no commander, no yargs.

The most critical constraint for the MCP server is **zero stdout output**: the stdio transport uses stdout exclusively for JSON-RPC protocol messages. Any stray `console.log()` anywhere in the MCP entry point or its imports will corrupt the client's message stream and cause silent failures. All logging must go to `process.stderr` or `console.error()`.

**Primary recommendation:** Use `node:util.parseArgs()` for CLI argument handling with `allowPositionals: true` to capture the subcommand. Use `McpServer.registerTool()` with zod schemas for MCP tools. Add `#!/usr/bin/env node` shebang to both entry points and configure two `bin` entries in `package.json`.

---

## Standard Stack

### Core (runtime dependencies to add in Phase 2)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | `1.28.0` | MCP server, stdio transport, tool registration | Official Anthropic SDK. Only viable option for MCP protocol compliance. |
| `zod` | `^4.3.6` | Input schema for MCP tool definitions | Required peer dep of MCP SDK (`optional: false`). SDK uses it for validation. Use latest v4 — SDK supports `^3.25 || ^4.0`. |

### Built-in Node.js (zero new deps)

| Module | Purpose | Notes |
|--------|---------|-------|
| `node:util.parseArgs()` | CLI argument parsing | Stable in Node 22+, handles flags + positionals, no external dep |
| `process.stdout.isTTY` | Auto-detect terminal vs pipe | `undefined` (falsy) when piped, `true` in terminal |
| `process.stderr` | MCP logging, parse warnings | Safe — not used by MCP stdio transport |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:util.parseArgs()` | `commander@13` | commander is better DX but violates locked zero-dep decision |
| `node:util.parseArgs()` | `yargs` | Same reason + slower startup (42ms vs ~5ms for built-ins) |
| `registerTool()` with zod | raw JSON schema | SDK's `inputSchema` param requires `ZodRawShapeCompat` — plain JSON schema not accepted in current API |

**Installation:**

```bash
npm install @modelcontextprotocol/sdk zod
```

---

## Architecture Patterns

### Recommended File Structure for Phase 2

```
shipcard/src/
├── cli/
│   ├── index.ts          # CLI entry point (#!/usr/bin/env node shebang)
│   ├── args.ts           # util.parseArgs wrapper, flag types, date arg parsing
│   ├── format.ts         # UTF-8 box-drawing table renderer
│   └── commands/
│       ├── summary.ts    # shiplog summary handler
│       ├── costs.ts      # shiplog costs handler
│       └── card.ts       # shiplog card handler (Phase 2: raw data or skip)
├── mcp/
│   ├── server.ts         # MCP entry point (#!/usr/bin/env node shebang)
│   └── tools/
│       ├── summary.ts    # shiplog:summary tool registration
│       ├── costs.ts      # shiplog:costs tool registration
│       └── card.ts       # shiplog:card tool registration
└── index.ts              # Engine API (existing Phase 1)
```

### package.json bin entries

```json
{
  "bin": {
    "shiplog": "./dist/cli/index.js",
    "shiplog-mcp": "./dist/mcp/server.js"
  }
}
```

The `shiplog` bin is the CLI — installed users run `shiplog summary`.
The `shiplog-mcp` bin is what Claude Code's MCP config invokes.

**npx invocation** — when `"bin"` has a single default key matching the package name, `npx shiplog` runs `./dist/cli/index.js`. Two bin entries mean `npx shiplog` runs the CLI (the `shiplog` key). The MCP server needs explicit reference: `command: "npx", args: ["-y", "shiplog-mcp"]`.

### Pattern 1: util.parseArgs for Subcommands

`util.parseArgs()` from `node:util` handles all flag parsing. The subcommand lands in `positionals[0]`.

```typescript
// Source: Node.js v22 built-in (verified live)
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    json:  { type: 'boolean', short: 'j' },
    since: { type: 'string' },
    until: { type: 'string' },
    color: { type: 'boolean' },
    help:  { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
  strict: false, // Don't throw on unknown flags
});

const command = positionals[0]; // 'summary' | 'costs' | 'card' | undefined
```

With `strict: false`, unknown flags are silently ignored rather than throwing. Use `strict: true` for a better error UX (requires catching and formatting the error).

**Return shape verified:** `{ values: { since: '7d', json: true }, positionals: ['summary'] }`

### Pattern 2: Color Auto-Disable

```typescript
// Source: Node.js built-in, verified with live test
function shouldUseColor(colorFlag: boolean): boolean {
  // --color flag overrides nothing — auto-detect wins when piped
  // process.stdout.isTTY is undefined when piped, true in terminal
  if (!process.stdout.isTTY) return false;
  return colorFlag;
}
```

When `shiplog | cat` is run, `process.stdout.isTTY` is `undefined` (falsy), so colors are disabled regardless of `--color`.

### Pattern 3: MCP Server with stdio Transport

```typescript
// Source: Official MCP TypeScript SDK docs (modelcontextprotocol.io/docs/develop/build-server)
// Verified against SDK v1.28.0 exports
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// CRITICAL: No console.log before or after this block — use console.error only
const server = new McpServer({
  name: 'shiplog',
  version: '1.0.0',
});

server.registerTool(
  'shiplog:summary',
  {
    title: 'ShipLog Summary',
    description: 'Returns sessions, tool calls, models, projects, and estimated cost',
    inputSchema: z.object({
      since: z.string().optional().describe('Start date (ISO: 2026-03-01, or relative: 7d, 30d, today)'),
      until: z.string().optional().describe('End date (exclusive)'),
    }),
  },
  async ({ since, until }) => {
    const result = await runEngine({ since, until });
    return {
      content: [{ type: 'text', text: JSON.stringify(result.summary, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
// Server now blocks on stdin — process lives until client disconnects
```

**Import paths verified from SDK v1.28.0 exports map:**
- `@modelcontextprotocol/sdk/server/mcp.js` → `McpServer`
- `@modelcontextprotocol/sdk/server/stdio.js` → `StdioServerTransport`
- Note the `.js` extension — required for Node16 ESM resolution

### Pattern 4: Entry Point Shebang

Both entry files must start with the shebang and be executable:

```typescript
#!/usr/bin/env node
// src/cli/index.ts — first line
```

TypeScript compiler preserves shebangs in output. Post-build `chmod 755` may be needed on Linux/macOS for global installs, but `npx` handles permissions automatically.

### Pattern 5: Exit Codes

```typescript
// Consistent across all CLI commands
process.exit(0);  // success — data found and displayed
process.exit(1);  // no data — no JSONL files found, or empty results
process.exit(2);  // partial parse errors — data shown but linesSkipped > 0
```

For `--json` output, write to stdout then exit — don't mix JSON with error messages on stdout.

### Pattern 6: UTF-8 Table Rendering

```typescript
// Source: Node.js built-in string ops, UTF-8 box drawing chars
const BOX = {
  TL: '┌', TR: '┐', BL: '└', BR: '┘',
  H: '─', V: '│',
  ML: '├', MR: '┤', TM: '┬', BM: '┴', MM: '┼',
};

function padRight(s: string, width: number): string {
  return s + ' '.repeat(Math.max(0, width - s.length));
}

function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? '').length))
  );
  // Build header row, separator, data rows
  // ...
}
```

The `compact` mode is a single stats block. The `sectioned` mode renders header + data tables. Default mode comes from `~/.shiplog.json` config.

### Pattern 7: Config File (~/.shiplog.json)

```typescript
// Schema for ~/.shiplog.json
interface ShipLogConfig {
  mode?: 'compact' | 'sectioned';  // display mode, default: 'compact'
  color?: boolean;                  // default color preference, default: false
}

async function loadConfig(): Promise<ShipLogConfig> {
  const configPath = path.join(os.homedir(), '.shiplog.json');
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(raw) as ShipLogConfig;
  } catch {
    return {}; // Missing or invalid config = all defaults
  }
}
```

CLI flags always override config file values. Config is only the persistent default.

### Pattern 8: Empty State Messages

```typescript
// No JSONL files found
const ONBOARDING_MSG = `
No Claude Code session data found.

ShipLog looks for JSONL files in: ${projectsDir}

This directory is populated automatically when you use Claude Code.
If you've used Claude Code on this machine, check that the directory exists.
`;

// Date range returns no sessions
function emptyRangeMsg(since: string | undefined, until: string | undefined, totalSessions: number): string {
  const rangeDesc = since || until
    ? `[${since ?? 'beginning'} → ${until ?? 'now'}]`
    : 'the selected range';
  return `No sessions found in ${rangeDesc}.\n${totalSessions} session(s) exist outside this range.`;
}
```

### Pattern 9: shiplog:card in Phase 2

**Decision (Claude's Discretion):** `shiplog:card` in Phase 2 returns the raw analytics data as JSON — same data that will eventually power the SVG card. This gives MCP callers useful data now without creating a Phase 3 stub that does nothing. The tool description says "returns card data as JSON (SVG generation available in shiplog:sync once cloud endpoint is configured)." This is the cleanest Phase 2 → Phase 3 handoff: Phase 3 adds cloud sync capability to the same tool shape.

### Pattern 10: MCP Config for Claude Code and Cursor

```json
{
  "mcpServers": {
    "shiplog": {
      "command": "npx",
      "args": ["-y", "shiplog-mcp"]
    }
  }
}
```

The `-y` flag auto-accepts the npx install prompt. Claude Code users add this to their project's `.mcp.json` or global settings. Cursor users add to `~/.cursor/mcp.json`.

### Anti-Patterns to Avoid

- **console.log in MCP entry point:** Corrupts JSON-RPC stream. Use `console.error()` exclusively.
- **Writing to stdout before MCP connect:** Even a single character corrupts protocol handshake.
- **Importing modules that log to stdout:** Audit all imports — some packages print banners on load.
- **Buffering all CLI output then printing:** Print progressively or all at once — but don't mix JSON and text on stdout.
- **Using process.exit() inside async callbacks without await:** Can cause unhandled promise rejection. Always `await` engine calls before exit.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP protocol implementation | Custom JSON-RPC handler | `@modelcontextprotocol/sdk` | Protocol compliance, auth, capability negotiation are all handled |
| Tool input schema validation | Custom type checking | Zod (via MCP SDK) | MCP SDK requires Zod for `inputSchema` — plain objects not accepted |
| Argument parsing (flags + values) | Manual `process.argv` string scanning | `node:util.parseArgs()` | Handles `--flag value`, `--flag=value`, `-f value`, `--` terminator correctly |

**Key insight:** The MCP SDK handles all JSON-RPC protocol complexity. The CLI built-ins in Node 22+ handle all argument parsing. The only custom code needed is display formatting and wiring calls to `runEngine()`.

---

## Common Pitfalls

### Pitfall 1: stdout Pollution in MCP Server

**What goes wrong:** `console.log()` is called anywhere in the MCP server entry point or its imports. The MCP client (Claude Code) receives corrupted JSON-RPC and either fails silently or shows a protocol error.

**Why it happens:** Phase 1 engine has no logging, but developers habitually use `console.log` for debugging. During development of Phase 2, a single debug log left in breaks the MCP server entirely.

**How to avoid:** Establish a rule: `console.log` is banned in `src/mcp/`. Lint rule or manual grep in verify step. Only `console.error()` and `process.stderr.write()` allowed.

**Warning signs:** MCP client shows tool as available but calls return empty/error. `mcpServers` in Claude Code shows connection status as disconnected after startup.

### Pitfall 2: Missing .js Extension on ESM Imports

**What goes wrong:** TypeScript files import `from './format'` without `.js`. Compiles fine, but Node16 ESM resolution requires explicit `.js` extension at runtime.

**Why it happens:** TypeScript resolves imports without extensions, but the compiled `.js` files in `dist/` must have explicit extensions for Node ESM.

**How to avoid:** Always write `import { x } from './format.js'` in TypeScript source when targeting Node16 ESM. The `.js` refers to the compiled output file.

**Warning signs:** `ERR_MODULE_NOT_FOUND` when running the compiled output.

### Pitfall 3: util.parseArgs and Token Object Prototype

**What goes wrong:** `values` returned from `parseArgs()` is a `[Object: null prototype]` object. JSON.stringify works but `values.hasOwnProperty` fails because there's no prototype.

**Why it happens:** Node's `parseArgs` returns a null-prototype object to avoid key conflicts with inherited properties.

**How to avoid:** Use `values.json` directly (not `values.hasOwnProperty('json')`). Use `in` operator: `'json' in values`. Or spread: `const { json, since } = values`.

**Warning signs:** TypeScript type `ParseArgsOptionConfig` is correctly typed — this is a runtime quirk only. Tests should verify spread destructuring works.

### Pitfall 4: npx and the -y Flag Behavior

**What goes wrong:** Without `-y`, `npx shiplog-mcp` prompts the user "Need to install the following packages" and waits for input. In an MCP server context, stdin is the JSON-RPC transport — reading from stdin before the server starts corrupts the protocol.

**Why it happens:** `npx` without `-y` interactively installs packages on first run, reading from stdin.

**How to avoid:** MCP config docs must show `"args": ["-y", "shiplog-mcp"]`. The `-y` flag skips the prompt. Document this clearly — it's the most common copy-paste mistake.

**Warning signs:** MCP server never responds after install. User reports "works after first restart."

### Pitfall 5: Zod v3 vs v4 Import Differences

**What goes wrong:** Some examples online use `import z from 'zod'` (default import, v3 pattern). Zod v4 uses named export: `import { z } from 'zod'`.

**Why it happens:** Zod v4 changed from default to named export.

**How to avoid:** Always use `import { z } from 'zod'`. Verified working with zod v4.3.6.

**Warning signs:** TypeScript error `Module '"zod"' has no default export`.

### Pitfall 6: TTY Detection in Claude Code vs Terminal

**What goes wrong:** `process.stdout.isTTY` is `undefined` even when running `shiplog summary` directly within Claude Code's Bash tool (because Claude pipes stdout to capture output).

**Why it happens:** Claude Code's Bash tool captures stdout, making it appear as a pipe to Node.js.

**How to avoid:** This is expected and correct behavior — colors are disabled in Claude Code's Bash tool since the output is being captured. The `--color` flag override does not bypass TTY check (per CONTEXT.md decision: "Auto-disable color when stdout is piped" — even with `--color`).

**Warning signs:** Colors work in terminal but not in Claude Code tool output — this is correct, not a bug.

### Pitfall 7: tsc Does Not Make bin Files Executable

**What goes wrong:** After `tsc` build, the compiled CLI entry is not executable. `npx shiplog` fails with "permission denied" on Linux/macOS.

**Why it happens:** `tsc` doesn't set file permissions. The shebang is present but the file isn't executable.

**How to avoid:** Add `chmod 755 dist/cli/index.js dist/mcp/server.js` to the build script after `tsc`. For npm publishing, this is critical.

**Warning signs:** `npx shiplog` works in some environments, fails in others.

---

## Code Examples

### Complete CLI Entry Point (src/cli/index.ts)

```typescript
#!/usr/bin/env node
// Source: Node.js v22 built-ins + Phase 1 engine API
import { parseArgs } from 'node:util';
import { runEngine } from '../index.js';
import { formatSummary } from './format.js';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    json:  { type: 'boolean' as const },
    since: { type: 'string' as const },
    until: { type: 'string' as const },
    color: { type: 'boolean' as const },
    help:  { type: 'boolean' as const, short: 'h' },
  },
  allowPositionals: true,
  strict: false,
});

const command = positionals[0];

if (!command || 'help' in values) {
  console.log(HELP_TEXT);
  process.exit(0);
}

try {
  const result = await runEngine({
    since: values.since as string | undefined,
    until: values.until as string | undefined,
  });

  if (result.meta.filesRead === 0) {
    console.error(ONBOARDING_MESSAGE);
    process.exit(1);
  }

  const useJson = 'json' in values && values.json === true;
  const useColor = shouldUseColor('color' in values && values.color === true);

  if (useJson) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(formatSummary(result, { color: useColor }) + '\n');
  }

  if (result.meta.linesSkipped > 0) {
    console.error(`Warning: ${result.meta.linesSkipped} line(s) skipped due to parse errors.`);
    process.exit(2);
  }

  process.exit(0);
} catch (err) {
  console.error('Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}
```

### Complete MCP Server Entry Point (src/mcp/server.ts)

```typescript
#!/usr/bin/env node
// Source: Official MCP docs (modelcontextprotocol.io/docs/develop/build-server)
// CRITICAL: No console.log anywhere in this file — stdout is MCP transport
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { runEngine } from '../index.js';

const server = new McpServer({
  name: 'shiplog',
  version: '0.1.0',
});

const dateFilterSchema = {
  since: z.string().optional().describe('Start date: ISO (2026-03-01) or relative (7d, 30d, today)'),
  until: z.string().optional().describe('End date (exclusive): ISO or relative'),
};

server.registerTool(
  'shiplog:summary',
  {
    title: 'ShipLog Summary',
    description: 'Returns sessions, tool calls, models used, projects touched, and estimated cost',
    inputSchema: z.object(dateFilterSchema),
  },
  async ({ since, until }) => {
    const result = await runEngine({ since, until });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result.summary, null, 2) }],
    };
  }
);

server.registerTool(
  'shiplog:costs',
  {
    title: 'ShipLog Costs',
    description: 'Returns cost breakdown by project and model',
    inputSchema: z.object(dateFilterSchema),
  },
  async ({ since, until }) => {
    const result = await runEngine({ since, until });
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ byProject: result.byProject, byModel: result.byModel }, null, 2),
      }],
    };
  }
);

server.registerTool(
  'shiplog:card',
  {
    title: 'ShipLog Card Data',
    description: 'Returns raw stats data for card generation. SVG sync available via shiplog:sync once cloud endpoint is configured.',
    inputSchema: z.object(dateFilterSchema),
  },
  async ({ since, until }) => {
    const result = await runEngine({ since, until });
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
// No process.exit() — server blocks on stdin until client disconnects
```

### MCP Config Documentation (copy-paste for README)

```json
{
  "mcpServers": {
    "shiplog": {
      "command": "npx",
      "args": ["-y", "shiplog-mcp"]
    }
  }
}
```

Claude Code: add to `.mcp.json` in project root or `~/.claude.json` global settings.
Cursor: add to `~/.cursor/mcp.json`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `server.tool()` method | `server.registerTool()` | SDK v1.x | `tool()` is deprecated, `registerTool()` is preferred |
| zod v3 default import | zod v4 named import `{ z }` | zod v4.0 | `import z from 'zod'` no longer works |
| `commander` for CLI | `node:util.parseArgs()` | Node 18.3+ (stable) | Built-in handles all flag types without external dep |
| CJS bin entries | ESM bin entries with shebang | Node 12+ with `type: module` | ESM .js files as bin entries work when package has `"type": "module"` |

**Deprecated/outdated:**
- `server.tool()`: Deprecated in favor of `server.registerTool()`. Both work in v1.28.0 but use `registerTool` for forward compatibility.
- `zod@3.x` default import: Use `import { z } from 'zod'` with v4.

---

## Open Questions

1. **tsup vs tsc for build**
   - What we know: Phase 1 uses plain `tsc`. For dual bin entries that need chmod, a build script wrapper works.
   - What's unclear: Whether we need `tsup` for Phase 2 or if `tsc + chmod` is sufficient.
   - Recommendation: Stay with `tsc` for Phase 2 (matches Phase 1, no new build dep). Add `chmod 755` to build script. Evaluate `tsup` before publishing (Phase 5).

2. **zod v4 import path in strict mode**
   - What we know: `import { z } from 'zod'` works with v4.3.6. MCP SDK works with both v3.25+ and v4.
   - What's unclear: Whether `zod/v4` subpath import is needed for some edge case.
   - Recommendation: Use `import { z } from 'zod'` — the main entry works for all our use cases.

3. **shiplog:card exact response shape**
   - What we know: Claude's Discretion says return the full `AnalyticsResult` as JSON.
   - What's unclear: Whether to return the whole `AnalyticsResult` or a subset (`summary` + `byProject`).
   - Recommendation: Return full `AnalyticsResult` — Phase 3 cloud sync will need all fields anyway, and MCP callers can use what they need.

---

## Sources

### Primary (HIGH confidence)

- SDK v1.28.0 package exports: `npm show @modelcontextprotocol/sdk@1.28.0 exports` — verified exact import paths
- SDK type definitions: `/tmp/mcp-inspect/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts` — `McpServer`, `registerTool`, `ToolCallback` signatures
- SDK type definitions: `/tmp/mcp-inspect/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.d.ts` — `StdioServerTransport` constructor
- Node.js v22 live test: `util.parseArgs()` with `allowPositionals: true` — verified return shape
- MCP official TypeScript docs: `https://modelcontextprotocol.io/docs/develop/build-server` — confirmed `console.log` corruption issue, exact import paths, package.json config
- Phase 1 engine API: `shipcard/src/index.ts` — `runEngine(options)` signature, `AnalyticsResult` shape

### Secondary (MEDIUM confidence)

- STACK.md prior research: `@modelcontextprotocol/sdk` MCP patterns, verified against v1.28.0 SDK source
- Node.js util.parseArgs docs: `https://2ality.com/2022/08/node-util-parseargs.html` — API confirmed with live test

### Tertiary (LOW confidence)

- WebSearch: `npm package bin field npx ESM` — supplementary confirmation, multiple sources agree

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — live package inspection, verified exports, live Node.js tests
- Architecture: HIGH — based on locked decisions from CONTEXT.md + verified API shapes
- CLI patterns: HIGH — `util.parseArgs()` verified with live Node 22 test
- MCP patterns: HIGH — confirmed from SDK type definitions + official docs
- Pitfalls: HIGH — sourced from official MCP docs (stdout pollution), Node.js behavior (TTY, ESM), SDK deprecation notes

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (30 days — MCP SDK is stable, Node 22 built-ins are stable)
