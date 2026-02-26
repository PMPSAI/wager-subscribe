import "dotenv/config";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });

const plans = [
  {
    tier: "starter",
    name: "WagerSubscribe Starter",
    description: "Starter plan - 1 active wager, market conditions only",
    amountCents: 900,
  },
  {
    tier: "pro",
    name: "WagerSubscribe Pro",
    description: "Pro plan - 5 active wagers, market/sports/economy conditions, priority support",
    amountCents: 2900,
  },
  {
    tier: "elite",
    name: "WagerSubscribe Elite",
    description: "Elite plan - Unlimited wagers, all conditions, 1-on-1 support, early access",
    amountCents: 7900,
  },
];

const results = {};

for (const plan of plans) {
  console.log(`Creating product: ${plan.name}...`);
  const product = await stripe.products.create({
    name: plan.name,
    description: plan.description,
    metadata: { tier: plan.tier },
  });

  console.log(`Creating price for ${plan.name} at $${plan.amountCents / 100}/mo...`);
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.amountCents,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: plan.tier },
  });

  results[plan.tier] = { productId: product.id, priceId: price.id, amountCents: plan.amountCents };
  console.log(`  ✓ ${plan.tier}: product=${product.id}, price=${price.id}`);
}

console.log("\n=== PRICE IDs TO UPDATE IN products.ts ===");
console.log(JSON.stringify(results, null, 2));
