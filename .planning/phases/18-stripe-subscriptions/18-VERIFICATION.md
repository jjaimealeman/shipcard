---
phase: 18-stripe-subscriptions
verified: 2026-03-29T08:33:46Z
status: human_needed
score: 4/5 must-haves verified automatically; criterion 5 partially verified by design
re_verification: false
human_verification:
  - test: "Clicking 'Upgrade to PRO' opens Stripe Checkout and activates PRO within seconds"
    expected: "GET /billing/checkout → GitHub OAuth → Stripe Checkout page; after completing checkout, webhook fires within seconds and dashboard shows PRO badge"
    why_human: "Requires live Stripe test mode, real OAuth callback, and webhook delivery — cannot simulate in code review. Also requires Stripe account setup and real D1 database_id (currently placeholder-replace-before-deploy in wrangler.jsonc)."
  - test: "Canceling via Customer Portal downgrades at end of billing period, not immediately"
    expected: "GET /billing/portal → GitHub OAuth → Stripe Customer Portal → cancel → subscription still active until period end; PRO badge stays until period end; downgrade happens only when customer.subscription.deleted fires"
    why_human: "Requires live Stripe Customer Portal interaction and waiting through billing period simulation (test mode clock advance). Code is architecturally correct — cancel only downgrades on subscription.deleted not subscription.updated — but real-flow timing needs human + Stripe test mode validation."
  - test: "Failed payment webhook shows payment-failed banner on dashboard"
    expected: "Simulate invoice.payment_failed via Stripe CLI stripe trigger invoice.payment_failed → dashboard shows red banner with 'Update Payment' link; after invoice.paid fires, banner disappears"
    why_human: "Requires Stripe CLI webhook forwarding and live D1 database. The payment_failed_at tracking and banner display logic are correctly wired in code, but end-to-end flow needs stripe CLI test."
---

# Phase 18: Stripe Subscriptions Verification Report

**Phase Goal:** Users can subscribe to PRO, manage their subscription, and the Worker enforces PRO gating consistently across all routes.
**Verified:** 2026-03-29T08:33:46Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Clicking "Upgrade to PRO" opens Stripe Checkout and completing it activates PRO within seconds | ? NEEDS HUMAN | Checkout flow fully wired: `/billing/checkout` → GitHub OAuth → Stripe Checkout session with correct price_id and `metadata.username`. Webhook handler processes `checkout.session.completed` and calls `upsertSubscription()`. But requires live Stripe + real D1 to verify end-to-end timing. |
| 2 | `isPro(userId)` returns correct answer immediately after webhook fires — no KV lag | VERIFIED | `isUserPro()` in kv.ts delegates to `isUserProFromD1()` which queries D1 directly. D1 is strong-consistency. All callers (card.ts:191, dashboard.ts:3181) pass `c.env.DB`. KV is no longer in the read path. |
| 3 | Canceling via Customer Portal downgrades at end of billing period, not immediately | ? NEEDS HUMAN | Code is architecturally correct: `customer.subscription.updated` (status=active, cancel_at_period_end=true) upserts status=active; `customer.subscription.deleted` triggers `markSubscriptionCanceled()`. But requires live Stripe flow to confirm timing. |
| 4 | A failed payment webhook marks subscription past-due and dashboard shows payment-failed banner | VERIFIED (code) | `invoice.payment_failed` calls `markPaymentFailed()` → sets `payment_failed_at`; dashboard line 3190 injects `__PAYMENT_FAILED__`; banner at line 1131 shows when `$store.dashboard.paymentFailed`. `past_due` status arrives via subsequent `subscription.updated` event from Stripe. Wiring is correct. Needs human to test live webhook delivery. |
| 5 | Free users see upgrade prompt when attempting PRO-only features (BYOT, custom slugs, AI insights) | PARTIAL | BYOT lock overlay fully implemented (lines 1568-1582 dashboard.ts) with feature list + pricing links. Custom slugs and AI insights don't exist yet (Phase 19/20 scope) — no touchpoints to gate. Upgrade hint text at billing section mentions all three features. |

