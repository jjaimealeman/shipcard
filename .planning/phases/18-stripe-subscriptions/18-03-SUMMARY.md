---
phase: 18-stripe-subscriptions
plan: 03
subsystem: payments
tags: [stripe, github-oauth, billing, d1, hono, cloudflare-workers]

# Dependency graph
requires:
  - phase: 18-01
    provides: Stripe SDK, D1 schema, subscriptions query helpers (isUserProFromD1, getSubscription)

provides:
  - GET /billing/checkout — start checkout via GitHub OAuth redirect
  - GET /billing/checkout/callback — OAuth callback creates Stripe Checkout session
  - GET /billing/portal — start portal via GitHub OAuth redirect
  - GET /billing/portal/callback — OAuth callback creates Stripe Customer Portal session
  - GET /billing/welcome — post-checkout confirmation HTML page
  - isUserPro() migrated from KV to D1 (strong consistency)

affects:
  - 18-04
  - 18-05
  - dashboard (billing buttons link to /billing/checkout and /billing/portal)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - GET + GitHub OAuth redirect flow for browser auth (no Bearer tokens, no cookies)
    - BillingState encoded as base64url JSON in OAuth state param
    - Checkout/portal sessions use same exchangeGitHubCode/getGitHubUsername helpers
    - isUserPro() thin wrapper delegates to isUserProFromD1() from db/subscriptions.ts

key-files:
  created:
    - shipcard-worker/src/routes/billing.ts
  modified:
    - shipcard-worker/src/index.ts
    - shipcard-worker/src/kv.ts
    - shipcard-worker/src/routes/card.ts
    - shipcard-worker/src/routes/dashboard.ts

key-decisions:
  - "Billing routes use GET + GitHub OAuth redirect (not POST + Bearer token) because dashboard is public with no auth mechanism"
  - "BillingState encoded as base64url JSON in OAuth state param to carry checkout/portal intent through redirect"
  - "Nonce in BillingState prevents replay attacks from cached OAuth URLs"
  - "isUserPro() kept as a thin wrapper in kv.ts so all callers remain unchanged (only param type changed)"
  - "D1 replaces KV for PRO status checks — strong consistency required for billing state"

patterns-established:
  - "GitHub OAuth redirect flow pattern: encode intent in state param, decode in callback, verify user, proceed to action"
  - "Billing helpers (exchangeGitHubCode, getGitHubUsername) private to billing.ts, same pattern as existing auth.ts"

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 18 Plan 03: Billing Routes Summary

**GET/OAuth-based billing flow with Stripe Checkout + Customer Portal, and D1-backed isUserPro() replacing KV reads**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-29T07:56:23Z
- **Completed:** 2026-03-29T07:59:00Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Created billing routes using GET + GitHub OAuth redirect flow — no Bearer tokens needed from browser
- Both monthly and annual checkout paths supported via `interval` query param
- Welcome page confirms PRO activation with dashboard link (resolves username from Stripe session)
- Migrated isUserPro() from KV (eventual consistency) to D1 (strong consistency) across all callers

## Task Commits

1. **Task 1: Create billing routes with GitHub OAuth redirect flow** - `a207aac` (feat)
2. **Task 2: Migrate isPro from KV to D1** - `d9004d6` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `shipcard-worker/src/routes/billing.ts` - 5 GET routes: checkout, checkout/callback, portal, portal/callback, welcome
- `shipcard-worker/src/index.ts` - Import and mount billingRoutes at /billing, added route docs to header
- `shipcard-worker/src/kv.ts` - isUserPro() signature changed to D1Database, delegates to isUserProFromD1()
- `shipcard-worker/src/routes/card.ts` - Updated isUserPro call to pass c.env.DB
- `shipcard-worker/src/routes/dashboard.ts` - Updated isUserPro call to pass c.env.DB

## Decisions Made

- GET + GitHub OAuth redirect flow chosen because the dashboard is a public page with no auth mechanism. Redirecting through GitHub is the cleanest way to verify identity without requiring users to log in.
- BillingState carries `action`, `interval`, and `nonce` through the OAuth state param. The nonce prevents replay attacks (cached OAuth URLs are useless after the nonce is consumed).
- isUserPro() kept as a thin wrapper in kv.ts to avoid changing call sites in card.ts and dashboard.ts beyond the binding swap.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required for this plan. Stripe and GitHub OAuth credentials were configured in Phase 18-01.

## Next Phase Readiness

- Billing routes complete and compiled clean
- Checkout flow: /billing/checkout?interval=month|year → GitHub OAuth → Stripe Checkout → /billing/welcome
- Portal flow: /billing/portal → GitHub OAuth → Stripe Customer Portal → dashboard
- isUserPro() reads from D1 — ready for webhook handler (18-02) to write subscription state
- Dashboard can now link to /billing/checkout and /billing/portal for upgrade/manage buttons (18-04/18-05)

---
*Phase: 18-stripe-subscriptions*
*Completed: 2026-03-29*
