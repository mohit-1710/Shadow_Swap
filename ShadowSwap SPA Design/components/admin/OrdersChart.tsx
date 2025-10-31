"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"

export type OrdersDaily = { day: string; count: number }

export function OrdersChart({ data }: { data: OrdersDaily[] }) {
  return (
    <Card className="glass accent-line accent-line-cyan">
      <CardHeader>
        <CardTitle className="text-white">Orders Created (last 30 days)</CardTitle>
      </CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8 }}>
            {/* Minimal grid lines; no background fill */}
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
            <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#0b0f14', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            <Bar dataKey="count" fill="#22d3ee" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
