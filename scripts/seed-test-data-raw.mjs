/**
 * Seed script using raw SQL via Neon HTTP API
 * Run: DATABASE_URL=... node scripts/seed-test-data-raw.mjs
 */
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL required"); process.exit(1); }

const sql = neon(DATABASE_URL);

async function main() {
  // 1. Get admin user
  const [adminUser] = await sql`SELECT * FROM "users" WHERE "openId" = 'simple-login-demo@local' LIMIT 1`;
  if (!adminUser) {
    console.log("⚠️  Admin user not found. Log in via /api/simple-login first.");
    process.exit(1);
  }
  console.log(`✅ Admin user: ${adminUser.email} (id=${adminUser.id}, role=${adminUser.role})`);

  // 2. Create merchant
  const [existingMerchant] = await sql`SELECT * FROM "merchants" WHERE "userId" = ${adminUser.id} LIMIT 1`;
  let merchantId;
  if (existingMerchant) {
    merchantId = existingMerchant.id;
    console.log(`⏭️  Merchant exists (id=${merchantId})`);
  } else {
    const [m] = await sql`
      INSERT INTO "merchants" ("userId", "name", "slug", "isActive")
      VALUES (${adminUser.id}, 'WagerSubscribe Demo', 'wager-demo', true)
      RETURNING *`;
    merchantId = m.id;
    console.log(`✅ Merchant created (id=${merchantId})`);
  }

  // 3. Create campaigns
  const campaignDefs = [
    { name: "Bitcoin Price Prediction", description: "Will BTC be above $100K by end of Q2 2026?", category: "market", conditionText: "BTC/USD > $100,000 by June 30, 2026", status: "ACTIVE" },
    { name: "NBA Championship 2026", description: "Predict the NBA Championship winner", category: "sports", conditionText: "Correct team wins NBA Championship 2026", status: "ACTIVE" },
    { name: "Fed Rate Decision Q3", description: "Will the Fed cut rates in Q3 2026?", category: "economy", conditionText: "Fed cuts rates by at least 25bps in Q3 2026", status: "ACTIVE" },
    { name: "Custom Elite Prediction", description: "Elite members define their own prediction", category: "custom", conditionText: "User-defined custom condition", status: "ACTIVE" },
  ];

  const campaignIds = [];
  for (const c of campaignDefs) {
    const [existing] = await sql`SELECT id FROM "campaigns" WHERE "name" = ${c.name} LIMIT 1`;
    if (existing) {
      campaignIds.push(existing.id);
      console.log(`⏭️  Campaign "${c.name}" exists (id=${existing.id})`);
    } else {
      const [created] = await sql`
        INSERT INTO "campaigns" ("merchantId", "name", "description", "category", "conditionText", "status", "stripePriceIds", "isActive")
        VALUES (${merchantId}, ${c.name}, ${c.description}, ${c.category}, ${c.conditionText}, ${c.status}, '[]'::json, true)
        RETURNING *`;
      campaignIds.push(created.id);
      console.log(`✅ Campaign "${c.name}" (id=${created.id})`);
    }
  }

  // 4. Create incentive options
  const optionDefs = [
    { campaignIdx: 0, conditionKey: "btc_above_100k", conditionLabel: "BTC > $100K ✅", category: "market", rewardValueUsd: "29.00", rewardLabel: "1 month credit", resolutionWindowDays: 90 },
    { campaignIdx: 0, conditionKey: "btc_below_100k", conditionLabel: "BTC < $100K ❌", category: "market", rewardValueUsd: "14.50", rewardLabel: "0.5 month credit", resolutionWindowDays: 90 },
    { campaignIdx: 1, conditionKey: "celtics_win", conditionLabel: "Boston Celtics 🏆", category: "sports", rewardValueUsd: "58.00", rewardLabel: "2 months credit", resolutionWindowDays: 120 },
    { campaignIdx: 1, conditionKey: "lakers_win", conditionLabel: "LA Lakers 🏆", category: "sports", rewardValueUsd: "58.00", rewardLabel: "2 months credit", resolutionWindowDays: 120 },
    { campaignIdx: 1, conditionKey: "other_team_win", conditionLabel: "Other team 🏆", category: "sports", rewardValueUsd: "29.00", rewardLabel: "1 month credit", resolutionWindowDays: 120 },
    { campaignIdx: 2, conditionKey: "fed_cuts", conditionLabel: "Fed cuts rates ✂️", category: "economy", rewardValueUsd: "29.00", rewardLabel: "1 month credit", resolutionWindowDays: 180 },
    { campaignIdx: 2, conditionKey: "fed_holds", conditionLabel: "Fed holds rates ⏸️", category: "economy", rewardValueUsd: "14.50", rewardLabel: "0.5 month credit", resolutionWindowDays: 180 },
    { campaignIdx: 3, conditionKey: "custom_achieved", conditionLabel: "Custom condition ✅", category: "custom", rewardValueUsd: "79.00", rewardLabel: "Elite reward", resolutionWindowDays: 365 },
  ];

  const optionIds = [];
  for (const o of optionDefs) {
    const cId = campaignIds[o.campaignIdx];
    const [existing] = await sql`SELECT id FROM "incentiveOptions" WHERE "conditionKey" = ${o.conditionKey} AND "campaignId" = ${cId} LIMIT 1`;
    if (existing) {
      optionIds.push(existing.id);
      console.log(`⏭️  Option "${o.conditionLabel}" exists`);
    } else {
      const [created] = await sql`
        INSERT INTO "incentiveOptions" ("campaignId", "conditionKey", "conditionLabel", "category", "rewardValueUsd", "rewardLabel", "resolutionWindowDays", "isActive")
        VALUES (${cId}, ${o.conditionKey}, ${o.conditionLabel}, ${o.category}, ${o.rewardValueUsd}, ${o.rewardLabel}, ${o.resolutionWindowDays}, true)
        RETURNING *`;
      optionIds.push(created.id);
      console.log(`✅ Option "${o.conditionLabel}" (id=${created.id})`);
    }
  }

  // 5. Create test customer
  const [existingCustomer] = await sql`SELECT * FROM "users" WHERE "openId" = 'test-customer@wager-demo.local' LIMIT 1`;
  let customerId;
  if (existingCustomer) {
    customerId = existingCustomer.id;
    console.log(`⏭️  Customer exists (id=${customerId})`);
  } else {
    const [c] = await sql`
      INSERT INTO "users" ("openId", "email", "name", "role")
      VALUES ('test-customer@wager-demo.local', 'customer@wager-demo.local', 'Test Customer', 'user')
      RETURNING *`;
    customerId = c.id;
    console.log(`✅ Customer created (id=${customerId})`);
  }

  // 6. Create subscription
  const [existingSub] = await sql`SELECT id FROM "subscriptions" WHERE "userId" = ${customerId} LIMIT 1`;
  if (!existingSub) {
    const periodEndUnix = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
    await sql`
      INSERT INTO "subscriptions" ("userId", "stripeSubscriptionId", "stripeCustomerId", "stripePriceId", "planName", "planTier", "status", "currentPeriodEnd")
      VALUES (${customerId}, 'sub_test_demo_001', 'cus_test_demo_001', 'price_1T4wMmLBX2wmK6ZvBZ1eGDsl', 'Pro Plan', 'pro', 'active', ${periodEndUnix})`;
    console.log(`✅ Subscription created (pro)`);
  } else { console.log(`⏭️  Subscription exists`); }

  // 7. Create transaction
  const [existingTx] = await sql`SELECT id FROM "transactions" WHERE "userId" = ${customerId} LIMIT 1`;
  let txId;
  if (existingTx) {
    txId = existingTx.id;
    console.log(`⏭️  Transaction exists (id=${txId})`);
  } else {
    const [tx] = await sql`
      INSERT INTO "transactions" ("userId", "stripeSessionId", "planName", "planTier", "amountCents", "currency", "status", "incentiveSelected")
      VALUES (${customerId}, 'cs_test_demo_001', 'Pro Plan', 'pro', 2900, 'usd', 'completed', 0)
      RETURNING *`;
    txId = tx.id;
    console.log(`✅ Transaction created (id=${txId})`);
  }

  // 8. Create intents
  const intentDefs = [
    { campaignIdx: 0, optionIdx: 0, status: "TRACKING" },
    { campaignIdx: 1, optionIdx: 2, status: "RESOLVED_WIN" },
    { campaignIdx: 2, optionIdx: 5, status: "RESOLVED_LOSS" },
  ];
  for (const i of intentDefs) {
    const cId = campaignIds[i.campaignIdx];
    const oId = optionIds[i.optionIdx];
    const [existing] = await sql`SELECT id FROM "intents" WHERE "userId" = ${customerId} AND "campaignId" = ${cId} LIMIT 1`;
    if (!existing) {
      const resolveAt = new Date(); resolveAt.setDate(resolveAt.getDate() + 90);
      await sql`INSERT INTO "intents" ("userId", "campaignId", "incentiveOptionId", "transactionId", "status", "resolveAt") VALUES (${customerId}, ${cId}, ${oId}, ${txId}, ${i.status}, ${resolveAt})`;
      console.log(`✅ Intent created (campaign=${cId}, status=${i.status})`);
    } else { console.log(`⏭️  Intent exists (campaign=${cId})`); }
  }

  // 9. Reward balance
  const [existingBalance] = await sql`SELECT id FROM "rewardBalances" WHERE "userId" = ${customerId} LIMIT 1`;
  if (!existingBalance) {
    await sql`INSERT INTO "rewardBalances" ("userId", "remainderUsd", "monthsAwardedLast365d") VALUES (${customerId}, '29.00', '1.00')`;
    console.log(`✅ Reward balance created`);
  } else { console.log(`⏭️  Reward balance exists`); }

  console.log("\n🎉 Seed complete!");
  console.log(`\n📋 Test Accounts:`);
  console.log(`  Admin/Merchant: /api/simple-login (email: simple-login-demo@local)`);
  console.log(`  Merchant ID: ${merchantId}`);
  console.log(`  Campaigns: ${campaignIds.length} (IDs: ${campaignIds.join(", ")})`);
  console.log(`  Options: ${optionIds.length}`);
  console.log(`  Customer ID: ${customerId}`);
}

main().catch(e => { console.error(e); process.exit(1); });
