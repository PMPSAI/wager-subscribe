import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { getStripe, getStripeMode } from "./stripe";
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
  createMemberAccount,
  createMerchant,
  createMerchantSubscription,
  createResolution,
  createResolverRun,
  createSettlement,
  createTransaction,
  getActiveMerchantSubscription,
  getActiveSubscriptionByUserId,
  getAllCampaigns,
  getAllIntents,
  getAllMerchantSubscriptions,
  getAllMerchants,
  getAllOptions,
  getAllPredictionMarkets,
  getAllSettlements,
  getAllUsers,
  getCampaignById,
  getEnabledPredictionMarkets,
  getEmbedToken,
  getIncentiveByTransactionId,
  getIncentivesByUserId,
  getAllIncentives,
  getIntentById,
  getIntentsDueForResolution,
  getLedgerByUser,
  getMemberByEmail,
  getMemberBySessionToken,
  getMembersByMerchant,
  getMerchantByUserId,
  getMerchantById,
  getMerchantBySlug,
  getMerchantKPIs,
  getOptionById,
  getOptionByPredictionMarketId,
  getOptionsByCampaign,
  getOrCreateIncentiveOptionForMarket,
  getOrCreateRewardBalance,
  getPredictionMarketById,
  getIntentsByMerchantId,
  getUserByOpenId,
  upsertUser,
  getResolutionByIntentId,
  getSettlementByIntentId,
  getTransactionById,
  getSubscriptionByStripeId,
  getTransactionBySessionId,
  updateTransactionStatus,
  getTransactionsByUserId,
  getUserById,
  getUserIntents,
  markTransactionIncentiveSelected,
  pauseAllCampaigns,
  updateCampaign,
  updateIncentiveStatus,
  updateIntentStatus,
  updateMemberAccount,
  updateMerchant,
  updatePredictionMarket,
  updateResolverRun,
  updateRewardBalance,
  updateSettlementStatus,
  updateUserProfile,
  updateUserStripeCustomerId,
  upsertPredictionMarket,
  upsertSubscription,
  cleanExpiredEmbedTokens,
  revokeEmbedToken,
  createEmbedToken,
  getWebhookEventsFromDb,
} from "./db";
import { PLANS } from "./products";
import { getConditionByKey, getConditionsForTier } from "./incentiveConditions";
import { getWebhookEvents } from "./_core/webhookEvents";
import { fetchPolymarketMarkets, fetchKalshiMarkets, checkPolymarketResolution, checkKalshiResolution } from "./markets";

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
    plans: publicProcedure
      .input(z.object({ merchantSlug: z.string().optional() }).default({}))
      .query(async ({ input }) => {
        const base = { plans: PLANS, stripeMode: getStripeMode() };
        if (!input?.merchantSlug) return base;
        const merchant = await getMerchantBySlug(input.merchantSlug);
        const display = merchant?.stripePlanDisplay as Record<string, number> | null | undefined;
        if (!display || Object.keys(display).length === 0) return base;
        const mergedPlans = PLANS.map((p) => {
          const overrideCents = display[p.tier];
          if (overrideCents == null) return p;
          return { ...p, amountCents: overrideCents };
        });
        return { plans: mergedPlans, stripeMode: base.stripeMode };
      }),

    createCheckoutSession: protectedProcedure
      .input(
        z.object({
          planTier: z.enum(["starter", "pro", "elite"]),
          merchantSlug: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const plan = PLANS.find((p) => p.tier === input.planTier);
        if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });
        const origin = (ctx.req.headers.origin as string) || "http://localhost:3000";

        let stripe: Stripe;
        let priceId: string;
        let planName = plan.name;
        let amountCents = plan.amountCents;
        const currency = plan.currency;

        if (input.merchantSlug) {
          const merchant = await getMerchantBySlug(input.merchantSlug);
          const priceIds = merchant?.stripePlanPriceIds as Record<string, string> | null | undefined;
          const merchantPriceId = priceIds?.[input.planTier];
          if (
            merchant &&
            merchant.stripeAccessToken &&
            merchantPriceId
          ) {
            stripe = new Stripe(merchant.stripeAccessToken, {
              apiVersion: "2026-02-25.clover",
            });
            priceId = merchantPriceId;
            planName = `${merchant.name} - ${plan.name}`;
          } else if (merchant) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Merchant has not configured Stripe plan prices for this tier. Add price IDs in Settings.",
            });
          } else {
            try {
              stripe = getStripe();
              priceId = plan.priceId;
            } catch (err) {
              throw new TRPCError({
                code: "PRECONDITION_FAILED",
                message: err instanceof Error ? err.message : "Stripe is not configured",
              });
            }
          }
        } else {
          try {
            stripe = getStripe();
          } catch (err) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: err instanceof Error ? err.message : "Stripe is not configured",
            });
          }
          priceId = plan.priceId;
        }

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: priceId, quantity: 1 }],
          customer_email: ctx.user.email ?? undefined,
          allow_promotion_codes: true,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            plan_tier: plan.tier,
            plan_name: planName,
            customer_email: ctx.user.email ?? "",
            customer_name: ctx.user.name ?? "",
          },
          success_url: `${origin}/incentiv-select?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/plans`,
        });
        await createTransaction({
          userId: ctx.user.id,
          stripeSessionId: session.id,
          planName,
          planTier: plan.tier,
          amountCents,
          currency,
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

        // ── Webhook fallback: if still pending, ask Stripe directly ──────────
        // Handles cases where the webhook was delayed, misconfigured, or missed.
        if (transaction.status === "pending") {
          try {
            const stripe = getStripe();
            const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
              expand: ["subscription"],
            });
            if (session.payment_status === "paid" || session.status === "complete") {
              const subscriptionId =
                typeof session.subscription === "string"
                  ? session.subscription
                  : (session.subscription as Stripe.Subscription | null)?.id ?? null;
              const paymentIntentId =
                typeof session.payment_intent === "string" ? session.payment_intent : null;
              await updateTransactionStatus(input.sessionId, "completed", {
                stripePaymentIntentId: paymentIntentId ?? undefined,
                stripeSubscriptionId: subscriptionId ?? undefined,
              });
              const customerId =
                typeof session.customer === "string" ? session.customer : null;
              if (customerId) {
                await updateUserStripeCustomerId(ctx.user.id, customerId);
              }
              if (subscriptionId) {
                const existingSub = await getSubscriptionByStripeId(subscriptionId);
                if (!existingSub) {
                  const sub =
                    typeof session.subscription === "object" && session.subscription !== null
                      ? (session.subscription as Stripe.Subscription)
                      : await stripe.subscriptions.retrieve(subscriptionId);
                  const priceId = sub.items.data[0]?.price.id ?? "";
                  const currentPeriodEnd = sub.items.data[0]?.current_period_end ?? 0;
                  const planTier = (session.metadata?.plan_tier ?? "starter") as "starter" | "pro" | "elite";
                  const planName = session.metadata?.plan_name ?? "Starter";
                  await upsertSubscription({
                    userId: ctx.user.id,
                    stripeSubscriptionId: subscriptionId,
                    stripeCustomerId: customerId ?? "",
                    stripePriceId: priceId,
                    planName,
                    planTier,
                    status: "active",
                    currentPeriodEnd: currentPeriodEnd * 1000,
                  });
                }
              }
              // Re-read the now-completed transaction
              const updated = await getTransactionBySessionId(input.sessionId);
              if (updated) {
                const existingIncentive = await getIncentiveByTransactionId(updated.id);
                return {
                  transaction: updated,
                  incentive: existingIncentive ?? null,
                  canSelectIncentive: updated.status === "completed" && !existingIncentive,
                };
              }
            }
          } catch (stripeErr) {
            // Non-fatal: log and fall through to return pending status
            console.warn(
              "[verifySession] Stripe fallback check failed:",
              stripeErr instanceof Error ? stripeErr.message : stripeErr
            );
          }
        }
        // ────────────────────────────────────────────────────────────────────

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
      const all = await getAllCampaigns();
      if (ctx.user.role === "admin") return all;
      const merchant = await getMerchantByUserId(ctx.user.id);
      if (!merchant) return all.filter((c: any) => c.merchantId == null);
      return all.filter((c: any) => c.merchantId == null || c.merchantId === merchant.id);
    }),
    /** Public: list active campaigns with their options (for widget) */
    listPublic: publicProcedure.query(async () => {
      const campaigns = await getAllCampaigns();
      const active = campaigns.filter((c: any) => c.isActive && c.status !== "ARCHIVED" && c.status !== "PAUSED");
      const withOptions = await Promise.all(
        active.map(async (c: any) => {
          const options = await getOptionsByCampaign(c.id);
          return { ...c, options };
        })
      );
      return withOptions;
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
        category: z.enum(["market", "sports", "economy", "custom"]),
        conditionText: z.string().min(1),
        windowDays: z.number().int().min(1).max(365),
        rewardType: z.enum(["MONTHS_FREE", "CREDIT_USD", "PERCENT_DISCOUNT"]),
        rewardValue: z.string(),
        eligibilityWindowDays: z.number().int().min(1).max(90).default(30),
        planTiers: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await createCampaign({
          name: input.name,
          description: input.description,
          category: input.category,
          conditionText: input.conditionText,
          status: "ACTIVE" as any,
          stripePriceIds: [],
          maxSelections: 1,
          isActive: true,
          termsText: input.conditionText,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["market", "sports", "economy", "custom"]).optional(),
        conditionText: z.string().optional(),
        status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
        isActive: z.boolean().optional(),
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

    /** Public: widget flow – record prediction choice (yes/no) from member */
    recordPrediction: publicProcedure
      .input(z.object({
        sessionToken: z.string().min(1),
        predictionMarketId: z.number().int().positive(),
        userChoice: z.enum(["yes", "no"]),
      }))
      .mutation(async ({ input }) => {
        const member = await getMemberBySessionToken(input.sessionToken);
        if (!member) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired session" });
        if (member.sessionExpiresAt && member.sessionExpiresAt < new Date()) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expired" });
        }

        const market = await getPredictionMarketById(input.predictionMarketId);
        if (!market || !market.isEnabled) throw new TRPCError({ code: "NOT_FOUND", message: "Market not found or not enabled for predictions" });
        const option = await getOrCreateIncentiveOptionForMarket(input.predictionMarketId);
        if (!option) throw new TRPCError({ code: "NOT_FOUND", message: "Failed to get prediction option" });

        const campaign = await getCampaignById(option.campaignId);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });

        const openId = `member-${member.id}`;
        await upsertUser({
          openId,
          email: member.email,
          name: member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.email,
        });
        const user = await getUserByOpenId(openId);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });

        const resolveAt = new Date();
        resolveAt.setDate(resolveAt.getDate() + option.resolutionWindowDays);

        await createIntent({
          userId: user.id,
          merchantId: member.merchantId,
          campaignId: campaign.id,
          incentiveOptionId: option.id,
          userChoice: input.userChoice,
          status: "TRACKING",
          resolveAt,
          termsSnapshot: {
            conditionKey: option.conditionKey,
            conditionLabel: option.conditionLabel ?? "",
            conditionDescription: option.conditionDescription ?? "",
            rewardValueUsd: parseFloat(option.rewardValueUsd),
            rewardLabel: option.rewardLabel ?? "",
            resolutionWindowDays: option.resolutionWindowDays,
            dataSource: option.dataSource ?? "",
            termsText: "",
            lockedAt: new Date().toISOString(),
            predictionMarketId: market?.id,
            yesPrice: market?.yesPrice ? parseFloat(market.yesPrice) : undefined,
            noPrice: market?.noPrice ? parseFloat(market.noPrice) : undefined,
          },
        });
        return { success: true } as const;
      }),

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

          let outcome: "WIN" | "LOSS" | null = null;
          // Use prediction market resolution when available
          if (option.predictionMarketId) {
            const market = await getPredictionMarketById(option.predictionMarketId);
            if (market?.resolvedOutcome && market?.resolvedAt) {
              const userChoice = (intent.userChoice ?? "").toLowerCase();
              if (userChoice === "yes") {
                outcome = (market.resolvedOutcome?.toLowerCase() === "yes") ? "WIN" : "LOSS";
              } else if (userChoice === "no") {
                outcome = (market.resolvedOutcome?.toLowerCase() === "no") ? "WIN" : "LOSS";
              }
            }
          }
          // Fallback: simulate outcome for non-prediction-market intents
          if (outcome === null) {
            outcome = Math.random() > 0.5 ? "WIN" : "LOSS";
          }

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
          stripePlanPriceIds: z.record(z.string(), z.string()).optional(),
          stripePlanDisplay: z.record(z.string(), z.number()).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getMerchantByUserId(ctx.user.id);
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "You already have a merchant account" });
        const result = await createMerchant({ ...input, userId: ctx.user.id });
        return result;
      }),

    get: protectedProcedure.query(async ({ ctx }) => {
      const merchant = await getMerchantByUserId(ctx.user.id);
      return merchant ?? null;
    }),

    /** List predictions from widget customers for this merchant */
    listPredictions: protectedProcedure.query(async ({ ctx }) => {
      const merchant = await getMerchantByUserId(ctx.user.id);
      if (!merchant) return [];
      return getIntentsByMerchantId(merchant.id);
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
          stripePlanPriceIds: z.record(z.string(), z.string()).optional(),
          stripePlanDisplay: z.record(z.string(), z.number()).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const own = await getMerchantByUserId(ctx.user.id);
        if (own?.id !== id) requireAdmin(ctx.user.role);
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
        const own = await getMerchantByUserId(ctx.user.id);
        if (!own || own.id !== merchantId) throw new TRPCError({ code: "FORBIDDEN", message: "You can only create tokens for your own merchant" });
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
        const merchant = await getMerchantById(record.merchantId);
        return { valid: true, merchantId: record.merchantId, userId: record.userId, merchantSlug: merchant?.slug ?? undefined };
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

  // ─── Prediction Markets ───────────────────────────────────────────────────────
  markets: router({
    /** Public: list enabled markets for widget */
    listEnabled: publicProcedure.query(async () => {
      return getEnabledPredictionMarkets();
    }),

    /** Admin: list all markets with pagination */
    list: protectedProcedure
      .input(z.object({ source: z.string().optional(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return getAllPredictionMarkets({ source: input.source, limit: input.limit });
      }),

    /** Admin: sync markets from Polymarket */
    syncPolymarket: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const markets = await fetchPolymarketMarkets(input.limit);
        let synced = 0;
        for (const m of markets) {
          try {
            await upsertPredictionMarket({
              source: m.source,
              externalId: m.externalId,
              slug: m.slug,
              title: m.title,
              description: m.description,
              category: m.category,
              yesPrice: m.yesPrice?.toFixed(4),
              noPrice: m.noPrice?.toFixed(4),
              volume: m.volume?.toFixed(2),
              resolutionDate: m.resolutionDate,
              resolvedAt: m.resolvedAt,
              resolvedOutcome: m.resolvedOutcome,
              isActive: m.isActive,
              lastFetchedAt: new Date(),
              rawData: m.rawData,
            });
            synced++;
          } catch (e) { /* skip duplicates */ }
        }
        return { synced, total: markets.length };
      }),

    /** Admin: sync markets from Kalshi */
    syncKalshi: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(20), apiKey: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const apiKey = input.apiKey || process.env.KALSHI_API_KEY;
        const markets = await fetchKalshiMarkets(apiKey, input.limit);
        let synced = 0;
        for (const m of markets) {
          try {
            await upsertPredictionMarket({
              source: m.source,
              externalId: m.externalId,
              slug: m.slug,
              title: m.title,
              description: m.description,
              category: m.category,
              yesPrice: m.yesPrice?.toFixed(4),
              noPrice: m.noPrice?.toFixed(4),
              volume: m.volume?.toFixed(2),
              resolutionDate: m.resolutionDate,
              resolvedAt: m.resolvedAt,
              resolvedOutcome: m.resolvedOutcome,
              isActive: m.isActive,
              lastFetchedAt: new Date(),
              rawData: m.rawData,
            });
            synced++;
          } catch (e) { /* skip duplicates */ }
        }
        return { synced, total: markets.length };
      }),

    /** Admin: toggle market enabled/disabled for widget */
    toggleEnabled: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), isEnabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await updatePredictionMarket(input.id, { isEnabled: input.isEnabled });
        if (input.isEnabled) {
          await getOrCreateIncentiveOptionForMarket(input.id);
        }
        return { success: true };
      }),

    /** Admin: manually set a market as resolved */
    resolve: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), outcome: z.string() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await updatePredictionMarket(input.id, {
          resolvedOutcome: input.outcome,
          resolvedAt: new Date(),
          isActive: false,
        });
        return { success: true };
      }),

    /** Admin: auto-resolve intents linked to resolved markets */
    autoResolveIntents: protectedProcedure.mutation(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      const markets = await getAllPredictionMarkets({ enabledOnly: false });
      const resolvedMarkets = markets.filter((m: any) => m.resolvedOutcome && m.resolvedAt);
      let resolved = 0;
      for (const market of resolvedMarkets) {
        // Check live resolution from API
        let outcome: string | undefined = market.resolvedOutcome ?? undefined;
        if (!outcome && market.source === "polymarket") {
          const r = await checkPolymarketResolution(market.externalId);
          if (r.resolved) outcome = r.outcome;
        } else if (!outcome && market.source === "kalshi") {
          const r = await checkKalshiResolution(market.externalId, process.env.KALSHI_API_KEY);
          if (r.resolved) outcome = r.outcome;
        }
        if (!outcome) continue;
        // Update market
        await updatePredictionMarket(market.id, { resolvedOutcome: outcome, resolvedAt: new Date(), isActive: false });
        resolved++;
      }
      return { resolved };
    }),
  }),

  // ─── Admin Portal ─────────────────────────────────────────────────────────────
  admin: router({
    /** Full platform overview */
    overview: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      const [allMerchants, allUsers, allIntents, allSettlements, allMerchantSubs, allMarkets] = await Promise.all([
        getAllMerchants(),
        getAllUsers(200),
        getAllIntents(500),
        getAllSettlements(200),
        getAllMerchantSubscriptions(),
        getAllPredictionMarkets({ limit: 200 }),
      ]);
      return {
        merchants: allMerchants,
        users: allUsers,
        intents: allIntents,
        settlements: allSettlements,
        merchantSubscriptions: allMerchantSubs,
        markets: allMarkets,
        stats: {
          totalMerchants: allMerchants.length,
          activeMerchants: allMerchants.filter((m: any) => m.isActive).length,
          totalUsers: allUsers.length,
          totalIntents: allIntents.length,
          pendingIntents: allIntents.filter((i: any) => i.status === "TRACKING").length,
          resolvedIntents: allIntents.filter((i: any) => i.status?.startsWith("RESOLVED")).length,
          totalMarkets: allMarkets.length,
          enabledMarkets: allMarkets.filter((m: any) => m.isEnabled).length,
          totalRevenue: allMerchantSubs.filter((s: any) => s.status === "active").length,
        },
      };
    }),

    /** Admin: update merchant settings including Stripe mode */
    updateMerchantSettings: protectedProcedure
      .input(z.object({
        merchantId: z.number().int().positive(),
        stripeMode: z.enum(["test", "live"]).optional(),
        stripePublishableKey: z.string().optional(),
        stripeWebhookSecret: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const { merchantId, ...data } = input;
        await updateMerchant(merchantId, data);
        return { success: true };
      }),

    /** Admin: get user profile */
    getUser: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return getUserById(input.userId);
      }),

    /** Admin: update user role */
    updateUserRole: protectedProcedure
      .input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const { updateUserProfile } = await import("./db");
        await updateUserProfile(input.userId, {});
        // Role update via direct DB call
        const { getDb } = await import("./db");
        const db = await getDb();
        if (db) {
          const { users } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        }
        return { success: true };
      }),
  }),

  // ─── Member Accounts (widget end-users) ──────────────────────────────────────
  member: router({
    /** Public: widget member signup */
    signup: publicProcedure
      .input(z.object({
        merchantSlug: z.string(),
        email: z.string().email(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        anonToken: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Find merchant by slug
        const allMerchants = await getAllMerchants();
        const merchant = allMerchants.find((m: any) => m.slug === input.merchantSlug);
        if (!merchant) throw new TRPCError({ code: "NOT_FOUND", message: "Merchant not found" });

        // Check if member already exists
        const existing = await getMemberByEmail(merchant.id, input.email);
        if (existing) {
          // Return existing session token
          const sessionToken = existing.sessionToken || crypto.randomUUID();
          if (!existing.sessionToken) {
            await updateMemberAccount(existing.id, { sessionToken, sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
          }
          return { success: true, sessionToken, memberId: existing.id, isNew: false };
        }

        // Create new member
        const sessionToken = crypto.randomUUID();
        const member = await createMemberAccount({
          merchantId: merchant.id,
          email: input.email.toLowerCase(),
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          sessionToken,
          sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
        return { success: true, sessionToken, memberId: member?.id, isNew: true };
      }),

    /** Public: verify member session token */
    verify: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .query(async ({ input }) => {
        const member = await getMemberBySessionToken(input.sessionToken);
        if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
        if (member.sessionExpiresAt && member.sessionExpiresAt < new Date()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Session expired" });
        }
        return { valid: true, member: { id: member.id, email: member.email, firstName: member.firstName, lastName: member.lastName } };
      }),

    /** Admin: list all members for a merchant */
    list: protectedProcedure
      .input(z.object({ merchantId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return getMembersByMerchant(input.merchantId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
