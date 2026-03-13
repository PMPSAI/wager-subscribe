import { and, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  Campaign,
  Incentive,
  InsertCampaign,
  InsertEmbedToken,
  InsertIncentive,
  InsertIncentiveOption,
  InsertIntent,
  InsertLedger,
  InsertMemberAccount,
  InsertMerchant,
  InsertMerchantSubscription,
  InsertPredictionMarket,
  InsertResolution,
  InsertResolverRun,
  InsertSettlement,
  InsertSubscription,
  InsertTransaction,
  InsertUser,
  InsertWebhookEvent,
  Intent,
  campaigns,
  embedTokens,
  incentiveOptions,
  incentives,
  intents,
  ledger,
  memberAccounts,
  merchantSubscriptions,
  merchants,
  predictionMarkets,
  resolutions,
  resolverRuns,
  rewardBalances,
  settlements,
  subscriptions,
  transactions,
  users,
  webhookEvents,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      _db = drizzle(sql);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  // Extra profile & auth fields
  const extraFields = ["passwordHash", "firstName", "lastName", "phone", "address"] as const;
  for (const field of extraFields) {
    const value = (user as Record<string, unknown>)[field];
    if (value !== undefined) {
      (values as Record<string, unknown>)[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function updateUserStripeCustomerId(userId: number, stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function upsertSubscription(sub: InsertSubscription) {
  const db = await getDb();
  if (!db) return;
  await db.insert(subscriptions).values(sub).onConflictDoUpdate({
    target: subscriptions.stripeSubscriptionId,
    set: { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, updatedAt: new Date() },
  });
}

export async function createSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(subscriptions).values(data);
}

export async function getActiveSubscriptionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  return result[0];
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId)).limit(1);
  return result[0];
}

export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set({ status }).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(transactions).values(data);
}

export async function getTransactionBySessionId(stripeSessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transactions)
    .where(eq(transactions.stripeSessionId, stripeSessionId)).limit(1);
  return result[0];
}

export async function getTransactionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return result[0];
}

export async function updateTransactionStatus(
  stripeSessionId: string,
  status: "pending" | "completed" | "failed" | "refunded",
  extra?: { stripePaymentIntentId?: string; stripeSubscriptionId?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(transactions).set({ status, ...extra }).where(eq(transactions.stripeSessionId, stripeSessionId));
}

export async function markTransactionIncentiveSelected(transactionId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(transactions).set({ incentiveSelected: 1 }).where(eq(transactions.id, transactionId));
}

export async function getTransactionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export async function getAllCampaigns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function getCampaignByNameAndMerchantId(name: string, merchantId: number | null) {
  const db = await getDb();
  if (!db) return undefined;
  const cond = merchantId === null ? and(eq(campaigns.name, name), isNull(campaigns.merchantId)) : and(eq(campaigns.name, name), eq(campaigns.merchantId, merchantId));
  const result = await db.select().from(campaigns).where(cond).limit(1);
  return result[0];
}

export async function getOrCreateWidgetPredictionsCampaign() {
  const db = await getDb();
  if (!db) return null;
  const existing = await getCampaignByNameAndMerchantId("Widget Predictions", null);
  if (existing) return existing;
  const [inserted] = await db.insert(campaigns).values({
    name: "Widget Predictions",
    merchantId: null,
    stripePriceIds: [],
    category: "market",
    status: "ACTIVE",
    isActive: true,
  }).returning();
  return inserted ?? null;
}

export async function createCampaign(data: InsertCampaign) {
  const db = await getDb();
  if (!db) return;
  await db.insert(campaigns).values(data);
}

export async function updateCampaign(id: number, data: Partial<Campaign>) {
  const db = await getDb();
  if (!db) return;
  await db.update(campaigns).set({ ...data, updatedAt: new Date() }).where(eq(campaigns.id, id));
}

/** Set all campaigns to inactive (kill switch). */
export async function pauseAllCampaigns(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(campaigns).set({ isActive: false, updatedAt: new Date() }).where(eq(campaigns.isActive, true));
}

// ─── Incentive Options ────────────────────────────────────────────────────────

export async function getOptionsByCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incentiveOptions).where(eq(incentiveOptions.campaignId, campaignId));
}

