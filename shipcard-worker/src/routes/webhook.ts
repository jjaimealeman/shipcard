/**
 * Stripe webhook route handler.
 *
 * Receives subscription lifecycle events from Stripe, verifies signatures,
 * deduplicates via stripe_events idempotency table, and persists state to D1.
 *
 * All event handlers return 200 — Stripe retries on 5xx, which would cause
 * duplicate processing and corrupt subscription state.
 *
 * Routes:
 *   POST /stripe — Stripe webhook event ingestion
 */

import { Hono } from "hono";
import type { AppType } from "../types.js";
import { getStripe, webCrypto } from "../stripe.js";
import {
  upsertSubscription,
  markSubscriptionCanceled,
  markPaymentFailed,
  clearPaymentFailed,
  getSubscriptionByStripeId,
  isEventProcessed,
  markEventProcessed,
} from "../db/subscriptions.js";
import type Stripe from "stripe";

export const webhookRoutes = new Hono<AppType>();

/**
 * Extracts the current period end timestamp from a Stripe Subscription.
 *
 * In Stripe API v2 (stripe-node v17+), current_period_end moved from the
 * Subscription object to SubscriptionItem. We take the end from the first item.
 */
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): number | null {
  return subscription.items.data[0]?.current_period_end ?? null;
}

/**
 * Extracts the subscription ID from a Stripe Invoice.
 *
 * In stripe-node v17+ the subscription reference moved from the top-level
 * Invoice to Invoice.parent.subscription_details.subscription.
 */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

webhookRoutes.post("/stripe", async (c) => {
  const env = c.env;
  const db = env.DB;

  try {
    // 1. Read raw body — MUST use text(), not json(). Stripe verifies the exact
    //    bytes of the request body against the signature.
    const body = await c.req.text();

    // 2. Signature header — required for verification
    const sig = c.req.header("stripe-signature");
    if (!sig) {
      return c.json({ error: "Missing stripe-signature header" }, 400);
    }

    // 3. Verify signature — MUST use constructEventAsync (not constructEvent).
    //    The sync version relies on Node.js crypto which is unavailable in Workers.
    const stripe = getStripe(env);
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        sig,
        env.STRIPE_WEBHOOK_SECRET,
        undefined,
        webCrypto,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signature verification failed";
      console.error("[webhook] Signature verification failed:", message);
      return c.json({ error: message }, 400);
    }

    // 4. Idempotency check — skip already-processed events
    const alreadyProcessed = await isEventProcessed(db, event.id);
    if (alreadyProcessed) {
      console.log(`[webhook] Duplicate event skipped: ${event.id}`);
      return c.json({ received: true }, 200);
    }

    // 5. Mark event processed BEFORE processing — prevents duplicate work on
    //    concurrent deliveries (Stripe has at-least-once semantics)
    await markEventProcessed(db, event.id);

    // 6. Route event to appropriate handler
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Retrieve full subscription — session object lacks current_period_end
        // and other fields needed to build the D1 row
        if (!session.subscription) {
          console.warn("[webhook] checkout.session.completed: no subscription on session, skipping");
          break;
        }

        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        const username = subscription.metadata?.username;
        if (!username) {
          console.warn(
            `[webhook] checkout.session.completed: no username in subscription metadata (${subscription.id}), skipping`,
          );
          break;
        }

        await upsertSubscription(db, username, {
          stripe_customer_id: typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          plan: "pro",
          current_period_end: getSubscriptionPeriodEnd(subscription),
        });

        console.log(`[webhook] checkout.session.completed: upserted subscription for ${username}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        // Prefer username from metadata; fall back to D1 lookup
        let username = subscription.metadata?.username;
        if (!username) {
          const existing = await getSubscriptionByStripeId(db, subscription.id);
          if (existing) username = existing.username;
        }

        if (!username) {
          console.warn(
            `[webhook] customer.subscription.updated: cannot resolve username for ${subscription.id}, skipping`,
          );
          break;
        }

        await upsertSubscription(db, username, {
          stripe_customer_id: typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          plan: "pro",
          current_period_end: getSubscriptionPeriodEnd(subscription),
        });

        console.log(`[webhook] customer.subscription.updated: updated subscription for ${username} (status=${subscription.status})`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        // Prefer username from metadata; fall back to D1 lookup
        let username = subscription.metadata?.username;
        if (!username) {
          const existing = await getSubscriptionByStripeId(db, subscription.id);
          if (existing) username = existing.username;
        }

        if (!username) {
          console.warn(
            `[webhook] customer.subscription.deleted: cannot resolve username for ${subscription.id}, skipping`,
          );
          break;
        }

        await markSubscriptionCanceled(db, username);
        console.log(`[webhook] customer.subscription.deleted: canceled subscription for ${username}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (!subscriptionId) {
          console.warn("[webhook] invoice.payment_failed: no subscription on invoice, skipping");
          break;
        }

        await markPaymentFailed(db, subscriptionId);
        console.log(`[webhook] invoice.payment_failed: recorded failure for subscription ${subscriptionId}`);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (!subscriptionId) {
          console.warn("[webhook] invoice.paid: no subscription on invoice, skipping");
          break;
        }

        await clearPaymentFailed(db, subscriptionId);
        console.log(`[webhook] invoice.paid: cleared payment failure for subscription ${subscriptionId}`);
        break;
      }

      default:
        // Unhandled event types are silently acknowledged — Stripe sends many
        // event types and we only care about subscription lifecycle events
        console.log(`[webhook] Unhandled event type: ${event.type}`);
        break;
    }

    // 7. Always return 200 — Stripe interprets anything else as a failure
    //    and schedules a retry, which would reprocess the event
    return c.json({ received: true }, 200);
  } catch (err) {
    // Catch-all — never return 5xx to Stripe
    console.error("[webhook] Unhandled error:", err);
    return c.json({ received: true }, 200);
  }
});
