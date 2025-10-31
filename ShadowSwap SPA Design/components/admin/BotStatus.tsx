"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function BotStatus({ bot }: { bot: { status: "ok" | "warn" | "down"; version: string; lastBlock: number; queueLen: number; successRate: number; avgTTS: number; rpcLatency: number; errors: { code: string; count: number }[] } }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white">Settlement Bot</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-white/60 text-xs">Status</div>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs mt-1 ${bot.status === 'ok' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : bot.status === 'warn' ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30' : 'bg-red-500/10 text-red-300 border-red-500/30'}`}>{bot.status.toUpperCase()}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Version</div>
              <div className="text-xl font-semibold text-white">{bot.version}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Last Block</div>
              <div className="text-xl font-semibold text-white">{bot.lastBlock}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Queue</div>
              <div className="text-xl font-semibold text-white">{bot.queueLen}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Success Rate</div>
              <div className="text-xl font-semibold text-white">{bot.successRate.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Avg TTS</div>
              <div className="text-xl font-semibold text-white">{bot.avgTTS.toFixed(1)}s</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">RPC Latency</div>
              <div className="text-xl font-semibold text-white">{bot.rpcLatency.toFixed(0)}ms</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white">Top Errors (24h)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-white/60">
                  <th className="text-left py-2">Code</th>
                  <th className="text-left py-2">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {bot.errors.map(e => (
                  <tr key={e.code} className="text-white/90">
                    <td className="py-2">{e.code}</td>
                    <td className="py-2">{e.count}</td>
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

