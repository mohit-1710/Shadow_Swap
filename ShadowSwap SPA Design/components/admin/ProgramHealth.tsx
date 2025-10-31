"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ProgramHealth({ program }: { program: { cluster: string; slot: number; tps: number; programId: string; version: string; idlHash: string; accounts: number; rentRisk: number; instrBreakdown: { name: string; count: number }[] } }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white">Cluster</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-white/60 text-xs">Cluster</div>
              <div className="text-xl font-semibold text-white">{program.cluster}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Slot</div>
              <div className="text-xl font-semibold text-white">{program.slot}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">TPS</div>
              <div className="text-xl font-semibold text-white">{program.tps}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Accounts</div>
              <div className="text-xl font-semibold text-white">{program.accounts}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Rent Risk</div>
              <div className="text-xl font-semibold text-white">{program.rentRisk}%</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white">Program</CardTitle></CardHeader>
        <CardContent>
          <div className="text-xs text-white/70">Program ID</div>
          <div className="font-mono text-sm text-white/90 break-all">{program.programId}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/70 text-xs">v{program.version}</span>
            <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/70 text-xs">IDL {program.idlHash.slice(0,8)}…</span>
          </div>
          <div className="mt-4">
            <div className="text-xs text-white/70 mb-2">Instruction Breakdown</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-white/60"><th className="text-left py-2">Instruction</th><th className="text-left py-2">Count</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {program.instrBreakdown.map((i) => (
                    <tr key={i.name} className="text-white/90"><td className="py-2">{i.name}</td><td className="py-2">{i.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

