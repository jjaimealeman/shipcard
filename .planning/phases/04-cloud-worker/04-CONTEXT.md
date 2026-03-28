# Phase 4: Cloud Worker - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Cloudflare Worker that serves SVG stats cards at the edge and accepts stat syncs from the CLI. Users authenticate via GitHub OAuth, configure their card visually in a browser-based playground, and sync approved stats. The Worker caches rendered SVGs in KV and serves them publicly. Custom themes, saved design slots, and admin analytics are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Identity & auth
- GitHub username is the identity key — no self-chosen slugs, no signup
- GitHub OAuth device flow for authentication (like `gh auth login` — auto-opens browser with code URL, degrades to manual in headless environments)
- Worker issues a bearer token after successful OAuth, used for all subsequent syncs
- Auth token stored locally in `~/.shipcard/config.json`

### Sync payload & privacy
- Full analytics payload (everything the engine produces) minus file paths and raw JSONL content
- User controls visibility per-stat via the configurator before syncing — stats toggled off never leave the machine
- Project names can be redacted (replaced with `private-1`, `private-2`) — user decides per-project in configurator
- `shiplog sync` always opens the browser configurator — every sync is reviewed visually
- Config persists choices in `~/.shipcard/config.json` so the configurator pre-loads previous settings

### Configurator (sync preview)
- Worker-hosted HTML page (e.g., `shiplog.workers.dev/configure`), not localhost
- Self-contained playground: stat toggles, layout/theme/style pickers, live SVG preview
- Plain, utilitarian UI — the card is the star, not the configurator chrome
- Uses existing Phase 3 themes (3 styles x dark/light) and layouts (classic/compact/hero)
- Generates the exact CLI command to run (e.g., `shiplog sync --layout hero --theme dark --hide projects,cost`)
- CLI handles the actual sync with auth token — no secrets in the browser
- Shows ready-to-copy Markdown/HTML embed snippets on the configurator page
- CLI also outputs embed snippets after sync completes
- localStorage remembers current configurator settings between visits

### Card URL & customization
- URL structure: Claude's discretion
- URL query params for appearance overrides: `?theme=dark&layout=hero&style=branded`
- Params control appearance only — never reveal stats the user toggled off
- Data visibility is locked at sync time, appearance is flexible at embed time
- Placeholder card for unknown/unsynced users — renders a valid SVG with "hasn't set up ShipLog yet" message and getting-started link
- Deleted users show a "redacted" card — black on white, placeholder values (`$X.XX`, `--- sessions`), clearly intentional removal

### Caching & invalidation
- Cache until next sync — no time-based TTL (card shows totals, not relative timestamps)
- Cache per appearance variant — each unique combo of username + theme + layout + style gets its own KV entry
- All variants invalidated on sync — zero staleness, no `CACHE_SECONDS` hack
- `shiplog sync --delete` wipes all user data and cached variants from KV

### Claude's Discretion
- Card URL path structure (e.g., `/card/:username` vs `/api/card/:username`)
- KV key naming scheme for cached variants
- OAuth callback URL routing in the Worker
- Configurator page HTML/CSS implementation details
- How stats are encoded when CLI opens the configurator URL (query params, hash fragment, etc.)

</decisions>

<specifics>
## Specific Ideas

- "We should do whatever necessary to NOT be like github-readme-stats" — no multi-day cache staleness, no CACHE_SECONDS env var workaround, no "deploy your own instance" cop-out
- Configurator UX inspired by the playground skill pattern — controls on one side, live preview on the other, copyable output
- Configurator page should be bland/plain — user is managing their card, not being distracted by the tool's UI
- User might want light card on GitHub profile and dark card on Astro blog — both work simultaneously via different URL params, both cached independently
- The redacted/deleted card should look obviously intentional — not broken, not error state, but clearly "this was removed"

</specifics>

<deferred>
## Deferred Ideas

- Custom hex color themes (catppuccin, dark-tokyo, user-defined palettes) — custom theme engine phase
- Multiple saved design slots / named designs — design management phase
- Free tier limits on number of designs — pricing/product strategy
- Admin analytics dashboard (growth, adoption, cards served, popularity) — platform analytics phase
- Configurator "Delete my data" button (CLI `--delete` covers Phase 4, browser button is polish)

</deferred>

---

*Phase: 04-cloud-worker*
*Context gathered: 2026-03-25*
