"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type LpRow = { owner: string; tvlShare: number; fees: number; apr: number }

export function LpAnalytics({ tvl, utilization, topLps }: { tvl: number; utilization: number; topLps: LpRow[] }) {
  const fmt = (n: number) => Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white">TVL & Utilization</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-white/60 text-xs">TVL</div>
              <div className="text-xl font-semibold text-white">${fmt(tvl)}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Utilization</div>
              <div className="text-xl font-semibold text-white">{utilization.toFixed(1)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white">Top LPs</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-white/60">
                  <th className="text-left py-2">Owner</th>
                  <th className="text-left py-2">TVL Share</th>
                  <th className="text-left py-2">Fees</th>
                  <th className="text-left py-2">APR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {topLps.map((r) => (
                  <tr key={r.owner} className="text-white/90">
                    <td className="py-2 font-mono text-xs">{r.owner}</td>
                    <td className="py-2">{r.tvlShare.toFixed(1)}%</td>
                    <td className="py-2">${fmt(r.fees)}</td>
                    <td className="py-2">{r.apr.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

