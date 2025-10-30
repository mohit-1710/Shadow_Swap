"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pill } from "@/components/ui/pill"
import { useOrderBook } from "@/hooks/useOrderBook"
import { useWallet } from "@/contexts/WalletContext"
import { AlertCircle, Lock, Loader2 } from "lucide-react"
import { ORDER_STATUS } from "@/lib/program"

export function OrderBook() {
  const { isWalletConnected } = useWallet()
  const { orders, isLoading } = useOrderBook(10000) // Refresh every 10s

  // Calculate statistics from real orders
  const activeOrders = orders.filter(o => 
    o.status === ORDER_STATUS.ACTIVE || 
    o.status === ORDER_STATUS.PARTIAL ||
    o.status === ORDER_STATUS.MATCHED_PENDING
  )
  const filledOrders = orders.filter(o => 
    o.status === ORDER_STATUS.FILLED || 
    o.status === ORDER_STATUS.EXECUTED
  )
  const totalOrders = orders.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-400" />
            Encrypted Order Book
          </CardTitle>
          <Pill variant={isLoading ? "warning" : "success"}>
            {isLoading ? "Syncing..." : "Live"}
          </Pill>
        </div>
      </CardHeader>
      <CardContent>
        {/* Privacy Notice */}
        <div className="mb-6 bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-purple-200/80">
              <p className="font-semibold mb-1">Privacy-Preserving Order Book</p>
              <p className="text-xs text-purple-200/60">
                Individual order details (price, amount) are encrypted to protect trader privacy. 
                Only aggregated statistics are displayed. Orders are matched off-chain by the keeper bot.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="text-xs text-white/50 mb-1">Active Orders</div>
            <div className="text-2xl font-bold text-green-400">
              {isLoading && !orders.length ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                activeOrders.length
              )}
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="text-xs text-white/50 mb-1">Filled Orders</div>
            <div className="text-2xl font-bold text-blue-400">
              {isLoading && !orders.length ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                filledOrders.length
              )}
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="text-xs text-white/50 mb-1">Total Orders</div>
            <div className="text-2xl font-bold text-purple-400">
              {isLoading && !orders.length ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                totalOrders
              )}
            </div>
          </div>
        </div>

        {/* Demo Order Book (Simulated) */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-white/70">Simulated Market Depth</h3>
            <span className="text-xs text-white/40">(Demo Data)</span>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Bids */}
              <div>
                <h4 className="text-xs font-semibold text-green-400 mb-3">Bids (Buy Orders)</h4>
                <div className="space-y-1 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-white/40 pb-1 border-b border-white/5">
                    <span>Price (USDC)</span>
                    <span className="text-right">Size (SOL)</span>
                  </div>
                  {[
                    { price: 142.45, size: 125 },
                    { price: 142.40, size: 210 },
                    { price: 142.35, size: 187 },
                    { price: 142.30, size: 320 },
                    { price: 142.25, size: 245 },
                  ].map((bid, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 text-white/60 py-0.5">
                      <span className="text-green-400 font-mono">{bid.price.toFixed(2)}</span>
                      <span className="text-right font-mono">{bid.size.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asks */}
              <div>
                <h4 className="text-xs font-semibold text-red-400 mb-3">Asks (Sell Orders)</h4>
                <div className="space-y-1 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-white/40 pb-1 border-b border-white/5">
                    <span>Price (USDC)</span>
                    <span className="text-right">Size (SOL)</span>
                  </div>
                  {[
                    { price: 142.55, size: 150 },
                    { price: 142.60, size: 220 },
                    { price: 142.65, size: 165 },
                    { price: 142.70, size: 280 },
                    { price: 142.75, size: 310 },
                  ].map((ask, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 text-white/60 py-0.5">
                      <span className="text-red-400 font-mono">{ask.price.toFixed(2)}</span>
                      <span className="text-right font-mono">{ask.size.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex justify-between text-xs text-white/50">
                <span>Spread</span>
                <span className="text-purple-400 font-medium">0.07% (0.10 USDC)</span>
              </div>
            </div>
          </div>
        </div>

        {!isWalletConnected && (
          <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
            <AlertCircle className="w-4 h-4" />
            <span>Connect wallet to see your personal orders in Order History</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
