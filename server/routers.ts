import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { getStripe } from "./stripe";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  appendLedger,
  createCampaign,
  createIncentive,
  createIncentiveOption,
  createIntent,
  createResolution,
  createResolverRun,
  createSettlement,
  createTransaction,
  getActiveSubscriptionByUserId,
  getAllCampaigns,
  getAllIntents,
  getAllOptions,
  getAllSettlements,
  getCampaignById,
  getIncentiveByTransactionId,
  getIncentivesByUserId,
  getAllIncentives,
  getIntentById,
  getIntentsDueForResolution,
  getLedgerByUser,
  getMerchantKPIs,
  getOptionById,
  pauseAllCampaigns,
  getOptionsByCampaign,
  getOrCreateRewardBalance,
  getResolutionByIntentId,
  getSettlementByIntentId,
  getTransactionById,
  getTransactionBySessionId,
  getTransactionsByUserId,
  getUserIntents,
  markTransactionIncentiveSelected,
  updateCampaign,
  updateIncentiveStatus,
  updateIntentStatus,
  updateResolverRun,
  updateRewardBalance,
  updateSettlementStatus,
  updateUserStripeCustomerId,
  upsertSubscription,
  createMerchant,
  getMerchantByUserId,
  getMerchantById,
  updateMerchant,
  getAllMerchants,
  createEmbedToken,
  getEmbedToken,
  revokeEmbedToken,
  cleanExpiredEmbedTokens,
  getWebhookEventsFromDb,
} from "./db";
import { PLANS } from "./products";
import { getConditionByKey, getConditionsForTier } from "./incentiveConditions";
import { getWebhookEvents } from "./_core/webhookEvents";

