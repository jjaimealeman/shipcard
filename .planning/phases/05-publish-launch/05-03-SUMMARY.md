---
phase: 05-publish-launch
plan: 03
subsystem: docs
tags: [readme, documentation, markdown, svg-cards, mcp, cli]

# Dependency graph
requires:
  - phase: 05-01
    provides: npm package rename to shipcard, /u route, shipcard.dev domain

provides:
  - README.md product landing page with live card embed, quick start, MCP config snippet, CLI table
  - USAGE.md full CLI command reference and MCP tool reference
  - STYLES.md visual gallery of all layout/theme/style combinations

affects: [05-04, npm-publish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - README as product demo — hero section embeds a live card to show what the tool does
    - Separate USAGE.md keeps README under 120 lines; detailed reference lives elsewhere
    - STYLES.md as img gallery — embeds render once Worker is live

key-files:
  created:
    - README.md
    - USAGE.md
    - STYLES.md
  modified: []

key-decisions:
  - "README stays under 120 lines — no badge soup, no features list, just demo + quick start"
  - "Live card embed in README hero section using <img> tag with width=495 for consistent rendering"
  - "STYLES.md uses <img> tags not markdown ![](url) — consistent width rendering across GitHub"
  - "USAGE.md captures --local flag for card command (not --embed) — matches actual implementation"

patterns-established:
  - "Product README pattern: hero embed → quick start → embed syntax → MCP config → CLI table → links"
  - "Docs split: README (landing page) + USAGE.md (full reference) + STYLES.md (visual gallery)"

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 5 Plan 03: Documentation — README, USAGE, STYLES Summary

**README.md as product landing page: live card embed, 4-command quick start, MCP config JSON block, CLI table — all under 90 lines with links to USAGE.md (272-line full reference) and STYLES.md (151-line style gallery)**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-26T03:40:37Z
- **Completed:** 2026-03-26T03:42:23Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- README.md: 87 lines, hero card embed at `shipcard.dev/u/jjaimealeman`, install + summary + card + login + sync quick start, embed markdown/HTML syntax with query params, MCP config block, CLI command table, links to USAGE.md and STYLES.md
- USAGE.md: complete CLI flag reference for all 5 commands (summary, costs, card, login, sync), all 3 MCP tools with parameters and example prompts, both config files documented, date filter reference
- STYLES.md: img embed gallery for 3 layouts (classic, compact, hero), 2 themes (dark, light), 3 styles (github, branded, minimal), hide params, combination examples

## Task Commits

Each task was committed atomically:

1. **Task 1: Write README.md** - `d0e3d51` (feat)
2. **Task 2: Write USAGE.md and STYLES.md** - `c35417f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `README.md` - Product landing page: live card embed, quick start, MCP config, CLI table (87 lines)
- `USAGE.md` - Full CLI and MCP reference with all flags, params, config docs (272 lines)
- `STYLES.md` - Card style gallery: layouts, themes, styles, combinations (151 lines)

## Decisions Made

- README stays under 120 lines — hero embed sells the product, quick start gets them running, no features section needed
- `<img>` tags used in STYLES.md instead of markdown `![]()` — width="495" ensures consistent rendering across GitHub dark/light modes
- `--local` flag documented for card command (not `--embed`) — matched actual implementation in card.ts
- Sync `--confirm` and `--delete` flags documented from actual SyncFlags interface

## Deviations from Plan

None — plan executed exactly as written. Source files were read to get accurate flag names and descriptions.

## Issues Encountered

None. All source files read to confirm exact flag names before writing docs.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- README, USAGE.md, STYLES.md complete — satisfies PUB-04 requirements
- README has card embed example, MCP config snippet, and CLI usage as specified
- All URLs use shipcard.dev domain, no shiplog references anywhere
- Ready for 05-04 (npm publish, Worker deploy, end-to-end testing)

---
*Phase: 05-publish-launch*
*Completed: 2026-03-26*