**Score:** 2/5 fully verified automatically, 2/5 need human testing, 1/5 partially implemented by design

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shipcard-worker/src/stripe.ts` | Stripe client factory + webCrypto for CF Workers | VERIFIED | 22 lines, exports `getStripe()` + `webCrypto`, uses `Stripe.createFetchHttpClient()` and `Stripe.createSubtleCryptoProvider()` |
| `shipcard-worker/src/db/schema.sql` | D1 schema: subscriptions + stripe_events tables | VERIFIED | Both CREATE TABLE statements present with all required columns, indexes on username and stripe_subscription_id |
| `shipcard-worker/src/db/subscriptions.ts` | D1 query helpers for full subscription lifecycle | VERIFIED | 220 lines, exports all 9 required functions: `isUserProFromD1`, `getSubscription`, `getSubscriptionByStripeId`, `upsertSubscription`, `markSubscriptionCanceled`, `markPaymentFailed`, `clearPaymentFailed`, `isEventProcessed`, `markEventProcessed` |
| `shipcard-worker/src/types.ts` | D1Database + Stripe secrets in Env | VERIFIED | `DB: D1Database`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID` all present |
| `shipcard-worker/src/routes/webhook.ts` | POST /webhook/stripe handler with signature verification and idempotency | VERIFIED | 233 lines, handles 5 lifecycle events, constructEventAsync, mark-before-process idempotency, always-200 pattern |
| `shipcard-worker/src/routes/billing.ts` | GET billing routes: checkout, checkout/callback, portal, portal/callback, welcome | VERIFIED | 456 lines, all 5 routes implemented with GitHub OAuth redirect flow, base64url state encoding, nonce anti-replay |
| `shipcard-worker/src/routes/dashboard.ts` | Dashboard with PRO badge, payment banner, upgrade card, billing section | VERIFIED | 3193 lines, all billing UI elements present: pro-badge (line 1106), payment-banner (line 1131), upgrade-card (line 1569), billing section (lines 1799-1832), server-injected placeholders replaced at line 3186-3191 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `billing.ts` | `stripe.checkout.sessions.create()` | `getStripe(c.env)` | WIRED | Line 200: `stripe.checkout.sessions.create({ mode: 'subscription', subscription_data: { metadata: { username } }, ... })` |
| `billing.ts` | `stripe.billingPortal.sessions.create()` | `getStripe(c.env)` | WIRED | Line 297: `stripe.billingPortal.sessions.create({ customer: sub.stripe_customer_id, ... })` |
| `webhook.ts` | `db/subscriptions.ts` helpers | `c.env.DB` | WIRED | All 5 event handlers call D1 helpers directly. Idempotency check + mark before switch statement. |
| `dashboard.ts` | `isUserPro()` | `c.env.DB` | WIRED | Line 3181: `await isUserPro(c.env.DB, username)` |
| `dashboard.ts` | `getSubscription()` | `c.env.DB` | WIRED | Line 3184: `await getSubscription(c.env.DB, username)` |
| `kv.ts:isUserPro()` | `isUserProFromD1()` | `D1Database` param | WIRED | Lines 267-272: thin wrapper, delegates to D1 query — KV no longer in read path |
| `card.ts` | `isUserPro()` | `c.env.DB` | WIRED | Line 191: `await isUserPro(c.env.DB, username)` — PRO gate for BYOT returns 403 SVG for free users |
| `index.ts` | `billingRoutes` | `app.route('/billing', ...)` | WIRED | Line 75 |
| `index.ts` | `webhookRoutes` | `app.route('/webhook', ...)` | WIRED | Line 78 |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| PAY-01: User can subscribe via Stripe Checkout | WIRED (human verify needed) | Full checkout flow implemented; requires live Stripe to confirm |
| PAY-02: Subscription state in D1 with strong consistency | VERIFIED | D1 schema + helpers + upsert pattern fully implemented |
| PAY-03: `isPro()` gate available to all Worker routes | VERIFIED | `isUserPro()` delegates to D1 in kv.ts; used in card.ts and dashboard.ts |
| PAY-04: Webhook handles subscription lifecycle (created, updated, canceled, payment_failed) | VERIFIED (code) | All 5 events handled: checkout.session.completed, subscription.updated, subscription.deleted, invoice.payment_failed, invoice.paid |
| PAY-05: User can manage subscription via Customer Portal | WIRED (human verify needed) | Portal flow implemented; requires live Stripe to confirm |
| PAY-06: Free users see upgrade prompts at PRO feature touchpoints | PARTIAL | BYOT touchpoint gated; custom slugs/AI insights deferred to Phase 19/20 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `wrangler.jsonc` | 37 | `"database_id": "placeholder-replace-before-deploy"` | Warning | Not a code bug — this is the documented setup step before production deploy. No blocker for development. |

