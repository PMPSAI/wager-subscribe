import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { pushWebhookEvent } from "./_core/webhookEvents";
import { persistWebhookEvent } from "./db";
import {
  createSubscription,
  getSubscriptionByStripeId,
  getTransactionBySessionId,
  updateSubscriptionStatus,
  updateTransactionStatus,
  updateUserStripeCustomerId,
} from "./db";
import { getPlanByPriceId } from "./products";
import { getStripe } from "./stripe";

async function recordWebhookEvent(record: {
  id: string;
  type: string;
  signatureValid: boolean;
  status: "processed" | "invalid" | "test" | "error";
  payload?: Record<string, unknown>;
  errorMessage?: string;
}): Promise<void> {
  // Always push to in-memory store for immediate UI visibility
  pushWebhookEvent({
    id: record.id,
    type: record.type,
    timestamp: new Date().toISOString(),
    signatureValid: record.signatureValid,
    status: record.status,
  });
  // Also persist to DB (fails gracefully if DB is unavailable)
  try {
    await persistWebhookEvent({
      stripeEventId: record.id === "unknown" ? `unknown-${Date.now()}` : record.id,
      eventType: record.type,
      signatureValid: record.signatureValid,
      status: record.status,
      payload: record.payload,
      errorMessage: record.errorMessage,
    });
  } catch (err) {
    console.warn("[Webhook] Failed to persist event to DB:", err instanceof Error ? err.message : err);
  }
}

export function registerStripeWebhook(app: Express) {
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe not configured";
      console.error("[Webhook]", message);
      return res.status(503).json({ error: message });
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Webhook] STRIPE_WEBHOOK_SECRET is not set");
      return res.status(503).json({ error: "STRIPE_WEBHOOK_SECRET is not set" });
    }
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Webhook] Signature verification failed:", message);
      await recordWebhookEvent({
        id: "unknown",
        type: "unknown",
        signatureValid: false,
        status: "invalid",
        errorMessage: message,
      });
      return res.status(400).send(`Webhook Error: ${message}`);
    }
    // Handle test events
    if (event.id.startsWith("evt_test_")) {
      await recordWebhookEvent({
        id: event.id,
        type: event.type,
        signatureValid: true,
        status: "test",
        payload: event as unknown as Record<string, unknown>,
      });
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }
    await recordWebhookEvent({
      id: event.id,
      type: event.type,
      signatureValid: true,
      status: "processed",
      payload: event as unknown as Record<string, unknown>,
    });
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
          await updateTransactionStatus(sessionId, "completed", {
            stripePaymentIntentId: (session.payment_intent as string) ?? undefined,
            stripeSubscriptionId: subscriptionId ?? undefined,
          });
          if (userId && customerId) {
            await updateUserStripeCustomerId(userId, customerId);
          }
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
      // Record the error in DB
      await recordWebhookEvent({
        id: event.id,
        type: event.type,
        signatureValid: true,
        status: "error",
        payload: event as unknown as Record<string, unknown>,
        errorMessage: err instanceof Error ? err.message : "Unknown handler error",
      });
      return res.status(500).json({ error: "Webhook handler failed" });
    }
    return res.json({ received: true });
  });
}
