import { Connection, PublicKey, Cluster } from '@solana/web3.js'

// Shared connection + rate-limited wrappers to avoid RPC 429

const DEFAULT_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com'
const URLS = (process.env.NEXT_PUBLIC_RPC_URLS || '').split(',').map(s => s.trim()).filter(Boolean)
const ENDPOINTS = URLS.length > 0 ? URLS : [DEFAULT_URL]

let currentIndex = 0
let sharedConnection: Connection | null = null

export function getSharedConnection(): Connection {
  const url = ENDPOINTS[currentIndex]
  if (!sharedConnection) {
    sharedConnection = new Connection(url, 'confirmed')
  }
  return sharedConnection
}

function rotateEndpoint() {
  if (ENDPOINTS.length <= 1) return
  currentIndex = (currentIndex + 1) % ENDPOINTS.length
  sharedConnection = new Connection(ENDPOINTS[currentIndex], 'confirmed')
  // eslint-disable-next-line no-console
  console.warn(`RPC: switched endpoint to ${ENDPOINTS[currentIndex]}`)
}

function isRateLimitError(e: any): boolean {
  const msg = typeof e === 'string' ? e : (e?.message || '')
  return /429|Too many requests|rate limit/i.test(msg)
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function withBackoff<T>(fn: () => Promise<T>, label: string, maxRetries = 4): Promise<T> {
  const delays = [500, 1000, 2000, 4000]
  let lastErr: any
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (e: any) {
      lastErr = e
      const rate = isRateLimitError(e)
      const delay = delays[Math.min(attempt, delays.length - 1)]
      // eslint-disable-next-line no-console
      console.error(`RPC error on ${label}${rate ? ' (429)' : ''}. Retrying after ${delay}ms...`)
      if (rate && attempt >= 1) rotateEndpoint()
      await sleep(delay)
    }
  }
  throw lastErr
}

// Small in-memory TTL cache for read calls
type CacheEntry<T> = { v: T, t: number, ttl: number }
const cache = new Map<string, CacheEntry<any>>()

function getCache<T>(key: string): T | null {
  const e = cache.get(key)
  if (!e) return null
  if (Date.now() - e.t > e.ttl) { cache.delete(key); return null }
  return e.v as T
}
function setCache<T>(key: string, v: T, ttl: number) {
  cache.set(key, { v, t: Date.now(), ttl })
}

export async function getLatestBlockhashRL(conn = getSharedConnection()) {
  const key = 'getLatestBlockhash'
  const c = getCache<any>(key)
  if (c) return c
  const v = await withBackoff(() => conn.getLatestBlockhash(), 'getLatestBlockhash')
  // blockhash changes often; cache very briefly
  setCache(key, v, 1500)
  return v
}

export async function getAccountInfoRL(pubkey: PublicKey, conn = getSharedConnection()) {
  const key = `getAccountInfo:${pubkey.toBase58()}`
  const c = getCache<any>(key)
  if (c) return c
  const v = await withBackoff(() => conn.getAccountInfo(pubkey), 'getAccountInfo')
  setCache(key, v, 3000)
  return v
}

export async function getMultipleAccountsInfoRL(pubkeys: PublicKey[], conn = getSharedConnection()) {
  const v = await withBackoff(() => conn.getMultipleAccountsInfo(pubkeys, { commitment: 'confirmed' }), 'getMultipleAccountsInfo')
  return v
}

export async function getSignaturesForAddressRL(address: PublicKey, opts: Parameters<Connection['getSignaturesForAddress']>[1], conn = getSharedConnection()) {
  return withBackoff(() => conn.getSignaturesForAddress(address, opts), 'getSignaturesForAddress')
}

export async function getTransactionRL(sig: string, opts: Parameters<Connection['getTransaction']>[1], conn = getSharedConnection()) {
  return withBackoff(() => conn.getTransaction(sig, opts), 'getTransaction')
}

export async function getSlotRL(conn = getSharedConnection()) {
  return withBackoff(() => conn.getSlot('confirmed'), 'getSlot')
}

export async function getRecentPerformanceSamplesRL(conn = getSharedConnection()) {
  return withBackoff(() => conn.getRecentPerformanceSamples(1), 'getRecentPerformanceSamples')
}

