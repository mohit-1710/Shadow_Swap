"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

const portfolioAssets = [
  {
    symbol: "SOL",
    name: "Solana",
    amount: 25.5,
    value: 3623.75,
    change: 12.5,
    allocation: 45,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    amount: 5234.5,
    value: 5234.5,
    change: 0,
    allocation: 35,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    amount: 1.75,
    value: 4288.75,
    change: 8.2,
    allocation: 20,
  },
]

export function PortfolioSection() {
  const totalValue = portfolioAssets.reduce((sum, asset) => sum + asset.value, 0)
  const totalChange = portfolioAssets.reduce((sum, asset) => sum + asset.change * (asset.value / totalValue), 0)

  return (
    <section id="portfolio" className="py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Your Portfolio</h2>
          <p className="text-white/60 text-lg">Monitor your assets and trading performance</p>
        </div>

        {/* Portfolio Summary */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-white/60 text-sm mb-2">Total Balance</div>
              <div className="text-3xl font-bold text-white mb-2">${totalValue.toFixed(2)}</div>
              <div className={`flex items-center gap-1 ${totalChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                {totalChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{Math.abs(totalChange).toFixed(2)}% today</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-white/60 text-sm mb-2">24h Volume</div>
              <div className="text-3xl font-bold text-white mb-2">$12,450.00</div>
              <div className="text-green-400 text-sm">+$2,100 from yesterday</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-white/60 text-sm mb-2">Total Trades</div>
              <div className="text-3xl font-bold text-white mb-2">127</div>
              <div className="text-golden text-sm">Win Rate: 68%</div>
            </CardContent>
          </Card>
        </div>

        {/* Assets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portfolioAssets.map((asset) => (
                <div
                  key={asset.symbol}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-golden/20 rounded-full flex items-center justify-center">
                        <span className="text-golden font-bold text-sm">{asset.symbol[0]}</span>
                      </div>
                      <div>
                        <div className="font-medium text-white">{asset.name}</div>
                        <div className="text-sm text-white/50">
                          {asset.amount} {asset.symbol}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-1">
                    <div className="font-medium text-white mb-1">${asset.value.toFixed(2)}</div>
                    <div
                      className={`text-sm flex items-center justify-end gap-1 ${asset.change >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {asset.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {Math.abs(asset.change).toFixed(1)}%
                    </div>
                  </div>

                  <div className="flex-1 ml-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-golden" style={{ width: `${asset.allocation}%` }} />
                      </div>
                      <span className="text-sm text-white/60 w-8 text-right">{asset.allocation}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
