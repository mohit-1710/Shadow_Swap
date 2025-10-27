"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pill } from "@/components/ui/pill"

const mockBids = [
  { price: 142.45, amount: 1250.5, total: 177938.73 },
  { price: 142.4, amount: 2100.0, total: 298740.0 },
  { price: 142.35, amount: 1875.25, total: 266531.04 },
  { price: 142.3, amount: 3200.0, total: 455360.0 },
  { price: 142.25, amount: 2450.75, total: 348226.44 },
]

const mockAsks = [
  { price: 142.55, amount: 1500.0, total: 213825.0 },
  { price: 142.6, amount: 2200.5, total: 313913.0 },
  { price: 142.65, amount: 1650.25, total: 235373.13 },
  { price: 142.7, amount: 2800.0, total: 399560.0 },
  { price: 142.75, amount: 3100.5, total: 442525.38 },
]

export function OrderBook() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>SOL/USDC Order Book</CardTitle>
          <Pill variant="success">Live</Pill>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-8">
          {/* Bids */}
          <div>
            <h3 className="text-sm font-semibold text-green-400 mb-4">Bids</h3>
            <div className="space-y-1 text-sm">
              <div className="grid grid-cols-3 gap-2 text-white/40 text-xs mb-2 pb-2 border-b border-white/10">
                <span>Price</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Total</span>
              </div>
              {mockBids.map((bid, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 gap-2 text-white/70 hover:bg-white/5 p-1 rounded transition-colors"
                >
                  <span className="text-green-400">{bid.price.toFixed(2)}</span>
                  <span className="text-right">{bid.amount.toFixed(2)}</span>
                  <span className="text-right text-white/50">{bid.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Asks */}
          <div>
            <h3 className="text-sm font-semibold text-red-400 mb-4">Asks</h3>
            <div className="space-y-1 text-sm">
              <div className="grid grid-cols-3 gap-2 text-white/40 text-xs mb-2 pb-2 border-b border-white/10">
                <span>Price</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Total</span>
              </div>
              {mockAsks.map((ask, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 gap-2 text-white/70 hover:bg-white/5 p-1 rounded transition-colors"
                >
                  <span className="text-red-400">{ask.price.toFixed(2)}</span>
                  <span className="text-right">{ask.amount.toFixed(2)}</span>
                  <span className="text-right text-white/50">{ask.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Spread Info */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Spread</span>
            <span className="text-golden font-medium">0.07% (0.10 USDC)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
