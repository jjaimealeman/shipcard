/**
 * Stripe client factory for Cloudflare Workers.
 *
 * Uses Stripe.createFetchHttpClient() so the Stripe SDK works correctly in the
 * Workers runtime (no Node.js http module available). webCrypto provides the
 * SubtleCrypto provider required for webhook signature verification.
 */
import Stripe from 'stripe';

/** SubtleCrypto provider for Stripe webhook signature verification in CF Workers. */
export const webCrypto = Stripe.createSubtleCryptoProvider();

/**
 * Creates a Stripe client configured for the Cloudflare Workers runtime.
 * Call once per request — do not cache across requests.
 */
export function getStripe(env: { STRIPE_SECRET_KEY: string }): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
