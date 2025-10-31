"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type PairHealth = {
  pair: string
  spreadBps: number
  depthL5: number
  imbalancePct: number
  volatility: number
  status: "ok" | "warn" | "halted"
}

export function OrderbookHealth({ health }: { health: PairHealth[] }) {
  const fmt = (n: number) => Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Top Pairs Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-white/60">
                <th className="text-left py-2">Pair</th>
                <th className="text-left py-2">Spread (bps)</th>
                <th className="text-left py-2">Depth L5 (quote)</th>
                <th className="text-left py-2">Imbalance</th>
                <th className="text-left py-2">Volatility</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {health.map((h) => (
                <tr key={h.pair} className="text-white/90">
                  <td className="py-2">{h.pair}</td>
                  <td className="py-2">{h.spreadBps.toFixed(1)}</td>
                  <td className="py-2">{fmt(h.depthL5)}</td>
                  <td className="py-2">{h.imbalancePct.toFixed(0)}%</td>
                  <td className="py-2">{h.volatility.toFixed(2)}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full border text-xs ${h.status === 'ok' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : h.status === 'warn' ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30' : 'bg-red-500/10 text-red-300 border-red-500/30'}`}>{h.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

