// Lightweight API client with timeout, cache and mock fallback

type JSONValue = any;

const memoryCache = new Map<string, { data: JSONValue; ts: number }>();

function cacheKey(url: string): string {
  return `api-cache:${url}`;
}

function readLocal<T = JSONValue>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeLocal<T = JSONValue>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export interface GetWithCacheOptions<T> {
  init?: RequestInit;
  timeoutMs?: number;
  // Returned if network fails and no cache exists
  mockFallback: T;
}

export async function getJSONWithCache<T = JSONValue>(url: string, opts: GetWithCacheOptions<T>): Promise<{ data: T; source: 'live' | 'cache' | 'mock' }>
{
  const { init, timeoutMs = 4000, mockFallback } = opts;
  const key = cacheKey(url);

  // 1) In-memory cache hit
  const mem = memoryCache.get(key) as { data: T; ts: number } | undefined;
  if (mem) {
    return { data: mem.data, source: 'cache' };
  }

  // 2) Try network with timeout
  try {
    const res = await fetchWithTimeout(url, { ...init, method: 'GET' }, timeoutMs);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    // Cache on success
    memoryCache.set(key, { data, ts: Date.now() });
    writeLocal(key, { data, ts: Date.now() });
    return { data, source: 'live' };
  } catch {
    // 3) On failure, try persisted cache
    const fromLocal = readLocal<{ data: T; ts: number }>(key);
    if (fromLocal && fromLocal.data) {
      memoryCache.set(key, fromLocal);
      return { data: fromLocal.data, source: 'cache' };
    }
    // 4) Fallback to mock, and cache it so subsequent views are instant
    const fallback = { data: mockFallback, ts: Date.now() };
    memoryCache.set(key, fallback as any);
    writeLocal(key, fallback as any);
    return { data: mockFallback, source: 'mock' };
  }
}
