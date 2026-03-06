import Stripe from "stripe";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) { console.error("STRIPE_SECRET_KEY not set"); process.exit(1); }

const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2026-02-25.clover" });

console.log("=== Existing Active Prices ===");
const prices = await stripe.prices.list({ limit: 20, active: true, expand: ["data.product"] });
for (const p of prices.data) {
  const prod = p.product;
  const name = typeof prod === "object" ? prod.name : prod;
  console.log(`  ${p.id} | $${(p.unit_amount ?? 0) / 100}/mo | ${name}`);
}

if (prices.data.length === 0) {
  console.log("No active prices found. Creating WagerSubscribe plans...");
  
  const plans = [
    { tier: "starter", name: "WagerSubscribe Starter", desc: "1 active wager, market conditions only", amount: 900 },
    { tier: "pro", name: "WagerSubscribe Pro", desc: "5 active wagers, market/sports/economy", amount: 2900 },
    { tier: "elite", name: "WagerSubscribe Elite", desc: "Unlimited wagers, all conditions, API access", amount: 7900 },
  ];

  const results = {};
  for (const plan of plans) {
    const product = await stripe.products.create({ name: plan.name, description: plan.desc, metadata: { tier: plan.tier } });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { tier: plan.tier },
    });
    results[plan.tier] = { productId: product.id, priceId: price.id };
    console.log(`  ✓ ${plan.tier}: ${price.id}`);
  }
  console.log("\nUpdate products.ts with these price IDs:", JSON.stringify(results, null, 2));
} else {
  console.log(`\nFound ${prices.data.length} active prices.`);
}
