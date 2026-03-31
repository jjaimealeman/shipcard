# Phase 18: Stripe Subscriptions - Research

**Researched:** 2026-03-29
**Domain:** Stripe Billing, Cloudflare D1, Subscription Lifecycle
**Confidence:** HIGH

## Summary

Phase 18 integrates Stripe Checkout + Billing into the existing Cloudflare Worker (Hono) to support PRO subscriptions at $2/month and $20/year. The Stripe Node SDK (v21 at time of research) natively supports Cloudflare Workers as of October 2025 via `Stripe.createFetchHttpClient()` — no workarounds needed. D1 must be added as a new binding for strong-consistency subscription state storage (replacing the existing KV-only `user:{username}:pro` pattern with a relational `subscriptions` table). The webhook handler is the core of Phase 18: it receives all lifecycle events from Stripe and is the single source of truth for PRO status.

The critical Cloudflare Workers-specific requirement is using `constructEventAsync()` (not `constructEvent()`) for webhook signature verification — the synchronous version fails silently in edge environments because it can't use Node's crypto.

**Primary recommendation:** Use `stripe` npm package directly (standard import), initialize with `Stripe.createFetchHttpClient()`, store subscription state in D1, use `checkout.session.completed` + `customer.subscription.*` events for the full lifecycle, and apply idempotency by storing processed Stripe event IDs in D1.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | v21.0.1 (current) | Stripe API client | Official SDK; native CF Workers support since Oct 2025; typed |
| Cloudflare D1 | Built-in (wrangler 4+) | Subscription state persistence | Strong consistency for billing — KV is not strongly consistent |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `wrangler` | Already at ^4.0.0 | D1 creation, schema migration, secrets | `wrangler d1 create`, `wrangler d1 execute` |
| Stripe CLI | Latest | Local webhook forwarding, test events | Dev only — `stripe listen --forward-to localhost/webhook` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| D1 for subscription state | KV only | KV lacks strong consistency; concurrent webhook updates could race; D1 INSERT/UPDATE is atomic |
| Stripe Checkout (hosted) | Stripe Elements (embedded) | Elements is more complex; Checkout is simpler and battle-tested for SaaS |
| Customer Portal (hosted) | Custom cancel/update UI | Custom UI is massive scope; Stripe Portal handles everything for free |

**Installation:**
```bash
npm install stripe
# In shipcard-worker/
```

## Architecture Patterns

### Recommended Project Structure
```
shipcard-worker/src/
├── routes/
│   ├── billing.ts          # NEW: POST /billing/checkout, POST /billing/portal, GET /billing/welcome
│   ├── webhook.ts          # NEW: POST /webhook/stripe
│   └── dashboard.ts        # MODIFY: inject isPro from D1 instead of KV
├── db/
│   ├── schema.sql          # NEW: subscriptions + stripe_events tables
│   └── subscriptions.ts    # NEW: D1 query helpers for subscription state
├── kv.ts                   # MODIFY: isUserPro() reads D1 (or dual-read during migration)
└── types.ts                # MODIFY: add D1Database to Env, add Subscription type
```

### Pattern 1: Stripe Client Initialization in Cloudflare Workers
**What:** Initialize Stripe once per request with FetchHttpClient — CF Workers has no Node `https` module.
**When to use:** Every route that calls Stripe API.
**Example:**
```typescript
// Source: https://blog.cloudflare.com/announcing-stripe-support-in-workers/
import Stripe from 'stripe';

export const webCrypto = Stripe.createSubtleCryptoProvider();

export function getStripe(env: Env): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
```

### Pattern 2: Webhook Verification (Async — Required for CF Workers)
**What:** `constructEventAsync` uses Web Crypto instead of Node crypto.
**When to use:** Every webhook route handler. `constructEvent` (sync) fails in edge environments.
**Example:**
```typescript
// Source: https://hono.dev/examples/stripe-webhook + https://gebna.gg/blog/stripe-webhook-cloudflare-workers
app.post('/webhook/stripe', async (c) => {
  const body = await c.req.text();
  const sig = c.req.header('stripe-signature');
  if (!sig) return c.text('', 400);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      c.env.STRIPE_WEBHOOK_SECRET,
      undefined,
      webCrypto  // REQUIRED for Cloudflare Workers
    );
  } catch (err) {
    return c.text(`Webhook Error: ${err}`, 400);
  }

  // Return 200 immediately, then process
  // (CF Workers must respond before async business logic times out)
  return c.json({ received: true });
});
```

