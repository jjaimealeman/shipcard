/**
 * D1 query helpers for subscription lifecycle management.
 *
 * All functions take a D1Database as the first param (function-object style,
 * no classes). Used by both the webhook handler and billing API routes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Row shape matching the subscriptions table. */
export interface Subscription {
  id: number;
  username: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  /** active | past_due | canceled | incomplete | trialing */
  status: string;
  plan: string;
  /** Unix timestamp of current billing period end (nullable). */
  current_period_end: number | null;
  /** Unix timestamp of last payment failure (null = no active failure). */
  payment_failed_at: number | null;
  created_at: number;
  updated_at: number;
}

/** Data required to upsert a subscription row. */
export interface UpsertSubscriptionData {
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  plan: string;
  current_period_end: number | null;
}

// ---------------------------------------------------------------------------
// PRO status check
// ---------------------------------------------------------------------------

/**
 * Returns true if the user has an active PRO subscription.
 * Treats 'active' and 'past_due' as PRO (grace period for payment failures).
 */
export async function isUserProFromD1(
  db: D1Database,
  username: string,
): Promise<boolean> {
  const row = await db
    .prepare('SELECT status FROM subscriptions WHERE username = ?')
    .bind(username)
    .first<{ status: string }>();

  if (!row) return false;
  return row.status === 'active' || row.status === 'past_due';
}

// ---------------------------------------------------------------------------
// Subscription queries
// ---------------------------------------------------------------------------

/**
 * Returns the full subscription row for a username, or null if not found.
 */
export async function getSubscription(
  db: D1Database,
  username: string,
): Promise<Subscription | null> {
  const row = await db
    .prepare('SELECT * FROM subscriptions WHERE username = ?')
    .bind(username)
    .first<Subscription>();

  return row ?? null;
}

/**
 * Returns the full subscription row by Stripe subscription ID, or null.
 * Used by webhook handler to look up the local row from Stripe event data.
 */
export async function getSubscriptionByStripeId(
  db: D1Database,
  stripeSubscriptionId: string,
): Promise<Subscription | null> {
  const row = await db
    .prepare('SELECT * FROM subscriptions WHERE stripe_subscription_id = ?')
    .bind(stripeSubscriptionId)
    .first<Subscription>();

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Subscription writes
// ---------------------------------------------------------------------------

/**
 * Inserts or replaces the subscription row for a username.
 * Always updates `updated_at` to the current unix timestamp.
 */
export async function upsertSubscription(
  db: D1Database,
  username: string,
  data: UpsertSubscriptionData,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO subscriptions
         (username, stripe_customer_id, stripe_subscription_id, status, plan, current_period_end, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, unixepoch())
       ON CONFLICT(username) DO UPDATE SET
         stripe_customer_id     = excluded.stripe_customer_id,
         stripe_subscription_id = excluded.stripe_subscription_id,
         status                 = excluded.status,
         plan                   = excluded.plan,
         current_period_end     = excluded.current_period_end,
         updated_at             = unixepoch()`,
    )
    .bind(
      username,
      data.stripe_customer_id,
      data.stripe_subscription_id,
      data.status,
      data.plan,
      data.current_period_end,
    )
    .run();
}

/**
 * Marks a subscription as canceled by username.
 * Updates `status` to 'canceled' and refreshes `updated_at`.
 */
export async function markSubscriptionCanceled(
  db: D1Database,
  username: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE subscriptions
       SET status = 'canceled', updated_at = unixepoch()
       WHERE username = ?`,
    )
    .bind(username)
    .run();
}

/**
 * Records a payment failure for the given Stripe subscription ID.
 * Sets `payment_failed_at` to the current unix timestamp.
 */
export async function markPaymentFailed(
  db: D1Database,
  stripeSubscriptionId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE subscriptions
       SET payment_failed_at = unixepoch(), updated_at = unixepoch()
       WHERE stripe_subscription_id = ?`,
    )
    .bind(stripeSubscriptionId)
    .run();
}

/**
 * Clears a payment failure for the given Stripe subscription ID.
 * Sets `payment_failed_at` to NULL (payment recovered).
 */
export async function clearPaymentFailed(
  db: D1Database,
  stripeSubscriptionId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE subscriptions
       SET payment_failed_at = NULL, updated_at = unixepoch()
       WHERE stripe_subscription_id = ?`,
    )
    .bind(stripeSubscriptionId)
    .run();
}

// ---------------------------------------------------------------------------
// Stripe event idempotency
// ---------------------------------------------------------------------------

/**
 * Returns true if a Stripe event has already been processed.
 * Prevents duplicate processing on Stripe's at-least-once delivery.
 */
export async function isEventProcessed(
  db: D1Database,
  eventId: string,
): Promise<boolean> {
  const row = await db
    .prepare('SELECT event_id FROM stripe_events WHERE event_id = ?')
    .bind(eventId)
    .first<{ event_id: string }>();

  return row !== null;
}

/**
 * Records a Stripe event as processed.
 * Insert is ignored if the event_id already exists (safety net).
 */
export async function markEventProcessed(
  db: D1Database,
  eventId: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO stripe_events (event_id) VALUES (?)`,
    )
    .bind(eventId)
    .run();
}
