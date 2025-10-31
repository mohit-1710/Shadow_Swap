import { Connection, PublicKey } from '@solana/web3.js'
import { getSignaturesForAddressRL, getTransactionRL } from '@/lib/rpc'

export type DailyVolumes = { day: string; base: number; quote: number }

const DAY_MS = 24 * 60 * 60 * 1000

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/**
 * Scans recent transactions for the program ID and parses settlement logs
 * to compute daily traded volumes. Real data, no mocks.
 *
 * Notes:
 * - Uses the program's msg! output from submit_match_results, which logs
 *   amount (base units, lamports), price (quote/base, micro units), and
 *   quote_total (quote micro units).
 */
export async function getDailyVolumesFromLogs(
  connection: Connection,
  programId: PublicKey,
  lookbackDays = 30,
  maxSignatures = 60,
): Promise<DailyVolumes[]> {
  const since = Date.now() - lookbackDays * DAY_MS
  const byDay = new Map<string, { base: number; quote: number }>()
  // Pre-seed buckets
  for (let i = lookbackDays - 1; i >= 0; i--) {
    const key = dayKey(since + i * DAY_MS)
    byDay.set(key, { base: 0, quote: 0 })
  }

  // Fetch recent signatures for program
  const sigs = await getSignaturesForAddressRL(programId, { limit: maxSignatures }, connection)

  // Fetch transactions sequentially to avoid RPC rate spikes
  for (const s of sigs) {
    // Throttle to avoid RPC 429 in dev
    await sleep(120)
    const tx = await getTransactionRL(s.signature, { maxSupportedTransactionVersion: 0 }, connection)
    if (!tx || !tx.meta || !tx.blockTime) continue
    const tsMs = tx.blockTime * 1000
    if (tsMs < since) continue
    const key = dayKey(tsMs)
    if (!byDay.has(key)) byDay.set(key, { base: 0, quote: 0 })

    const logs = tx.meta.logMessages || []
    for (const line of logs) {
      // Example: Program log: Settling match: buyer=.., seller=.., amount=123, price=456, quote_total=789
      if (line.includes('Settling match:')) {
        const m = line.match(/amount=(\d+),\s*price=(\d+),\s*quote_total=(\d+)/)
        if (m) {
          const amount = Number(m[1]) // base units (lamports)
          const quoteTotal = Number(m[3]) // quote micro units
          const baseSol = amount / 1e9
          const quoteUsdc = quoteTotal / 1e6
          const cur = byDay.get(key) || { base: 0, quote: 0 }
          cur.base += baseSol
          cur.quote += quoteUsdc
          byDay.set(key, cur)
        }
      }
    }
  }

  return Array.from(byDay.entries()).map(([day, v]) => ({ day, base: Number(v.base.toFixed(6)), quote: Number(v.quote.toFixed(2)) }))
}

// Small helper to pause between RPC calls to avoid 429 rate-limits
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }
