-- ShipCard D1 Schema
-- Apply with: npx wrangler d1 execute shipcard-db --file=src/db/schema.sql
-- For local dev: npx wrangler d1 execute shipcard-db --local --file=src/db/schema.sql

-- ---------------------------------------------------------------------------
-- subscriptions — one row per user, tracks PRO subscription lifecycle
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  username               TEXT    NOT NULL UNIQUE,
  stripe_customer_id     TEXT    NOT NULL,
  stripe_subscription_id TEXT    NOT NULL,
  -- status values: active, past_due, canceled, incomplete, trialing
  status                 TEXT    NOT NULL,
  plan                   TEXT    NOT NULL DEFAULT 'pro',
  -- unix timestamp of when the current billing period ends
  current_period_end     INTEGER,
  -- unix timestamp of when the last payment failure occurred (NULL = no failure)
  payment_failed_at      INTEGER,
  created_at             INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at             INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_username
  ON subscriptions(username);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id
  ON subscriptions(stripe_subscription_id);

-- ---------------------------------------------------------------------------
-- stripe_events — idempotency table to deduplicate webhook event delivery
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stripe_events (
  event_id     TEXT    PRIMARY KEY,
  processed_at INTEGER NOT NULL DEFAULT (unixepoch())
);
