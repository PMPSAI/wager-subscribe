/**
 * Prediction Markets Integration
 * 
 * Fetches markets from Polymarket (CLOB API) and Kalshi (REST API).
 * Stores them in the predictionMarkets table.
 * Auto-resolves intents when a market resolves.
 */

export interface MarketData {
  source: "polymarket" | "kalshi" | "manual";
  externalId: string;
  slug?: string;
  title: string;
  description?: string;
  category?: string;
  yesPrice?: number;
  noPrice?: number;
  volume?: number;
  resolutionDate?: Date;
  resolvedAt?: Date;
  resolvedOutcome?: string;
  isActive: boolean;
  rawData?: Record<string, unknown>;
}

/**
 * Fetch active markets from Polymarket CLOB API
 * Polymarket uses the Gamma API for market data
 */
export async function fetchPolymarketMarkets(limit = 20): Promise<MarketData[]> {
  try {
    const url = `https://gamma-api.polymarket.com/markets?closed=false&limit=${limit}&order=volume&ascending=false`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Polymarket API error: ${res.status}`);
    const data = await res.json() as any[];

    return data.map((m: any) => ({
      source: "polymarket" as const,
      externalId: m.id ?? m.conditionId ?? String(m.slug),
      slug: m.slug,
      title: m.question ?? m.title ?? "Unknown",
      description: m.description,
      category: m.category ?? "market",
      yesPrice: m.outcomePrices ? parseFloat(m.outcomePrices[0]) : undefined,
      noPrice: m.outcomePrices ? parseFloat(m.outcomePrices[1]) : undefined,
      volume: m.volume ? parseFloat(m.volume) : undefined,
      resolutionDate: m.endDate ? new Date(m.endDate) : undefined,
      resolvedAt: m.resolutionTime ? new Date(m.resolutionTime) : undefined,
      resolvedOutcome: m.resolution ?? undefined,
      isActive: !m.closed && !m.archived,
      rawData: m,
    }));
  } catch (err) {
    console.warn("[Markets] Polymarket fetch failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Fetch active markets from Kalshi REST API (v2)
 * Kalshi requires an API key for full access; public endpoint available for some data
 */
export async function fetchKalshiMarkets(apiKey?: string, limit = 20): Promise<MarketData[]> {
  try {
    const headers: Record<string, string> = { "Accept": "application/json" };
    if (apiKey) headers["Authorization"] = `Token ${apiKey}`;

    const url = `https://trading-api.kalshi.com/trade-api/v2/markets?limit=${limit}&status=open`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Kalshi API error: ${res.status}`);
    const data = await res.json() as { markets: any[] };

    return (data.markets ?? []).map((m: any) => ({
      source: "kalshi" as const,
      externalId: m.ticker ?? m.id,
      slug: m.ticker,
      title: m.title ?? m.question ?? "Unknown",
      description: m.rules_primary ?? m.description,
      category: m.category ?? "market",
      yesPrice: m.yes_bid ? m.yes_bid / 100 : undefined,
      noPrice: m.no_bid ? m.no_bid / 100 : undefined,
      volume: m.volume ? parseFloat(m.volume) : undefined,
      resolutionDate: m.close_time ? new Date(m.close_time) : undefined,
      resolvedAt: m.result_at ? new Date(m.result_at) : undefined,
      resolvedOutcome: m.result ?? undefined,
      isActive: m.status === "open",
      rawData: m,
    }));
  } catch (err) {
    console.warn("[Markets] Kalshi fetch failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Check if a specific Polymarket market has resolved
 */
export async function checkPolymarketResolution(externalId: string): Promise<{ resolved: boolean; outcome?: string }> {
  try {
    const url = `https://gamma-api.polymarket.com/markets/${externalId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { resolved: false };
    const m = await res.json() as any;
    if (m.closed && m.resolution) {
      return { resolved: true, outcome: m.resolution === "yes" ? "WIN" : "LOSS" };
    }
    return { resolved: false };
  } catch {
    return { resolved: false };
  }
}

/**
 * Check if a specific Kalshi market has resolved
 */
export async function checkKalshiResolution(ticker: string, apiKey?: string): Promise<{ resolved: boolean; outcome?: string }> {
  try {
    const headers: Record<string, string> = { "Accept": "application/json" };
    if (apiKey) headers["Authorization"] = `Token ${apiKey}`;
    const url = `https://trading-api.kalshi.com/trade-api/v2/markets/${ticker}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { resolved: false };
    const data = await res.json() as any;
    const m = data.market ?? data;
    if (m.status === "finalized" && m.result) {
      return { resolved: true, outcome: m.result === "yes" ? "WIN" : "LOSS" };
    }
    return { resolved: false };
  } catch {
    return { resolved: false };
  }
}
