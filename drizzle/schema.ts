import {
  bigint,
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Subscriptions ────────────────────────────────────────────────────────────
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }).notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }).notNull(),
  stripePriceId: varchar("stripePriceId", { length: 128 }).notNull(),
  planName: varchar("planName", { length: 64 }).notNull(),
  planTier: mysqlEnum("planTier", ["starter", "pro", "elite"]).notNull(),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "trialing", "incomplete"]).default("active").notNull(),
  currentPeriodEnd: bigint("currentPeriodEnd", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripeSessionId: varchar("stripeSessionId", { length: 256 }).notNull().unique(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  planName: varchar("planName", { length: 64 }).notNull(),
  planTier: mysqlEnum("planTier", ["starter", "pro", "elite"]).notNull(),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 8 }).default("usd").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  incentiveSelected: int("incentiveSelected").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  stripePriceIds: json("stripePriceIds").$type<string[]>().notNull(),
  maxSelections: int("maxSelections").default(1).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  termsText: text("termsText"),
  riskLimitUsd: decimal("riskLimitUsd", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// ─── Incentive Options ────────────────────────────────────────────────────────
export const incentiveOptions = mysqlTable("incentiveOptions", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  conditionKey: varchar("conditionKey", { length: 128 }).notNull(),
  conditionLabel: varchar("conditionLabel", { length: 255 }).notNull(),
  conditionDescription: text("conditionDescription"),
  category: mysqlEnum("category", ["market", "economy", "sports", "custom"]).notNull(),
  rewardValueUsd: decimal("rewardValueUsd", { precision: 10, scale: 2 }).notNull(),
  rewardLabel: varchar("rewardLabel", { length: 255 }),
  resolutionWindowDays: int("resolutionWindowDays").default(30).notNull(),
  dataSource: varchar("dataSource", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type IncentiveOption = typeof incentiveOptions.$inferSelect;
export type InsertIncentiveOption = typeof incentiveOptions.$inferInsert;

// ─── Intents ──────────────────────────────────────────────────────────────────
export const intents = mysqlTable("intents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  transactionId: int("transactionId"),
  campaignId: int("campaignId").notNull(),
  incentiveOptionId: int("incentiveOptionId").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
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
  }>(),
  status: mysqlEnum("status", [
    "CREATED",
    "TRACKING",
    "PENDING_RESOLUTION",
    "RESOLVED_WIN",
    "RESOLVED_LOSS",
    "CANCELLED",
    "ERROR",
  ]).default("CREATED").notNull(),
  resolveAt: timestamp("resolveAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Intent = typeof intents.$inferSelect;
export type InsertIntent = typeof intents.$inferInsert;

// ─── Resolutions ──────────────────────────────────────────────────────────────
export const resolutions = mysqlTable("resolutions", {
  id: int("id").autoincrement().primaryKey(),
  intentId: int("intentId").notNull().unique(),
  outcome: mysqlEnum("outcome", ["WIN", "LOSS"]).notNull(),
  proofJson: json("proofJson").$type<Record<string, unknown>>(),
  resolvedAt: timestamp("resolvedAt").defaultNow().notNull(),
  resolverRunId: int("resolverRunId"),
});
export type Resolution = typeof resolutions.$inferSelect;
export type InsertResolution = typeof resolutions.$inferInsert;

// ─── Settlements ──────────────────────────────────────────────────────────────
export const settlements = mysqlTable("settlements", {
  id: int("id").autoincrement().primaryKey(),
  intentId: int("intentId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", [
    "PENDING",
    "APPLIED",
    "WIN_PENDING_ELIGIBILITY",
    "FAILED_RETRYING",
    "FAILED_NEEDS_REVIEW",
    "CAP_REACHED",
    "EXPIRED_UNCLAIMED",
    "REVERSED",
  ]).default("PENDING").notNull(),
  rewardValueUsd: decimal("rewardValueUsd", { precision: 10, scale: 2 }),
  rewardBalanceUsdBefore: decimal("rewardBalanceUsdBefore", { precision: 10, scale: 2 }).default("0"),
  currentPlanPriceUsd: decimal("currentPlanPriceUsd", { precision: 10, scale: 2 }),
  monthsToDefer: int("monthsToDefer"),
  remainderBalanceUsd: decimal("remainderBalanceUsd", { precision: 10, scale: 2 }),
  nextInvoiceDateBefore: timestamp("nextInvoiceDateBefore"),
  nextInvoiceDateAfter: timestamp("nextInvoiceDateAfter"),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  attempts: int("attempts").default(0).notNull(),
  lastAttemptAt: timestamp("lastAttemptAt"),
  lastError: text("lastError"),
  eligibilityClaimExpiresAt: timestamp("eligibilityClaimExpiresAt"),
  appliedAt: timestamp("appliedAt"),
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = typeof settlements.$inferInsert;

// ─── Reward Balances ──────────────────────────────────────────────────────────
export const rewardBalances = mysqlTable("rewardBalances", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  remainderUsd: decimal("remainderUsd", { precision: 10, scale: 2 }).default("0").notNull(),
  monthsAwardedLast365d: decimal("monthsAwardedLast365d", { precision: 5, scale: 2 }).default("0").notNull(),
  windowStartedAt: timestamp("windowStartedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RewardBalance = typeof rewardBalances.$inferSelect;
export type InsertRewardBalance = typeof rewardBalances.$inferInsert;

// ─── Ledger ───────────────────────────────────────────────────────────────────
export const ledger = mysqlTable("ledger", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  intentId: int("intentId"),
  settlementId: int("settlementId"),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  amountUsd: decimal("amountUsd", { precision: 10, scale: 2 }),
  description: text("description"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Ledger = typeof ledger.$inferSelect;
export type InsertLedger = typeof ledger.$inferInsert;

// ─── Resolver Runs ────────────────────────────────────────────────────────────
export const resolverRuns = mysqlTable("resolverRuns", {
  id: int("id").autoincrement().primaryKey(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  intentsProcessed: int("intentsProcessed").default(0),
  winsFound: int("winsFound").default(0),
  lossesFound: int("lossesFound").default(0),
  settlementsTriggered: int("settlementsTriggered").default(0),
  errorMessage: text("errorMessage"),
});
export type ResolverRun = typeof resolverRuns.$inferSelect;
export type InsertResolverRun = typeof resolverRuns.$inferInsert;

// ─── Incentives (legacy — kept for backward compat) ───────────────────────────
export const incentives = mysqlTable("incentives", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  transactionId: int("transactionId"),
  subscriptionId: int("subscriptionId"),
  conditionKey: varchar("conditionKey", { length: 64 }).notNull(),
  conditionLabel: varchar("conditionLabel", { length: 256 }),
  conditionCategory: mysqlEnum("conditionCategory", ["market", "sports", "economy", "custom"]).notNull().default("market"),
  conditionDetail: text("conditionDetail"),
  rewardDescription: varchar("rewardDescription", { length: 256 }),
  rewardValueCents: int("rewardValueCents"),
  status: mysqlEnum("status", ["pending", "achieved", "not_achieved", "expired", "cancelled"]).default("pending").notNull(),
  resolvedAt: timestamp("resolvedAt"),
  expiresAt: timestamp("expiresAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Incentive = typeof incentives.$inferSelect;
export type InsertIncentive = typeof incentives.$inferInsert;
