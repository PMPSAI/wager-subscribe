import Stripe from "stripe";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createSubscription,
  createTransaction,
  createWager,
  getActiveSubscriptionByUserId,
  getTransactionBySessionId,
  getTransactionById,
  getTransactionsByUserId,
  getWagerByTransactionId,
  getWagersByUserId,
  markTransactionWagerSelected,
  updateUserStripeCustomerId,
  updateWagerStatus,
  getAllWagers,
} from "./db";
import { PLANS, getPlanByPriceId } from "./products";
import { getConditionsForTier, getConditionByKey } from "./wagerConditions";
import { TRPCError } from "@trpc/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  subscription: router({
    plans: publicProcedure.query(() => PLANS),

    activeSubscription: protectedProcedure.query(async ({ ctx }) => {
      return getActiveSubscriptionByUserId(ctx.user.id);
    }),

    createCheckoutSession: protectedProcedure
      .input(z.object({ planTier: z.enum(["starter", "pro", "elite"]) }))
      .mutation(async ({ ctx, input }) => {
        const plan = PLANS.find((p) => p.tier === input.planTier);
        if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });

        const origin = (ctx.req.headers.origin as string) || "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [{ price: plan.priceId, quantity: 1 }],
          customer_email: ctx.user.email ?? undefined,
          allow_promotion_codes: true,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            customer_email: ctx.user.email ?? "",
            customer_name: ctx.user.name ?? "",
            plan_tier: plan.tier,
            plan_name: plan.name,
          },
          success_url: `${origin}/wager-select?session_id={CHECKOUT_SESSION_ID}`,
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
          wagerSelected: 0,
        });

        return { url: session.url };
      }),

    verifySession: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ ctx, input }) => {
        const transaction = await getTransactionBySessionId(input.sessionId);
        if (!transaction) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
        if (transaction.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        const existingWager = await getWagerByTransactionId(transaction.id);

        return {
          transaction,
          wager: existingWager ?? null,
          canSelectWager: transaction.status === "completed" && !existingWager,
        };
      }),
  }),

  wager: router({
    conditions: protectedProcedure
      .input(z.object({ planTier: z.enum(["starter", "pro", "elite"]) }))
      .query(({ input }) => getConditionsForTier(input.planTier)),

    selectWager: protectedProcedure
      .input(z.object({ transactionId: z.number(), conditionKey: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const transaction = await getTransactionById(input.transactionId);
        if (!transaction) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
        if (transaction.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (transaction.status !== "completed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment not completed yet" });
        }
        if (transaction.wagerSelected) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Wager already selected for this transaction" });
        }

        const condition = getConditionByKey(input.conditionKey);
        if (!condition) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid condition" });
        if (!condition.availableFor.includes(transaction.planTier)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Condition not available for your plan" });
        }

        const plan = PLANS.find((p) => p.tier === transaction.planTier);
        if (!plan) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await createWager({
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

        await markTransactionWagerSelected(transaction.id);
        return { success: true };
      }),

    myWagers: protectedProcedure.query(async ({ ctx }) => {
      const [wagerList, txList] = await Promise.all([
        getWagersByUserId(ctx.user.id),
        getTransactionsByUserId(ctx.user.id),
      ]);
      const txMap = new Map(txList.map((t) => [t.id, t]));
      return wagerList.map((w) => ({ ...w, transaction: txMap.get(w.transactionId) ?? null }));
    }),

    resolveWager: protectedProcedure
      .input(z.object({ wagerId: z.number(), outcome: z.enum(["won", "lost"]), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await updateWagerStatus(input.wagerId, input.outcome, input.notes);
        return { success: true };
      }),

    allWagers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllWagers();
    }),
  }),

  dashboard: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const [activeSub, wagerList, txList] = await Promise.all([
        getActiveSubscriptionByUserId(ctx.user.id),
        getWagersByUserId(ctx.user.id),
        getTransactionsByUserId(ctx.user.id),
      ]);
      const txMap = new Map(txList.map((t) => [t.id, t]));
      const wagersWithTx = wagerList.map((w) => ({ ...w, transaction: txMap.get(w.transactionId) ?? null }));
      const won = wagersWithTx.filter((w) => w.status === "won");
      const totalRewardCents = won.reduce((sum, w) => sum + w.rewardValueCents, 0);
      return {
        subscription: activeSub ?? null,
        wagers: wagersWithTx,
        stats: {
          total: wagersWithTx.length,
          pending: wagersWithTx.filter((w) => w.status === "pending").length,
          won: won.length,
          lost: wagersWithTx.filter((w) => w.status === "lost").length,
          totalRewardCents,
        },
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
