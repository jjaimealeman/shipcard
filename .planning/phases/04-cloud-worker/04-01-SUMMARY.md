---
phase: 04-cloud-worker
plan: 01
subsystem: infra
tags: [cloudflare-workers, hono, kv, svg, typescript, wrangler]

# Dependency graph
requires:
  - phase: 03-svg-card
    provides: SVG renderer modules (renderer.ts, layouts, themes, xml, format) copied verbatim into worker

provides:
  - Hono Worker project at shiplog-worker/ with wrangler.jsonc KV bindings
  - SafeStats privacy-boundary type (no paths, no project names, no timestamps)
  - GET /card/:username serving SVG with anti-camo Cache-Control headers
  - KV cache layer with per-variant key scheme (card:{username}:{theme}:{layout}:{style})
  - Placeholder card renderer for unknown users (no 404s)
  - Redacted card renderer for deleted users

affects:
  - 04-02 (sync, auth, configurator routes depend on kv.ts helpers and SafeStats type)

# Tech tracking
tech-stack:
  added:
    - hono ^4.x (Worker routing)
    - wrangler ^4.x (dev/deploy/types CLI)
    - "@cloudflare/workers-types" (KVNamespace and runtime types)
  patterns:
    - Bundler module resolution in tsconfig (not Node16 — Workers use a bundler, not Node)
    - svgResponse() helper centralizes anti-camo headers on all SVG responses
    - KV key naming scheme: card:{username}:{theme}:{layout}:{style} / user:{username}:data / token:{token}:username
    - SVG renderer copied (not imported) from CLI package — Worker has no npm dependency on shiplog

key-files:
  created:
    - shiplog-worker/package.json
    - shiplog-worker/wrangler.jsonc
    - shiplog-worker/tsconfig.json
    - shiplog-worker/.gitignore
    - shiplog-worker/src/types.ts
    - shiplog-worker/src/index.ts
    - shiplog-worker/src/kv.ts
    - shiplog-worker/src/routes/card.ts
    - shiplog-worker/src/svg/index.ts
    - shiplog-worker/src/svg/renderer.ts
    - shiplog-worker/src/svg/xml.ts
    - shiplog-worker/src/svg/format.ts
    - shiplog-worker/src/svg/themes/types.ts
    - shiplog-worker/src/svg/themes/github.ts
    - shiplog-worker/src/svg/themes/branded.ts
    - shiplog-worker/src/svg/themes/minimal.ts
    - shiplog-worker/src/svg/themes/index.ts
    - shiplog-worker/src/svg/layouts/classic.ts
    - shiplog-worker/src/svg/layouts/compact.ts
    - shiplog-worker/src/svg/layouts/hero.ts
  modified: []

key-decisions:
  - "Bundler module resolution in tsconfig.json — Workers runtime uses a bundler, not Node16 resolution"
  - "SVG renderer copied verbatim from shiplog/src/card/ into shiplog-worker/src/svg/ — no cross-package import"
  - "renderCard() in svg/index.ts accepts SafeStats (not AnalyticsResult) — privacy boundary enforced at the module boundary"
  - "No expirationTtl on card cache KV puts — cache is valid until next sync invalidates it (sync-driven design)"
  - "svgResponse() helper extracts anti-camo headers — ensures all SVG paths (cached, rendered, placeholder) get Cache-Control: no-cache"
  - "@cloudflare/workers-types installed as devDependency — wrangler types not yet run (needs actual KV namespace IDs)"

patterns-established:
  - "Pattern: svgResponse(c, svg) helper — all SVG responses go through it to guarantee correct headers"
  - "Pattern: KV key naming — card:{username}:{theme}:{layout}:{style} for per-variant cache, user:{username}:data for SafeStats, token:{token}:username for auth"
  - "Pattern: Placeholder card on unknown user — renderPlaceholderCard(username) returns valid SVG, never a 404"

# Metrics
duration: 6min
completed: 2026-03-26
---

# Phase 4 Plan 1: Worker Scaffold Summary

**Hono Worker at shiplog-worker/ with KV-cached GET /card/:username, SafeStats privacy type, and anti-camo Cache-Control headers preventing GitHub camo staleness**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-26T01:57:45Z
- **Completed:** 2026-03-26T02:03:09Z
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments

- Cloudflare Worker project scaffolded with Hono routing, wrangler.jsonc with CARDS_KV and USER_DATA_KV bindings
- SVG renderer (renderer, layouts, themes, xml, format) copied verbatim from Phase 3 shiplog/src/card/ into shiplog-worker/src/svg/ — zero cross-package imports
- SafeStats type defined as the privacy boundary: no file paths, no project names (just count), no raw timestamps
- GET /card/:username endpoint: KV cache hit → serve, cache miss → render from SafeStats or return placeholder SVG
- Cache-Control: no-cache, no-store, must-revalidate on every SVG response (anti-GitHub-camo-cache)
- Typed KV helpers in kv.ts covering card cache, user data, and auth token operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Worker project and copy SVG renderer** - `69b0b7a` (feat)
2. **Task 2: KV cache layer and GET /card/:username endpoint** - `1a3feb1` (feat)

