# Phase 21: Clack CLI - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade CLI output from plain text to polished Clack prompts for interactive terminals. Automatic plain-text fallback for MCP and pipe contexts. All 6 existing commands (summary, costs, card, login, sync, slug) are in scope. No new commands, no new flags beyond what Clack integration requires.

</domain>

<decisions>
## Implementation Decisions

### Command coverage
- Tiered approach: full Clack for interactive commands (login, sync, slug), light framing (intro/outro) for read-only commands (summary, costs, card)
- Read-only commands keep their current table/JSON output intact and pipe-safe — Clack adds framing only in TTY mode

### Visual style
- Bold & branded feel — ShipCard intro banner, colored headers, box frames around results
- Standard terminal colors for semantics: green=success, red=error, yellow=warning (not custom brand colors)
- Next-step hints after successful commands (e.g., after sync: "View your card at shipcard.dev/u/jaime", after login: "Run shipcard sync to publish")

### Interactive prompts
- `shipcard login`: Full Clack walkthrough with step indicators (opening browser -> waiting for approval -> authenticated), spinner while waiting, celebratory outro
- `shipcard sync --delete` and `shipcard slug delete`: Clack confirm (y/n) prompt with warning message — not type-to-confirm
- All existing flags (--confirm, --json, etc.) continue to work unchanged

### Fallback behavior
- Auto-detect only via `process.stdout.isTTY` — no --no-interactive flag
- TTY = Clack styled output, non-TTY (pipe/MCP/CI) = plain text
- Existing `shouldUseColor()` TTY check in cli/index.ts is the pattern to extend

### Claude's Discretion
- Where "light" framing ends and "full" Clack begins for each specific command
- Which slug subcommands (create, list, delete) get full vs light treatment
- Sync confirmation UX (Clack confirm prompt vs current flow, --confirm skip behavior)
- MCP fallback formatting (plain text vs light markdown)
- Clack render failure handling (silent fallback vs warn-and-fallback)
- Banner display logic (every command vs major commands only)
- Spinner types and animation choices

</decisions>

<specifics>
## Specific Ideas

- "Bold & branded" — think create-next-app or Nuxt CLI, not subtle/minimal
- User explicitly wants next-step hints to guide new users through the onboarding flow (login -> sync -> view card)
- Login flow should feel like a celebration when auth succeeds — first impression for new users

</specifics>

<deferred>
## Deferred Ideas

- Full ShipCard visual/brand redesign — user wants a more impressive, unique brand identity (referenced FlareCMS and Agentlytics as inspiration). Separate phase.

</deferred>

---

*Phase: 21-clack-cli*
*Context gathered: 2026-03-29*
