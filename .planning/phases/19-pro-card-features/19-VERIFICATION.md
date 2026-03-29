---
phase: 19-pro-card-features
verified: 2026-03-29T17:20:33Z
status: gaps_found
score: 4/5 success criteria verified
gaps:
  - truth: "Running shipcard sync as a PRO user causes slug URLs to reflect new data within seconds"
    status: partial
    reason: >
      The CLI defaults to POST /sync/v2 (syncV2.ts). That route invalidates all standard card
      variants but does NOT pre-render PRO slug KV caches. Only the v1 sync route (sync.ts)
      has the PRO slug pre-render loop. Free users also get near-instant standard card
      invalidation — the 1-hour TTL differentiation described in CONTEXT.md was not implemented.
    artifacts:
      - path: "shipcard-worker/src/routes/syncV2.ts"
        issue: >
          No isUserPro() check, no getUserSlugs() call, no per-slug renderCard() + KV.put loop.
          PRO slug variant pre-render is absent from the v2 endpoint that the CLI uses by default.
    missing:
      - "isUserPro() check after invalidateCardVariants() in syncV2.ts"
      - "getUserSlugs() call and per-slug renderCard() + KV.put loop in syncV2.ts (mirror sync.ts lines 104-137)"
---

# Phase 19: PRO Card Features Verification Report

**Phase Goal:** PRO subscribers get a visibly superior card experience — instant cache refresh, a PRO badge, and custom slugs with saved configurations.
**Verified:** 2026-03-29T17:20:33Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PRO cards display a PRO badge that free cards do not | VERIFIED | `proBadgeSvg()` in all 3 layouts, `isPro` from `isUserPro()` D1 call in card route |
| 2 | `shipcard sync` as PRO causes card to reflect new data within seconds | PARTIAL | Standard card URL: instant for all tiers. Slug URLs: broken via default v2 sync path |
| 3 | PRO user can create a custom slug at `/u/:username/:slug` with saved config | VERIFIED | D1 table, CRUD routes, card route reads config and renders saved theme/layout/colors |
| 4 | Free users are blocked from creating custom slugs and see upgrade prompt | VERIFIED | 403 + upgrade_url on API, `slug-upgrade-block` in dashboard, upgrade message in CLI |
| 5 | Slugs with reserved words or fewer than 3 chars fail with clear error | VERIFIED | `validateSlug()` in slugs.ts, enforced in API route and mirrored in CLI + dashboard |

