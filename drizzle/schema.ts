import {
  bigserial,
  boolean,
  decimal,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const planTierEnum = pgEnum("planTier", ["starter", "pro", "elite"]);
export const subscriptionStatusEnum = pgEnum("subscriptionStatus", [
  "active", "canceled", "past_due", "trialing", "incomplete",
]);
export const transactionStatusEnum = pgEnum("transactionStatus", [
  "pending", "completed", "failed", "refunded",
]);
export const categoryEnum = pgEnum("category", [
  "market", "economy", "sports", "custom",
]);
export const intentStatusEnum = pgEnum("intentStatus", [
  "CREATED", "TRACKING", "PENDING_RESOLUTION",
  "RESOLVED_WIN", "RESOLVED_LOSS", "CANCELLED", "ERROR",
]);
export const outcomeEnum = pgEnum("outcome", ["WIN", "LOSS"]);
export const settlementStatusEnum = pgEnum("settlementStatus", [
  "PENDING", "APPLIED", "WIN_PENDING_ELIGIBILITY",
  "FAILED_RETRYING", "FAILED_NEEDS_REVIEW",
  "CAP_REACHED", "EXPIRED_UNCLAIMED", "REVERSED",
]);
export const resolverRunStatusEnum = pgEnum("resolverRunStatus", [
  "running", "completed", "failed",
]);
export const webhookEventStatusEnum = pgEnum("webhookEventStatus", [
  "processed", "invalid", "test", "error",
]);
export const incentiveStatusEnum = pgEnum("incentiveStatus", [
  "pending", "achieved", "not_achieved", "expired", "cancelled",
]);
export const predictionMarketSourceEnum = pgEnum("predictionMarketSource", [
  "polymarket", "kalshi", "manual",
]);

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: text("passwordHash"),
  firstName: varchar("firstName", { length: 128 }),
  lastName: varchar("lastName", { length: 128 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Merchants ────────────────────────────────────────────────────────────────
export const merchants = pgTable("merchants", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  stripeAccountId: varchar("stripeAccountId", { length: 128 }),
  stripeAccessToken: text("stripeAccessToken"),
  stripeRefreshToken: text("stripeRefreshToken"),
  stripePublishableKey: varchar("stripePublishableKey", { length: 128 }),
  stripeWebhookEndpointId: varchar("stripeWebhookEndpointId", { length: 128 }),
  stripeWebhookSecret: text("stripeWebhookSecret"),
  stripeMode: varchar("stripeMode", { length: 8 }).default("test").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = typeof merchants.$inferInsert;

// ─── Merchant Plans (packages purchased by merchants) ─────────────────────────
export const merchantPlanEnum = pgEnum("merchantPlan", ["basic", "pro", "elite"]);
export const merchantSubscriptions = pgTable("merchantSubscriptions", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchantId").notNull(),
  userId: integer("userId").notNull(),
  plan: merchantPlanEnum("plan").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }).unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripePriceId: varchar("stripePriceId", { length: 128 }),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  currentPeriodEnd: integer("currentPeriodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type MerchantSubscription = typeof merchantSubscriptions.$inferSelect;
export type InsertMerchantSubscription = typeof merchantSubscriptions.$inferInsert;

// ─── Subscriptions (end-user plans) ──────────────────────────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }).notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }).notNull(),
  stripePriceId: varchar("stripePriceId", { length: 128 }).notNull(),
  planName: varchar("planName", { length: 64 }).notNull(),
  planTier: planTierEnum("planTier").notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  currentPeriodEnd: integer("currentPeriodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  stripeSessionId: varchar("stripeSessionId", { length: 256 }).notNull().unique(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  planName: varchar("planName", { length: 64 }).notNull(),
  planTier: planTierEnum("planTier").notNull(),
  amountCents: integer("amountCents").notNull(),
  currency: varchar("currency", { length: 8 }).default("usd").notNull(),
  status: transactionStatusEnum("status").default("pending").notNull(),
  incentiveSelected: integer("incentiveSelected").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaignStatusEnum = pgEnum("campaignStatus", ["ACTIVE", "PAUSED", "ARCHIVED"]);
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchantId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: categoryEnum("category").default("market").notNull(),
  conditionText: text("conditionText"),
  status: campaignStatusEnum("status").default("ACTIVE").notNull(),
  stripePriceIds: json("stripePriceIds").$type<string[]>().notNull(),
  maxSelections: integer("maxSelections").default(1).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  termsText: text("termsText"),
  riskLimitUsd: decimal("riskLimitUsd", { precision: 10, scale: 2 }),
  resolutionCron: varchar("resolutionCron", { length: 64 }).default("0 0 9 * * 1"),
  capMonthsPer365d: integer("capMonthsPer365d").default(12).notNull(),
  claimWindowDays: integer("claimWindowDays").default(7).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// ─── Incentive Options ────────────────────────────────────────────────────────
export const incentiveOptions = pgTable("incentiveOptions", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaignId").notNull(),
  conditionKey: varchar("conditionKey", { length: 128 }).notNull(),
  conditionLabel: varchar("conditionLabel", { length: 255 }).notNull(),
  conditionDescription: text("conditionDescription"),
  category: categoryEnum("category").notNull(),
  rewardValueUsd: decimal("rewardValueUsd", { precision: 10, scale: 2 }).notNull(),
  rewardLabel: varchar("rewardLabel", { length: 255 }),
  resolutionWindowDays: integer("resolutionWindowDays").default(7).notNull(),
  dataSource: varchar("dataSource", { length: 255 }),
  // Polymarket / Kalshi market linkage
  predictionMarketId: integer("predictionMarketId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type IncentiveOption = typeof incentiveOptions.$inferSelect;
export type InsertIncentiveOption = typeof incentiveOptions.$inferInsert;

// ─── Intents ──────────────────────────────────────────────────────────────────
export const intents = pgTable("intents", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  merchantId: integer("merchantId"),
  transactionId: integer("transactionId"),
  campaignId: integer("campaignId").notNull(),
  incentiveOptionId: integer("incentiveOptionId").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  userChoice: varchar("userChoice", { length: 16 }),
  termsSnapshot: json("termsSnapshot").$type<{
    conditionKey: string;
    conditionLabel: string;
    conditionDescription: string;
    rewardValueUsd: number;
    rewardLabel: string;
    resolutionWindowDays: number;
    dataSource: string;
    termsText: string;
    lockedAt: string;
    predictionMarketId?: number;
    yesPrice?: number;
    noPrice?: number;
  }>(),
  status: intentStatusEnum("status").default("CREATED").notNull(),
  resolveAt: timestamp("resolveAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Intent = typeof intents.$inferSelect;
export type InsertIntent = typeof intents.$inferInsert;

// ─── Resolutions ──────────────────────────────────────────────────────────────
export const resolutions = pgTable("resolutions", {
  id: serial("id").primaryKey(),
  intentId: integer("intentId").notNull().unique(),
  outcome: outcomeEnum("outcome").notNull(),
  proofJson: json("proofJson").$type<Record<string, unknown>>(),
  resolvedAt: timestamp("resolvedAt").defaultNow().notNull(),
  resolverRunId: integer("resolverRunId"),
});
export type Resolution = typeof resolutions.$inferSelect;
export type InsertResolution = typeof resolutions.$inferInsert;

// ─── Settlements ──────────────────────────────────────────────────────────────
export const settlements = pgTable("settlements", {
  id: serial("id").primaryKey(),
  intentId: integer("intentId").notNull(),
  userId: integer("userId").notNull(),
  status: settlementStatusEnum("status").default("PENDING").notNull(),
  rewardValueUsd: decimal("rewardValueUsd", { precision: 10, scale: 2 }),
  rewardBalanceUsdBefore: decimal("rewardBalanceUsdBefore", { precision: 10, scale: 2 }).default("0"),
  currentPlanPriceUsd: decimal("currentPlanPriceUsd", { precision: 10, scale: 2 }),
  monthsToDefer: integer("monthsToDefer"),
  remainderBalanceUsd: decimal("remainderBalanceUsd", { precision: 10, scale: 2 }),
  nextInvoiceDateBefore: timestamp("nextInvoiceDateBefore"),
  nextInvoiceDateAfter: timestamp("nextInvoiceDateAfter"),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  attempts: integer("attempts").default(0).notNull(),
  lastAttemptAt: timestamp("lastAttemptAt"),
  lastError: text("lastError"),
  eligibilityClaimExpiresAt: timestamp("eligibilityClaimExpiresAt"),
  appliedAt: timestamp("appliedAt"),
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = typeof settlements.$inferInsert;

// ─── Reward Balances ──────────────────────────────────────────────────────────
export const rewardBalances = pgTable("rewardBalances", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  remainderUsd: decimal("remainderUsd", { precision: 10, scale: 2 }).default("0").notNull(),
  monthsAwardedLast365d: decimal("monthsAwardedLast365d", { precision: 5, scale: 2 }).default("0").notNull(),
  windowStartedAt: timestamp("windowStartedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type RewardBalance = typeof rewardBalances.$inferSelect;
export type InsertRewardBalance = typeof rewardBalances.$inferInsert;

// ─── Ledger ───────────────────────────────────────────────────────────────────
export const ledger = pgTable("ledger", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: integer("userId").notNull(),
  intentId: integer("intentId"),
  settlementId: integer("settlementId"),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  amountUsd: decimal("amountUsd", { precision: 10, scale: 2 }),
  description: text("description"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Ledger = typeof ledger.$inferSelect;
export type InsertLedger = typeof ledger.$inferInsert;

// ─── Resolver Runs ────────────────────────────────────────────────────────────
export const resolverRuns = pgTable("resolverRuns", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  status: resolverRunStatusEnum("status").default("running").notNull(),
  intentsProcessed: integer("intentsProcessed").default(0),
  winsFound: integer("winsFound").default(0),
  lossesFound: integer("lossesFound").default(0),
  settlementsTriggered: integer("settlementsTriggered").default(0),
  errorMessage: text("errorMessage"),
});
export type ResolverRun = typeof resolverRuns.$inferSelect;
export type InsertResolverRun = typeof resolverRuns.$inferInsert;

// ─── Webhook Events (persistent) ─────────────────────────────────────────────
export const webhookEvents = pgTable("webhookEvents", {
  id: serial("id").primaryKey(),
  stripeEventId: varchar("stripeEventId", { length: 128 }).notNull().unique(),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  signatureValid: boolean("signatureValid").default(false).notNull(),
  status: webhookEventStatusEnum("status").notNull(),
  payload: json("payload").$type<Record<string, unknown>>(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

// ─── Embed Tokens ─────────────────────────────────────────────────────────────
export const embedTokens = pgTable("embedTokens", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchantId").notNull(),
  userId: integer("userId").notNull(),
  token: varchar("token", { length: 256 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  revoked: boolean("revoked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EmbedToken = typeof embedTokens.$inferSelect;
export type InsertEmbedToken = typeof embedTokens.$inferInsert;

// ─── Incentives (legacy) ──────────────────────────────────────────────────────
export const incentives = pgTable("incentives", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  transactionId: integer("transactionId"),
  subscriptionId: integer("subscriptionId"),
  conditionKey: varchar("conditionKey", { length: 64 }).notNull(),
  conditionLabel: varchar("conditionLabel", { length: 256 }),
  conditionCategory: categoryEnum("conditionCategory").notNull().default("market"),
  conditionDetail: text("conditionDetail"),
  rewardDescription: varchar("rewardDescription", { length: 256 }),
  rewardValueCents: integer("rewardValueCents"),
  status: incentiveStatusEnum("status").default("pending").notNull(),
  resolvedAt: timestamp("resolvedAt"),
  expiresAt: timestamp("expiresAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Incentive = typeof incentives.$inferSelect;
export type InsertIncentive = typeof incentives.$inferInsert;

// ─── Prediction Markets (Polymarket / Kalshi) ─────────────────────────────────
export const predictionMarkets = pgTable("predictionMarkets", {
  id: serial("id").primaryKey(),
  source: predictionMarketSourceEnum("source").notNull(),
  externalId: varchar("externalId", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }),
  title: text("title").notNull(),
  description: text("description"),
  category: varchar("category", { length: 128 }),
  yesPrice: decimal("yesPrice", { precision: 6, scale: 4 }),
  noPrice: decimal("noPrice", { precision: 6, scale: 4 }),
  volume: decimal("volume", { precision: 18, scale: 2 }),
  resolutionDate: timestamp("resolutionDate"),
  resolvedAt: timestamp("resolvedAt"),
  resolvedOutcome: varchar("resolvedOutcome", { length: 32 }),
  isActive: boolean("isActive").default(true).notNull(),
  isEnabled: boolean("isEnabled").default(false).notNull(),
  lastFetchedAt: timestamp("lastFetchedAt"),
  rawData: json("rawData").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type PredictionMarket = typeof predictionMarkets.$inferSelect;
export type InsertPredictionMarket = typeof predictionMarkets.$inferInsert;

// ─── Member Accounts (end-users tied to a merchant) ───────────────────────────
export const memberAccounts = pgTable("memberAccounts", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchantId").notNull(),
  userId: integer("userId"),
  email: varchar("email", { length: 320 }).notNull(),
  firstName: varchar("firstName", { length: 128 }),
  lastName: varchar("lastName", { length: 128 }),
  phone: varchar("phone", { length: 32 }),
  sessionToken: varchar("sessionToken", { length: 128 }),
  sessionExpiresAt: timestamp("sessionExpiresAt"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type MemberAccount = typeof memberAccounts.$inferSelect;
export type InsertMemberAccount = typeof memberAccounts.$inferInsert;
