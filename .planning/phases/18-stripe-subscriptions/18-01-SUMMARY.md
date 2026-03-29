---
phase: 18-stripe-subscriptions
plan: 01
subsystem: payments
tags: [stripe, d1, cloudflare-workers, sqlite, subscriptions]

# Dependency graph
requires:
  - phase: 16-rebrand
    provides: shipcard-worker TypeScript project with Env interface and function-object conventions
  - phase: 17-theme-system
    provides: Env type baseline that this plan extends with D1 + Stripe bindings

provides:
  - Stripe SDK installed and configured for Cloudflare Workers runtime (fetch-based httpClient)
  - D1 database binding (DB) in wrangler.jsonc
  - D1 schema: subscriptions table (full lifecycle) + stripe_events idempotency table
  - Typed D1 query helpers covering create/read/update/cancel/payment-failure/idempotency
  - getStripe() factory + webCrypto provider in src/stripe.ts

affects:
  - 18-02-webhook-handler
  - 18-03-checkout-api
  - 18-04-portal-api
  - 18-05-pro-gate

# Tech tracking
tech-stack:
  added:
    - stripe@21.0.1
  patterns:
    - Stripe.createFetchHttpClient() for Workers-compatible HTTP
    - Stripe.createSubtleCryptoProvider() for webhook signature verification
    - D1 function-object helpers (no classes), db.prepare().bind().run() pattern
    - INSERT OR IGNORE for idempotency records
    - ON CONFLICT(username) DO UPDATE for upsert pattern

key-files:
  created:
    - shipcard-worker/src/stripe.ts
    - shipcard-worker/src/db/schema.sql
    - shipcard-worker/src/db/subscriptions.ts
  modified:
    - shipcard-worker/package.json
    - shipcard-worker/wrangler.jsonc
    - shipcard-worker/src/types.ts

key-decisions:
  - "Stripe.createFetchHttpClient() required for CF Workers (no Node.js http module)"
  - "D1 chosen over KV for subscriptions (strong consistency needed for billing state)"
  - "past_due treated as PRO in isUserProFromD1() (grace period for payment failures)"
  - "INSERT OR IGNORE for stripe_events (safety net; webhook handler checks before calling)"
  - "ON CONFLICT(username) DO UPDATE for upsertSubscription (simpler than separate insert/update)"

patterns-established:
  - "D1 query helpers: all functions take db: D1Database as first param"
  - "Subscription lookup by both username (UI routes) and stripe_subscription_id (webhook routes)"

# Metrics
duration: 1min
completed: 2026-03-29
---

# Phase 18 Plan 01: Stripe Foundation Summary

**Stripe SDK wired to Cloudflare Workers runtime via fetch httpClient, D1 schema with subscriptions + stripe_events tables, and 9 typed query helpers covering the full subscription lifecycle**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-29T07:49:55Z
- **Completed:** 2026-03-29T07:51:33Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Stripe SDK installed (v21.0.1) and configured for CF Workers runtime via Stripe.createFetchHttpClient()
- D1 binding added to wrangler.jsonc with placeholder database_id + Stripe secrets documented in comments
- D1 schema created: subscriptions table with full lifecycle columns + stripe_events idempotency table + indexes
- 9 typed query helpers exported: isUserProFromD1, getSubscription, getSubscriptionByStripeId, upsertSubscription, markSubscriptionCanceled, markPaymentFailed, clearPaymentFailed, isEventProcessed, markEventProcessed

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Stripe SDK + configure D1 binding** - `9addcef` (feat)
2. **Task 2: Create D1 schema + subscription query helpers** - `e6e13be` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `shipcard-worker/src/stripe.ts` - getStripe() factory + webCrypto provider for CF Workers
- `shipcard-worker/src/db/schema.sql` - D1 schema: subscriptions + stripe_events tables
- `shipcard-worker/src/db/subscriptions.ts` - 9 typed D1 query helpers for subscription lifecycle
- `shipcard-worker/package.json` - Added stripe@21.0.1 dependency
- `shipcard-worker/pnpm-lock.yaml` - Lock file updated
- `shipcard-worker/wrangler.jsonc` - Added d1_databases binding + Stripe secrets comments
- `shipcard-worker/src/types.ts` - Added DB, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRO_MONTHLY_PRICE_ID, STRIPE_PRO_ANNUAL_PRICE_ID to Env

## Decisions Made

- **Stripe.createFetchHttpClient()** required — CF Workers runtime has no Node.js `http` module; fetch-based client is mandatory for the Stripe SDK to work
- **past_due treated as PRO** in isUserProFromD1() — provides a grace period for payment failures, prevents immediate access loss on first failed charge
- **INSERT OR IGNORE** for stripe_events — webhook handler checks isEventProcessed() before processing, this is a safety net for any race conditions
- **ON CONFLICT(username) DO UPDATE** for upsertSubscription — handles both first-time subscribers and plan/status updates from webhooks in a single query
- **D1 over KV** — subscriptions require strong consistency (billing state, payment failure tracking); KV's eventual consistency is unsuitable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before this code can be deployed or tested locally, the following external services require configuration:

**Stripe:**
- Create account at https://dashboard.stripe.com
- Create PRO product with two prices: $2/month and $20/year
- Configure Customer Portal (allow cancel, plan switching) at Stripe Dashboard -> Settings -> Customer portal
- Set secrets: `npx wrangler secret put STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`
- Add to `.dev.vars` for local dev: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`

**Cloudflare D1:**
- Run: `npx wrangler d1 create shipcard-db`
- Copy the `database_id` from output into `wrangler.jsonc` (replace `placeholder-replace-before-deploy`)
- Apply schema: `npx wrangler d1 execute shipcard-db --file=src/db/schema.sql`
- For local dev: `npx wrangler d1 execute shipcard-db --local --file=src/db/schema.sql`

## Next Phase Readiness

- Plan 02 (webhook handler) can proceed — stripe.ts and db/subscriptions.ts provide all needed imports
- Plan 03 (checkout API) can proceed — getStripe(), upsertSubscription(), Env bindings all ready
- Plan 04 (portal API) can proceed — getStripe(), getSubscription(), Env bindings ready
- Plan 05 (PRO gate) can proceed — isUserProFromD1() ready for middleware use

**Blocker for production deploy:** Replace `placeholder-replace-before-deploy` in wrangler.jsonc with real D1 database_id after running `wrangler d1 create shipcard-db`.

---
*Phase: 18-stripe-subscriptions*
*Completed: 2026-03-29*
