# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Developers using Claude Code can see what they shipped and what it cost, and share verifiable proof via an embeddable card.
**Current focus:** Phase 8 - Landing Page

## Current Position

Phase: 8 of 8 (Landing Page) — Complete
Plan: 1 of 1 in Phase 8 complete (08-01 done)
Status: Phase 8 complete — ALL PHASES DONE
Last activity: 2026-03-26 — Completed 08-01-PLAN.md (landing page with configurator, fonts, quickstart)

Progress: [█████████████████] 100% (17/17 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: ~3.5 min
- Total execution time: ~35 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-parser-engine | 3 (complete) | ~8 min | ~2.7 min |
| 02-mcp-cli | 3 (complete) | ~6 min | ~2 min |
| 03-svg-card | 2 (complete) | ~8 min | ~4 min |
| 04-cloud-worker | 3 (complete) | ~16 min | ~5 min |
| 05-publish-launch | 4 (complete) | ~25 min | ~6 min |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
All decisions from phases 1-5:

- [Project]: Phase 1 + Phase 2 sequential — local tool must work before card has data
- [Project]: Dual MCP + CLI interface — covers IDE users and terminal natives
- [Project]: Cloudflare Workers over Vercel — avoids github-readme-stats rate-limit problems
- [Project]: 3 MCP tools only — ship the wedge, not the platform
- [01-01]: Node16 module resolution (not Bundler) — targeting Node 22 directly, no bundler
- [01-01]: glob async iterator form (for await of glob()) — promise form unreliable per research
- [01-01]: message.id dedup scoped per-file, uuid dedup shared — matches Claude Code write patterns
- [01-01]: User entries are metadata-only (cwd source) — ParsedMessages are assistant entries only
- [01-01]: Zero runtime deps enforced — only node: built-ins used in parser
- [01-02]: Pricing snapshot stored in data/ (outside src/) — loaded via import.meta.url at runtime, not compiled
- [01-02]: PricingMap is Map<string, ModelPricing> for O(1) lookup in aggregator hot path
- [01-02]: Per-message cost calculation (not per-session) — handles multi-model sessions correctly
- [01-02]: pricingCache in aggregator memoizes getModelPricing() calls per model string
- [01-03]: parseFilterDate uses local time (ISO + T00:00:00, relative/today + setHours(0,0,0,0))
- [01-03]: since inclusive (>=), until exclusive (<) — standard analytics range convention
- [01-03]: sessions map rebuilt from filtered messages so totalSessions reflects the window
- [01-03]: stats.filesRead/linesSkipped carry from full parse (reflects I/O, not filter)
- [01-03]: dist/ gitignored — compiled output not committed
- [02-01]: node:util.parseArgs with strict: false — avoids unknown flag crashes, zero deps
- [02-01]: shouldUseColor() checks isTTY first — prevents garbled ANSI in piped output
- [02-02]: Tool-per-file pattern — each MCP tool in separate module for testability and clean server.ts
- [02-02]: import type McpServer in tool files — type-only import avoids runtime dependency in tool modules
- [02-02]: as const on MCP content type literal — prevents type widening from "text" to string
- [02-03]: chmod 755 in build script (not post-install hook) — executable bits set at compile time
- [02-03]: Separate bin names (shipcard vs shipcard-mcp) — CLI and MCP server are distinct invocations
- [02-03]: files field includes data/ — pricing snapshot required at runtime, must be in npm publish
- [02-03]: npx -y required for MCP stdio servers — prevents interactive prompt corrupting transport
- [03-01]: ThemeColors in themes/types.ts (not index.ts) — prevents circular imports between registry and palette modules
- [03-01]: Inline SVG path d strings for icons (STAT_ICONS map in renderer.ts) — zero icon package dependency
- [03-01]: CardData intermediate type in renderer.ts — clean boundary between AnalyticsResult and SVG rendering concerns
- [03-01]: Classic layout dynamic height (70px + 30px/stat); compact/hero use formula heights
- [03-02]: Cast CLI string flags to LayoutName/StyleName/ThemeName at renderCard() call site — no runtime validation, invalid values fall through to renderer defaults
- [03-02]: Markdown snippet uses basename of custom output path — portability for relative README embeds
- [03-02]: Import LayoutName/StyleName/ThemeName from card/index.ts re-exports — keeps cli/ imports clean
- [04-01]: Bundler module resolution in tsconfig.json — Workers runtime uses a bundler, not Node16 resolution
- [04-01]: SVG renderer copied verbatim from shiplog/src/card/ into shiplog-worker/src/svg/ — no cross-package import
- [04-01]: No expirationTtl on card cache KV puts — sync-driven invalidation design (cache until next sync)
- [04-01]: svgResponse() helper centralizes anti-camo headers — all SVG paths guaranteed Cache-Control: no-cache, no-store
- [04-02]: AppType Variables: { username: string } — auth middleware sets username on Hono context for typed downstream access
- [04-02]: crypto.randomUUID() for Worker tokens — opaque, simple; TOKEN_SECRET preserved for future HMAC if needed
- [04-02]: GitHub login lowercase comparison — prevents false mismatches from user input capitalization
- [04-02]: isValidSafeStats bans field names (path, paths, filePath, cwd, content, rawContent, jsonl, projectsTouched, projectNames) + rejects file-path strings (/~)
- [04-02]: Synchronous default card re-render on every sync — defeats Cloudflare KV eventual consistency on next GET
- [04-02]: DELETE /sync preserves auth token — user can re-sync without re-authenticating
- [04-03]: SafeStats.totalTokens uses cacheCreate (aligns to local TokenCounts) — cacheCreation was a Worker typo
- [04-03]: Auth config in ~/.shipcard/config.json separate from display config ~/.shipcard.json
- [04-03]: Configurator stats passed via URL hash fragment — server never sees the data
- [05-01]: npm package name is shipcard — shiplog was taken on npm registry
- [05-01]: Card URL path is /u/:username — shorter and cleaner than /card/:username
- [05-01]: Config paths are ~/.shipcard/ and ~/.shipcard.json
- [05-01]: MCP tool names use shipcard: prefix (shipcard:summary, shipcard:costs, shipcard:card)
- [05-01]: Worker name in wrangler.jsonc is shipcard with shipcard.dev custom domain
- [05-02]: LICENSE placed in both repo root and shiplog/ — npm only auto-includes from package root (shiplog/)
- [05-02]: "license": "MIT" added to package.json to satisfy npm registry metadata requirement
- [06-01]: Cache key format: card:{user}:{theme}:{layout}:{style}:hide={sorted,keys} — appended only when non-empty; invalidateCardVariants prefix listing covers all hide variants automatically
- [06-01]: getCardCache/putCardCache accept optional hide param defaulting to [] — zero breaking changes to existing callers
- [06-01]: DELETE /sync putCardCache for redacted card placed AFTER deleteAllUserData + invalidateCardVariants — avoids immediate erasure
- [06-01]: DELETE /sync response includes redactedCard: true to signal CLI that a redacted card was stored
- [07-01]: npm package name is unscoped "shipcard" — simplifies npx usage (no -p flag for CLI commands)
- [07-01]: looksLikeFilePath checks ~/ not ~ — cost strings like "~$3,414.02" are not file paths
- [08-01]: Base64-embedded fonts (Poppins 600/700 + Lora 400, ~43 KB) — zero external requests, instant load
- [08-01]: XHR for card fetch instead of fetch() — simpler error handling in var-only embedded JS
- [08-01]: DOM API for snippet content — same security pattern as configure.ts

### Pending Todos

None.

### Blockers/Concerns

All resolved.

## Session Continuity

Last session: 2026-03-26T07:52:00Z
Stopped at: Completed 08-01-PLAN.md — landing page with live configurator, base64 fonts, quickstart. All 8 phases complete.
Resume file: None
