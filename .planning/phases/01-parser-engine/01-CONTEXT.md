# Phase 1: Parser + Engine - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

JSONL parser and analytics engine — the foundation everything else builds on. Reads Claude Code JSONL files from `~/.claude/projects/`, produces structured analytics output with token counts, cost estimates, session stats, tool call breakdowns, and project-level drill-downs. No UI, no server, no CLI — just the engine that all interfaces consume.

</domain>

<decisions>
## Implementation Decisions

### Output shape & formatting
- **Summary + drill-down structure:** Top-level summary for quick glance, plus `byProject` and `byModel` breakdowns for detail
- **byModel nests into projects:** Each model shows aggregate totals AND per-project breakdown (e.g., opus-4 → SaaS: ~$31.50, portfolio: ~$6.50)
- **Tool calls broken down by tool name:** Not just a total count — top tools with individual counts (Read: 312, Edit: 201, Bash: 189, etc.)
- **Date filtering:** Support ISO dates (`2026-03-01`) plus relative shortcuts (`7d`, `30d`, `today`) — Claude's discretion on exact syntax and fuzzy natural language edge cases. Bias toward maximum flexibility.

### Cost estimation approach
- **Pricing source: LiteLLM community JSON** — `https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json` (~2,594 models, updated multiple times daily, no API key needed)
- **Caching layers:** Runtime fetch → local cache (`~/.shiplog/pricing.json`, 24h TTL) → bundled fallback snapshot at build time → user override file for custom pricing
- **Token counts are exact** from JSONL (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`)
- **Unknown models:** Fall back to a conservative default rate (e.g., Sonnet pricing) and flag as "estimated from default"
- **Cost label:** Minimal — just `~$47.20` (tilde prefix signals estimation). No source attribution in default output.
- **Cache token costs:** Claude's discretion — include if LiteLLM provides `cache_creation_input_token_cost` and `cache_read_input_token_cost` for the model, since ignoring them understates real cost

### Session detection logic
- **Trust `sessionId` from JSONL** — Claude Code assigns these, one sessionId = one session. No custom detection logic.
- **Project naming:** Scan `~/.claude/projects/*/` folders for file discovery, read `cwd` field from first JSONL entry for display name. Last path segment of `cwd` = project name. Handles dots (`915website.com`), underscores (`_github`), and spaces across Linux, macOS, and Windows.
- **Session duration:** Derive from first → last entry timestamp per sessionId
- **Subagents:** Merge subagent JSONL files (in `/subagents/` subdirs) into parent session stats. One session = one total.

### Resilience & edge cases
- **Corrupt/unparseable lines:** Skip and count. Report summary at end: "Skipped 3 unparseable lines across 2 files"
- **Unknown fields:** Ignore silently. Extract only what ShipLog knows about. Never crash on schema changes.
- **Live files:** Claude's discretion on whether to include actively-written files or skip them
- **Large directories:** Stream everything, no default limit. Parse all files every run. Date filtering via `--since`/`--until` handles the common "just show me this week" case.

### Claude's Discretion
- Cache token cost inclusion (based on LiteLLM data availability)
- Live/active file handling strategy
- Exact natural language date parsing implementation
- Internal data structures and streaming approach
- Error state handling beyond the decisions above

</decisions>

<specifics>
## Specific Ideas

- LiteLLM pricing JSON is the same source ccusage (ryoppippi/ccusage) uses — validated approach, reference implementation available at `packages/internal/src/pricing.ts`
- The `jja-cc-updates` skill monitors Claude Code releases for breaking JSONL schema changes — automation for this is planned separately
- OAuth usage API (`https://api.anthropic.com/api/oauth/usage`) gives utilization percentages but NOT dollar costs — not useful for cost estimation, but could be a future data source for plan limit tracking

</specifics>

<deferred>
## Deferred Ideas

- Automate jja-cc-updates to run on a schedule (systemd timer / cron + ntfy notification) — handle in ~/.claude session, not ShipLog
- Plan limit tracking via OAuth usage API — could complement cost data in future phases

</deferred>

---

*Phase: 01-parser-engine*
*Context gathered: 2026-03-25*
