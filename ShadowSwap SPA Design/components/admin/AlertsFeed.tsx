"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type Alert = { id: string; level: 'info' | 'warn' | 'error'; message: string; ts: number }

export function AlertsFeed({ alerts }: { alerts: Alert[] }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader><CardTitle className="text-white">Recent Alerts</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-white/60"><th className="text-left py-2">Time</th><th className="text-left py-2">Level</th><th className="text-left py-2">Message</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {alerts.map((a) => (
                <tr key={a.id} className="text-white/90">
                  <td className="py-2">{new Date(a.ts).toLocaleTimeString()}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full border text-xs ${a.level === 'info' ? 'border-white/20 text-white/70' : a.level === 'warn' ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30' : 'bg-red-500/10 text-red-300 border-red-500/30'}`}>{a.level.toUpperCase()}</span>
                  </td>
                  <td className="py-2">{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

