# Phase 13: Data Pipeline + Cleanup - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Enrich the daily aggregator and sync payload with per-project stat breakdowns, fix the hardcoded userMessages field, remove the stale Slowest Day metric, and relabel "Most Messages" to "Peak Day." This is the data foundation — Phases 14 and 15 consume what Phase 13 produces.

</domain>

<decisions>
## Implementation Decisions

### Project Identification
- Full directory path stored as the unique key; display the directory name only in the UI
- Collision handling: default to directory name, add shortest unique parent suffix only when two projects share the same name
- No special-casing for $HOME or /tmp — every directory is treated equally; top 10 by metric wins naturally
- `--show-projects` remains an explicit opt-in flag (privacy by default)

### Per-Project Payload
- Include EVERYTHING the aggregator already computes per project: tokens (input/output/cache), sessions, messages, costCents, toolCalls, thinkingBlocks, models
- Fix the userMessages TODO (hardcoded to 0) — implement per-day user message counting from UserEntry timestamps while reworking the aggregator
- Philosophy: if they opted in with --show-projects, they get the full picture. Granular control (hide specific metrics) is a paid-tier feature for later.

### Privacy Boundaries
- Directory name is considered safe to share — it's user-chosen context, not raw data
- The opt-in flag (`--show-projects`) is the privacy gate; once opted in, all per-project metrics are fair game
- Full paths are never sent — only the last directory segment (plus parent for disambiguation)
- No hashing or anonymization — that kills usefulness

### Backward Compatibility
- Old-format synced data (no per-project stats) still works: dashboard shows totals normally
- Project Activity panel shows a prompt: "Sync with --show-projects to see project breakdown" when no per-project data exists
- Mixed data (some days with per-project, older days without): show what's available — partial data is still useful
- API versioning: Claude's discretion on whether to bump to v3 or use optional fields on v2

### Cleanup UX
- Slowest Day metric: removed entirely, layout contracts (remaining cards fill space naturally)
- "Most Messages" relabeled to "Peak Day" — aligns with Phase 14's naming
- Peak Day shows message count only in Phase 13 (Phase 14 expands to multi-metric: sessions, tokens, cost — which could each be different days, driving user curiosity)

### Claude's Discretion
- API version strategy (bump v3 vs optional fields on v2)
- Exact aggregator implementation for per-project breakdowns
- UserEntry timestamp parsing approach for userMessages fix
- Dashboard layout adjustments after Slowest Day removal

</decisions>

<specifics>
## Specific Ideas

- "We're showing them the exact same data they already have access to, but in a rich and easy to understand visual format" — the value is presentation, not data novelty
- Peak sessions and peak tokens could easily be different days than peak messages — that'll make people curious enough to dig through their own git logs and projects
- Collision disambiguation: keep it as short as possible — shortest unique path wins

</specifics>

<deferred>
## Deferred Ideas

- **Custom project display names** — Paid-tier feature: let users rename projects (e.g., 'SaaS' → 'ShipCard'). Privacy use case: hide that you're working on a FAANG project. Target: v3 paid tier.
- **Granular metric opt-out** — Let paid users choose which per-project metrics to share (e.g., share messages but hide cost). Target: paid tier.

</deferred>

---

*Phase: 13-data-pipeline-cleanup*
*Context gathered: 2026-03-27*
