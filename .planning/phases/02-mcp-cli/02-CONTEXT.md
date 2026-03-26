# Phase 2: MCP + CLI - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Dual interfaces — CLI commands and MCP server tools — that consume the Phase 1 parser/analytics engine. Terminal users get `shiplog summary`, `shiplog costs`, and `shiplog card` commands. IDE users get `shiplog:summary`, `shiplog:costs`, and `shiplog:card` MCP tools via stdio transport. Both interfaces share the same engine output. Card generation (SVG) is Phase 3 — this phase only surfaces the data.

</domain>

<decisions>
## Implementation Decisions

### CLI output style
- Two display modes: **compact** (single stats block) and **sectioned** (overview + per-project/per-model tables)
- User-configurable via `~/.shiplog.json` — user picks their preferred default
- Plain text with UTF-8 box-drawing characters by default — no ANSI colors
- Colors available via opt-in `--color` flag for users who want it
- Auto-disable color when stdout is piped (even with --color)
- Cross-platform compatibility is the priority: Mac, Windows, Linux must all render identically

### CLI command structure
- Subcommands required — bare `shiplog` shows help/usage, not summary
- Three commands: `summary`, `costs`, `card`
- Hand-rolled argument parsing with `process.argv` — zero dependencies, matches Phase 1 philosophy
- Global flags: `--json`, `--since`, `--until`, `--color`, `--help`

### Date filtering
- `--since` and `--until` accept ISO dates (`2026-03-25`) and simple relative shortcuts (`7d`, `30d`, `today`)
- Relative shortcuts are language-neutral (numbers + letters) — works for all users regardless of locale
- MCP tools get natural language date filtering for free — Claude interprets user input and converts to ISO before calling the tool

### MCP tool responses
- `shiplog:card` behavior in Phase 2: Claude's Discretion (decide based on cleanest Phase 2 → 3 handoff)
- Response verbosity: Claude's Discretion (decide based on MCP SDK conventions)
- MCP tools accept since/until filter parameters: Claude's Discretion (decide based on utility for an AI caller)
- MCP server: zero stdout output — all logging to stderr to prevent stdio transport corruption

### Empty & error states
- **No JSONL files found:** Friendly onboarding message — explains where ShipLog looks (`~/.claude/projects/`), confirms the path, suggests checking if Claude Code has been used on this machine
- **Date range returns zero sessions:** Message showing the exact range used, plus count of sessions outside the range with suggestion to widen filters
- **Corrupted/unparseable JSONL lines:** Silent skip during normal operation. If any lines were skipped, friendly footer naming the specific file and line count (e.g., "3 lines skipped in ~/.claude/projects/saas/abc123.jsonl")
- Parse errors are rare (Claude Code writes the files) — only realistic scenarios are truncated writes or format changes

### Exit codes
- Distinct exit codes for scripting/CI use:
  - `0` = success
  - `1` = no data found
  - `2` = partial parse errors (results shown but some data skipped)

### Claude's Discretion
- `shiplog costs` vs `summary` data split — determine the right level of detail for each command based on engine output
- MCP tool response shape and verbosity
- MCP date filtering parameter support
- `shiplog:card` Phase 2 behavior (raw data vs skip until Phase 3)
- Config file schema for `~/.shiplog.json`
- Help text wording and formatting

</decisions>

<specifics>
## Specific Ideas

- Help output preview was approved: subcommand list + global options, clean and scannable
- Empty-range message should show "42 sessions exist outside this range" to be helpful, not just "no data"
- Corrupted file warnings should name the exact file path so user knows where to look
- Cross-OS compatibility is a core principle — test on Mac, Windows, Linux

</specifics>

<deferred>
## Deferred Ideas

- Natural language date parsing in CLI (--since "last monday", multilingual) — ANLYT-V2-03 in v2 requirements
- ANSI color themes / customizable color schemes — future enhancement

</deferred>

---

*Phase: 02-mcp-cli*
*Context gathered: 2026-03-25*