export async function getAllOptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incentiveOptions).orderBy(desc(incentiveOptions.createdAt));
}

export async function createIncentiveOption(data: InsertIncentiveOption) {
  const db = await getDb();
  if (!db) return;
  await db.insert(incentiveOptions).values(data);
}

export async function getOptionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(incentiveOptions).where(eq(incentiveOptions.id, id)).limit(1);
  return result[0];
}

export async function getOptionByPredictionMarketId(predictionMarketId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(incentiveOptions).where(eq(incentiveOptions.predictionMarketId, predictionMarketId)).limit(1);
  return result[0];
}

export async function getOrCreateIncentiveOptionForMarket(predictionMarketId: number) {
  const db = await getDb();
  if (!db) return null;
  let option = await getOptionByPredictionMarketId(predictionMarketId);
  if (option) return option;
  const campaign = await getOrCreateWidgetPredictionsCampaign();
  if (!campaign) return null;
  const market = await getPredictionMarketById(predictionMarketId);
  if (!market) return null;
  const [inserted] = await db.insert(incentiveOptions).values({
    campaignId: campaign.id,
    conditionKey: `market-${market.externalId}`,
    conditionLabel: market.title?.slice(0, 255) ?? `Market ${market.id}`,
    conditionDescription: market.description ?? undefined,
    category: "market",
    rewardValueUsd: "0",
    resolutionWindowDays: 30,
    dataSource: market.source,
    predictionMarketId: market.id,
    isActive: true,
  }).returning();
  return inserted ?? null;
}

// ─── Intents ──────────────────────────────────────────────────────────────────

export async function createIntent(data: InsertIntent) {
  const db = await getDb();
  if (!db) return undefined;
  const [result] = await db.insert(intents).values(data).returning({ id: intents.id });
  return result?.id;
}

export async function getUserIntents(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(intents).where(eq(intents.userId, userId)).orderBy(desc(intents.createdAt));
}

export async function getAllIntents(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(intents).orderBy(desc(intents.createdAt)).limit(limit);
}

export async function getIntentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(intents).where(eq(intents.id, id)).limit(1);
  return result[0];
}

export async function updateIntentStatus(id: number, status: Intent["status"]) {
  const db = await getDb();
  if (!db) return;
  await db.update(intents).set({ status, updatedAt: new Date() }).where(eq(intents.id, id));
}

export async function getIntentsDueForResolution() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(intents).where(and(eq(intents.status, "TRACKING"), lt(intents.resolveAt, now)));
}

export async function getIntentsByMerchantId(merchantId: number, limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(intents).where(eq(intents.merchantId, merchantId)).orderBy(desc(intents.createdAt)).limit(limit);
}

// ─── Resolutions ──────────────────────────────────────────────────────────────

export async function createResolution(data: InsertResolution) {
  const db = await getDb();
  if (!db) return;
  await db.insert(resolutions).values(data);
}

export async function getResolutionByIntentId(intentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(resolutions).where(eq(resolutions.intentId, intentId)).limit(1);
  return result[0];
}

// ─── Settlements ──────────────────────────────────────────────────────────────

export async function createSettlement(data: InsertSettlement) {
  const db = await getDb();
  if (!db) return;
  await db.insert(settlements).values(data);
}

export async function getAllSettlements(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(settlements).orderBy(desc(settlements.createdAt)).limit(limit);
}

export async function getSettlementByIntentId(intentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(settlements).where(eq(settlements.intentId, intentId)).limit(1);
  return result[0];
}