### Pattern 3: Checkout Session Creation (Subscription Mode)
**What:** Create a Stripe Checkout session that links to the user's internal username via `subscription_data.metadata`.
**When to use:** When authenticated user clicks "Upgrade to PRO".
**Example:**
```typescript
// Source: https://docs.stripe.com/billing/subscriptions/checkout + Context7 /stripe/stripe-node
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  // Pass username so webhook can identify the user
  subscription_data: {
    metadata: { username: c.var.username }
  },
  success_url: `${origin}/billing/welcome?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/u/${c.var.username}/dashboard`,
});
return c.redirect(session.url!);
```

### Pattern 4: Customer Portal Session
**What:** Create a portal session and redirect user to manage their subscription.
**When to use:** When authenticated PRO user clicks "Manage subscription".
**Example:**
```typescript
// Source: https://docs.stripe.com/api/customer_portal/sessions/create
const sub = await getSubscriptionByUsername(c.env.DB, c.var.username);
if (!sub?.stripe_customer_id) return c.json({ error: 'No subscription found' }, 404);

const portalSession = await stripe.billingPortal.sessions.create({
  customer: sub.stripe_customer_id,
  return_url: `${origin}/u/${c.var.username}/dashboard`,
});
return c.redirect(portalSession.url);
```

### Pattern 5: D1 Subscription Schema
**What:** Relational schema for subscription state — strong consistency, no eventual-consistency races.
**Example:**
```sql
-- Source: Cloudflare D1 docs + Stripe subscription object fields
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,         -- our internal user key
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  status TEXT NOT NULL,                  -- active | past_due | canceled | ...
  plan TEXT NOT NULL DEFAULT 'pro',      -- future-proofing for teams tier
  current_period_end INTEGER,            -- unix timestamp from Stripe
  payment_failed_at INTEGER,             -- unix timestamp; NULL = no failure
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_username ON subscriptions(username);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);

-- Idempotency table — prevents duplicate webhook processing
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,             -- evt_... from Stripe
  processed_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### Pattern 6: Webhook Lifecycle Handler
**What:** The subscription lifecycle in a single switch statement — the authoritative source of truth for PRO status.
**Events to handle:**
```typescript
// Sources: https://docs.stripe.com/billing/subscriptions/webhooks

