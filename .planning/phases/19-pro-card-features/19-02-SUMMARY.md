---
phase: 19-pro-card-features
plan: 02
subsystem: database
tags: [d1, sqlite, cloudflare-workers, typescript, slugs]

# Dependency graph
requires:
  - phase: 18-stripe-subscriptions
    provides: D1 schema and query helper patterns (subscriptions.ts style)
provides:
  - card_slugs table in D1 schema with UNIQUE(username, slug) constraint
  - D1 query helpers for full slug CRUD lifecycle
  - validateSlug() function with length, character, and reserved word rules
  - SLUG_RESERVED set and SLUG_MAX_PER_USER constant for cap enforcement
affects:
  - 19-03 (slug API routes consume these helpers)
  - 19-04 (CLI slug commands use validateSlug and query helpers)
  - 19-05 (dashboard slug management reads from getUserSlugs, countUserSlugs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Function-object style for D1 helpers (db as first param, no classes)"
    - "db.prepare().bind().run() / .first() / .all() D1 query pattern"
    - "JSON.stringify/parse for config blob stored in TEXT column"
    - "validateSlug returns null (valid) or error string (invalid)"

key-files:
  created:
    - shipcard-worker/src/db/slugs.ts
  modified:
    - shipcard-worker/src/db/schema.sql

key-decisions:
  - "config stored as TEXT (JSON string) rather than separate columns — flexible for future SlugConfig fields without schema migrations"
  - "SLUG_REGEX requires minimum 2 chars to match (^[a-z0-9][a-z0-9-]*[a-z0-9]$) so a 3-char minimum is enforced by SLUG_MIN_LENGTH constant, not the regex alone"

patterns-established:
  - "Validation: returns null on success, error string on failure (matches existing codebase error pattern)"
  - "Query helpers: return typed rows or null/.results array, never throw for not-found"

# Metrics
duration: 2min
completed: 2026-03-29
---

# Phase 19 Plan 02: D1 Slug Schema and Query Helpers Summary

**card_slugs D1 table with UNIQUE(username, slug) constraint, 5 typed CRUD helpers, and validateSlug() enforcing length/character/reserved-word rules**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-29T17:02:47Z
- **Completed:** 2026-03-29T17:04:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `card_slugs` table to `schema.sql` with UNIQUE(username, slug) constraint and username index
- Created `slugs.ts` with `CardSlug`, `SlugConfig` types, 18-reserved-word blocklist, and `validateSlug()` function
- Implemented 5 D1 query helpers: `getUserSlugs`, `getSlug`, `countUserSlugs`, `createSlug`, `deleteSlug`
- TypeScript compiles cleanly with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add card_slugs table to D1 schema** - `aa0d82b` (feat)
2. **Task 2: Create slug query helpers and validation** - `99dc570` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `shipcard-worker/src/db/schema.sql` - Added card_slugs table with UNIQUE(username, slug) and idx_card_slugs_username
- `shipcard-worker/src/db/slugs.ts` - Full slug data layer: types, constants, validation, 5 CRUD helpers

## Decisions Made

- `config` stored as TEXT (JSON string) — keeps schema minimal and allows SlugConfig shape to evolve without migrations; Plans 03-05 parse/stringify as needed
- `SLUG_REGEX` is `^[a-z0-9][a-z0-9-]*[a-z0-9]$` which technically requires length >= 2 for a match; SLUG_MIN_LENGTH = 3 is the enforced minimum via explicit length check before regex test

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Schema changes take effect when `npx wrangler d1 execute shipcard-db --file=src/db/schema.sql` is run (already tracked as a pending todo in STATE.md).

## Next Phase Readiness

- Slug data layer complete and ready for Plan 03 (API routes: create/delete/list slug endpoints)
- Plan 04 (CLI) and Plan 05 (dashboard) can also import directly from `shipcard-worker/src/db/slugs.ts`
- No blockers

---
*Phase: 19-pro-card-features*
*Completed: 2026-03-29*
