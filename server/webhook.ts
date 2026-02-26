import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import {
  createSubscription,
  getSubscriptionByStripeId,
  getTransactionBySessionId,
  updateSubscriptionStatus,
  updateTransactionStatus,
  updateUserStripeCustomerId,
} from "./db";
import { getPlanByPriceId } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

export function registerStripeWebhook(app: Express) {
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Webhook] Signature verification failed:", message);
      return res.status(400).send(`Webhook Error: ${message}`);
    }

    // Handle test events
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    console.log(`[Webhook] Event: ${event.type} | ID: ${event.id}`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const sessionId = session.id;
          const userId = parseInt(session.metadata?.user_id ?? "0", 10);
          const planTier = (session.metadata?.plan_tier ?? "starter") as "starter" | "pro" | "elite";
          const planName = session.metadata?.plan_name ?? "Starter";
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          // Mark transaction as completed
          await updateTransactionStatus(sessionId, "completed", {
            stripePaymentIntentId: (session.payment_intent as string) ?? undefined,
            stripeSubscriptionId: subscriptionId ?? undefined,
          });

          // Update user's Stripe customer ID
          if (userId && customerId) {
            await updateUserStripeCustomerId(userId, customerId);
          }

          // Create subscription record
          if (subscriptionId) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = sub.items.data[0]?.price.id ?? "";
            const currentPeriodEnd = sub.items.data[0]?.current_period_end ?? 0;
            const existing = await getSubscriptionByStripeId(subscriptionId);
            if (!existing && userId) {
              await createSubscription({
                userId,
                stripeSubscriptionId: subscriptionId,
                stripeCustomerId: customerId,
                stripePriceId: priceId,
                planName,
                planTier,
                status: "active",
                currentPeriodEnd: currentPeriodEnd * 1000,
              });
            }
          }
          break;
        }

        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          const status = sub.status as "active" | "canceled" | "past_due" | "trialing" | "incomplete";
          await updateSubscriptionStatus(sub.id, status);
          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          await updateSubscriptionStatus(sub.id, "canceled");
          break;
        }

        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error("[Webhook] Handler error:", err);
      return res.status(500).json({ error: "Webhook handler failed" });
    }

    return res.json({ received: true });
  });
}