**Plan metadata:** `(next commit)` (docs: complete worker scaffold plan)

## Files Created/Modified

- `shiplog-worker/package.json` — name: shiplog-worker, hono + wrangler deps
- `shiplog-worker/wrangler.jsonc` — Worker config with CARDS_KV and USER_DATA_KV bindings
- `shiplog-worker/tsconfig.json` — ESNext + Bundler module resolution
- `shiplog-worker/.gitignore` — node_modules, .dev.vars, .wrangler/, worker-configuration.d.ts
- `shiplog-worker/src/types.ts` — Env interface, SafeStats, CardQueryParams, AppType
- `shiplog-worker/src/index.ts` — Hono app, health check, route registration
- `shiplog-worker/src/kv.ts` — Typed KV helpers (card cache, user data, tokens)
- `shiplog-worker/src/routes/card.ts` — GET /card/:username with svgResponse() helper
- `shiplog-worker/src/svg/index.ts` — renderCard(SafeStats), renderPlaceholderCard(), renderRedactedCard()
- `shiplog-worker/src/svg/renderer.ts` — renderSvg() dispatcher (copied from Phase 3)
- `shiplog-worker/src/svg/xml.ts` — escapeXml() (copied)
- `shiplog-worker/src/svg/format.ts` — abbreviateNumber, formatCost, truncate (copied)
- `shiplog-worker/src/svg/themes/*.ts` — types, github, branded, minimal, index (all copied)
- `shiplog-worker/src/svg/layouts/*.ts` — classic, compact, hero (all copied)

## Decisions Made

- **Bundler module resolution:** tsconfig uses `"moduleResolution": "Bundler"` — Workers use a bundler, not Node16 resolution. This is the correct choice per Cloudflare docs.
- **SVG renderer copy pattern:** The entire card rendering module is copied (not imported via npm) into the Worker. Workers have no runtime access to the shiplog npm package.
- **SafeStats in svg/index.ts:** The worker's card entry point accepts SafeStats instead of AnalyticsResult. This enforces the privacy boundary at the module level — the renderer never sees AnalyticsResult shapes.
- **No TTL on card cache:** KV puts for card variants have no expirationTtl. Cache is valid indefinitely until the next sync invalidates it. This is the correct sync-driven design per CONTEXT.md.
- **svgResponse() helper:** All three SVG response paths (cached, rendered, placeholder) go through a single helper function. Ensures Cache-Control headers can never be accidentally omitted.
- **@cloudflare/workers-types as devDependency:** Installed directly rather than running wrangler types (which requires actual KV namespace IDs that the user will create).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @cloudflare/workers-types**

- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** `tsconfig.json` referenced `@cloudflare/workers-types` in the `types` array, but the package was not in package.json. `npx tsc --noEmit` failed with "Cannot find type definition file for '@cloudflare/workers-types'"
- **Fix:** Ran `npm install --save-dev @cloudflare/workers-types` to add the package
- **Files modified:** shiplog-worker/package.json
- **Verification:** `npx tsc --noEmit` exits 0 with no errors
- **Committed in:** 69b0b7a (Task 1 commit — package.json updated by npm install)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for TypeScript to compile. No scope creep.

## Issues Encountered

- `.dev.vars` is correctly gitignored by the worker's own `.gitignore` — git refused to stage it. This is correct behavior, not an error. The file template is created on disk for developer reference but not committed.

## User Setup Required

Before deploying the Worker, these steps are required:

1. Create KV namespaces:
   ```bash
   cd shiplog-worker
   npx wrangler kv namespace create CARDS_KV
   npx wrangler kv namespace create USER_DATA_KV
   ```
2. Replace `<REPLACE_WITH_CARDS_KV_NAMESPACE_ID>` and `<REPLACE_WITH_USER_DATA_KV_NAMESPACE_ID>` in `wrangler.jsonc` with the returned IDs
3. Set secrets:
   ```bash
   npx wrangler secret put GITHUB_CLIENT_SECRET
   npx wrangler secret put TOKEN_SECRET
   ```
4. Populate `.dev.vars` for local development

## Next Phase Readiness

- GET /card/:username is complete and correct — ready for README embedding once deployed
- kv.ts helpers (getTokenUsername, putToken, deleteToken, getUserData, putUserData, invalidateCardVariants) are ready for Plan 02 sync and auth routes to use
- SafeStats type is defined — Plan 02 sync endpoint can validate incoming payloads against it
- No blockers for Plan 02

---
*Phase: 04-cloud-worker*
*Completed: 2026-03-26*