export async function updateSettlementStatus(id: number, status: string, extra?: Partial<typeof settlements.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(settlements).set({ status: status as any, ...extra, updatedAt: new Date() }).where(eq(settlements.id, id));
}

export async function getPendingEligibilitySettlements() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(settlements).where(
    and(eq(settlements.status, "WIN_PENDING_ELIGIBILITY"), gte(settlements.eligibilityClaimExpiresAt, now))
  );
}

// ─── Reward Balances ──────────────────────────────────────────────────────────

export async function getOrCreateRewardBalance(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(rewardBalances).where(eq(rewardBalances.userId, userId)).limit(1);
  if (result[0]) return result[0];
  await db.insert(rewardBalances).values({ userId, remainderUsd: "0", monthsAwardedLast365d: "0", windowStartedAt: new Date() });
  const created = await db.select().from(rewardBalances).where(eq(rewardBalances.userId, userId)).limit(1);
  return created[0] ?? null;
}

export async function updateRewardBalance(userId: number, remainderUsd: string, monthsAwardedLast365d: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(rewardBalances).set({ remainderUsd, monthsAwardedLast365d, updatedAt: new Date() }).where(eq(rewardBalances.userId, userId));
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

export async function appendLedger(data: InsertLedger) {
  const db = await getDb();
  if (!db) return;
  await db.insert(ledger).values(data);
}

export async function getLedgerByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ledger).where(eq(ledger.userId, userId)).orderBy(desc(ledger.createdAt)).limit(limit);
}

// ─── Resolver Runs ────────────────────────────────────────────────────────────

export async function createResolverRun(data: InsertResolverRun) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.insert(resolverRuns).values(data).returning({ id: resolverRuns.id });
  return result?.id ?? 0;
}

export async function updateResolverRun(id: number, data: Partial<typeof resolverRuns.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(resolverRuns).set(data).where(eq(resolverRuns.id, id));
}

export async function getLastResolverRun() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(resolverRuns).orderBy(desc(resolverRuns.startedAt)).limit(1);
  return result[0];
}

// ─── Legacy Incentives ────────────────────────────────────────────────────────

export async function createIncentive(data: InsertIncentive) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(incentives).values(data);
}

export async function getIncentivesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incentives).where(eq(incentives.userId, userId)).orderBy(desc(incentives.createdAt));
}

export async function getIncentiveByTransactionId(transactionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(incentives).where(eq(incentives.transactionId, transactionId)).limit(1);
  return result[0];
}

export async function updateIncentiveStatus(
  incentiveId: number,
  status: "pending" | "achieved" | "not_achieved" | "expired" | "cancelled",
  notes?: string
) {
  const db = await getDb();
  if (!db) return;
  await db.update(incentives).set({ status, resolvedAt: status !== "pending" ? new Date() : undefined, notes }).where(eq(incentives.id, incentiveId));
}

export async function getAllIncentives() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incentives).orderBy(desc(incentives.createdAt));
}

// ─── Merchant KPIs ────────────────────────────────────────────────────────────

