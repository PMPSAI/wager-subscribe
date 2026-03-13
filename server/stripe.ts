import Stripe from "stripe";

let _stripeTest: Stripe | null = null;
let _stripeLive: Stripe | null = null;

/**
 * Returns whether the current Stripe configuration is in test mode.
 * Test mode: STRIPE_SECRET_KEY starts with "sk_test_" or STRIPE_MODE=test.
 */
export function getStripeMode(): "test" | "live" {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (key.startsWith("sk_test_")) return "test";
  if (process.env.STRIPE_MODE === "test") return "test";
  return "live";
}

/**
 * Returns the Stripe client for the given mode.
 * Falls back to STRIPE_SECRET_KEY if mode-specific keys are not set.
 */
export function getStripeForMode(mode: "test" | "live"): Stripe {
  if (mode === "test") {
    const key = process.env.STRIPE_SECRET_KEY_TEST ?? process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("No Stripe test key configured. Set STRIPE_SECRET_KEY_TEST or STRIPE_SECRET_KEY.");
    if (!_stripeTest) _stripeTest = new Stripe(key, { apiVersion: "2026-02-25.clover" });
    return _stripeTest;
  } else {
    const key = process.env.STRIPE_SECRET_KEY_LIVE ?? process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("No Stripe live key configured. Set STRIPE_SECRET_KEY_LIVE or STRIPE_SECRET_KEY.");
    if (!_stripeLive) _stripeLive = new Stripe(key, { apiVersion: "2026-02-25.clover" });
    return _stripeLive;
  }
}

/**
 * Returns the Stripe publishable key for the current mode (used for embedded checkout).
 * Uses STRIPE_PUBLISHABLE_KEY, or mode-specific STRIPE_PUBLISHABLE_KEY_TEST / STRIPE_PUBLISHABLE_KEY_LIVE.
 */
export function getStripePublishableKey(): string | undefined {
  const mode = getStripeMode();
  if (mode === "test") {
    return process.env.STRIPE_PUBLISHABLE_KEY_TEST ?? process.env.STRIPE_PUBLISHABLE_KEY;
  }
  return process.env.STRIPE_PUBLISHABLE_KEY_LIVE ?? process.env.STRIPE_PUBLISHABLE_KEY;
}

/**
 * Returns the Stripe client using the default configured key.
 * Throws if STRIPE_SECRET_KEY is not set.
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to your .env file to use Stripe features."
    );
  }
  return getStripeForMode(getStripeMode());
}