No TODO/FIXME/placeholder patterns found in implementation files. No empty handlers or stub returns detected. TypeScript compiles clean (`tsc --noEmit` exits 0).

### Human Verification Required

#### 1. End-to-End Checkout Flow

**Test:** In Stripe test mode with local `wrangler dev`: visit `/billing/checkout?interval=month`, complete GitHub OAuth, proceed through Stripe Checkout with a test card (4242 4242 4242 4242). Then check D1 for the subscription row and dashboard for PRO badge.
**Expected:** Dashboard shows PRO badge within ~5 seconds of completing checkout (webhook delivery time). `isUserPro()` returns true.
**Why human:** Requires Stripe account, real D1 database_id, stripe CLI webhook forwarding (`stripe listen --forward-to localhost:8787/webhook/stripe`), and browser interaction.

**Pre-requisites to verify first:**
- Replace `placeholder-replace-before-deploy` in `wrangler.jsonc` with real D1 database_id
- Apply schema: `npx wrangler d1 execute shipcard-db --local --file=src/db/schema.sql`
- Set `.dev.vars` with Stripe test keys

#### 2. Cancel at Period End (not immediately)

**Test:** With an active test subscription, open Customer Portal via `/billing/portal`, cancel the subscription. Verify dashboard still shows PRO badge and "Active" status until period end. Use `stripe trigger customer.subscription.updated` to simulate (with `cancel_at_period_end=true`) then verify PRO is retained.
**Expected:** PRO badge stays active; subscription status remains `active` in D1; PRO only revoked when `customer.subscription.deleted` event fires.
**Why human:** Requires Stripe Portal interaction and test clock advancement to verify timing. Webhook code is structurally correct but real-flow confirmation needed.

#### 3. Payment Failed Banner

**Test:** `stripe trigger invoice.payment_failed` via CLI with webhook forwarding to local dev. Check dashboard for red payment-failed banner with "Update Payment" link.
**Expected:** Banner appears immediately after webhook. After `stripe trigger invoice.paid`, banner disappears.
**Why human:** Requires stripe CLI + live webhook delivery to local D1.

### Gaps Summary

No structural gaps found. All artifacts exist, are substantive, and are wired correctly. TypeScript compiles clean.

The `human_needed` status reflects that the payment integration is inherently untestable without a real Stripe account and live webhook delivery. The three human verification items are external-service integration tests, not code deficiencies.

One intentional partial implementation: PAY-06 (upgrade prompts at custom slugs and AI insights) is deferred to Phase 19/20 by explicit design decision documented in 18-04-SUMMARY.md. Only BYOT has an upgrade prompt in Phase 18 — the other features don't exist yet.

---

_Verified: 2026-03-29T08:33:46Z_
_Verifier: Claude (gsd-verifier)_
