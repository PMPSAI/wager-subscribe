import type { PlanTier } from "./products";

export interface IncentiveCondition {
  key: string;
  label: string;
  category: "market" | "sports" | "economy" | "custom";
  detail: string;
  availableFor: PlanTier[];
}

export const INCENTIVE_CONDITIONS: IncentiveCondition[] = [
  // Market conditions (all tiers)
  {
    key: "btc_100k",
    label: "Bitcoin Reaches $100,000",
    category: "market",
    detail: "Bitcoin (BTC) price closes at or above $100,000 USD on any major exchange within 30 days.",
    availableFor: ["starter", "pro", "elite"],
  },
  {
    key: "sp500_up_5pct",
    label: "S&P 500 Gains 5%",
    category: "market",
    detail: "The S&P 500 index closes at least 5% higher than its value at the time of subscription within 30 days.",
    availableFor: ["starter", "pro", "elite"],
  },
  {
    key: "gold_2500",
    label: "Gold Hits $2,500/oz",
    category: "market",
    detail: "Gold spot price closes at or above $2,500 per troy ounce within 30 days.",
    availableFor: ["starter", "pro", "elite"],
  },
  {
    key: "eth_5k",
    label: "Ethereum Reaches $5,000",
    category: "market",
    detail: "Ethereum (ETH) price closes at or above $5,000 USD on any major exchange within 30 days.",
    availableFor: ["starter", "pro", "elite"],
  },
  // Sports conditions (pro + elite)
  {
    key: "nba_underdog_win",
    label: "NBA Underdog Team Wins Championship",
    category: "sports",
    detail: "A team ranked outside the top 4 seeds wins the NBA Championship this season.",
    availableFor: ["pro", "elite"],
  },
  {
    key: "nfl_upset_superbowl",
    label: "NFL Wild Card Team Wins Super Bowl",
    category: "sports",
    detail: "A wild card team wins the Super Bowl this season.",
    availableFor: ["pro", "elite"],
  },
  {
    key: "soccer_world_cup_upset",
    label: "Major Soccer Tournament Upset",
    category: "sports",
    detail: "A team ranked outside the top 10 wins a major international soccer tournament within 30 days.",
    availableFor: ["pro", "elite"],
  },
  // Economy conditions (pro + elite)
  {
    key: "fed_rate_cut",
    label: "Federal Reserve Cuts Interest Rates",
    category: "economy",
    detail: "The U.S. Federal Reserve announces a reduction in the federal funds rate within 30 days.",
    availableFor: ["pro", "elite"],
  },
  {
    key: "inflation_below_3",
    label: "U.S. Inflation Drops Below 3%",
    category: "economy",
    detail: "The U.S. Consumer Price Index (CPI) year-over-year rate is reported below 3% within 30 days.",
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
    detail: "Define your own market-based condition. Our team will verify and track it for you.",
    availableFor: ["elite"],
  },
  {
    key: "custom_sports",
    label: "Custom Sports Condition",
    category: "custom",
    detail: "Define your own sports-based condition. Our team will verify and track it for you.",
    availableFor: ["elite"],
  },
];

export function getConditionsForTier(tier: PlanTier): IncentiveCondition[] {
  return INCENTIVE_CONDITIONS.filter((c) => c.availableFor.includes(tier));
}

export function getConditionByKey(key: string): IncentiveCondition | undefined {
  return INCENTIVE_CONDITIONS.find((c) => c.key === key);
}
