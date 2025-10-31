"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type FlowPoint = { ts: number; value: number }

export function FlowCharts({ flowSeries, feeSeries }: { flowSeries: { solToUsdc: FlowPoint[]; usdcToSol: FlowPoint[]; netSol: FlowPoint[] }; feeSeries: { ts: number; value: number }[] }) {
  const formatTime = (ts: number) => new Date(ts).toLocaleDateString()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white">SOL → USDC Volume</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={flowSeries.solToUsdc} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="c1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6ae3ff" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6ae3ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="ts" tickFormatter={formatTime} stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip labelFormatter={(v) => formatTime(v as number)} contentStyle={{ background: "#0b0f14", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              <Area type="monotone" dataKey="value" stroke="#6ae3ff" fill="url(#c1)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white">USDC → SOL Volume</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={flowSeries.usdcToSol} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="c2" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#7ee787" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#7ee787" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="ts" tickFormatter={formatTime} stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip labelFormatter={(v) => formatTime(v as number)} contentStyle={{ background: "#0b0f14", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              <Area type="monotone" dataKey="value" stroke="#7ee787" fill="url(#c2)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white">Net SOL Flow</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={flowSeries.netSol} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="ts" tickFormatter={formatTime} stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip labelFormatter={(v) => formatTime(v as number)} contentStyle={{ background: "#0b0f14", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              <Line type="monotone" dataKey="value" stroke="#ffcc66" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white">Fees Collected</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={feeSeries} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="ts" tickFormatter={formatTime} stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip labelFormatter={(v) => formatTime(v as number)} contentStyle={{ background: "#0b0f14", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              <Bar dataKey="value" fill="#7ee787" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

