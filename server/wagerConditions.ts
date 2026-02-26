import type { PlanTier } from "./products";

export type WagerCategory = "market" | "sports" | "economy" | "custom";

export interface WagerCondition {
  key: string;
  label: string;
  category: WagerCategory;
  detail: string;
  availableFor: PlanTier[];
}

export const WAGER_CONDITIONS: WagerCondition[] = [
  // Market
  {
    key: "btc_100k",
    label: "Bitcoin hits $100k",
    category: "market",
    detail: "BTC/USD closes above $100,000 on any major exchange within 30 days.",
    availableFor: ["starter", "pro", "elite"],
  },
  {
    key: "sp500_record",
    label: "S&P 500 hits all-time high",
    category: "market",
    detail: "S&P 500 index closes at a new all-time high within 30 days.",
    availableFor: ["starter", "pro", "elite"],
  },
  {
    key: "eth_5k",
    label: "Ethereum hits $5,000",
    category: "market",
    detail: "ETH/USD closes above $5,000 on any major exchange within 30 days.",
    availableFor: ["starter", "pro", "elite"],
  },
  {
    key: "gold_3k",
    label: "Gold hits $3,000/oz",
    category: "market",
    detail: "Gold spot price closes above $3,000 per troy ounce within 30 days.",
    availableFor: ["starter", "pro", "elite"],
  },
  // Sports
  {
    key: "knicks_championship",
    label: "Knicks Win Championship",
    category: "sports",
    detail: "New York Knicks win the NBA Championship this season.",
    availableFor: ["pro", "elite"],
  },
  {
    key: "lakers_finals",
    label: "Lakers Reach NBA Finals",
    category: "sports",
    detail: "LA Lakers advance to the NBA Finals this season.",
    availableFor: ["pro", "elite"],
  },
  {
    key: "chiefs_superbowl",
    label: "Chiefs Win Super Bowl",
    category: "sports",
    detail: "Kansas City Chiefs win the next Super Bowl.",
    availableFor: ["pro", "elite"],
  },
  {
    key: "world_cup_upset",
    label: "Major World Cup Upset",
    category: "sports",
    detail: "A team ranked outside the top 10 wins their group stage in the next major tournament.",
    availableFor: ["pro", "elite"],
  },
  // Economy
  {
    key: "fed_rate_cut",
    label: "Fed Cuts Interest Rates",
    category: "economy",
    detail: "The Federal Reserve announces a rate cut at the next FOMC meeting (March 20).",
    availableFor: ["pro", "elite"],
  },
  {
    key: "inflation_below_2",
    label: "US Inflation Below 2%",
    category: "economy",
    detail: "US CPI year-over-year drops below 2.0% in the next monthly report.",
    availableFor: ["pro", "elite"],
  },
  {
    key: "oil_below_60",
    label: "Oil Drops Below $60/barrel",
    category: "economy",
    detail: "WTI crude oil price closes below $60 per barrel within 30 days.",
    availableFor: ["pro", "elite"],
  },
  // Custom (Elite only)
  {
    key: "custom_market",
    label: "Custom Market Condition",
    category: "custom",
    detail: "Define your own market-based condition. Our team will verify and track it.",
    availableFor: ["elite"],
  },
  {
    key: "custom_sports",
    label: "Custom Sports Condition",
    category: "custom",
    detail: "Define your own sports-based condition. Our team will verify and track it.",
    availableFor: ["elite"],
  },
];

export function getConditionsForTier(tier: PlanTier): WagerCondition[] {
  return WAGER_CONDITIONS.filter((c) => c.availableFor.includes(tier));
}

export function getConditionByKey(key: string): WagerCondition | undefined {
  return WAGER_CONDITIONS.find((c) => c.key === key);
}
