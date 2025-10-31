import type { NextApiRequest, NextApiResponse } from 'next';

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
  const { id = 'solana', vs_currency = 'usd', days = '1', ttl_ms } = req.query as { id: string; vs_currency: string; days: string; ttl_ms?: string };
  const ttl = Math.max(5_000, Math.min(5 * 60_000, Number(ttl_ms) || DEFAULT_TTL_MS));

  const key = `cg:mc:${id}:${vs_currency}:${days}`;
  const cached = cache.get(key);
  const freshEnough = cached && Date.now() - cached.ts < ttl;

  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=${encodeURIComponent(vs_currency)}&days=${encodeURIComponent(days)}`;

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

