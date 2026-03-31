# Phase 19: PRO Card Features - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

PRO subscribers get a visibly superior card experience — a PRO badge on the SVG, instant cache refresh on sync, and custom slugs with saved configurations. Free users are blocked from PRO actions with informational messaging. Automated/scheduled syncing is out of scope.

</domain>

<decisions>
## Implementation Decisions

### PRO badge design
- Top-right corner placement on the SVG card
- Solid pill with filled background, rounded corners, white text
- Fixed gold/amber color regardless of theme — universally signals "premium"
- Same position across all three layouts (classic, compact, hero)

### Custom slugs
- Two interfaces: dashboard slug management page AND CLI subcommands (`shipcard slug create/list/delete`)
- Dashboard supports full CRUD: create, list, delete
- CLI mirrors dashboard: `shipcard slug create`, `slug list`, `slug delete`
- Cap at 5 slugs per PRO user
- URL structure: `/u/:username/:slug` — namespaced, no route collision risk
- Validation: 3+ characters, lowercase alphanumeric + hyphens, URL-safe only
- Short route blocklist (admin, api, settings, etc.) — no profanity filter
- Paying users with credit cards on file are the troll filter
- Each slug saves theme, layout, and BYOT colors as a preset

### Cache refresh mechanics
- PRO sync triggers both KV purge AND CDN cache purge — truly instant
- Purge covers all card URLs: main `/card/:user` + all custom slug URLs `/u/:user/:slug`
- Free users: 1hr TTL on cached SVG render (data in KV is immediate for both tiers)
- Dashboard reads from KV directly — stats update instantly for everyone regardless of tier
- The PRO perk is specifically about the embeddable card image URL reflecting new data instantly

### Upgrade prompts
- Block on PRO actions only — never nag during normal workflows
- Show upgrade block when free user tries: slug creation (dashboard or CLI), BYOT colors
- No upgrade CTA in CLI sync output — just factual TTL line if needed
- Tone: informational, not pushy — "Custom slugs are a PRO feature. Learn more at shipcard.dev/pricing"
- Tailored messaging per surface: CLI gets a one-liner, dashboard gets a richer block

### Claude's Discretion
- Exact badge dimensions and positioning within the top-right area
- CDN purge implementation details (Cache API vs cache tags)
- Slug management page layout and design
- CLI output formatting for slug commands
- Dashboard upgrade block visual design (feature comparison, etc.)

</decisions>

<specifics>
## Specific Ideas

- Badge should feel like a verified checkmark — small, confident, not flashy
- Anti-annoyance philosophy: "block with explanation when they try a PRO action, never nag during normal workflows"
- CLI sync for free users: factual TTL info only, no upgrade link — if they care, they'll find PRO on the website
- Slugs are card presets with clean URLs — instead of `?theme=catppuccin&layout=compact`, share `/u/username/dark-minimal`

</specifics>

<deferred>
## Deferred Ideas

- **Scheduled auto-sync for PRO users** — User-configurable time (e.g. 5pm, midnight). Cross-platform challenge: systemd timers (Linux), launchd (macOS), Task Scheduler (Windows). Server-side cron can't pull fresh JSONL from local machine. Needs its own phase to figure out client-side scheduling story. Could also explore "push on session end" model.

</deferred>

---

*Phase: 19-pro-card-features*
*Context gathered: 2026-03-29*
