# Phase 8: Landing Page - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

shipcard.dev root serves a polished landing page that sells the product in 30 seconds — replacing the current JSON health check. Vanilla HTML/CSS/JS served by the existing Cloudflare Worker. No framework, no build step.

</domain>

<decisions>
## Implementation Decisions

### Live demo / Configurator
- Interactive card configurator in the hero area using jjaimealeman's real live card
- Inline SVG injection (fetch SVG as text, inject into DOM) — not img src swap
- Instant swap on toggle changes — no transition animations
- All four card params exposed: theme (dark/light), layout (classic/compact/hero), style (flat/shadow/border), hide stats
- Username text input field, defaults to "jjaimealeman", visitors can type any username to discover other cards
- If username has no card: show empty state / "no card found" message
- Tabbed code block below configurator: Markdown tab | HTML tab — embed snippet updates live with current toggle values
- Reset button to snap back to default settings

### Content & copy
- Stats-focused headline: "See what you shipped with Claude Code"
- Subtext: sessions, tokens, cost, one embeddable card
- 3-step quickstart with copy-able terminal-styled code blocks:
  1. `npx shipcard summary`
  2. `shipcard login`
  3. `shipcard sync`
- Brief MCP server mention (callout, not full walkthrough)
- Links to GitHub repo and npm package (no full docs link on page)

### Visual design
- Full Anthropic brand palette:
  - Dark bg: `#141413`
  - Light text: `#faf9f5`
  - Mid gray: `#b0aea5`
  - Light gray: `#e8e6dc`
  - Orange accent: `#d97757`
  - Blue accent: `#6a9bcc`
  - Green accent: `#788c5d`
- Typography: Poppins (headings), Lora (body)
- Fonts self-hosted, bundled in the Worker (not Google Fonts CDN)
- Clean, minimal aesthetic

### Page structure
- Flow: Hero (headline + subtext) → Card configurator → 3-step quickstart → Footer
- Fully responsive — all sections stack on mobile, configurator adapts, card scales
- Footer includes: GitHub link, npm link, MIT license badge, MCP mention, "Made by" attribution

### Claude's Discretion
- Visual flourishes (subtle gradients, fade-in animations, or purely static)
- Nav/header presence and style (sticky bar vs no nav)
- Exact spacing, typography sizing, and responsive breakpoints
- Empty state design for unknown usernames
- Code block styling and copy button implementation

</decisions>

<specifics>
## Specific Ideas

- "Get it going in 30 seconds" — the quickstart must feel instant
- Configurator is the centerpiece — it's what sells the product
- Username discovery ("type any GitHub username") creates a viral moment
- Anthropic brand identity ties it visually to the Claude ecosystem
- Tabbed Markdown/HTML snippet is a conversion tool — visitor configures, copies, pastes into README

</specifics>

<deferred>
## Deferred Ideas

- Font choice for cards (monospace, serif, sans-serif selector) — new card renderer capability, own phase
- User directory / leaderboard (sortable table by name, sessions, cost, etc.) — new capability, own phase
- "Currently serving X ShipCards since March 2026" counter — requires tracking signups, own phase
- New user showcase (recent signups displayed on landing page) — own phase

</deferred>

---

*Phase: 08-landing-page*
*Context gathered: 2026-03-26*
