/**
 * Seed script: creates test merchant, admin user, campaigns, intents, and settlements.
 * Run with: DATABASE_URL=... STRIPE_SECRET_KEY=... node scripts/seed-test-data.mjs
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

// ─── Helpers ────────────────────────────────────────────────────────────────
async function run(label, fn) {
  try {
    const result = await fn();
    console.log(`✅ ${label}`, result ? `(id=${result?.id ?? "ok"})` : "");
    return result;
  } catch (err) {
    if (err.message?.includes("duplicate") || err.message?.includes("unique")) {
      console.log(`⏭️  ${label} (already exists)`);
      return null;
    }
    console.error(`❌ ${label}:`, err.message);
    return null;
  }
}

// ─── Dynamic imports from schema ────────────────────────────────────────────
const {
  users, campaigns, incentiveOptions, intents, resolutions, settlements,
  rewardBalances, ledger, merchants, transactions, subscriptions,
} = await import("../drizzle/schema.ts").catch(async () => {
  // Fallback: use compiled JS if TS not available
  return import("../drizzle/schema.js");
}).catch(() => {
  console.error("Cannot import schema. Run this via tsx or ts-node.");
  process.exit(1);
});

// ─── 1. Ensure admin user exists ────────────────────────────────────────────
console.log("\n📦 Seeding admin user...");
const [adminUser] = await db.select().from(users).where(eq(users.openId, "simple-login-demo@local")).limit(1);
if (!adminUser) {
  console.log("⚠️  Admin user not found. Log in via /api/simple-login first, then re-run this script.");
  process.exit(1);
}
console.log(`✅ Admin user found: ${adminUser.email} (id=${adminUser.id}, role=${adminUser.role})`);

// ─── 2. Create test merchant ─────────────────────────────────────────────────
console.log("\n📦 Seeding merchant...");
const [existingMerchant] = await db.select().from(merchants).where(eq(merchants.userId, adminUser.id)).limit(1);
let merchantId;
if (existingMerchant) {
  merchantId = existingMerchant.id;
  console.log(`⏭️  Merchant already exists (id=${merchantId})`);
} else {
  const [newMerchant] = await db.insert(merchants).values({
    userId: adminUser.id,
    name: "WagerSubscribe Demo Merchant",
    slug: "wager-demo",
    stripeAccountId: null,
    stripePublishableKey: process.env.STRIPE_SECRET_KEY ? null : null,
    isActive: true,
  }).returning();
  merchantId = newMerchant.id;
  console.log(`✅ Merchant created (id=${merchantId})`);
}

// ─── 3. Create test campaigns ────────────────────────────────────────────────
console.log("\n📦 Seeding campaigns...");
const campaignData = [
  {
    name: "Bitcoin Price Prediction",
    description: "Will Bitcoin be above $100K by end of Q2 2026?",
    category: "MARKET",
    conditionText: "BTC/USD > $100,000 by June 30, 2026",
    status: "ACTIVE",
    planTiers: ["starter", "pro", "elite"],
    merchantId,
  },
  {
    name: "NBA Championship 2026",
    description: "Predict the NBA Championship winner for the 2025-26 season",
    category: "SPORTS",
    conditionText: "Correct team wins NBA Championship 2026",
    status: "ACTIVE",
    planTiers: ["pro", "elite"],
    merchantId,
  },
  {
    name: "Fed Rate Decision",
    description: "Will the Federal Reserve cut rates in Q3 2026?",
    category: "ECONOMY",
    conditionText: "Fed cuts rates by at least 25bps in Q3 2026",
    status: "ACTIVE",
    planTiers: ["starter", "pro", "elite"],
    merchantId,
  },
  {
    name: "Custom Prediction (Elite)",
    description: "Elite members can define their own prediction condition",
    category: "CUSTOM",
    conditionText: "User-defined custom condition",
    status: "ACTIVE",
    planTiers: ["elite"],
    merchantId,
  },
];

const existingCampaigns = await db.select().from(campaigns);
const campaignIds = [];

for (const c of campaignData) {
  const existing = existingCampaigns.find(ec => ec.name === c.name);
  if (existing) {
    console.log(`⏭️  Campaign "${c.name}" already exists (id=${existing.id})`);
    campaignIds.push(existing.id);
  } else {
    const [created] = await db.insert(campaigns).values(c).returning();
    console.log(`✅ Campaign "${c.name}" created (id=${created.id})`);
    campaignIds.push(created.id);
  }
}

// ─── 4. Create incentive options for each campaign ───────────────────────────
console.log("\n📦 Seeding incentive options...");
const optionData = [
  // Bitcoin campaign options
  { campaignId: campaignIds[0], conditionKey: "btc_above_100k", conditionLabel: "BTC > $100K ✅", rewardLabel: "1 month subscription credit", rewardValueCents: 2900, resolutionWindowDays: 90, dataSource: "CoinGecko API" },
  { campaignId: campaignIds[0], conditionKey: "btc_below_100k", conditionLabel: "BTC < $100K ❌", rewardLabel: "0.5 month subscription credit", rewardValueCents: 1450, resolutionWindowDays: 90, dataSource: "CoinGecko API" },
  // NBA campaign options
  { campaignId: campaignIds[1], conditionKey: "celtics_win", conditionLabel: "Boston Celtics win 🏆", rewardLabel: "2 months subscription credit", rewardValueCents: 5800, resolutionWindowDays: 120, dataSource: "ESPN API" },
  { campaignId: campaignIds[1], conditionKey: "lakers_win", conditionLabel: "LA Lakers win 🏆", rewardLabel: "2 months subscription credit", rewardValueCents: 5800, resolutionWindowDays: 120, dataSource: "ESPN API" },
  { campaignId: campaignIds[1], conditionKey: "other_team_win", conditionLabel: "Other team wins 🏆", rewardLabel: "1 month subscription credit", rewardValueCents: 2900, resolutionWindowDays: 120, dataSource: "ESPN API" },
  // Fed Rate campaign options
  { campaignId: campaignIds[2], conditionKey: "fed_cuts", conditionLabel: "Fed cuts rates ✂️", rewardLabel: "1 month subscription credit", rewardValueCents: 2900, resolutionWindowDays: 180, dataSource: "Federal Reserve" },
  { campaignId: campaignIds[2], conditionKey: "fed_holds", conditionLabel: "Fed holds rates ⏸️", rewardLabel: "0.5 month subscription credit", rewardValueCents: 1450, resolutionWindowDays: 180, dataSource: "Federal Reserve" },
  // Custom campaign options
  { campaignId: campaignIds[3], conditionKey: "custom_achieved", conditionLabel: "Custom condition achieved ✅", rewardLabel: "Elite reward", rewardValueCents: 7900, resolutionWindowDays: 365, dataSource: "Manual" },
];

const existingOptions = await db.select().from(incentiveOptions);
const optionIds = [];

for (const o of optionData) {
  const existing = existingOptions.find(eo => eo.conditionKey === o.conditionKey && eo.campaignId === o.campaignId);
  if (existing) {
    console.log(`⏭️  Option "${o.conditionLabel}" already exists (id=${existing.id})`);
    optionIds.push(existing.id);
  } else {
    const [created] = await db.insert(incentiveOptions).values(o).returning();
    console.log(`✅ Option "${o.conditionLabel}" created (id=${created.id})`);
    optionIds.push(created.id);
  }
}

// ─── 5. Create test user (merchant customer) ─────────────────────────────────
console.log("\n📦 Seeding test customer user...");
const testCustomerOpenId = "test-customer@wager-demo.local";
const [existingCustomer] = await db.select().from(users).where(eq(users.openId, testCustomerOpenId)).limit(1);
let customerId;
if (existingCustomer) {
  customerId = existingCustomer.id;
  console.log(`⏭️  Test customer already exists (id=${customerId})`);
} else {
  const [newCustomer] = await db.insert(users).values({
    openId: testCustomerOpenId,
    email: "customer@wager-demo.local",
    name: "Test Customer",
    role: "user",
    avatarUrl: null,
    stripeCustomerId: null,
  }).returning();
  customerId = newCustomer.id;
  console.log(`✅ Test customer created (id=${customerId})`);
}

// ─── 6. Create test subscription for customer ────────────────────────────────
console.log("\n📦 Seeding test subscription...");
const [existingSub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, customerId)).limit(1);
if (existingSub) {
  console.log(`⏭️  Subscription already exists (id=${existingSub.id})`);
} else {
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const [sub] = await db.insert(subscriptions).values({
    userId: customerId,
    stripeSubscriptionId: "sub_test_demo_001",
    stripeCustomerId: "cus_test_demo_001",
    planTier: "pro",
    status: "active",
    currentPeriodEnd: periodEnd,
  }).returning();
  console.log(`✅ Subscription created (id=${sub.id}, tier=pro)`);
}

// ─── 7. Create test transaction for customer ─────────────────────────────────
console.log("\n📦 Seeding test transaction...");
const [existingTx] = await db.select().from(transactions).where(eq(transactions.userId, customerId)).limit(1);
let txId;
if (existingTx) {
  txId = existingTx.id;
  console.log(`⏭️  Transaction already exists (id=${txId})`);
} else {
  const [tx] = await db.insert(transactions).values({
    userId: customerId,
    stripeSessionId: "cs_test_demo_001",
    stripePaymentIntentId: "pi_test_demo_001",
    planTier: "pro",
    amountCents: 2900,
    currency: "usd",
    status: "completed",
    incentiveSelected: false,
  }).returning();
  txId = tx.id;
  console.log(`✅ Transaction created (id=${txId})`);
}

// ─── 8. Create test intents ───────────────────────────────────────────────────
console.log("\n📦 Seeding test intents...");
const existingIntents = await db.select().from(intents).where(eq(intents.userId, customerId));

const intentData = [
  {
    userId: customerId,
    campaignId: campaignIds[0],
    incentiveOptionId: optionIds[0],
    transactionId: txId,
    status: "TRACKING",
    conditionSnapshot: { key: "btc_above_100k", label: "BTC > $100K" },
    resolveAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  },
  {
    userId: customerId,
    campaignId: campaignIds[1],
    incentiveOptionId: optionIds[2],
    transactionId: txId,
    status: "RESOLVED_WIN",
    conditionSnapshot: { key: "celtics_win", label: "Boston Celtics win" },
    resolveAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    userId: customerId,
    campaignId: campaignIds[2],
    incentiveOptionId: optionIds[5],
    transactionId: txId,
    status: "RESOLVED_LOSS",
    conditionSnapshot: { key: "fed_cuts", label: "Fed cuts rates" },
    resolveAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
];

for (const intent of intentData) {
  const existing = existingIntents.find(ei => 
    ei.campaignId === intent.campaignId && ei.userId === intent.userId
  );
  if (existing) {
    console.log(`⏭️  Intent for campaign ${intent.campaignId} already exists (id=${existing.id})`);
  } else {
    const [created] = await db.insert(intents).values(intent).returning();
    console.log(`✅ Intent created (id=${created.id}, status=${created.status})`);
  }
}

// ─── 9. Create reward balance for customer ───────────────────────────────────
console.log("\n📦 Seeding reward balance...");
const [existingBalance] = await db.select().from(rewardBalances).where(eq(rewardBalances.userId, customerId)).limit(1);
if (existingBalance) {
  console.log(`⏭️  Reward balance already exists (remainderUsd=${existingBalance.remainderUsd})`);
} else {
  const [balance] = await db.insert(rewardBalances).values({
    userId: customerId,
    remainderUsd: "29.00",
    monthsAwardedLast365d: "1.00",
  }).returning();
  console.log(`✅ Reward balance created (remainderUsd=${balance.remainderUsd})`);
}

// ─── 10. Create ledger entries ────────────────────────────────────────────────
console.log("\n📦 Seeding ledger entries...");
const [existingLedger] = await db.select().from(ledger).where(eq(ledger.userId, customerId)).limit(1);
if (existingLedger) {
  console.log(`⏭️  Ledger entries already exist`);
} else {
  await db.insert(ledger).values([
    {
      userId: customerId,
      type: "credit",
      amountUsd: "29.00",
      description: "NBA Championship prediction win - 1 month credit",
      relatedIntentId: null,
    },
  ]);
  console.log(`✅ Ledger entry created`);
}

console.log("\n🎉 Seed complete!");
console.log("\n📋 Test Accounts:");
console.log("  Admin/Merchant: Log in via /api/simple-login (email: simple-login-demo@local)");
console.log("  Customer:       openId=test-customer@wager-demo.local (DB only, no login)");
console.log("\n📋 Test Data:");
console.log(`  Merchant ID: ${merchantId}`);
console.log(`  Campaigns: ${campaignIds.length} created`);
console.log(`  Options: ${optionIds.length} created`);
console.log(`  Customer ID: ${customerId}`);
console.log(`  Transaction ID: ${txId}`);
