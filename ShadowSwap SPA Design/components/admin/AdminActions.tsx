"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AdminActions() {
  const actions = [
    { label: 'Pause Markets', tone: 'warn' },
    { label: 'Resume Markets', tone: 'ok' },
    { label: 'List New Pair', tone: '' },
    { label: 'Update Fees', tone: '' },
    { label: 'Requeue Stuck Settlements', tone: 'warn' },
  ] as const

  const bg = (t: string) => t === 'warn' ? 'bg-yellow-400 text-black' : t === 'ok' ? 'bg-emerald-400 text-black' : 'bg-white text-black'

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader><CardTitle className="text-white">Controls</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {actions.map(a => (
            <button key={a.label} className={`px-3 py-2 rounded-md text-sm font-medium ${bg(a.tone)}`} onClick={() => alert(`${a.label} (stub)`)}>{a.label}</button>
          ))}
        </div>
        <div className="text-xs text-white/60 mt-2">Actions are stubbed; wire with role checks and program/bot flows.</div>
      </CardContent>
    </Card>
  )
}

