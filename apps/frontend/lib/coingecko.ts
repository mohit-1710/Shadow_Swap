import { getJSONWithCache } from './apiClient';

export type CoinGeckoSimplePrice = Record<string, Record<string, number>>;

export async function getCoinGeckoSimplePrice(ids: string[], vsCurrency = 'usd', opts?: { timeoutMs?: number; ttlMs?: number }) {
  const idsParam = ids.join(',');
  const url = `/api/coingecko/prices?ids=${encodeURIComponent(idsParam)}&vs_currency=${encodeURIComponent(vsCurrency)}${opts?.ttlMs ? `&ttl_ms=${opts.ttlMs}` : ''}`;
  return getJSONWithCache<CoinGeckoSimplePrice>(url, {
    timeoutMs: opts?.timeoutMs ?? 3000,
    // If both network and cache fail, return empty object as a safe fallback
    mockFallback: {},
  });
}

