# Phase 3: SVG Card - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Local SVG card generation displaying developer stats with multiple layout/style options, dark/light themes, and GitHub README compatibility. The card is generated via `shiplog card --local` and saved as a committable SVG file. Cloud serving of cards is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Layouts (user-configurable via --layout flag)
- Three layouts ship in v1: **classic** (single column, github-readme-stats style), **compact** (two-column grid), **hero** (one big stat + details below)
- Classic is the default layout
- Hero layout: hero stat is user-configurable via `--hero-stat` flag (sessions, cost, tools, etc.)
- Layouts and styles are independent flags — mix and match (9 combinations)

### Visual styles (user-configurable via --style flag)
- Three styles ship in v1: **github** (muted, blends into READMEs), **branded** (distinctive accent colors, dev tool identity), **minimal** (typographic, stripped down)
- Each style has dark + light variants
- Dark/light auto-detects system preference, overridable with `--theme dark` or `--theme light`
- Border treatment: Claude's discretion per style (what fits each aesthetic best)

### Stats shown
- All five stats displayed by default: sessions, tool calls, models, projects, estimated cost
- `--hide` flag lets users remove specific stats (e.g. `--hide cost`)
- Date range displayed on card when `--since`/`--until` filters are used

### Stats display format
- Inline SVG icons next to each stat label
- Abbreviated numbers (1.8k, 2.3k) not comma-separated
- Cost displayed with tilde prefix: ~$12.50
- Model names shown directly (Opus, Sonnet, Haiku) — short enough to display inline

### Branding
- Subtle "ShipLog" text in card footer — always present, not removable

### Output & file handling
- Default output location: git repo root (auto-detected)
- Filename: `shiplog-card.svg` — single card, single README
- Overwrites existing file silently with confirmation message ("Updated shiplog-card.svg")
- `--preview` flag opens SVG in default browser after generation
- `-o`/`--output` flag for custom path override
- After generation, prints a copy-paste markdown snippet: `![ShipLog-YYYY-MM-DD](./shiplog-card.svg)` — alt text encodes generation date for source-level visibility

### Claude's Discretion
- Border treatment per style (rounded, shadow, flat — whatever fits)
- Icon selection for each stat
- Exact spacing, typography, and proportions per layout
- Auto-detection method for dark/light system preference
- SVG element structure for GitHub camo proxy compatibility

</decisions>

<specifics>
## Specific Ideas

- Alt text in markdown snippet encodes generation date: `![ShipLog-2026-03-25](./shiplog-card.svg)` — viewers see the image, but markdown source reveals when stats were captured
- Target audience is "dev enough" to use git history as backup — no need for versioned filenames or overwrite protection
- Card should feel at home on a GitHub profile README

</specifics>

<deferred>
## Deferred Ideas

- Custom user-created layouts (paid tier v2/v3 feature)
- Premium theme packs: Nord, Dracula, Catppuccin, etc. (paid tier v2/v3)
- User-editable theme JSON files (e.g. `theme-catppuccin-mocha.json`) as alternative to premium themes
- Multiple cards per README with different layouts/styles (possible but not prioritized)

</deferred>

---

*Phase: 03-svg-card*
*Context gathered: 2026-03-25*
