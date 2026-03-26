---
phase: 04-cloud-worker
plan: 02
subsystem: auth-sync
tags: [cloudflare-workers, hono, kv, auth, bearer-token, github-api, privacy, typescript]

# Dependency graph
requires:
  - phase: 04-cloud-worker
    plan: 01
    provides: "KV helpers (putToken, getTokenUsername, putUserData, invalidateCardVariants, putCardCache), SafeStats type, AppType"

provides:
  - Bearer token auth middleware (authMiddleware) for Hono routes
  - POST /auth/exchange — GitHub token → Worker-issued opaque token
  - POST /sync — SafeStats upload with privacy boundary validation, KV store, cache invalidation, default card re-render
  - DELETE /sync — wipe user data and card variants, preserve auth token
  - isValidSafeStats() type guard enforcing CLOUD-04 privacy policy

affects:
  - 04-03 (configurator page can rely on /auth/exchange and /sync being stable)
  - Phase 5 (CLI sync command calls POST /auth/exchange then POST /sync)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bearer token auth middleware: Authorization header → KV lookup → c.set('username')"
    - "GitHub identity verification before issuing Worker token (no impersonation)"
    - "Synchronous default card re-render on sync to defeat KV eventual consistency"
    - "isValidSafeStats() recursive banned-field scan + file-path string detection"

key-files:
  created:
    - shiplog-worker/src/auth.ts
    - shiplog-worker/src/routes/auth.ts
    - shiplog-worker/src/routes/sync.ts
  modified:
    - shiplog-worker/src/types.ts
    - shiplog-worker/src/index.ts

key-decisions:
  - "AppType Variables: { username: string } — auth middleware sets username on Hono context for downstream handlers"
  - "GitHub API verification: compare login (lowercase) against claimed username — prevents impersonation"
  - "Worker token is crypto.randomUUID() — opaque, not HMAC-signed (TOKEN_SECRET unused for now, available for future signing)"
  - "isValidSafeStats bans field names: path, paths, filePath, projectsDir, cwd, content, rawContent, jsonl, projectsTouched, projectNames"
  - "Synchronous re-render of dark/classic/github variant on every sync — avoids KV eventual consistency staleness on next GET"
  - "DELETE /sync preserves auth token — user can re-sync without re-authenticating"

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 4 Plan 2: Auth and Sync Summary

**Bearer token auth middleware + GitHub identity verification + POST /sync with CLOUD-04 privacy enforcement (banned field names, file-path string detection, synchronous card re-render on sync)**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-26T02:06:14Z
- **Completed:** 2026-03-26T02:08:23Z
- **Tasks:** 2
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Auth middleware (`src/auth.ts`) validates `Authorization: Bearer <token>` by KV lookup, sets `username` on Hono context via `c.set('username', ...)`
- `AppType` updated with `Variables: { username: string }` so all sub-apps have typed access to the authenticated user
- `POST /auth/exchange` verifies GitHub token against `api.github.com/user` (User-Agent: shiplog-worker/1.0 per GitHub requirement), confirms `login` matches claimed username, issues `crypto.randomUUID()` Worker token stored with 1-year TTL — GitHub token never stored
- `isValidSafeStats()` type guard in `types.ts` enforces CLOUD-04: structural validation + recursive banned field name scan + string value file-path detection (rejects `/` or `~` prefixes)
- `POST /sync` authenticates, validates, checks username matches token owner, stores SafeStats in KV, invalidates all card cache variants, synchronously re-renders default variant (dark/classic/github) to defeat Cloudflare KV eventual consistency
- `DELETE /sync` removes user data and card variants; auth token preserved for future re-sync
- Both routes registered in `index.ts` — full read+write cycle complete

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth middleware and token exchange endpoint** — `75ca893` (feat)
2. **Task 2: POST /sync endpoint with SafeStats validation and cache invalidation** — `b519aee` (feat)

## Files Created/Modified

- `shiplog-worker/src/auth.ts` — `authMiddleware: MiddlewareHandler<AppType>`, rejects missing/invalid tokens with 401
- `shiplog-worker/src/routes/auth.ts` — `POST /exchange`: GitHub API verification + opaque token issuance
- `shiplog-worker/src/routes/sync.ts` — `POST /`: validated sync with cache invalidation + re-render; `DELETE /`: data wipe
- `shiplog-worker/src/types.ts` — Added `Variables` to AppType; added `isValidSafeStats()` with banned-field + file-path checks
- `shiplog-worker/src/index.ts` — Registered `/auth` and `/sync` routes

## Decisions Made

- **AppType Variables:** Added `Variables: { username: string }` to AppType so `authMiddleware` can set `c.set('username', ...)` and downstream handlers can call `c.get('username')` with full TypeScript type safety.
- **crypto.randomUUID() for tokens:** Simple, secure, no HMAC signing needed for this use case. `TOKEN_SECRET` binding in `Env` is preserved for future HMAC use if needed.
- **GitHub login lowercase comparison:** GitHub usernames are case-insensitive in practice. Comparing both sides lowercased prevents false mismatches from capitalization differences in user input.
- **Banned field names (not just type shape):** `isValidSafeStats()` explicitly checks for `path`, `paths`, `filePath`, `projectsDir`, `cwd`, `content`, `rawContent`, `jsonl`, `projectsTouched`, `projectNames` — not just the TypeScript type structure. This catches attempts to smuggle extra fields alongside valid fields.
- **File-path string detection:** Any string value starting with `/` or `~` is rejected. Guards against creative workarounds like `{ username: "/home/user/projects" }`.
- **Synchronous re-render on sync:** After invalidating card variants, the default card (dark/classic/github) is re-rendered and written to KV in the same request. This ensures the next `GET /card/:username` gets fresh data even if KV replication hasn't propagated yet.
- **DELETE preserves auth token:** Per research decision #4 — deleting data is not the same as revoking access. Users who delete their stats can immediately re-sync without going through the auth exchange flow again.

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

- Auth and sync are complete — CLI can call `POST /auth/exchange` to get a token, then `POST /sync` to push stats
- All Worker routes are registered: `GET /`, `GET /card/:username`, `POST /auth/exchange`, `POST /sync`, `DELETE /sync`
- Plan 03 (configurator page) can proceed without blocking on auth/sync

---
*Phase: 04-cloud-worker*
*Completed: 2026-03-26*
