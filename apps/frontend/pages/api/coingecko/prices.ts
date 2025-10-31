import type { NextApiRequest, NextApiResponse } from 'next';

// Simple in-memory cache for server responses
type CacheEntry = { data: any; ts: number };
const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60_000; // 1 minute

async function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { ids = '', vs_currency = 'usd', ttl_ms } = req.query as { ids: string; vs_currency: string; ttl_ms?: string };
  const ttl = Math.max(5_000, Math.min(5 * 60_000, Number(ttl_ms) || DEFAULT_TTL_MS));

  const key = `cg:${ids}:${vs_currency}`;
  const cached = cache.get(key);
  const freshEnough = cached && Date.now() - cached.ts < ttl;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${encodeURIComponent(vs_currency)}`;

  try {
    const resp = await fetchWithTimeout(url, { method: 'GET' }, 3000);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    cache.set(key, { data, ts: Date.now() });
    res.setHeader('x-cache', 'miss');
    res.status(200).json(data);
  } catch (e) {
    if (freshEnough) {
      res.setHeader('x-cache', 'hit');
      res.status(200).json(cached!.data);
      return;
    }
    res.status(504).json({ error: 'coingecko_timeout_or_error', detail: (e as Error).message });
  }
}

