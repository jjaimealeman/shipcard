# Phase 17: Theme System - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Curated visual themes and custom colors (BYOT) for the embeddable SVG card only. Dashboard theming is out of scope. Users pick from 9 curated themes (8 named + solarized-light variant) or supply custom hex colors (PRO). A dashboard configurator section provides live preview and embed code generation.

</domain>

<decisions>
## Implementation Decisions

### Theme palette design
- 5 color slots per theme: `bg`, `title`, `text`, `icon`, `border`
- Dramatic variety across themes — dark, light, vibrant, muted all welcome
- 9 curated themes: catppuccin, dracula, tokyo-night, nord, gruvbox, solarized-dark, solarized-light, one-dark, monokai
- Activity chart bars inside the card use the `icon` color from the active theme — everything cohesive

### Dashboard configurator UX
- Dedicated section on the dashboard page (not a modal or sidebar)
- Live preview fetches the real SVG from the Worker endpoint with theme params — WYSIWYG, ~20-50ms latency
- Live embed code (markdown/HTML) updates below the preview as theme/params change — copyable
- Theme picker layout: Claude's discretion (dropdown vs swatch grid based on dashboard design)

### BYOT (Bring Your Own Theme) color input
- 5 hex text input fields (bg, title, text, icon, border) — developer-friendly
- Accessible via both dashboard configurator AND URL params (`?bg=1e1e2e&title=cdd6f4&...`)
- WCAG 3:1 contrast check enforced — hard block, card won't render with failing contrast
- Contrast errors shown inline per field with specific message (e.g., "Title has insufficient contrast against background")

### Free vs PRO gating
- Curated themes are FREE for everyone — `?theme=dracula` works for any user
- BYOT custom colors are PRO-only
- Free users see BYOT fields greyed out with lock icon and "Upgrade to PRO" prompt in configurator
- Free users CAN select and use curated themes in the configurator

### Claude's Discretion
- Default theme behavior (current look vs named "shipcard" theme)
- Invalid theme name handling (fallback to default vs error)
- Theme picker presentation style (dropdown vs swatch grid)
- Exact dashboard section layout and placement

</decisions>

<specifics>
## Specific Ideas

- Solarized includes both dark and light variants as separate themes — provides a light option in the lineup
- Chart bars use theme's icon color for full visual cohesion
- The card at shipcard.dev/u/:username is the only thing being themed — not the dashboard pages

</specifics>

<deferred>
## Deferred Ideas

- Dashboard theming/polish — the dashboard has areas with inconsistent colors and could use design attention (separate phase)
- `shipcard` CLI not globally installed — user noticed `zsh: command not found: shipcard` — setup/publishing concern

</deferred>

---

*Phase: 17-theme-system*
*Context gathered: 2026-03-28*