switch (event.type) {
  case 'checkout.session.completed': {
    // User completed checkout → subscription may not exist yet (Basil API)
    // Retrieve the session to get subscription_id
    const session = event.data.object as Stripe.Checkout.Session;
    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
    const username = sub.metadata.username;
    await upsertSubscription(db, username, sub);
    break;
  }

  case 'customer.subscription.updated': {
    // Covers: renewal, plan change, cancel_at_period_end set, payment retry
    const sub = event.data.object as Stripe.Subscription;
    const username = sub.metadata.username;
    await upsertSubscription(db, username, sub);
    break;
  }

  case 'customer.subscription.deleted': {
    // Terminal: subscription actually canceled
    const sub = event.data.object as Stripe.Subscription;
    const username = sub.metadata.username;
    await markSubscriptionCanceled(db, username, sub);
    break;
  }

  case 'invoice.payment_failed': {
    // Payment failed — record timestamp for 7-day grace period banner
    const invoice = event.data.object as Stripe.Invoice;
    const subId = invoice.subscription as string;
    await markPaymentFailed(db, subId);
    break;
  }

  case 'invoice.paid': {
    // Payment succeeded — clear any payment_failed_at timestamp
    const invoice = event.data.object as Stripe.Invoice;
    const subId = invoice.subscription as string;
    await clearPaymentFailed(db, subId);
    break;
  }
}
```

### Pattern 7: isPro() from D1
**What:** Updated `isPro` check reads D1 for authoritative status, with statuses that grant vs. revoke access.
**Example:**
```typescript
// PRO-granting statuses: active, past_due (grace period — we track payment_failed_at separately)
// PRO-revoking: canceled, incomplete, incomplete_expired, unpaid
export async function isUserProFromD1(db: D1Database, username: string): Promise<boolean> {
  const result = await db.prepare(
    "SELECT status FROM subscriptions WHERE username = ? AND status IN ('active', 'past_due')"
  ).bind(username).first<{ status: string }>();
  return result !== null;
}
```

### Anti-Patterns to Avoid
- **Using `constructEvent()` synchronously in Workers:** Fails silently due to missing Node crypto; always use `constructEventAsync()` with `webCrypto` provider.
- **Reading subscription state from KV for billing decisions:** KV is eventually consistent; parallel webhook calls can create race conditions. Use D1.
- **Trusting `checkout.session.completed` for subscription ID directly:** As of Stripe API `2025-03-31.basil`, subscriptions are created after checkout completes — retrieve the subscription from the session data rather than assuming it's already created.
- **Not returning 200 quickly from webhook:** CF Workers will time out if the webhook handler does too much work synchronously. Return `{ received: true }` and process.
- **Storing Stripe secret key in wrangler.jsonc:** Always use `wrangler secret put STRIPE_SECRET_KEY`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cancel flow UI | Custom cancel page | Stripe Customer Portal | Portal handles cancel, plan switch, payment method update, invoices — all free |
| Retry failed payments | Custom retry scheduler | Stripe Smart Retries (enabled by default) | Stripe has ML-optimized retry timing |
| Tax calculation | Custom tax rules | Stripe Tax (if needed) | Complex jurisdiction rules; not in scope for Phase 18 |
| Idempotency key generation | Custom UUID scheme | Stripe event ID (`evt_...`) as primary key | Stripe guarantees event IDs are globally unique |

**Key insight:** Stripe Checkout + Customer Portal covers ~80% of the billing UX. Only build what Stripe doesn't provide: the checkout initiation endpoint, the webhook handler, and the PRO gate.

## Common Pitfalls

### Pitfall 1: Wrong Webhook Verification Method
**What goes wrong:** `stripe.webhooks.constructEvent()` throws or returns wrong result in Cloudflare Workers.
**Why it happens:** `constructEvent` uses Node.js `crypto` synchronously; Workers has `SubtleCrypto` (async only).
**How to avoid:** Always use `stripe.webhooks.constructEventAsync(body, sig, secret, undefined, webCrypto)`.
**Warning signs:** Webhook returns 400 on valid Stripe requests; events never process.

### Pitfall 2: No Idempotency = Double PRO Grants
**What goes wrong:** User gets PRO access toggled on/off multiple times, or same event processes twice.
**Why it happens:** Stripe retries webhooks for up to 3 days on non-2xx responses. Network blips cause duplicates.
**How to avoid:** Before processing any event, INSERT into `stripe_events(event_id)` — if it fails (UNIQUE constraint), skip processing and return 200.
**Warning signs:** `subscriptions.updated_at` changes without user action; billing logs show repeated updates.

### Pitfall 3: Missing `subscription_data.metadata`
**What goes wrong:** Webhook receives subscription event but can't identify which user it belongs to.
**Why it happens:** `checkout.session.metadata` and `subscription.metadata` are separate; session metadata does NOT propagate to the subscription automatically.
**How to avoid:** Always pass `subscription_data.metadata: { username }` (not `metadata`) when creating checkout sessions. Verify in webhook: `sub.metadata.username`.
**Warning signs:** Webhook handler has no way to find the user; falls through to unhandled event.

### Pitfall 4: Stripe Node SDK v18 Breaking Change — Basil API
**What goes wrong:** Subscription not immediately available after `checkout.session.completed`.
**Why it happens:** As of SDK v18 / API version `2025-03-31.basil`, subscription creation is postponed until after checkout completes. The `subscription` field on the checkout session may not be populated immediately.
**How to avoid:** In `checkout.session.completed` handler, retrieve the subscription explicitly: `stripe.subscriptions.retrieve(session.subscription)`. Don't assume it exists at the moment the event fires.
**Warning signs:** `session.subscription` is null or missing on `checkout.session.completed` events.

### Pitfall 5: KV vs D1 Inconsistency
**What goes wrong:** Dashboard shows PRO but card endpoint shows free (or vice versa) because one reads KV and one reads D1.
**Why it happens:** Current code uses `isUserPro()` from `kv.ts` (reads `user:{username}:pro`). If Phase 18 writes to D1 but doesn't update KV, routes that still read KV will be wrong.
**How to avoid:** Update `isUserPro()` in `kv.ts` to read from D1 instead of KV. All existing callers (`card.ts`, `dashboard.ts`) will automatically use D1.
**Warning signs:** PRO status differs between card endpoint and dashboard; BYOT fails despite active subscription.

### Pitfall 6: Stripe Products/Prices Must Be Pre-Created in Dashboard
**What goes wrong:** Checkout session creation fails with "No such price" error.
**Why it happens:** Price IDs must be created in the Stripe Dashboard (or via API) before they're referenced in checkout sessions.
**How to avoid:** Create the PRO product with monthly and annual prices in Stripe Dashboard first. Store price IDs as `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_ANNUAL` secrets in wrangler.
**Warning signs:** `stripe.checkout.sessions.create()` returns 400 with price not found error.

### Pitfall 7: Webhook Endpoint Not Registered in Stripe Dashboard
**What goes wrong:** Webhooks never arrive; events build up in Stripe but nothing is processed.
**Why it happens:** Stripe only sends webhooks to registered endpoints. The endpoint URL and events list must be configured in Stripe Dashboard → Webhooks.
**How to avoid:** After deploy, add `https://shipcard.dev/webhook/stripe` to Stripe Dashboard webhooks. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
**Warning signs:** Webhook never fires during testing; Stripe Dashboard shows no delivery attempts.

