---
phase: 17-theme-system
plan: "02"
subsystem: api
tags: [cloudflare-workers, kv, hono, svg, themes, byot, pro-gating]

# Dependency graph
requires:
  - phase: 17-01
    provides: "curated theme palettes (CURATED_THEMES, CURATED_THEME_NAMES), resolveCuratedTheme(), validateByotContrast(), isValidHex(), ThemeColors"
  - phase: 16-02
    provides: "renderCard() with colors option, CardOptions interface"
provides:
  - "isUserPro() KV helper reading user:{username}:pro key (Phase 18 Stripe will write it)"
  - "v2 cache key functions: cardKeyV2, getCardCacheV2, putCardCacheV2"
  - "Card route upgraded: curated themes (free), BYOT (PRO-only), legacy backward compat"
  - "renderErrorSvg() helper for descriptive, actionable error SVGs"
  - "PRO gating infrastructure ready for Phase 18 Stripe Subscriptions"
affects: [18-stripe-subscriptions, phase-19-dashboard, card-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BYOT: hex validation → PRO gate → contrast validation → render (no cache)"
    - "V2 cache keys use t= prefix to disambiguate from legacy keys"
    - "Error SVGs use same 495px width as regular cards; height scales with message count"
    - "PRO check before contrast validation (avoids leaking upgrade hints to free users)"

key-files:
  created: []
  modified:
    - shipcard-worker/src/kv.ts
    - shipcard-worker/src/routes/card.ts

key-decisions:
  - "PRO gate checked before contrast validation — prevents free users from knowing what contrast thresholds would pass"
  - "BYOT cards skip KV cache entirely — prevents unbounded cache growth from arbitrary color combinations"
  - "Unknown/absent ?theme defaults to catppuccin (not github-dark) — curated is the new default"
  - "ContrastError.message used directly in error SVG (matches the type from Plan 01)"
  - "escapeXmlLocal() inlined in card.ts — avoids cross-module dep for a simple helper"

patterns-established:
  - "Error SVGs: 495x(dynamic)px, #1e1e2e bg, #ff6b6b title, #cdd6f4 text, #313244 border"
  - "BYOT mode detection: any of 5 color params present triggers BYOT validation chain"
  - "Legacy URL compat: ?theme=dark|light routes to old resolveTheme() + old cache keys"
  - "normalizeHex(): accepts 1e1e2e or #1e1e2e, always returns #1e1e2e"

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 17 Plan 02: Card Route Upgrade Summary

**Card route upgraded to support curated themes (free), BYOT custom colors (PRO-only with contrast validation), and full backward compat for all existing embed URLs — backed by isUserPro() KV helper and v2 cache key scheme**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-29T01:35:15Z
- **Completed:** 2026-03-29T01:37:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `isUserPro()` KV helper reads `user:{username}:pro` key — Phase 18 Stripe webhook writes it, Phase 17 reads it (clean separation)
- V2 cache key scheme (`card:{username}:{layout}:t={theme}`) prevents collision with legacy keys and isolates curated theme entries
- Card route handles 3 modes: curated themes (free, default catppuccin), BYOT (PRO-only with hex validation + contrast check), and legacy `?theme=dark|light` (backward compat)
- BYOT cards skip KV cache entirely, preventing cache explosion from unbounded color combinations
- Descriptive error SVGs with per-field messages for all failure modes (missing params, invalid hex, PRO gate, contrast failures)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PRO gate helper and v2 cache key functions to kv.ts** - `5ce0cef` (feat)
2. **Task 2: Rewrite card route for curated themes, BYOT, and backward compat** - `18dd70c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `shipcard-worker/src/kv.ts` - Added `isUserPro()`, `cardKeyV2()`, `getCardCacheV2()`, `putCardCacheV2()`; updated KV key doc comment
- `shipcard-worker/src/routes/card.ts` - Full rewrite: curated mode, BYOT mode, legacy mode, `renderErrorSvg()`, `normalizeHex()`, `escapeXmlLocal()`

## Decisions Made

- **PRO gate before contrast validation** — a free user submitting BYOT params gets the upgrade prompt immediately, before any color analysis is run; this avoids leaking information about which color combinations would pass
- **BYOT never cached** — any cached entry would be keyed on 5 arbitrary hex values, making cache invalidation and key namespacing unmanageable; rendering fresh is the correct trade-off
- **Default theme = catppuccin** — absent or unrecognized `?theme` now defaults to catppuccin instead of github-dark; new users get the best visual default
- **ContrastError.message used as-is** — the message field already has the human-readable contrast ratio and field name; no reformatting needed (matched the actual type from Plan 01)
- **escapeXmlLocal() inlined** — trivial 5-line function; importing from `svg/xml.ts` across module boundaries for this would be over-engineering

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ContrastError field name mismatch**
- **Found during:** Task 2 (card route rewrite), TypeScript compilation
- **Issue:** Plan spec referenced `e.ratio`, `e.minRatio`, `e.hint` on `ContrastError` — but the actual type (from Plan 01) only has `field` and `message`
- **Fix:** Replaced per-field formatting with `contrastErrors.map((e) => e.message)` — the message already contains ratio and field info
- **Files modified:** `shipcard-worker/src/routes/card.ts`
- **Verification:** `tsc --noEmit` passed with zero errors
- **Committed in:** `18dd70c` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Minor type correction; behavior is identical to plan intent. No scope creep.

## Issues Encountered

None beyond the ContrastError field name mismatch documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Card route fully supports curated themes and BYOT with PRO gating
- `isUserPro()` is wired and ready — Phase 18 only needs to write `user:{username}:pro = "1"` on Stripe webhook
- All existing embed URLs (`?theme=dark`, `?style=branded&theme=light`, etc.) continue to work
- Phase 17 Plan 03 (theme picker UI or documentation) can proceed immediately
- Phase 18 (Stripe Subscriptions) has the PRO gate ready to activate

---
*Phase: 17-theme-system*
*Completed: 2026-03-29*
