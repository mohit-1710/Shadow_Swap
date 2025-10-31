"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type Kpi = {
  label: string
  value: string
  sub?: string
  trend?: { dir: "up" | "down"; value: string }
}

export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((k) => (
        <Card key={k.label} className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs text-white/60 font-normal">{k.label}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold text-white">{k.value}</div>
            {k.sub ? <div className="text-xs text-white/60 mt-1">{k.sub}</div> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
