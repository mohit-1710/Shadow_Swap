import { getJSONWithCache } from './apiClient';

export type MarketChart = {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
};

export async function getCoinGeckoMarketChart(
  id: string,
  vsCurrency: string,
  days: number | string,
  opts?: { timeoutMs?: number; ttlMs?: number }
) {
  const url = `/api/coingecko/market_chart?id=${encodeURIComponent(id)}&vs_currency=${encodeURIComponent(vsCurrency)}&days=${encodeURIComponent(String(days))}${opts?.ttlMs ? `&ttl_ms=${opts.ttlMs}` : ''}`;
  return getJSONWithCache<MarketChart>(url, {
    timeoutMs: opts?.timeoutMs ?? 3000,
    // Safe fallback when both network and cache fail
    mockFallback: { prices: [], market_caps: [], total_volumes: [] },
  });
}

