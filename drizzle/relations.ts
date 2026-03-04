import { relations } from "drizzle-orm";
import {
  campaigns,
  embedTokens,
  incentiveOptions,
  intents,
  ledger,
  merchants,
  resolutions,
  resolverRuns,
  rewardBalances,
  settlements,
  subscriptions,
  transactions,
  users,
  webhookEvents,
} from "./schema";

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many, one }) => ({
  merchants: many(merchants),
  subscriptions: many(subscriptions),
  transactions: many(transactions),
  intents: many(intents),
  settlements: many(settlements),
  rewardBalance: one(rewardBalances, {
    fields: [users.id],
    references: [rewardBalances.userId],
  }),
  ledgerEntries: many(ledger),
  embedTokens: many(embedTokens),
}));

// ─── Merchants ────────────────────────────────────────────────────────────────
export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  owner: one(users, {
    fields: [merchants.userId],
    references: [users.id],
  }),
  campaigns: many(campaigns),
  embedTokens: many(embedTokens),
}));

// ─── Subscriptions ────────────────────────────────────────────────────────────
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [campaigns.merchantId],
    references: [merchants.id],
  }),
  incentiveOptions: many(incentiveOptions),
  intents: many(intents),
}));

// ─── Incentive Options ────────────────────────────────────────────────────────
export const incentiveOptionsRelations = relations(incentiveOptions, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [incentiveOptions.campaignId],
    references: [campaigns.id],
  }),
  intents: many(intents),
}));

// ─── Intents ──────────────────────────────────────────────────────────────────
export const intentsRelations = relations(intents, ({ one }) => ({
  user: one(users, {
    fields: [intents.userId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [intents.campaignId],
    references: [campaigns.id],
  }),
  incentiveOption: one(incentiveOptions, {
    fields: [intents.incentiveOptionId],
    references: [incentiveOptions.id],
  }),
  resolution: one(resolutions, {
    fields: [intents.id],
    references: [resolutions.intentId],
  }),
  settlement: one(settlements, {
    fields: [intents.id],
    references: [settlements.intentId],
  }),
}));

// ─── Resolutions ──────────────────────────────────────────────────────────────
export const resolutionsRelations = relations(resolutions, ({ one }) => ({
  intent: one(intents, {
    fields: [resolutions.intentId],
    references: [intents.id],
  }),
  resolverRun: one(resolverRuns, {
    fields: [resolutions.resolverRunId],
    references: [resolverRuns.id],
  }),
}));

// ─── Settlements ──────────────────────────────────────────────────────────────
export const settlementsRelations = relations(settlements, ({ one }) => ({
  intent: one(intents, {
    fields: [settlements.intentId],
    references: [intents.id],
  }),
  user: one(users, {
    fields: [settlements.userId],
    references: [users.id],
  }),
}));

// ─── Reward Balances ──────────────────────────────────────────────────────────
export const rewardBalancesRelations = relations(rewardBalances, ({ one }) => ({
  user: one(users, {
    fields: [rewardBalances.userId],
    references: [users.id],
  }),
}));

// ─── Ledger ───────────────────────────────────────────────────────────────────
export const ledgerRelations = relations(ledger, ({ one }) => ({
  user: one(users, {
    fields: [ledger.userId],
    references: [users.id],
  }),
  intent: one(intents, {
    fields: [ledger.intentId],
    references: [intents.id],
  }),
  settlement: one(settlements, {
    fields: [ledger.settlementId],
    references: [settlements.id],
  }),
}));

// ─── Resolver Runs ────────────────────────────────────────────────────────────
export const resolverRunsRelations = relations(resolverRuns, ({ many }) => ({
  resolutions: many(resolutions),
}));

// ─── Embed Tokens ─────────────────────────────────────────────────────────────
export const embedTokensRelations = relations(embedTokens, ({ one }) => ({
  merchant: one(merchants, {
    fields: [embedTokens.merchantId],
    references: [merchants.id],
  }),
  user: one(users, {
    fields: [embedTokens.userId],
    references: [users.id],
  }),
}));