**Score:** 4.5/5 (SC-2 is partial)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shipcard-worker/src/svg/layouts/classic.ts` | PRO badge in classic layout | VERIFIED | `proBadgeSvg()` at line 27, injected at line 132 when `isPro` |
| `shipcard-worker/src/svg/layouts/compact.ts` | PRO badge in compact layout | VERIFIED | `proBadgeSvg()` at line 29, injected at line 129 when `isPro` |
| `shipcard-worker/src/svg/layouts/hero.ts` | PRO badge in hero layout | VERIFIED | `proBadgeSvg()` at line 31, injected at line 171 when `isPro` |
| `shipcard-worker/src/svg/renderer.ts` | `isPro` in `RenderOptions`, dispatch to all layouts | VERIFIED | `isPro?: boolean` at line 63, passed to all 3 layout dispatchers |
| `shipcard-worker/src/routes/card.ts` | `isUserPro()` call, `isPro` passed to `renderCard` | VERIFIED | D1 check at line 335, `isPro` passed in legacy, curated, and BYOT paths |
| `shipcard-worker/src/db/slugs.ts` | D1 slug CRUD helpers + `validateSlug()` | VERIFIED | 5 query helpers + `validateSlug()` with min/max/regex/reserved enforcement |
| `shipcard-worker/src/db/schema.sql` | `card_slugs` table with UNIQUE(username, slug) | VERIFIED | Table at line 44, UNIQUE constraint at line 52 |
| `shipcard-worker/src/routes/slugs.ts` | POST/GET/DELETE slug CRUD with PRO gate | VERIFIED | 3 routes, PRO gate checks `isUserPro()`, 403 with upgrade_url on failure |
| `shipcard-worker/src/routes/card.ts` | `/:username/:slug` route serving saved config | VERIFIED | Route at line 141, reads D1 slug row, resolves BYOT/curated colors |
| `shipcard-worker/src/routes/sync.ts` | PRO slug pre-render after v1 sync | VERIFIED | Lines 104-137: `isUserPro()`, `getUserSlugs()`, per-slug `renderCard()` + KV.put |
| `shipcard-worker/src/routes/syncV2.ts` | PRO slug pre-render after v2 sync | MISSING | No PRO check, no slug loop — the default CLI sync path lacks this |
| `shipcard/src/cli/commands/slug.ts` | CLI `slug create/list/delete` subcommands | VERIFIED | All 3 subcommands implemented, client-side validation, PRO gate on 403 |
| `shipcard-worker/src/routes/dashboard.ts` | Slug section + upgrade block for free users | VERIFIED | 370+ lines of slug section, `slug-upgrade-block` for `!isPro` users |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `card.ts` route | `isUserPro()` | D1 query | WIRED | Called at line 269 (BYOT) and 335 (curated/legacy) |
| `card.ts` route | `renderCard()` | `isPro` param | WIRED | Passed in all 3 code paths |
| `renderSvg()` | layout functions | `isPro` param | WIRED | Passed to `renderClassic`, `renderCompact`, `renderHero` |
| layout functions | `proBadgeSvg()` | `isPro` conditional | WIRED | `if (isPro) lines.push(proBadgeSvg(...))` in all 3 layouts |
| `slugs.ts` routes | `validateSlug()` | Direct call | WIRED | Called at line 87 in POST route, error returned as 400 |
| CLI `slug.ts` | Worker `/u/:username/slugs` | `fetch()` | WIRED | POST/GET/DELETE calls at lines 149, 211, 291 |
| `sync.ts` v1 | slug KV pre-render | `getUserSlugs()` + `renderCard()` | WIRED | Lines 104-137 |
| `syncV2.ts` | slug KV pre-render | (missing) | NOT WIRED | No PRO slug pre-render in v2 — CLI default path |
| dashboard | `isPro` state | Alpine.js store injection | WIRED | `__IS_PRO__` replaced at template render time |
| dashboard free users | upgrade block | `x-if="!$store.dashboard.isPro"` | WIRED | Conditional renders `.slug-upgrade-block` |

---

## Requirements Coverage

Requirements from ROADMAP (CARD-01 through CARD-06) — referenced from phase goal scope:

| Requirement | Status | Notes |
|-------------|--------|-------|
| CARD-01: PRO badge on SVG | SATISFIED | All 3 layouts, all render paths |
| CARD-02: Instant cache refresh on PRO sync | PARTIAL | Instant for standard card URL; slug URLs broken on v2 sync (default) |
| CARD-03: Custom slug creation at `/u/:username/:slug` | SATISFIED | Full CRUD, card serving, config persistence |
| CARD-04: Saved config (theme, layout) per slug | SATISFIED | `SlugConfig` serialized to D1, deserialized in card route |
| CARD-05: Free users blocked from slug creation | SATISFIED | API 403, dashboard upgrade block, CLI upgrade message |
| CARD-06: Slug validation (reserved words, min 3 chars) | SATISFIED | `validateSlug()` enforced server-side and mirrored client-side |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `syncV2.ts` | Missing PRO slug pre-render | BLOCKER | PRO users syncing via default `shipcard sync --confirm` do not get slug URL cache refresh |

No TODO/FIXME/placeholder patterns found in any phase files. No empty return stubs detected.

---

## Gaps Summary

One structural gap blocks full SC-2 achievement:

The `shipcard sync --confirm` CLI command attempts `/sync/v2` first and only falls back to `/sync` (v1) if the worker returns 404. In production the worker has `/sync/v2`, so the v2 path is always taken. `syncV2.ts` invalidates all standard card variants (lines 100-103) and re-renders the default variant (lines 108-120), but it does not perform the PRO slug pre-render that `sync.ts` does at lines 104-137.

Consequence: after `shipcard sync --confirm`, a PRO user's custom slug URLs (e.g. `/u/alice/dark-minimal`) continue serving the stale KV-cached card from before the sync. The cache will eventually be replaced the next time any request hits the slug route and misses the cache (since the slug cache has no TTL — it only expires via explicit purge). In practice the slug URL may serve stale data indefinitely until manually triggered.

The fix is to copy the PRO slug pre-render block from `sync.ts` (lines 104-137) into `syncV2.ts` after the `invalidateCardVariants` call, importing `isUserPro`, `getUserData`, `getUserSlugs`, `resolveCuratedTheme`, and the `LayoutName` type into `syncV2.ts`.

Additionally, the free-user TTL differentiation described in CONTEXT.md ("free users: 1hr TTL on cached SVG render") was not implemented. Both tiers get KV cache invalidated on sync with no TTL. This is more generous than specified but does not break any success criterion — PRO users do get instant refresh of their standard card URL when syncing.

---

## Human Verification Required

None — all success criteria can be verified structurally from the codebase.

---

_Verified: 2026-03-29T17:20:33Z_
_Verifier: Claude (gsd-verifier)_
