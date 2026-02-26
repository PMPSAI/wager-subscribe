import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertSubscription,
  InsertTransaction,
  InsertIncentive,
  subscriptions,
  transactions,
  users,
  incentives,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function updateUserStripeCustomerId(userId: number, stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function createSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(subscriptions).values(data);
}

export async function getActiveSubscriptionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return result[0];
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);
  return result[0];
}

export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set({ status }).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(transactions).values(data);
}

export async function getTransactionBySessionId(stripeSessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.stripeSessionId, stripeSessionId))
    .limit(1);
  return result[0];
}

export async function getTransactionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return result[0];
}

export async function updateTransactionStatus(
  stripeSessionId: string,
  status: "pending" | "completed" | "failed" | "refunded",
  extra?: { stripePaymentIntentId?: string; stripeSubscriptionId?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(transactions)
    .set({ status, ...extra })
    .where(eq(transactions.stripeSessionId, stripeSessionId));
}

export async function markTransactionIncentiveSelected(transactionId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(transactions).set({ incentiveSelected: 1 }).where(eq(transactions.id, transactionId));
}

export async function getTransactionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt));
}

// ─── Incentives ───────────────────────────────────────────────────────────────

export async function createIncentive(data: InsertIncentive) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(incentives).values(data);
}

export async function getIncentivesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(incentives)
    .where(eq(incentives.userId, userId))
    .orderBy(desc(incentives.createdAt));
}

export async function getIncentiveByTransactionId(transactionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(incentives)
    .where(eq(incentives.transactionId, transactionId))
    .limit(1);
  return result[0];
}

export async function updateIncentiveStatus(
  incentiveId: number,
  status: "pending" | "achieved" | "not_achieved" | "expired" | "cancelled",
  notes?: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(incentives)
    .set({ status, resolvedAt: status !== "pending" ? new Date() : undefined, notes })
    .where(eq(incentives.id, incentiveId));
}

export async function getAllIncentives() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incentives).orderBy(desc(incentives.createdAt));
}
