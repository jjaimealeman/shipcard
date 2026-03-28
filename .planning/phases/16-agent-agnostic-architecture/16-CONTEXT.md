# Phase 16: Agent-Agnostic Architecture - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor the parser engine so any agent's JSONL format can plug in through a clean adapter interface. Zero behavior change for Claude Code users. Includes full directory rename from shiplog → shipcard to eliminate legacy naming before the architecture work begins.

</domain>

<decisions>
## Implementation Decisions

### Directory rename (Plan 1)
- Rename `shipcard/` → `shipcard/` and `shipcard-worker/` → `shipcard-worker/`
- Update all internal import paths, tsconfig, wrangler.jsonc, and package.json references
- Update planning docs that reference `shipcard/` paths
- Verify builds pass after rename — this is a prerequisite for the adapter refactor
- This is the first plan in Phase 16, done before any architecture changes

### Adapter boundary
- Architecture supports multiple adapters, runtime activates one at a time
- PRO multi-adapter activation (multiple agents simultaneously) deferred to post-Phase 18 (Stripe)
- Free users pick one adapter; PRO users can activate multiple — gating comes after subscriptions exist

### Claude's Discretion (Adapter boundary)
- Whether adapters handle file discovery or the engine does
- Whether adapters are parse-only or can contribute agent-specific commands/metrics
- Class-based vs function-object adapter interface — match existing codebase patterns

### Format detection
- Detection strategy (auto-detect, convention-based, or hybrid) at Claude's discretion
- If auto-detection fails on unrecognized JSONL: fall back to interactive prompt, remember the choice
- Detection runs once on first run, result cached in config
- Both config file editing AND CLI command available for re-detection/switching adapters

### Data normalization
- ShipCard defines canonical terms (sessions, messages, etc.) — each adapter maps its agent's terminology to ours ("banana" in their world = "sessions" in ours)
- Field strategy (optional fields vs strict common set + extras) at Claude's discretion
- Display strategy for missing metrics (hide vs N/A) at Claude's discretion
- Agent name visibility on card/dashboard at Claude's discretion

### Migration path
- Fully invisible to existing users — no new config fields, Claude Code adapter is the implicit default
- Version bump to 2.0.0 — timing (after rename, after full refactor, or split) at Claude's discretion
- All existing CLI command names, flags, and output formats remain identical

</decisions>

<specifics>
## Specific Ideas

- "banana = sessions" — Jaime's mental model for adapter translation. The adapter's job is to say "in my world, a session is called X" and map it to ShipCard's canonical terms.
- Open-source pride — Jaime wants the codebase clean enough that contributors deep-diving through all 198 commits see consistent naming throughout. The shiplog → shipcard rename is about long-term credibility.
- The adapter interface should make adding a second agent require zero changes to engine or CLI code — that's the success criteria from the roadmap.

</specifics>

<deferred>
## Deferred Ideas

- PRO multi-adapter activation (use Claude Code + Codex simultaneously) — requires Phase 18 (Stripe) first
- Actual research into other agents' JSONL formats — not needed until a second adapter is being built
- Multi-platform subdomain strategy — deferred until 1,000+ users on Claude Code

</deferred>

---

*Phase: 16-agent-agnostic-architecture*
*Context gathered: 2026-03-28*
