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

// ─── Merchants ────────────────────────────────────────────────────────────────
// Represents a merchant (business) that uses IncentivSubscribe.
// Each merchant has their own Stripe Connect account, campaigns, and tenant
// isolation.  The owning user is tracked via userId for RBAC.
export const merchants = mysqlTable("merchants", {
  id: int("id").autoincrement().primaryKey(),
  /** The platform user who owns / administers this merchant account. */
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  /** Stripe Connect account ID (set after OAuth). */
  stripeAccountId: varchar("stripeAccountId", { length: 128 }),
  /** Stripe Connect OAuth access token (encrypted at rest in production). */
  stripeAccessToken: text("stripeAccessToken"),
  /** Stripe Connect refresh token. */
  stripeRefreshToken: text("stripeRefreshToken"),
  /** Stripe publishable key for the connected account. */
  stripePublishableKey: varchar("stripePublishableKey", { length: 128 }),
  /** Stripe webhook endpoint ID registered for this merchant. */
  stripeWebhookEndpointId: varchar("stripeWebhookEndpointId", { length: 128 }),
  /** Stripe webhook signing secret for this merchant. */
  stripeWebhookSecret: text("stripeWebhookSecret"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = typeof merchants.$inferInsert;

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
// A Campaign belongs to a Merchant (multi-tenant).  The merchantId column
// enables tenant isolation — all queries should filter by merchantId.
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  /** Tenant isolation: which merchant owns this campaign. */
  merchantId: int("merchantId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /** Stripe Price IDs that activate this campaign at checkout. */
  stripePriceIds: json("stripePriceIds").$type<string[]>().notNull(),
  maxSelections: int("maxSelections").default(1).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  termsText: text("termsText"),
  riskLimitUsd: decimal("riskLimitUsd", { precision: 10, scale: 2 }),
  /** Weekly resolution schedule — cron expression (default: weekly on Monday). */
  resolutionCron: varchar("resolutionCron", { length: 64 }).default("0 0 9 * * 1"),
  /** Hard cap: max months that can be awarded per rolling 365-day window. */
  capMonthsPer365d: int("capMonthsPer365d").default(12).notNull(),
  /** Claim window in days after a WIN resolution. */
  claimWindowDays: int("claimWindowDays").default(7).notNull(),
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
  /** Legacy field — kept for backward compat; use campaign.claimWindowDays instead. */
  resolutionWindowDays: int("resolutionWindowDays").default(7).notNull(),
  dataSource: varchar("dataSource", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type IncentiveOption = typeof incentiveOptions.$inferSelect;
export type InsertIncentiveOption = typeof incentiveOptions.$inferInsert;

// ─── Intents ──────────────────────────────────────────────────────────────────
// An Intent is created when a customer selects an incentive option after
// checkout.  The termsSnapshot is locked at creation time and is immutable.
//
// Status machine:
//   CREATED → TRACKING → PENDING_RESOLUTION → RESOLVED_WIN | RESOLVED_LOSS
//                                           ↘ CANCELLED | ERROR
export const intents = mysqlTable("intents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  transactionId: int("transactionId"),
  campaignId: int("campaignId").notNull(),
  incentiveOptionId: int("incentiveOptionId").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  /** Immutable snapshot of the option terms locked at intent creation. */
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
// Immutable record written by the weekly resolver job.
export const resolutions = mysqlTable("resolutions", {
  id: int("id").autoincrement().primaryKey(),
  intentId: int("intentId").notNull().unique(),
  outcome: mysqlEnum("outcome", ["WIN", "LOSS"]).notNull(),
  /** Proof / evidence JSON from the data source. */
  proofJson: json("proofJson").$type<Record<string, unknown>>(),
  resolvedAt: timestamp("resolvedAt").defaultNow().notNull(),
  resolverRunId: int("resolverRunId"),
});
export type Resolution = typeof resolutions.$inferSelect;
export type InsertResolution = typeof resolutions.$inferInsert;

// ─── Settlements ──────────────────────────────────────────────────────────────
// Tracks the application of a WIN reward to a Stripe subscription.
//
// Status machine:
//   PENDING → APPLIED
//           → WIN_PENDING_ELIGIBILITY (subscription not active at resolution)
//               → APPLIED (after grace window + retry)
//               → FAILED_NEEDS_REVIEW (after N retries)
//           → CAP_REACHED
//           → EXPIRED_UNCLAIMED
//           → REVERSED
//           → FAILED_RETRYING → FAILED_NEEDS_REVIEW
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
  /** floor((rewardValueUsd + remainderBalanceBefore) / currentPlanPriceUsd) */
  monthsToDefer: int("monthsToDefer"),
  /** (rewardValueUsd + remainderBalanceBefore) - (monthsToDefer * currentPlanPriceUsd) */
  remainderBalanceUsd: decimal("remainderBalanceUsd", { precision: 10, scale: 2 }),
  nextInvoiceDateBefore: timestamp("nextInvoiceDateBefore"),
  nextInvoiceDateAfter: timestamp("nextInvoiceDateAfter"),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  attempts: int("attempts").default(0).notNull(),
  lastAttemptAt: timestamp("lastAttemptAt"),
  lastError: text("lastError"),
  /** Expiry of the 7-day grace window for WIN_PENDING_ELIGIBILITY. */
  eligibilityClaimExpiresAt: timestamp("eligibilityClaimExpiresAt"),
  appliedAt: timestamp("appliedAt"),
  /** Idempotency key to prevent duplicate settlement applications. */
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = typeof settlements.$inferInsert;

// ─── Reward Balances ──────────────────────────────────────────────────────────
// Per-user running balance of remainder USD and 12-month cap tracking.
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
// Immutable append-only audit trail.  Never update or delete rows.
//
// eventType values: AWARD_APPLIED | AWARD_PENDING | CAP_REACHED | EXPIRED | REVERSED | LOSS
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
// Audit log for each execution of the weekly resolver job.
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

// ─── Webhook Events (persistent) ─────────────────────────────────────────────
// Persists Stripe webhook events to the database for merchant diagnostics.
// Replaces the in-memory store in server/_core/webhookEvents.ts for
// production durability.
export const webhookEvents = mysqlTable("webhookEvents", {
  id: int("id").autoincrement().primaryKey(),
  /** Stripe event ID (e.g. evt_...). */
  stripeEventId: varchar("stripeEventId", { length: 128 }).notNull().unique(),
  /** Stripe event type (e.g. checkout.session.completed). */
  eventType: varchar("eventType", { length: 128 }).notNull(),
  signatureValid: boolean("signatureValid").default(false).notNull(),
  status: mysqlEnum("status", ["processed", "invalid", "test", "error"]).notNull(),
  /** Full Stripe event payload for debugging. */
  payload: json("payload").$type<Record<string, unknown>>(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

// ─── Embed Tokens ─────────────────────────────────────────────────────────────
// Short-lived signed tokens for the embedded customer dashboard (iframe / JS
// snippet).  Merchants generate these server-side and pass them to the embed.
export const embedTokens = mysqlTable("embedTokens", {
  id: int("id").autoincrement().primaryKey(),
  /** The merchant that issued this token. */
  merchantId: int("merchantId").notNull(),
  /** The end-customer this token grants access to. */
  userId: int("userId").notNull(),
  /** Opaque token value (signed JWT or random secret). */
  token: varchar("token", { length: 256 }).notNull().unique(),
  /** When this token expires. */
  expiresAt: timestamp("expiresAt").notNull(),
  /** Whether the token has been revoked. */
  revoked: boolean("revoked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EmbedToken = typeof embedTokens.$inferSelect;
export type InsertEmbedToken = typeof embedTokens.$inferInsert;

// ─── Incentives (legacy — kept for backward compat) ───────────────────────────
// This table predates the Campaign / IncentiveOption / Intent model.
// New code should use intents + incentiveOptions instead.
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