## Code Examples

Verified patterns from official sources:

### Stripe Client (Cloudflare Workers)
```typescript
// Source: https://blog.cloudflare.com/announcing-stripe-support-in-workers/
import Stripe from 'stripe';

export const webCrypto = Stripe.createSubtleCryptoProvider();

export function getStripe(env: Env): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
```

### Checkout Session (Subscription)
```typescript
// Source: Context7 /stripe/stripe-node + https://docs.stripe.com/billing/subscriptions/checkout
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: env.STRIPE_PRICE_MONTHLY, quantity: 1 }],
  subscription_data: {
    metadata: { username: authenticatedUsername }
  },
  success_url: `${origin}/billing/welcome?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/u/${authenticatedUsername}/dashboard`,
});
```

### Customer Portal Session
```typescript
// Source: https://docs.stripe.com/api/customer_portal/sessions/create
const portalSession = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${origin}/u/${username}/dashboard`,
});
return c.redirect(portalSession.url);
```

### Webhook Idempotency with D1
```typescript
// Source: https://docs.stripe.com/webhooks/best-practices
async function isEventProcessed(db: D1Database, eventId: string): Promise<boolean> {
  const result = await db.prepare(
    'INSERT OR IGNORE INTO stripe_events (event_id) VALUES (?)'
  ).bind(eventId).run();
  // If changes = 0, the row already existed (duplicate event)
  return result.meta.changes === 0;
}
```

### D1 Binding in wrangler.jsonc
```jsonc
// Source: https://developers.cloudflare.com/d1/get-started/
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "shipcard-subscriptions",
      "database_id": "<generated-by-wrangler>"
    }
  ]
}
```

### D1 in Env Type
```typescript
// Source: https://developers.cloudflare.com/d1/get-started/
export interface Env {
  // ... existing KV bindings ...
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_MONTHLY: string;  // price_xxx for $2/month
  STRIPE_PRICE_ANNUAL: string;   // price_xxx for $20/year
}
```

### D1 Database Creation
```bash
# Source: https://developers.cloudflare.com/d1/get-started/
npx wrangler d1 create shipcard-subscriptions
npx wrangler d1 execute shipcard-subscriptions --local --file=./src/db/schema.sql
npx wrangler d1 execute shipcard-subscriptions --file=./src/db/schema.sql  # production
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `stripe/lib/stripe.js` import | `import Stripe from 'stripe'` (standard) | Oct 2025 (native CF Workers support) | Standard import path now works |
| `constructEvent()` | `constructEventAsync()` + `webCrypto` | Required for CF Workers always | Sync method never worked in Workers; async is correct |
| Subscription created immediately in Checkout | Postponed creation (Basil API) | `2025-03-31.basil` (v18+ SDK) | Must retrieve subscription after event, not assume it's in the session |
| KV for PRO state | D1 for PRO state | Phase 18 (this phase) | D1 provides strong consistency for billing-critical data |

