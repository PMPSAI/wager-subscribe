import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB functions — covers all helpers used by routers
vi.mock("./db", () => ({
  // User / auth
  upsertUser: vi.fn().mockResolvedValue({}),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
  updateUserStripeCustomerId: vi.fn().mockResolvedValue({}),
  // Subscriptions
  getActiveSubscriptionByUserId: vi.fn().mockResolvedValue(null),
  createSubscription: vi.fn().mockResolvedValue({}),
  // Transactions
  getTransactionBySessionId: vi.fn().mockResolvedValue(null),
  getTransactionById: vi.fn().mockResolvedValue(null),
  getTransactionsByUserId: vi.fn().mockResolvedValue([]),
  createTransaction: vi.fn().mockResolvedValue({}),
  markTransactionIncentiveSelected: vi.fn().mockResolvedValue({}),
  // Incentives (legacy)
  getIncentiveByTransactionId: vi.fn().mockResolvedValue(null),
  getIncentivesByUserId: vi.fn().mockResolvedValue([]),
  createIncentive: vi.fn().mockResolvedValue({}),
  updateIncentiveStatus: vi.fn().mockResolvedValue({}),
  getAllIncentives: vi.fn().mockResolvedValue([]),
  // Campaigns
  getCampaigns: vi.fn().mockResolvedValue([]),
  getCampaignById: vi.fn().mockResolvedValue(null),
  createCampaign: vi.fn().mockResolvedValue({ id: 1 }),
  updateCampaign: vi.fn().mockResolvedValue({}),
  getIncentiveOptionsByCampaign: vi.fn().mockResolvedValue([]),
  createIncentiveOption: vi.fn().mockResolvedValue({ id: 1 }),
  // Intents
  getUserIntents: vi.fn().mockResolvedValue([]),
  getIntentsByUser: vi.fn().mockResolvedValue([]),
  getIntentById: vi.fn().mockResolvedValue(null),
  createIntent: vi.fn().mockResolvedValue({ id: 1 }),
  updateIntentStatus: vi.fn().mockResolvedValue({}),
  getAllIntents: vi.fn().mockResolvedValue([]),
  getTrackingIntents: vi.fn().mockResolvedValue([]),
  // Settlements
  getSettlements: vi.fn().mockResolvedValue([]),
  getSettlementById: vi.fn().mockResolvedValue(null),
  createSettlement: vi.fn().mockResolvedValue({ id: 1 }),
  updateSettlementStatus: vi.fn().mockResolvedValue({}),
  // Resolver
  getLastResolverRun: vi.fn().mockResolvedValue(null),
  createResolverRun: vi.fn().mockResolvedValue({ id: 1 }),
  updateResolverRun: vi.fn().mockResolvedValue({}),
  // Reward balance & ledger
  getOrCreateRewardBalance: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    remainderUsd: "0.00",
    monthsAwardedLast365d: "0",
    updatedAt: new Date(),
  }),
  getLedgerByUser: vi.fn().mockResolvedValue([]),
  // Merchant KPIs
  getMerchantKPIs: vi.fn().mockResolvedValue({
    totalIntents: 0,
    totalWins: 0,
    totalLosses: 0,
    winRate: 0,
    totalRewardUsd: 0,
    pendingSettlements: 0,
  }),
  // DB connection
  getDb: vi.fn().mockResolvedValue(null),
}));

// Mock the ./stripe module so getStripe() doesn't require STRIPE_SECRET_KEY in tests
vi.mock("./stripe", () => ({
  getStripe: vi.fn().mockReturnValue({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/test",
        }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/portal" }),
      },
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        items: { data: [{ price: { id: "price_test" }, current_period_end: 9999999999 }] },
      }),
    },
  }),
}));

// Mock Stripe package (for direct imports)
vi.mock("stripe", () => {
  const Stripe = vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/test",
        }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/portal" }),
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
    req: {
      protocol: "https",
      headers: { origin: "http://localhost:3000" },
    } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("subscription.plans", () => {
  it("returns all plans as public procedure", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
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
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.subscription.createCheckoutSession({ planTier: "pro" })).rejects.toThrow();
  });
});

describe("incentiv.conditions", () => {
  it("returns conditions for starter tier", async () => {
    const ctx = createUserCtx();
    const caller = appRouter.createCaller(ctx);
    const conditions = await caller.incentiv.conditions({ planTier: "starter" });
    expect(conditions.length).toBeGreaterThan(0);
    expect(conditions.every((c) => c.availableFor.includes("starter"))).toBe(true);
  });

  it("returns more conditions for pro tier than starter", async () => {
    const ctx = createUserCtx();
    const caller = appRouter.createCaller(ctx);
    const starterConditions = await caller.incentiv.conditions({ planTier: "starter" });
    const proConditions = await caller.incentiv.conditions({ planTier: "pro" });
    expect(proConditions.length).toBeGreaterThan(starterConditions.length);
  });
});

describe("incentiv.resolveIncentive", () => {
  it("allows admin to resolve an incentive", async () => {
    const ctx = createUserCtx("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.incentiv.resolveIncentive({ incentiveId: 1, outcome: "achieved" });
    expect(result.success).toBe(true);
  });

  it("forbids non-admin from resolving an incentive", async () => {
    const ctx = createUserCtx("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.incentiv.resolveIncentive({ incentiveId: 1, outcome: "achieved" })
    ).rejects.toThrow();
  });
});

describe("dashboard.summary", () => {
  it("returns summary for authenticated user", async () => {
    const ctx = createUserCtx();
    const caller = appRouter.createCaller(ctx);
    const summary = await caller.dashboard.summary();
    expect(summary).toHaveProperty("stats");
    expect(summary.stats.total).toBe(0);
    expect(summary.stats.achieved).toBe(0);
    expect(summary.incentives).toEqual([]);
    expect(summary.intents).toEqual([]);
    expect(summary.ledger).toEqual([]);
  });
});

describe("merchant.kpis", () => {
  it("allows admin to fetch merchant KPIs", async () => {
    const ctx = createUserCtx("admin");
    const caller = appRouter.createCaller(ctx);
    const kpis = await caller.merchant.kpis();
    expect(kpis).toHaveProperty("totalIntents");
    expect(kpis).toHaveProperty("winRate");
  });

  it("forbids non-admin from fetching merchant KPIs", async () => {
    const ctx = createUserCtx("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.merchant.kpis()).rejects.toThrow();
  });
});
