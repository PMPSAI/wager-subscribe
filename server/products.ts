export type PlanTier = "starter" | "pro" | "elite";

export interface Plan {
  tier: PlanTier;
  name: string;
  priceId: string;
  amountCents: number;
  currency: string;
  features: string[];
  /** Number of active incentive conditions allowed per billing cycle. -1 = unlimited. */
  incentiveSlots: number;
  /** Condition categories available to this tier. */
  conditionCategories: string[];
  rewardDescription: string;
  rewardValueCents: number;
  popular?: boolean;
}

export const PLANS: Plan[] = [
  {
    tier: "starter",
    name: "Starter",
    priceId: "price_1T7zNuGi8GTL1o1Rwg4Vw8Q0",
    amountCents: 900,
    currency: "usd",
    features: [
      "1 active incentive condition per month",
      "Market conditions only",
      "Email support",
      "Basic performance dashboard",
    ],
    incentiveSlots: 1,
    conditionCategories: ["market"],
    rewardDescription: "1 Month Free ($9 subscription credit)",
    rewardValueCents: 900,
  },
  {
    tier: "pro",
    name: "Pro",
    priceId: "price_1T7zNvGi8GTL1o1Rf8yQwTjy",
    amountCents: 2900,
    currency: "usd",
    features: [
      "5 active incentive conditions per month",
      "Market, Sports & Economy conditions",
      "Priority 24/7 support",
      "Full analytics dashboard",
      "Incentive history & export",
    ],
    incentiveSlots: 5,
    conditionCategories: ["market", "sports", "economy"],
    rewardDescription: "12 Months Free ($348 subscription credit)",
    rewardValueCents: 34800,
    popular: true,
  },
  {
    tier: "elite",
    name: "Elite",
    priceId: "price_1T7zNvGi8GTL1o1RXE8PRDs3",
    amountCents: 7900,
    currency: "usd",
    features: [
      "Unlimited active incentive conditions",
      "All condition categories including Custom",
      "1-on-1 dedicated support",
      "Early access to new features",
      "Advanced analytics & reporting",
      "API access",
    ],
    incentiveSlots: -1,
    conditionCategories: ["market", "sports", "economy", "custom"],
    rewardDescription: "24 Months Free ($1,896 subscription credit)",
    rewardValueCents: 189600,
  },
];

export function getPlanByPriceId(priceId: string): Plan | undefined {
  return PLANS.find((p) => p.priceId === priceId);
}

export function getPlanByTier(tier: PlanTier): Plan | undefined {
  return PLANS.find((p) => p.tier === tier);
}