export async function getMerchantKPIs() {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [intents7d] = await db.select({ count: sql<number>`count(*)` }).from(intents).where(gte(intents.createdAt, sevenDaysAgo));
  const [intents30d] = await db.select({ count: sql<number>`count(*)` }).from(intents).where(gte(intents.createdAt, thirtyDaysAgo));
  const [totalResolutions] = await db.select({ count: sql<number>`count(*)` }).from(resolutions);
  const [totalWins] = await db.select({ count: sql<number>`count(*)` }).from(resolutions).where(eq(resolutions.outcome, "WIN"));
  const [appliedSettlements] = await db.select({ total: sql<number>`coalesce(sum("rewardValueUsd"), 0)` }).from(settlements).where(eq(settlements.status, "APPLIED"));
  const [pendingSettlements] = await db.select({ total: sql<number>`coalesce(sum("rewardValueUsd"), 0)` }).from(settlements).where(eq(settlements.status, "WIN_PENDING_ELIGIBILITY"));
  const [failedSettlements] = await db.select({ count: sql<number>`count(*)` }).from(settlements).where(eq(settlements.status, "FAILED_NEEDS_REVIEW"));
  const [retryQueue] = await db.select({ count: sql<number>`count(*)` }).from(settlements).where(
    inArray(settlements.status, ["WIN_PENDING_ELIGIBILITY", "FAILED_RETRYING"])
  );
  const [totalSettlements] = await db.select({ count: sql<number>`count(*)` }).from(settlements);
  const [appliedCount] = await db.select({ count: sql<number>`count(*)` }).from(settlements).where(eq(settlements.status, "APPLIED"));
  const lastRun = await getLastResolverRun();

  const totalRes = Number(totalResolutions?.count ?? 0);
  const totalWin = Number(totalWins?.count ?? 0);
  const totalSett = Number(totalSettlements?.count ?? 0);
  const appliedCnt = Number(appliedCount?.count ?? 0);

  return {
    intents7d: Number(intents7d?.count ?? 0),
    intents30d: Number(intents30d?.count ?? 0),
    totalResolutions: totalRes,
    totalWins: totalWin,
    winRate: totalRes > 0 ? Math.round((totalWin / totalRes) * 100) : 0,
    awardsAppliedUsd: Number(appliedSettlements?.total ?? 0),
    awardsPendingUsd: Number(pendingSettlements?.total ?? 0),
    failedSettlements: Number(failedSettlements?.count ?? 0),
    retryQueueSize: Number(retryQueue?.count ?? 0),
    settlementSuccessRate: totalSett > 0 ? Math.round((appliedCnt / totalSett) * 100) : 0,
    lastResolverRun: lastRun ?? null,
  };
}

// ─── Merchants ────────────────────────────────────────────────────────────────

export async function createMerchant(data: InsertMerchant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(merchants).values(data).returning({ id: merchants.id });
  return result;
}

export async function getMerchantByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(merchants).where(eq(merchants.userId, userId)).limit(1);
  return result[0];
}

export async function getMerchantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(merchants).where(eq(merchants.id, id)).limit(1);
  return result[0];
}

export async function getMerchantBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(merchants).where(eq(merchants.slug, slug)).limit(1);
  return result[0];
}

export async function updateMerchant(id: number, data: Partial<InsertMerchant>) {
  const db = await getDb();
  if (!db) return;
  await db.update(merchants).set({ ...data, updatedAt: new Date() }).where(eq(merchants.id, id));
}

export async function getAllMerchants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(merchants).orderBy(desc(merchants.createdAt));
}

// ─── Webhook Events (persistent) ─────────────────────────────────────────────

/**
 * Persist a Stripe webhook event to the database for merchant diagnostics.
 * Falls back gracefully if the DB is unavailable — the in-memory store in
 * server/_core/webhookEvents.ts still captures the event.
 */
export async function persistWebhookEvent(data: InsertWebhookEvent) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(webhookEvents).values(data).onConflictDoUpdate({
      target: webhookEvents.stripeEventId,
      set: { status: data.status, errorMessage: data.errorMessage },
    });
  } catch (err) {
    console.warn("[DB] Failed to persist webhook event:", err);
  }
}

export async function getWebhookEventsFromDb(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.createdAt))
    .limit(limit);
}

// ─── Embed Tokens ─────────────────────────────────────────────────────────────

export async function createEmbedToken(data: InsertEmbedToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(embedTokens).values(data).returning({ id: embedTokens.id });
  return result;
}

export async function getEmbedToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(embedTokens)
    .where(eq(embedTokens.token, token))
    .limit(1);
  return result[0];
}

export async function revokeEmbedToken(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(embedTokens).set({ revoked: true }).where(eq(embedTokens.token, token));
}