**Deprecated/outdated:**
- `stripe/lib/stripe.js` path: No longer needed for CF Workers — use standard `stripe` import
- Synchronous `constructEvent()`: Don't use in Workers; always `constructEventAsync()`

## Open Questions

1. **`checkout.session.completed` vs `customer.subscription.created` for initial provisioning**
   - What we know: Both events fire on new subscription. Basil API may delay subscription creation.
   - What's unclear: Exact timing of `subscription` field population in `checkout.session.completed` with current SDK v21 / API version used.
   - Recommendation: Handle both events; use `customer.subscription.updated` as the canonical handler (also fires on creation). Use `checkout.session.completed` only to redirect to welcome page; rely on subscription events for D1 writes.

2. **Customer Portal configuration (Stripe Dashboard setup)**
   - What we know: Must be configured in Stripe Dashboard before use.
   - What's unclear: Whether features (cancel, plan switch) need explicit enabling or are on by default.
   - Recommendation: Plan a manual setup step in Phase 18 plan tasks: "Configure Customer Portal in Stripe Dashboard."

3. **Stripe account hasn't been created yet**
   - What we know: STATE.md lists "Set up Stripe account before Phase 18 begins" as a pending action.
   - What's unclear: Whether test-mode price IDs will be available when planning begins.
   - Recommendation: The plan should include a pre-flight task: "Create Stripe account, create PRO product + 2 prices, copy price IDs to .dev.vars." This blocks all other tasks.

## Sources

### Primary (HIGH confidence)
- Context7 `/stripe/stripe-node` — Checkout session creation, customer management, product/price creation
- https://blog.cloudflare.com/announcing-stripe-support-in-workers/ — CF Workers initialization pattern, `createFetchHttpClient()`, `constructEventAsync()`
- https://hono.dev/examples/stripe-webhook — Hono-specific webhook verification pattern
- https://docs.stripe.com/billing/subscriptions/webhooks — Subscription webhook events and status model
- https://docs.stripe.com/api/subscriptions/object — Subscription status values (active, past_due, canceled, etc.)
- https://docs.stripe.com/billing/subscriptions/cancel — `cancel_at_period_end` behavior
- https://docs.stripe.com/api/customer_portal/sessions/create — Portal session creation
- https://developers.cloudflare.com/d1/get-started/ — D1 setup, wrangler config, TypeScript usage
- https://docs.stripe.com/webhooks/best-practices — Idempotency via event ID tracking

### Secondary (MEDIUM confidence)
- https://gebna.gg/blog/stripe-webhook-cloudflare-workers — `constructEventAsync` vs `constructEvent` in Workers
- https://docs.stripe.com/metadata — `subscription_data.metadata` for passing username through checkout
- https://mrcoles.com/stripe-api-subscription-status/ — Status-to-access mapping (active/trialing = grant, canceled/incomplete = revoke)
- https://github.com/stripe/stripe-node/wiki/Migration-guide-for-v18 — Basil API breaking changes (postponed subscription creation)

### Tertiary (LOW confidence)
- WebSearch findings on D1 schema patterns for subscriptions — no canonical source, standard relational design applied

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Stripe native Workers support is documented by Cloudflare officially; D1 bindings are well-documented
- Architecture: HIGH — Webhook patterns verified against Hono docs + Cloudflare blog; D1 schema is straightforward SQL
- Pitfalls: HIGH — `constructEventAsync` requirement is a known, documented Workers-specific issue; idempotency pattern from official Stripe docs; Basil API change from official migration guide

**Research date:** 2026-03-29
**Valid until:** 2026-06-29 (Stripe API stable; D1 stable; 90-day estimate)
