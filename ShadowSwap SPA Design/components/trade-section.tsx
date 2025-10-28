"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PriceCharts } from "./price-charts"
import { ArrowRightLeft } from "lucide-react"

export function TradeSection() {
  const [fromToken, setFromToken] = useState("SOL")
  const [toToken, setToToken] = useState("USDC")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [orderType, setOrderType] = useState<"limit" | "market">("limit")

  const handleSwap = () => {
    setFromToken(toToken)
    setToToken(fromToken)
  }

  return (
    <section id="trade" className="py-12 sm:py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">Trade with Privacy</h2>
          <p className="text-white/60 text-base sm:text-lg">Execute orders without exposing your positions to the mempool</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Trade Form - Mobile First (shows first on mobile) */}
          <div className="lg:col-span-1 lg:order-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Place Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Order Type Tabs */}
                <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
                  <button
                    onClick={() => setOrderType("limit")}
                    className={`flex-1 py-2 rounded transition-all touch-manipulation ${
                      orderType === "limit" ? "bg-purple-500 text-white font-medium glow-purple" : "text-white/60 hover:text-white active:text-white"
                    }`}
                  >
                    Limit
                  </button>
                  <button
                    onClick={() => setOrderType("market")}
                    className={`flex-1 py-2 rounded transition-all touch-manipulation ${
                      orderType === "market" ? "bg-purple-500 text-white font-medium glow-purple" : "text-white/60 hover:text-white active:text-white"
                    }`}
                  >
                    Market
                  </button>
                </div>

                {/* From Token */}
                <div>
                  <label className="block text-sm text-white/70 mb-2">From</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      className="flex-1"
                    />
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-md text-white font-medium transition-colors touch-manipulation">
                      {fromToken}
                    </button>
                  </div>
                  <div className="text-xs text-white/40 mt-1">Balance: 10.5 SOL</div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleSwap}
                    className="p-2 bg-purple-500/10 hover:bg-purple-500/20 active:bg-purple-500/30 rounded-lg text-purple-400 transition-colors hover:glow-purple touch-manipulation"
                  >
                    <ArrowRightLeft size={20} />
                  </button>
                </div>

                {/* To Token */}
                <div>
                  <label className="block text-sm text-white/70 mb-2">To</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={toAmount}
                      onChange={(e) => setToAmount(e.target.value)}
                      className="flex-1"
                    />
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-md text-white font-medium transition-colors touch-manipulation">
                      {toToken}
                    </button>
                  </div>
                  <div className="text-xs text-white/40 mt-1">Balance: 5,234.50 USDC</div>
                </div>

                {/* Price Input (for limit orders) */}
                {orderType === "limit" && (
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Price</label>
                    <Input type="number" placeholder="0.00" className="w-full" />
                  </div>
                )}

                {/* Fee Info */}
                <div className="bg-white/5 p-3 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between text-white/60">
                    <span>Exchange Rate</span>
                    <span>1 SOL = 142.50 USDC</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Fee</span>
                    <span className="text-purple-400">0.1%</span>
                  </div>
                </div>

                {/* Action Button */}
                <Button variant="default" size="lg" className="w-full">
                  {orderType === "limit" ? "Place Limit Order" : "Execute Trade"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Price Charts - Desktop Second (shows second on mobile) */}
          <div className="lg:col-span-2 lg:order-1">
            <PriceCharts />
          </div>
        </div>
      </div>
    </section>
  )
}
