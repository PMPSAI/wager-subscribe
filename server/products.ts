export type PlanTier = "starter" | "pro" | "elite";

export interface Plan {
  tier: PlanTier;
  name: string;
  priceId: string;
  amountCents: number;
  currency: string;
  features: string[];
  wagerSlots: number;
  wagerCategories: string[];
  rewardDescription: string;
  rewardValueCents: number;
  popular?: boolean;
}

export const PLANS: Plan[] = [
  {
    tier: "starter",
    name: "Starter",
    priceId: "price_1T4wMlLBX2wmK6Zv4ykAuqm1",
    amountCents: 900,
    currency: "usd",
    features: [
      "1 active wager per month",
      "Market conditions only",
      "Email support",
      "Basic dashboard",
    ],
    wagerSlots: 1,
    wagerCategories: ["market"],
    rewardDescription: "1 Month Free ($9 value)",
    rewardValueCents: 900,
  },
  {
    tier: "pro",
    name: "Pro",
    priceId: "price_1T4wMmLBX2wmK6ZvBZ1eGDsl",
    amountCents: 2900,
    currency: "usd",
    features: [
      "5 active wagers per month",
      "Market, Sports & Economy conditions",
      "Priority 24/7 support",
      "Full analytics dashboard",
      "Wager history & export",
    ],
    wagerSlots: 5,
    wagerCategories: ["market", "sports", "economy"],
    rewardDescription: "12 Months Free ($348 value)",
    rewardValueCents: 34800,
    popular: true,
  },
  {
    tier: "elite",
    name: "Elite",
    priceId: "price_1T4wMnLBX2wmK6Zv83jUUYcl",
    amountCents: 7900,
    currency: "usd",
    features: [
      "Unlimited active wagers",
      "All conditions + Custom wagers",
      "1-on-1 dedicated support",
      "Early access to new features",
      "Advanced analytics & reporting",
      "API access",
    ],
    wagerSlots: -1, // unlimited
    wagerCategories: ["market", "sports", "economy", "custom"],
    rewardDescription: "24 Months Free ($1,896 value)",
    rewardValueCents: 189600,
  },
];

export function getPlanByPriceId(priceId: string): Plan | undefined {
  return PLANS.find((p) => p.priceId === priceId);
}

export function getPlanByTier(tier: PlanTier): Plan | undefined {
  return PLANS.find((p) => p.tier === tier);
}
