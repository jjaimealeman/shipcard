# Domain Pitfalls

**Domain:** Local analytics tool + cloud card endpoint (MCP server / CLI / Cloudflare Worker)
**Researched:** 2026-03-25
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: JSONL Schema Instability

**What goes wrong:**
Claude Code's JSONL format changes across versions without warning. Fields get added, renamed, or restructured. A parser hardcoded to today's schema breaks silently on tomorrow's update — stats go wrong, cost calculations drift, or the tool crashes.

**Why it happens:**
Claude Code is a rapidly iterating product. The JSONL files are internal logging, not a public API. Anthropic has no obligation to maintain schema stability.

**How to avoid:**
- Build a resilient parser that extracts known fields gracefully and ignores unknowns
- Use optional typing (`field?: type`) for every non-guaranteed field
- Never crash on unexpected data — log a warning, skip the record
- Version-detect: check the `version` field in JSONL records to branch parsing logic
- Ship a `--debug` flag that dumps unparsed records for troubleshooting

**Warning signs:**
- Users report "stats stopped working after Claude Code update"
- Cost calculations suddenly show $0 or NaN
- Session counts diverge from what users expect

**Phase to address:** Phase 1 (JSONL parser must be resilient from day one)

---

### Pitfall 2: Cost Estimation Inaccuracy

**What goes wrong:**
Token-to-dollar conversion is wrong because: (a) model pricing changes and the tool ships stale rates, (b) JSONL token counts may not match billing (cached tokens, system prompts), (c) users on Max plan pay flat rate — per-token cost is meaningless for them.

**Why it happens:**
Anthropic updates pricing without notice. JSONL records tokens consumed, not dollars billed. The mapping is an estimate, not truth.

**How to avoid:**
- Make cost estimation explicitly approximate: "~$127 estimated" not "$127.00"
- Ship pricing as a versioned constant with "last updated" date visible to users
- Support a `--pricing-file` flag for user-supplied custom rates
- Detect Max plan users (if possible from JSONL) and show token counts instead of dollars
- Never display cost to the cent — round to nearest dollar for totals

**Warning signs:**
- Users report costs don't match their Anthropic billing
- Reddit posts calling ShipLog "inaccurate"

**Phase to address:** Phase 1 (cost engine, but with clear "estimate" labeling)

---

### Pitfall 3: SVG Rendering Inconsistency Across Platforms

**What goes wrong:**
SVG cards look different on GitHub (uses camo proxy, sanitizes SVGs), Reddit (may not render inline SVG), Discord (may not embed SVG at all). Text wrapping, fonts, and colors break across renderers.

**Why it happens:**
Each platform has its own SVG sanitizer and renderer. GitHub strips `<script>`, `<foreignObject>`, external stylesheets, and some CSS properties. Reddit and Discord may only support SVG-as-image via `<img>` tags with URL src.

**How to avoid:**
- Use only basic SVG elements: `<rect>`, `<text>`, `<g>`, `<svg>`, `<line>`
- Inline ALL styles — no `<style>` blocks, no external CSS
- Use web-safe fonts only (monospace, sans-serif) — never assume custom fonts render
- Set explicit `width` and `height` on root `<svg>` — don't rely on viewBox alone
- Test on GitHub README, Reddit markdown, and Discord embed before shipping
- Set `Content-Type: image/svg+xml` on Worker response

**Warning signs:**
- Cards look wrong on specific platforms
- Text overflows, fonts fallback to serif

**Phase to address:** Phase 2 (card generation — test matrix needed)

---

### Pitfall 4: Large JSONL File Performance

**What goes wrong:**
Power users with months of Claude Code history have JSONL files totaling hundreds of megabytes. `fs.readFileSync` + `JSON.parse` on the whole file causes OOM crashes or 30+ second startup times.

**Why it happens:**
Easy to prototype with `readFileSync`, hard to notice the problem until files get big.

**How to avoid:**
- Use Node.js `readline` interface for streaming line-by-line parsing
- Process files lazily — don't load entire history into memory
- Support `--since` and `--until` flags to limit time range
- Cache computed aggregates locally (e.g., in `~/.shiplog/cache.json`) to avoid re-parsing unchanged files
- Use file modification timestamps to skip files that haven't changed since last parse

**Warning signs:**
- Startup takes > 2 seconds
- Memory usage spikes during parsing
- Users with long history report crashes

**Phase to address:** Phase 1 (parser design — streaming must be the default, not an optimization)

---

### Pitfall 5: MCP Server Transport Gotchas

**What goes wrong:**
MCP servers communicate via stdio. Any accidental `console.log` in the MCP code path corrupts the JSON-RPC stream. The MCP client disconnects silently, and the user sees "tool not available" with no error message.