export async function cleanExpiredEmbedTokens() {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db.delete(embedTokens).where(lt(embedTokens.expiresAt, now));
}

// ─── Prediction Markets ───────────────────────────────────────────────────────
export async function upsertPredictionMarket(data: InsertPredictionMarket) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(predictionMarkets)
    .values(data)
    .onConflictDoUpdate({
      target: [predictionMarkets.externalId, predictionMarkets.source],
      set: {
        title: data.title,
        description: data.description,
        category: data.category,
        yesPrice: data.yesPrice,
        noPrice: data.noPrice,
        volume: data.volume,
        resolutionDate: data.resolutionDate,
        resolvedAt: data.resolvedAt,
        resolvedOutcome: data.resolvedOutcome,
        isActive: data.isActive,
        lastFetchedAt: new Date(),
        rawData: data.rawData,
        updatedAt: new Date(),
      },
    });
}

export async function getAllPredictionMarkets(opts?: { enabledOnly?: boolean; source?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: ReturnType<typeof eq>[] = [];
  if (opts?.enabledOnly) conditions.push(eq(predictionMarkets.isEnabled, true));
  if (opts?.source) conditions.push(eq(predictionMarkets.source, opts.source as any));
  const base = db.select().from(predictionMarkets).orderBy(desc(predictionMarkets.updatedAt)).limit(opts?.limit ?? 100);
  if (conditions.length === 0) return base;
  if (conditions.length === 1) return base.where(conditions[0]);
  return base.where(and(...conditions));
}

export async function getPredictionMarketById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(predictionMarkets).where(eq(predictionMarkets.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updatePredictionMarket(id: number, data: Partial<InsertPredictionMarket>) {
  const db = await getDb();
  if (!db) return;
  await db.update(predictionMarkets).set({ ...data, updatedAt: new Date() }).where(eq(predictionMarkets.id, id));
}

export async function getEnabledPredictionMarkets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(predictionMarkets).where(and(eq(predictionMarkets.isEnabled, true), eq(predictionMarkets.isActive, true)));
}

// ─── Member Accounts ──────────────────────────────────────────────────────────
export async function createMemberAccount(data: InsertMemberAccount) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(memberAccounts).values(data).returning();
  return result[0] ?? null;
}

export async function getMemberByEmail(merchantId: number, email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(memberAccounts)
    .where(and(eq(memberAccounts.merchantId, merchantId), eq(memberAccounts.email, email.toLowerCase())))
    .limit(1);
  return result[0] ?? null;
}

export async function getMemberBySessionToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(memberAccounts)
    .where(eq(memberAccounts.sessionToken, token))
    .limit(1);
  return result[0] ?? null;
}

export async function getMembersByMerchant(merchantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memberAccounts).where(eq(memberAccounts.merchantId, merchantId)).orderBy(desc(memberAccounts.createdAt));
}

export async function updateMemberAccount(id: number, data: Partial<InsertMemberAccount>) {
  const db = await getDb();
  if (!db) return;
  await db.update(memberAccounts).set({ ...data, updatedAt: new Date() }).where(eq(memberAccounts.id, id));
}

// ─── Merchant Subscriptions (merchant plan purchases) ─────────────────────────
export async function createMerchantSubscription(data: InsertMerchantSubscription) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(merchantSubscriptions).values(data).returning();
  return result[0] ?? null;
}

export async function getActiveMerchantSubscription(merchantId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(merchantSubscriptions)
    .where(and(eq(merchantSubscriptions.merchantId, merchantId), eq(merchantSubscriptions.status, "active")))
    .orderBy(desc(merchantSubscriptions.createdAt))
    .limit(1);
  return result[0] ?? null;
}

export async function getAllMerchantSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(merchantSubscriptions).orderBy(desc(merchantSubscriptions.createdAt));
}

// ─── User Utilities ───────────────────────────────────────────────────────────
export async function updateUserProfile(userId: number, data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  name?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getAllUsers(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
}
