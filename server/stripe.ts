import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Returns the Stripe client. Throws if STRIPE_SECRET_KEY is not set.
 * Use this instead of creating Stripe at module load so the server can start
 * without Stripe configured (e.g. in dev without .env).
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to your .env file to use Stripe features."
    );
  }
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" });
  }
  return _stripe;
}
