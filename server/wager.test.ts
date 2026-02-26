import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB functions
vi.mock("./db", () => ({
  getActiveSubscriptionByUserId: vi.fn().mockResolvedValue(null),
  getTransactionBySessionId: vi.fn().mockResolvedValue(null),
  getTransactionById: vi.fn().mockResolvedValue(null),
  getTransactionsByUserId: vi.fn().mockResolvedValue([]),
  getWagerByTransactionId: vi.fn().mockResolvedValue(null),
  getWagersByUserId: vi.fn().mockResolvedValue([]),
  createTransaction: vi.fn().mockResolvedValue({}),
  createWager: vi.fn().mockResolvedValue({}),
  markTransactionWagerSelected: vi.fn().mockResolvedValue({}),
  updateUserStripeCustomerId: vi.fn().mockResolvedValue({}),
  updateWagerStatus: vi.fn().mockResolvedValue({}),
  getAllWagers: vi.fn().mockResolvedValue([]),
  createSubscription: vi.fn().mockResolvedValue({}),
}));

// Mock Stripe
vi.mock("stripe", () => {
  const Stripe = vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ id: "cs_test_123", url: "https://checkout.stripe.com/test" }),
      },
    },
  }));
  return { default: Stripe };
});

function createUserCtx(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: { origin: "http://localhost:3000" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("subscription.plans", () => {
  it("returns all plans as public procedure", async () => {
    const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const caller = appRouter.createCaller(ctx);
    const plans = await caller.subscription.plans();
    expect(plans).toHaveLength(3);
    expect(plans.map((p) => p.tier)).toEqual(["starter", "pro", "elite"]);
  });
});

describe("subscription.createCheckoutSession", () => {
  it("creates a checkout session for authenticated user", async () => {
    const ctx = createUserCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.createCheckoutSession({ planTier: "pro" });
    expect(result.url).toBe("https://checkout.stripe.com/test");
  });

  it("throws for unauthenticated user", async () => {
    const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.subscription.createCheckoutSession({ planTier: "pro" })).rejects.toThrow();
  });
});

describe("wager.conditions", () => {
  it("returns conditions for starter tier (market only)", async () => {
    const ctx = createUserCtx();
    const caller = appRouter.createCaller(ctx);
    const conditions = await caller.wager.conditions({ planTier: "starter" });
    expect(conditions.length).toBeGreaterThan(0);
    expect(conditions.every((c) => c.availableFor.includes("starter"))).toBe(true);
  });

  it("returns more conditions for pro tier", async () => {
    const ctx = createUserCtx();
    const caller = appRouter.createCaller(ctx);
    const starterConditions = await caller.wager.conditions({ planTier: "starter" });
    const proConditions = await caller.wager.conditions({ planTier: "pro" });
    expect(proConditions.length).toBeGreaterThan(starterConditions.length);
  });
});

describe("wager.resolveWager", () => {
  it("allows admin to resolve a wager", async () => {
    const ctx = createUserCtx("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wager.resolveWager({ wagerId: 1, outcome: "won" });
    expect(result.success).toBe(true);
  });

  it("forbids non-admin from resolving a wager", async () => {
    const ctx = createUserCtx("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.wager.resolveWager({ wagerId: 1, outcome: "won" })).rejects.toThrow();
  });
});

describe("dashboard.summary", () => {
  it("returns summary for authenticated user", async () => {
    const ctx = createUserCtx();
    const caller = appRouter.createCaller(ctx);
    const summary = await caller.dashboard.summary();
    expect(summary).toHaveProperty("stats");
    expect(summary.stats.total).toBe(0);
    expect(summary.stats.won).toBe(0);
    expect(summary.wagers).toEqual([]);
  });
});
