# SQLite Bridge Architecture — v3.0 Vision

**Status:** Idea (captured 2026-03-30)
**Priority:** High — structural foundation for long-term resilience
**Depends on:** v2.0 shipped (done)

## The Problem

ShipCard parses raw JSONL files on every CLI/MCP invocation. This has two critical issues:

1. **Performance** — scanning 2,400+ files is slow and gets worse over time
2. **Fragility** — Anthropic can change the JSONL schema at any time (they did in Jan 2026, breaking all pre-Jan data)

## The Solution: ETL Bridge

```
JSONL files (Anthropic controls, format can break)
        ↓
   Bridge/ETL (the ONLY component that breaks on format changes)
        ↓
   SQLite DB (~/.shipcard/stats.db)
        ↓
   MCP tools, CLI, sync — all read from SQLite
```

### How It Works

1. **Bridge** reads JSONL files, normalizes data into a stable schema, writes to SQLite
2. **Hook-driven** — Claude Code's `PostSessionStop` hook triggers the bridge after each session
3. **Incremental** — tracks which files have been processed (file hash or mtime), only parses new/changed ones
4. **MCP/CLI** reads exclusively from SQLite — fast, consistent, never touches JSONL directly

### On Anthropic Format Changes

| Step | What happens | Impact |
|------|-------------|--------|
| 1 | Anthropic ships new JSONL format | Bridge breaks on NEW files only |
| 2 | jja-ccupdates skill detects the change | Hours to days |
| 3 | We update the bridge parser, ship patch | Users run `npm update` |
| 4 | Bridge resumes, processes new files | Gap filled |
| 5 | Old data in SQLite | Untouched, safe forever |

**Key insight:** MCP tools, CLI commands, sync, dashboard, cards — NOTHING changes. Only the bridge parser needs updating.

### Data Retention

Users should configure Claude Code to keep JSONL files:
```json
// ~/.claude/settings.json
{ "cleanupPeriodDays": 99999 }
```

ShipCard setup wizard could offer to set this automatically.

## Milestone Placement

- **v3.0** — SQLite bridge for all users
  - Local ETL pipeline
  - Hook-driven incremental parsing
  - Versioned parsers (v1 for Jan 2026 schema, v2 for future schemas)
  - Migration from direct-JSONL to SQLite-first
  - Zero breaking changes to CLI/MCP interface

- **v4.0** — Power Users & Enterprise
  - Dockerized PostgreSQL option (like Jaime's personal setup)
  - Months/years of persistent data
  - Team dashboards with shared data
  - $5/mo team tier

## Competitive Advantage

No competing tool has this:
- **ccusage** — direct JSONL parsing, no persistence
- **WakaTime** — cloud-only, no local data ownership
- **github-readme-stats** — no local component at all

ShipCard with SQLite bridge = the only tool that:
- Survives Anthropic format changes gracefully
- Gets faster over time (incremental, not full-scan)
- Preserves data forever locally
- Can scale to enterprise PostgreSQL

## Proof of Concept

Jaime's personal `~/.claude/` PostgreSQL setup (claude-data MCP server) has been running this pattern for months with 13 tables, session summaries, observations, and conversation history. The model works — ShipCard v3.0 productizes it for everyone.

## Open Questions

- [ ] SQLite schema design (sessions, messages, daily_stats, tool_calls?)
- [ ] Hook mechanism — PostSessionStop or file watcher?
- [ ] Migration path — first run backfills from existing JSONL
- [ ] Should bridge run as background process or on-demand?
- [ ] How to handle partial/corrupt JSONL files during incremental parse