**Why it happens:**
Developers add debug logging during development and forget to remove it. Or a dependency logs to stdout.

**How to avoid:**
- Never use `console.log` in MCP code paths — use `console.error` (goes to stderr, not stdio)
- Create a logger utility that writes to stderr in MCP mode and stdout in CLI mode
- Test MCP server by piping through `jq` to validate every line is valid JSON-RPC
- Add an integration test that runs the MCP server and checks for clean stdio

**Warning signs:**
- MCP tools show up in config but don't work
- "Tool not found" errors in Claude Code / Cursor

**Phase to address:** Phase 1 (MCP server setup — logger pattern from day one)

---

### Pitfall 6: npm Publishing / bin Entry Mistakes

**What goes wrong:**
Package publishes but `shiplog` CLI command doesn't work: wrong `bin` path in package.json, missing shebang, ESM/CJS mismatch, or tsup output doesn't match expected entry points.

**Why it happens:**
The dual MCP/CLI pattern means two bin entries pointing to different compiled files. Easy to get the paths wrong, especially with tsup's output directory.

**How to avoid:**
- Test `npm pack` + `npm install -g` locally before publishing
- Verify both `shiplog` and `shiplog-mcp` bin entries work after install
- Use `#!/usr/bin/env node` shebang in both entry point source files
- Pin tsup output to `dist/` and reference `dist/cli.js` and `dist/mcp-server.js` in bin
- Add a prepublish script that builds and verifies bin entries exist

**Warning signs:**
- "command not found" after global install
- Works in dev but not after npm install

**Phase to address:** Phase 1 (project setup — get bin entries right from the start)

---

### Pitfall 7: Privacy Leak via Card Data

**What goes wrong:**
User opts into card sharing but the sync endpoint receives more data than intended — project names (which may be confidential), session contents, or file paths leak into the card or the KV store.

**Why it happens:**
The line between "aggregated stats" and "identifiable data" is fuzzy. Project directory names like `~/work/secret-client-project` are identifying. Tool call names might reveal what the user is building.

**How to avoid:**
- Define a strict `SafeStats` interface: only numbers (session count, tool call count, token totals, cost estimate) and explicit opt-in strings (display name, username)
- Never sync project names, file paths, tool names, or session content
- Let users preview exactly what will be synced before first upload
- Log every sync payload locally so users can audit what was sent

**Warning signs:**
- Users ask "what data are you sending?"
- Project names appear in card or API responses

**Phase to address:** Phase 2 (sync endpoint — SafeStats type must be locked before any cloud code)

---

## Moderate Pitfalls

### Pitfall 8: KV Cache Stale Data

**What goes wrong:**
User syncs new stats but the card still shows old data because KV cache hasn't expired.

**Prevention:**
- Invalidate card cache on sync (delete KV key, let next request regenerate)
- Show "last updated" timestamp on card so staleness is visible
- Default card TTL to 1 hour, stats TTL to 6 hours

---

### Pitfall 9: npm Package Name Conflict

**What goes wrong:**
`shiplog` is already taken on npm. Discovery happens after all code is written.

**Prevention:**
- Check `npm show shiplog` BEFORE writing any code
- Have fallback names ready: `@shiplog/cli`, `shiplog-dev`, `shiplog-ai`
- Consider scoped package from the start: `@shiplog/cli`

---

### Pitfall 10: Cloudflare Worker Size Limit

**What goes wrong:**
Worker bundle exceeds 1MB free tier limit (or 10MB paid). SVG templates with many themes bloat the bundle.

**Prevention:**
- Keep SVG templates as string literals, not imported files
- Monitor bundle size in CI
- Free tier limit is 1MB compressed — should be fine for a single-route Worker
- Use `wrangler deploy --dry-run` to check size before deploying

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| JSONL Parser | Schema changes, large files | Resilient parser, streaming, version detection |
| Analytics Engine | Cost inaccuracy | Explicit estimates, versioned pricing, user overrides |
| MCP Server | stdout corruption | stderr-only logging, integration tests |
| CLI Interface | bin entry paths | Local test install before publish |
| SVG Cards | Cross-platform rendering | Basic SVG only, inline styles, test matrix |
| Cloud Sync | Privacy leaks | Strict SafeStats type, audit logging, preview |
| KV Cache | Stale cards | Cache invalidation on sync, visible timestamps |

---

## Sources

- Architecture research (first-hand JSONL file inspection on this machine)
- github-readme-stats GitHub issues (SVG rendering problems across platforms)
- MCP SDK documentation (stdio transport requirements)
- Cloudflare Workers documentation (KV limits, Worker size limits)
- ccusage GitHub issues (cost estimation complaints, schema changes)

---
*Pitfalls research for: ShipLog*
*Researched: 2026-03-25*
