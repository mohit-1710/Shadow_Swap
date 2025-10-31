"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"

type Point = { day: string; value: number }

export function VolumeCharts({ base, quote }: { base: Point[]; quote: Point[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white">SOL Volume (Base)</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={base} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
              <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} allowDecimals />
              <Tooltip contentStyle={{ background: '#0b0f14', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
              <Area type="monotone" dataKey="value" stroke="#60a5fa" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white">USDC Volume (Quote)</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={quote} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
              <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} allowDecimals />
              <Tooltip contentStyle={{ background: '#0b0f14', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
              <Area type="monotone" dataKey="value" stroke="#22d3ee" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

