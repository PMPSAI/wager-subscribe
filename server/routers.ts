import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createIncentive,
  createTransaction,
  getActiveSubscriptionByUserId,
  getIncentiveByTransactionId,
  getIncentivesByUserId,
  getAllIncentives,
  getTransactionById,
  getTransactionBySessionId,
  getTransactionsByUserId,
  markTransactionIncentiveSelected,
  updateIncentiveStatus,
  updateUserStripeCustomerId,
} from "./db";
import { PLANS } from "./products";
import { getConditionByKey, getConditionsForTier } from "./incentiveConditions";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

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

  subscription: router({
    /** Returns all available subscription plans */
    plans: publicProcedure.query(() => PLANS),

    /** Creates a Stripe Checkout session for the selected plan */
    createCheckoutSession: protectedProcedure
      .input(z.object({ planTier: z.enum(["starter", "pro", "elite"]) }))
      .mutation(async ({ ctx, input }) => {
        const plan = PLANS.find((p) => p.tier === input.planTier);
        if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });

        const origin = ctx.req.headers.origin as string || "http://localhost:3000";

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

        // Record pending transaction
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

    /** Verifies a Stripe session and returns transaction + incentive state */
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
  }),

  incentiv: router({
    /** Returns available incentive conditions for a given plan tier */
    conditions: protectedProcedure
      .input(z.object({ planTier: z.enum(["starter", "pro", "elite"]) }))
      .query(({ input }) => getConditionsForTier(input.planTier)),

    /** Selects an incentive condition for a completed transaction */
    selectIncentive: protectedProcedure
      .input(z.object({ transactionId: z.number(), conditionKey: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const transaction = await getTransactionById(input.transactionId);
        if (!transaction) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
        if (transaction.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (transaction.status !== "completed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment not yet confirmed. Please wait a moment and try again." });
        }
        if (transaction.incentiveSelected) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "An incentive condition has already been selected for this transaction." });
        }
        const condition = getConditionByKey(input.conditionKey);
        if (!condition) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid condition key" });
        if (!condition.availableFor.includes(transaction.planTier)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This condition is not available for your plan tier." });
        }
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

    /** Returns all incentives for the current user */
    myIncentives: protectedProcedure.query(async ({ ctx }) => {
      const [incentiveList, txList] = await Promise.all([
        getIncentivesByUserId(ctx.user.id),
        getTransactionsByUserId(ctx.user.id),
      ]);
      const txMap = new Map(txList.map((t) => [t.id, t]));
      return incentiveList.map((i) => ({ ...i, transaction: txMap.get(i.transactionId) ?? null }));
    }),

    /** Admin: resolve an incentive outcome */
    resolveIncentive: protectedProcedure
      .input(z.object({
        incentiveId: z.number(),
        outcome: z.enum(["achieved", "not_achieved"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await updateIncentiveStatus(input.incentiveId, input.outcome, input.notes);
        return { success: true };
      }),

    /** Admin: view all incentives across all users */
    allIncentives: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllIncentives();
    }),
  }),

  dashboard: router({
    /** Returns a summary of the user's subscription and incentive history */
    summary: protectedProcedure.query(async ({ ctx }) => {
      const [activeSub, incentiveList, txList] = await Promise.all([
        getActiveSubscriptionByUserId(ctx.user.id),
        getIncentivesByUserId(ctx.user.id),
        getTransactionsByUserId(ctx.user.id),
      ]);
      const txMap = new Map(txList.map((t) => [t.id, t]));
      const incentivesWithTx = incentiveList.map((i) => ({ ...i, transaction: txMap.get(i.transactionId) ?? null }));
      const achieved = incentivesWithTx.filter((i) => i.status === "achieved");
      const totalRewardCents = achieved.reduce((sum, i) => sum + i.rewardValueCents, 0);
      return {
        subscription: activeSub ?? null,
        incentives: incentivesWithTx,
        stats: {
          total: incentivesWithTx.length,
          pending: incentivesWithTx.filter((i) => i.status === "pending").length,
          achieved: achieved.length,
          notAchieved: incentivesWithTx.filter((i) => i.status === "not_achieved").length,
          totalRewardCents,
        },
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
