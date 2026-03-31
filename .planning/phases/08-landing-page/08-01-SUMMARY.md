---
phase: 08-landing-page
plan: 01
subsystem: worker
tags: [landing-page, html, css, fonts, configurator, hono]
depends_on:
  requires: [04-01, 04-03, 03-01]
  provides: [landing-page-route, card-configurator-ui, quickstart-section]
  affects: []
tech-stack:
  added: [Poppins-woff2, Lora-woff2]
  patterns: [self-hosted-base64-fonts, single-file-html-route, xhr-card-fetch]
key-files:
  created:
    - shipcard-worker/src/routes/landing.ts
  modified:
    - shipcard-worker/src/index.ts
decisions:
  - Self-hosted fonts via base64 @font-face (Poppins 600/700 + Lora 400, ~43 KB total)
  - XHR for card fetch instead of fetch() for broader compatibility
  - DOM API for snippet generation (no innerHTML on user content, same pattern as configure.ts)
  - Hide checkboxes (checked = hidden) rather than show toggles for consistency with URL params
metrics:
  duration: 5 min
  completed: 2026-03-26
---

# Phase 8 Plan 01: Landing Page Summary

Self-contained HTML landing page at GET / with Anthropic brand palette, live card configurator fetching /u/:username, tabbed embed snippets, 3-step quickstart, and responsive layout with self-hosted base64 fonts.

## Completed Tasks

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Download and base64-encode self-hosted fonts | d89e7e9 | (embedded in landing.ts) |
| 2 | Create landing page route with full HTML/CSS/JS | d89e7e9 | shipcard-worker/src/routes/landing.ts |
| 3 | Wire landing route into Worker entry point | ea84a18 | shipcard-worker/src/index.ts |

## What Was Built

### Landing Page (shipcard-worker/src/routes/landing.ts)

- **Hero section:** "See what you shipped with Claude Code" headline with Poppins 700, sub-text in Lora 400
- **Card configurator:** Username text input (debounced 400ms), theme/layout/style button groups, hide-stat checkboxes, live SVG preview via XHR to /u/:username, reset button
- **Embed snippets:** Tabbed Markdown/HTML code blocks with copy buttons, updating live with configurator state
- **Quickstart:** 3-step terminal blocks (npx shipcard summary, shipcard login, shipcard sync) with copy buttons
- **Footer:** GitHub, npm, Configurator links, MIT license, maker attribution
- **Fonts:** Poppins 600+700 and Lora 400 Latin subset woff2, base64-embedded in @font-face (~43 KB)
- **Palette:** Anthropic brand colors as CSS custom properties (--bg, --fg, --orange, --blue, --green, etc.)
- **Responsive:** Mobile-first with grid collapse at 768px

### Entry Point Update (shipcard-worker/src/index.ts)

- Replaced JSON health check `{ name: "shipcard", status: "ok" }` with `app.route("/", landingRoutes)`
- Added import for landingRoutes
- Updated JSDoc route documentation

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Base64-embedded fonts (not CDN) | Zero external requests, no CORS/privacy concerns, fonts load instantly |
| XHR instead of fetch() | Simpler error handling, no promise chain complexity in var-only JS |
| Tasks 1+2 in single commit | Font base64 strings are embedded directly in landing.ts, no separate files |
| DOM API for snippet content | Same security pattern as configure.ts — no innerHTML on user-derived strings |

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- [x] `npx tsc --noEmit` passes with no errors
- [x] landing.ts exports `landingRoutes` Hono instance
- [x] index.ts imports and routes `/` to `landingRoutes`
- [x] HTML contains: hero, configurator, quickstart, footer sections
- [x] Embedded JS uses `var`/`function` with single-quoted strings (no template literals)
- [x] CSS includes 3 @font-face rules with base64 data
- [x] CSS custom properties define the Anthropic brand palette
- [x] All configurator controls wired: theme, layout, style, hide, username, reset
- [x] Tabbed Markdown/HTML snippets update live
- [x] Copy buttons use navigator.clipboard.writeText with execCommand fallback
