# Phase 5: Publish + Launch - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Package ShipCard for npm distribution, deploy the Worker to shipcard.dev, create a README that sells the product in 30 seconds, and ensure the full publish chain works end-to-end. This phase also includes the full rename from "shiplog" to "shipcard" across the codebase.

</domain>

<decisions>
## Implementation Decisions

### Package rename
- npm package name: `shipcard` (shiplog is taken)
- Domain: `shipcard.dev` (purchased, registered on Cloudflare)
- GitHub repo: `github.com/jjaimealeman/shipcard`
- Full rename across entire codebase — directories, imports, types, variable names, bin entries all become shipcard
- Bin entries: `shipcard` (CLI) and `shipcard-mcp` (MCP server)

### Build & module format
- ESM only — targeting Node 22+, no CJS dual build
- tsup for library publishing

### Worker domain
- Custom domain `shipcard.dev` from day one
- Card URLs: `shipcard.dev/u/username` (Reddit-style short path, not `/card/username`)

### README structure
- 30-second hero: live card embed with real data + tagline — the product demos itself
- Quick start: 3-4 commands, enough to understand what this is immediately
- No bloat — avoid the "AI wrote this README" look
- Full CLI/MCP reference in separate `USAGE.md`
- Full card gallery (all layout x theme combos) in separate `STYLES.md`
- Link to live configurator at `shipcard.dev`

### Card embed experience
- Embed snippets available from both CLI (`shipcard card --embed`) and web configurator
- No click-through link on the card for now
- `shipcard.dev` watermark/footer printed on the card itself — built-in marketing ("How'd you get that card?")

### Launch validation
- Full dry run: pack tarball, inspect contents, test npx, deploy Worker, test the whole chain end-to-end
- Step-by-step npm publish guide (first time publishing)
- Step-by-step GitHub OAuth App creation guide

### Claude's Discretion
- tsup configuration details
- .npmignore vs files field strategy
- Exact README wording and formatting
- STYLES.md layout and presentation
- Order of operations for the full dry run

</decisions>

<specifics>
## Specific Ideas

- "First impressions matter" — README must not look AI-generated or bloated
- Card gallery should show ALL style combinations but on a separate page to keep README clean
- The live configurator at shipcard.dev should be linked/embedded where possible
- Product is proudly vibe-coded with Claude Code — the commits show it, and that's fine
- Watermark on card answers "How'd you get that?" without needing a click-through link
- User wants to confirm domain purchase works after deploy tonight before fully committing

</specifics>

<deferred>
## Deferred Ideas

- Profile page at `shipcard.dev/u/username` — HTML wrapper around the card with links and full stats (new capability, future phase)
- Click-through link on card embed — revisit after profile pages exist

</deferred>

---

*Phase: 05-publish-launch*
*Context gathered: 2026-03-25*
