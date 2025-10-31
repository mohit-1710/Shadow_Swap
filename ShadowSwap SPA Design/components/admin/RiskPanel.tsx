"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function RiskPanel({ risk }: { risk: { stuckEscrows: number; expiredOrders: number; authMismatches: number; replays: number; blacklistedHits: number; largeWithdrawals: number } }) {
  const items = [
    { label: 'Stuck escrows', val: risk.stuckEscrows },
    { label: 'Expired orders', val: risk.expiredOrders },
    { label: 'Authority mismatches', val: risk.authMismatches },
    { label: 'Replay attempts', val: risk.replays },
    { label: 'Blacklisted hits', val: risk.blacklistedHits },
    { label: 'Large withdrawals', val: risk.largeWithdrawals },
  ]
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader><CardTitle className="text-white">Risk Overview</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((i) => (
            <div key={i.label} className="bg-white/5 border border-white/10 rounded-md p-3">
              <div className="text-xs text-white/60">{i.label}</div>
              <div className={`text-xl font-semibold ${i.val > 0 ? 'text-red-300' : 'text-emerald-300'}`}>{i.val}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

