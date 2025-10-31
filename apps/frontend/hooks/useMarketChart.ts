import * as React from 'react';
import { getCoinGeckoMarketChart, MarketChart } from '../lib/marketData';

type Interval = '1D' | '1W' | '1M' | '6M' | '1Y';
const intervalToDays: Record<Interval, number> = { '1D': 1, '1W': 7, '1M': 30, '6M': 180, '1Y': 365 };

const memCache = new Map<string, MarketChart>();

function key(id: string, vs: string, interval: Interval) {
  return `${id}:${vs}:${interval}`;
}

export function useMarketChart({ id, vs = 'usd', initial = '1D' as Interval }) {
  const [interval, setInterval] = React.useState<Interval>(initial);
  const [data, setData] = React.useState<MarketChart | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'ready'>('idle');
  const latestReqRef = React.useRef(0);

  const select = React.useCallback((next: Interval) => {
    setInterval(next);
  }, []);

  React.useEffect(() => {
    const k = key(id, vs, interval);

    // Serve from memory cache immediately if available (non-blocking UI)
    const cached = memCache.get(k);
    if (cached) {
      setData(cached);
      setStatus('ready');
    } else {
      setStatus('loading');
    }

    // Fire request; ensure only latest response applies
    const reqId = Date.now();
    latestReqRef.current = reqId;
    (async () => {
      const res = await getCoinGeckoMarketChart(id, vs, intervalToDays[interval], { timeoutMs: 3000, ttlMs: 60_000 });
      if (latestReqRef.current !== reqId) return; // stale
      memCache.set(k, res.data);
      setData(res.data);
      setStatus('ready');
    })();
  }, [id, vs, interval]);

  return { interval, select, data, status } as const;
}

export type { Interval };