function requireAdmin(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Subscription / Checkout ────────────────────────────────────────────────
  subscription: router({
    plans: publicProcedure.query(() => PLANS),

    createCheckoutSession: protectedProcedure
      .input(z.object({ planTier: z.enum(["starter", "pro", "elite"]) }))
      .mutation(async ({ ctx, input }) => {
        let stripe: Stripe;
        try {
          stripe = getStripe();
        } catch (err) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: err instanceof Error ? err.message : "Stripe is not configured",
          });
        }
        const plan = PLANS.find((p) => p.tier === input.planTier);
        if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });
        const origin = (ctx.req.headers.origin as string) || "http://localhost:3000";
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: plan.priceId, quantity: 1 }],
          customer_email: ctx.user.email ?? undefined,
          allow_promotion_codes: true,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            plan_tier: plan.tier,
            plan_name: plan.name,
            customer_email: ctx.user.email ?? "",
            customer_name: ctx.user.name ?? "",
          },
          success_url: `${origin}/incentiv-select?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/plans`,
        });
        await createTransaction({
          userId: ctx.user.id,
          stripeSessionId: session.id,
          planName: plan.name,
          planTier: plan.tier,
          amountCents: plan.amountCents,
          currency: plan.currency,
          status: "pending",
          incentiveSelected: 0,
        });
        return { url: session.url };
      }),

    verifySession: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ ctx, input }) => {
        const transaction = await getTransactionBySessionId(input.sessionId);
        if (!transaction) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
        if (transaction.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const existingIncentive = await getIncentiveByTransactionId(transaction.id);
        return {
          transaction,
          incentive: existingIncentive ?? null,
          canSelectIncentive: transaction.status === "completed" && !existingIncentive,
        };
      }),

    mySubscription: protectedProcedure.query(async ({ ctx }) => {
      return getActiveSubscriptionByUserId(ctx.user.id);
    }),

    billingPortal: protectedProcedure.mutation(async ({ ctx }) => {
      let stripe: Stripe;
      try {
        stripe = getStripe();
      } catch (err) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: err instanceof Error ? err.message : "Stripe is not configured",
        });
      }
      if (!ctx.user.stripeCustomerId) throw new TRPCError({ code: "BAD_REQUEST", message: "No Stripe customer found" });
      const origin = (ctx.req.headers.origin as string) || "http://localhost:3000";
      const session = await stripe.billingPortal.sessions.create({
        customer: ctx.user.stripeCustomerId,
        return_url: `${origin}/dashboard`,
      });
      return { url: session.url };
    }),
  }),

  // ─── Legacy Incentiv (condition selection) ──────────────────────────────────
  incentiv: router({
    conditions: protectedProcedure
      .input(z.object({ planTier: z.enum(["starter", "pro", "elite"]) }))
      .query(({ input }) => getConditionsForTier(input.planTier)),

    selectIncentive: protectedProcedure
      .input(z.object({ transactionId: z.number(), conditionKey: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const transaction = await getTransactionById(input.transactionId);
        if (!transaction) throw new TRPCError({ code: "NOT_FOUND" });
        if (transaction.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (transaction.status !== "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "Payment not yet confirmed." });
        if (transaction.incentiveSelected) throw new TRPCError({ code: "BAD_REQUEST", message: "Condition already selected." });
        const condition = getConditionByKey(input.conditionKey);
        if (!condition) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid condition key" });
        if (!condition.availableFor.includes(transaction.planTier)) throw new TRPCError({ code: "FORBIDDEN", message: "Not available for your plan tier." });
        const plan = PLANS.find((p) => p.tier === transaction.planTier);
        if (!plan) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await createIncentive({
          userId: ctx.user.id,
          transactionId: transaction.id,
          conditionKey: condition.key,
          conditionLabel: condition.label,
          conditionCategory: condition.category,
          conditionDetail: condition.detail,
          rewardDescription: plan.rewardDescription,
          rewardValueCents: plan.rewardValueCents,
          status: "pending",
          expiresAt,
        });
        await markTransactionIncentiveSelected(transaction.id);
        return { success: true };
      }),

    myIncentives: protectedProcedure.query(async ({ ctx }) => {
      const [incentiveList, txList] = await Promise.all([
        getIncentivesByUserId(ctx.user.id),
        getTransactionsByUserId(ctx.user.id),
      ]);
      const txMap = new Map(txList.map((t) => [t.id, t]));
      return incentiveList.map((i) => ({ ...i, transaction: txMap.get(i.transactionId ?? -1) ?? null }));
    }),

    resolveIncentive: protectedProcedure
      .input(z.object({ incentiveId: z.number(), outcome: z.enum(["achieved", "not_achieved"]), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await updateIncentiveStatus(input.incentiveId, input.outcome, input.notes);
        return { success: true };
      }),

    allIncentives: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return getAllIncentives();
    }),
  }),

  // ─── Campaigns ──────────────────────────────────────────────────────────────
  campaign: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return getAllCampaigns();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const c = await getCampaignById(input.id);
        if (!c) throw new TRPCError({ code: "NOT_FOUND" });
        const options = await getOptionsByCampaign(input.id);
        return { ...c, options };
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(["MARKET", "SPORTS", "ECONOMY", "CUSTOM"]),
        conditionText: z.string().min(1),
        windowDays: z.number().int().min(1).max(365),
        rewardType: z.enum(["MONTHS_FREE", "CREDIT_USD", "PERCENT_DISCOUNT"]),
        rewardValue: z.string(),
        eligibilityWindowDays: z.number().int().min(1).max(90).default(30),
        planTiers: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await createCampaign({ name: input.name, description: input.description, stripePriceIds: [], maxSelections: 1, isActive: true, termsText: input.conditionText });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
        conditionText: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const { id, ...data } = input;
        await updateCampaign(id, data as any);
        return { success: true };
      }),

    addOption: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        conditionKey: z.string().min(1),
        conditionLabel: z.string().min(1),
        conditionDescription: z.string().optional(),
        category: z.enum(["market", "economy", "sports", "custom"]),
        rewardValueUsd: z.string(),
        rewardLabel: z.string().optional(),
        resolutionWindowDays: z.number().int().min(1).default(30),
        dataSource: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await createIncentiveOption(input);
        return { success: true };
      }),

    allOptions: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return getAllOptions();
    }),
  }),

  // ─── Intents ─────────────────────────────────────────────────────────────────
  intent: router({
    /** Customer: create an intent after checkout */
    create: protectedProcedure
      .input(z.object({
        incentiveOptionId: z.number(),
        campaignId: z.number(),
        transactionId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const option = await getOptionById(input.incentiveOptionId);
        if (!option) throw new TRPCError({ code: "NOT_FOUND", message: "Option not found" });
        const activeSub = await getActiveSubscriptionByUserId(ctx.user.id);
        if (!activeSub) throw new TRPCError({ code: "FORBIDDEN", message: "Active subscription required" });
        const resolveAt = new Date();
        resolveAt.setDate(resolveAt.getDate() + option.resolutionWindowDays);
        await createIntent({
          userId: ctx.user.id,
          incentiveOptionId: input.incentiveOptionId,
          campaignId: input.campaignId,
          transactionId: input.transactionId,
          stripeSubscriptionId: activeSub.stripeSubscriptionId,
          stripeCustomerId: ctx.user.stripeCustomerId,
          status: "TRACKING",
          resolveAt,
          termsSnapshot: {
            conditionKey: option.conditionKey,
            conditionLabel: option.conditionLabel,
            conditionDescription: option.conditionDescription ?? "",
            rewardValueUsd: parseFloat(option.rewardValueUsd),
            rewardLabel: option.rewardLabel ?? "",
            resolutionWindowDays: option.resolutionWindowDays,
            dataSource: option.dataSource ?? "",
            termsText: `Condition: ${option.conditionLabel}. Reward: ${option.rewardLabel}. Window: ${option.resolutionWindowDays} days.`,
            lockedAt: new Date().toISOString(),
          },
        });
        return { success: true };
      }),

    myIntents: protectedProcedure.query(async ({ ctx }) => getUserIntents(ctx.user.id)),

    list: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return getAllIntents();
    }),

    /** Admin: manually resolve an intent */
    resolve: protectedProcedure
      .input(z.object({
        intentId: z.number(),
        outcome: z.enum(["WIN", "LOSS"]),
        proofNote: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const intent = await getIntentById(input.intentId);
        if (!intent) throw new TRPCError({ code: "NOT_FOUND" });
        const option = await getOptionById(intent.incentiveOptionId);
        if (!option) throw new TRPCError({ code: "NOT_FOUND" });

        await createResolution({
          intentId: intent.id,
          outcome: input.outcome,
          proofJson: input.proofNote ? { note: input.proofNote } : undefined,
        });

        if (input.outcome === "WIN") {
          await createSettlement({
            intentId: intent.id,
            userId: intent.userId,
            rewardValueUsd: option.rewardValueUsd,
            status: "WIN_PENDING_ELIGIBILITY",
          });
          await updateIntentStatus(intent.id, "RESOLVED_WIN");
        } else {
          await updateIntentStatus(intent.id, "RESOLVED_LOSS");
          await appendLedger({
            userId: intent.userId,
            intentId: intent.id,
            eventType: "LOSS",
            amountUsd: "0",
            description: `Condition not met: ${option.conditionLabel}`,
          });
        }
        return { success: true };
      }),
  }),

  // ─── Settlements ─────────────────────────────────────────────────────────────
  settlement: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return getAllSettlements();
    }),

    /** Customer: claim a pending win settlement */
    claim: protectedProcedure
      .input(z.object({ intentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const settlement = await getSettlementByIntentId(input.intentId);
        if (!settlement) throw new TRPCError({ code: "NOT_FOUND" });
        if (settlement.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (settlement.status !== "WIN_PENDING_ELIGIBILITY") throw new TRPCError({ code: "BAD_REQUEST", message: "Not in claimable state" });
        const now = new Date();
        if (settlement.eligibilityClaimExpiresAt && settlement.eligibilityClaimExpiresAt < now) {
          await updateSettlementStatus(settlement.id, "EXPIRED_UNCLAIMED");
          throw new TRPCError({ code: "BAD_REQUEST", message: "Claim window has expired" });
        }
        const balance = await getOrCreateRewardBalance(ctx.user.id);
        const currentRemainder = parseFloat(balance?.remainderUsd ?? "0");
        const rewardUsd = parseFloat(settlement.rewardValueUsd ?? "0");
        const newRemainder = currentRemainder + rewardUsd;
        await updateRewardBalance(ctx.user.id, newRemainder.toFixed(2), balance?.monthsAwardedLast365d ?? "0");
        await updateSettlementStatus(settlement.id, "APPLIED", { appliedAt: now });
        await updateIntentStatus(input.intentId, "RESOLVED_WIN");
        await appendLedger({
          userId: ctx.user.id,
          intentId: input.intentId,
          settlementId: settlement.id,
          eventType: "WIN_APPLIED",
          amountUsd: rewardUsd.toFixed(2),
          description: `Reward applied: $${rewardUsd.toFixed(2)} USD`,
        });
        return { success: true, rewardApplied: rewardUsd.toFixed(2) };
      }),

    applySettlement: protectedProcedure
      .input(z.object({ settlementId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await updateSettlementStatus(input.settlementId, "APPLIED", { appliedAt: new Date() });
        return { success: true };
      }),
  }),

  // ─── Resolver Job ────────────────────────────────────────────────────────────
  resolver: router({
    runWeekly: protectedProcedure.mutation(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      const runId = await createResolverRun({ status: "running", startedAt: new Date() });
      const due = await getIntentsDueForResolution();
      let processed = 0; let wins = 0; let losses = 0;
      const errors: string[] = [];

      for (const intent of due) {
        try {
          const existing = await getResolutionByIntentId(intent.id);
          if (existing) continue;
          const option = await getOptionById(intent.incentiveOptionId);
          if (!option) continue;
          // Simulate outcome (in production: call real data source)
          const outcome: "WIN" | "LOSS" = Math.random() > 0.5 ? "WIN" : "LOSS";
          await createResolution({ intentId: intent.id, outcome, proofJson: { source: "weekly_resolver", simulatedAt: new Date().toISOString() } });
          if (outcome === "WIN") {
            wins++;
            await createSettlement({ intentId: intent.id, userId: intent.userId, rewardValueUsd: option.rewardValueUsd, status: "WIN_PENDING_ELIGIBILITY" });
            await updateIntentStatus(intent.id, "RESOLVED_WIN");
          } else {
            losses++;
            await updateIntentStatus(intent.id, "RESOLVED_LOSS");
            await appendLedger({ userId: intent.userId, intentId: intent.id, eventType: "LOSS", amountUsd: "0", description: `Auto-resolved LOSS: ${option.conditionLabel}` });
          }
          processed++;
        } catch (e: any) { errors.push(`Intent ${intent.id}: ${e.message}`); }
      }

      await updateResolverRun(runId, {
        status: errors.length > 0 ? "failed" : "completed",
        completedAt: new Date(),
        intentsProcessed: processed,
        winsFound: wins,
        lossesFound: losses,
        errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
      });

      return { processed, wins, losses, errors };
    }),

    lastRun: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      const { getLastResolverRun } = await import("./db");
      return (await getLastResolverRun()) ?? null;
    }),
  }),

  // ─── Merchant Portal KPIs ────────────────────────────────────────────────────
  merchant: router({
    kpis: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      const kpis = await getMerchantKPIs();
      const base = kpis ?? {
        intents7d: 0,
        intents30d: 0,
        totalResolutions: 0,
        totalWins: 0,
        winRate: 0,
        awardsAppliedUsd: 0,
        awardsPendingUsd: 0,
        failedSettlements: 0,
        retryQueueSize: 0,
        settlementSuccessRate: 0,
        lastResolverRun: null,
      };
      return {
        ...base,
        stripeConnected: Boolean(process.env.STRIPE_SECRET_KEY),
      };
    }),
    pauseAllCampaigns: protectedProcedure.mutation(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      await pauseAllCampaigns();
      return { success: true, message: "All campaigns paused" };
    }),

    getWebhookEvents: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      // Return from DB first (persistent), normalized to WebhookEventRecord shape
      const dbEvents = await getWebhookEventsFromDb(50);
      if (dbEvents.length > 0) {
        return dbEvents.map((e) => ({
          id: e.stripeEventId,
          type: e.eventType,
          timestamp: e.createdAt.toISOString(),
          signatureValid: e.signatureValid,
          status: e.status,
        }));
      }
      return getWebhookEvents(50);
    }),

    // ─── Merchant CRUD ────────────────────────────────────────────────────────
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          slug: z
            .string()
            .min(1)
            .max(128)
            .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
          stripeAccountId: z.string().optional(),
          stripeAccessToken: z.string().optional(),
          stripeRefreshToken: z.string().optional(),
          stripePublishableKey: z.string().optional(),
          stripeWebhookEndpointId: z.string().optional(),
          stripeWebhookSecret: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const result = await createMerchant({ ...input, userId: ctx.user.id });
        return result;
      }),

    get: protectedProcedure.query(async ({ ctx }) => {
      const merchant = await getMerchantByUserId(ctx.user.id);
      return merchant ?? null;
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const merchant = await getMerchantById(input.id);
        if (!merchant) throw new TRPCError({ code: "NOT_FOUND", message: "Merchant not found" });
        return merchant;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().min(1).max(255).optional(),
          slug: z
            .string()
            .min(1)
            .max(128)
            .regex(/^[a-z0-9-]+$/)
            .optional(),
          stripeAccountId: z.string().optional(),
          stripeAccessToken: z.string().optional(),
          stripeRefreshToken: z.string().optional(),
          stripePublishableKey: z.string().optional(),
          stripeWebhookEndpointId: z.string().optional(),
          stripeWebhookSecret: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const { id, ...data } = input;
        await updateMerchant(id, data);
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return getAllMerchants();
    }),

    // ─── Embed Token ──────────────────────────────────────────────────────────
    createEmbedToken: protectedProcedure
      .input(
        z.object({
          merchantId: z.number().int().positive(),
          ttlSeconds: z.number().int().positive().default(3600),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { merchantId, ttlSeconds } = input;
        await cleanExpiredEmbedTokens();
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
        await createEmbedToken({ merchantId, userId: ctx.user.id, token, expiresAt });
        return { token, expiresAt };
      }),

    revokeEmbedToken: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx: _ctx, input }) => {
        await revokeEmbedToken(input.token);
        return { success: true };
      }),

    verifyEmbedToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const record = await getEmbedToken(input.token);
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
        if (record.revoked) throw new TRPCError({ code: "FORBIDDEN", message: "Token has been revoked" });
        if (record.expiresAt < new Date()) throw new TRPCError({ code: "FORBIDDEN", message: "Token has expired" });
        return { valid: true, merchantId: record.merchantId, userId: record.userId };
      }),
  }),

  // ─── Customer Dashboard ──────────────────────────────────────────────────────
  dashboard: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const [activeSub, incentiveList, txList, myIntents, balance, ledgerEntries] = await Promise.all([
        getActiveSubscriptionByUserId(ctx.user.id),
        getIncentivesByUserId(ctx.user.id),
        getTransactionsByUserId(ctx.user.id),
        getUserIntents(ctx.user.id),
        getOrCreateRewardBalance(ctx.user.id),
        getLedgerByUser(ctx.user.id, 20),
      ]);
      const txMap = new Map(txList.map((t) => [t.id, t]));
      const incentivesWithTx = incentiveList.map((i) => ({ ...i, transaction: txMap.get(i.transactionId ?? -1) ?? null }));
      const achieved = incentivesWithTx.filter((i) => i.status === "achieved");
      const totalRewardCents = achieved.reduce((sum, i) => sum + (i.rewardValueCents ?? 0), 0);
      return {
        subscription: activeSub ?? null,
        incentives: incentivesWithTx,
        intents: myIntents,
        balance: balance ?? null,
        ledger: ledgerEntries,
        stats: {
          total: incentivesWithTx.length,
          pending: incentivesWithTx.filter((i) => i.status === "pending").length,
          achieved: achieved.length,
          notAchieved: incentivesWithTx.filter((i) => i.status === "not_achieved").length,
          totalRewardCents,
          totalIntents: myIntents.length,
          trackingIntents: myIntents.filter((i) => i.status === "TRACKING").length,
          wonIntents: myIntents.filter((i) => i.status === "RESOLVED_WIN").length,
          remainderUsd: parseFloat(balance?.remainderUsd ?? "0"),
          monthsAwardedLast365d: parseFloat(balance?.monthsAwardedLast365d ?? "0"),
        },
      };
    }),
  }),

  // ─── Ledger ──────────────────────────────────────────────────────────────────
  ledger: router({
    mine: protectedProcedure.query(async ({ ctx }) => getLedgerByUser(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
