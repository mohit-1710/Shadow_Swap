"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pill } from "@/components/ui/pill"
import { X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

/* OLD ORDER BOOK DATA - COMMENTED OUT
const mockOrders = [
  {
    id: "1",
    pair: "SOL/USDC",
    type: "Limit Buy",
    amount: 5.5,
    price: 142.0,
    total: 780.1,
    status: "Open",
    timestamp: "2 min ago",
  },
  {
    id: "2",
    pair: "ETH/USDC",
    type: "Limit Sell",
    amount: 2.25,
    price: 2450.5,
    total: 5513.63,
    status: "Open",
    timestamp: "15 min ago",
  },
  {
    id: "3",
    pair: "SOL/USDC",
    type: "Market Buy",
    amount: 10.0,
    price: 142.5,
    total: 1425.0,
    status: "Filled",
    timestamp: "1 hour ago",
  },
  {
    id: "4",
    pair: "BTC/USDC",
    type: "Limit Buy",
    amount: 0.05,
    price: 42500.0,
    total: 2125.0,
    status: "Cancelled",
    timestamp: "3 hours ago",
  },
]
*/

// NEW LIQUIDITY POOLS DATA
const mockPools = [
  {
    id: "1",
    tokenA: "SOL",
    tokenB: "USDC",
    liquidity: "$2.4M",
    volume24h: "$850K",
    fees24h: "$2.5K",
    apr24h: "12.5%",
    active: true,
  },
  {
    id: "2",
    tokenA: "ETH",
    tokenB: "BTC",
    liquidity: "$1.8M",
    volume24h: "$620K",
    fees24h: "$1.8K",
    apr24h: "10.2%",
    active: false,
  },
  {
    id: "3",
    tokenA: "JitoSOL",
    tokenB: "USDC",
    liquidity: "$2.1M",
    volume24h: "$780K",
    fees24h: "$2.3K",
    apr24h: "13.7%",
    active: false,
  },
  {
    id: "4",
    tokenA: "TRUMP",
    tokenB: "USDT",
    liquidity: "$950K",
    volume24h: "$380K",
    fees24h: "$1.1K",
    apr24h: "8.7%",
    active: false,
  },
  {
    id: "5",
    tokenA: "BONK",
    tokenB: "SOL",
    liquidity: "$680K",
    volume24h: "$210K",
    fees24h: "$630",
    apr24h: "6.5%",
    active: false,
  },
  {
    id: "6",
    tokenA: "MET",
    tokenB: "USDC",
    liquidity: "$420K",
    volume24h: "$125K",
    fees24h: "$375",
    apr24h: "5.2%",
    active: false,
  },
  {
    id: "7",
    tokenA: "PAYAI",
    tokenB: "ETH",
    liquidity: "$310K",
    volume24h: "$95K",
    fees24h: "$285",
    apr24h: "4.8%",
    active: false,
  },
  {
    id: "8",
    tokenA: "PUMP",
    tokenB: "JLP",
    liquidity: "$890K",
    volume24h: "$320K",
    fees24h: "$960",
    apr24h: "7.9%",
    active: false,
  },
  {
    id: "9",
    tokenA: "JLP",
    tokenB: "USDC",
    liquidity: "$1.5M",
    volume24h: "$540K",
    fees24h: "$1.6K",
    apr24h: "11.3%",
    active: false,
  },
  {
    id: "10",
    tokenA: "BTC",
    tokenB: "USDT",
    liquidity: "$3.2M",
    volume24h: "$1.1M",
    fees24h: "$3.3K",
    apr24h: "14.8%",
    active: false,
  },
]

export function OrdersSection() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  // Filter pools based on search query
  const filteredPools = mockPools.filter((pool) => {
    if (!searchQuery) return true // Show all pools when search is empty
    const query = searchQuery.toLowerCase()
    return (
      pool.tokenA.toLowerCase().includes(query) ||
      pool.tokenB.toLowerCase().includes(query)
    )
  })

  // Determine if a pool should be clickable/active
  const isPoolActive = (pool: typeof mockPools[0]) => {
    // When searching, all matched pools become active
    if (searchQuery) return true
    // When not searching, only SOL/USDC is active
    return pool.active
  }

  const handleRowClick = (pool: typeof mockPools[0]) => {
    if (isPoolActive(pool)) {
      router.push(`/trade?from=${pool.tokenA}&to=${pool.tokenB}`)
    }
  }

  const handleTradeClick = (e: React.MouseEvent, pool: typeof mockPools[0]) => {
    e.stopPropagation()
    router.push(`/trade?from=${pool.tokenA}&to=${pool.tokenB}`)
  }

  const TokenIcon = ({ symbol }: { symbol: string }) => {
    // Map token symbols to their actual icon filenames
    const iconMap: { [key: string]: string } = {
      'SOL': 'SOL-logo.png',
      'USDC': 'USDC-logo.png',
      'USDT': 'USDT-logo.png',
      'ETH': 'ETH-logo.png',
      'TRUMP': 'TRUMP-logo.jpg',
      'BTC': 'WBTC-logo.png',
      'BONK': 'USDC-logo.png', // placeholder - will use fallback
      'JLP': 'JLP-logo.png',
      'MET': 'MET-logo.png',
      'JitoSOL': 'JitoSOL-logo.png',
      'PAYAI': 'PAYAI-logo.webp',
      'PUMP': 'PUMP-logo.png',
    }

    const iconFile = iconMap[symbol] || `${symbol}-logo.png`

    return (
      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-500/20 flex items-center justify-center overflow-hidden relative">
        <Image
          src={`/icons/${iconFile}`}
          alt={symbol}
          width={24}
          height={24}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to text if icon doesn't exist
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
        <span className="text-[10px] font-bold text-purple-400 absolute">{symbol.charAt(0)}</span>
      </div>
    )
  }

  return (
    <section id="orders" className="py-12 sm:py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">Liquidity Pools</h2>
          <p className="text-white/60 text-base sm:text-lg">Explore available liquidity pools and start trading.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search pools (e.g., SOL, USDC, ETH...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Liquidity Pools</CardTitle>
          </CardHeader>
          <CardContent>
            {/* OLD ORDER BOOK TABLE - COMMENTED OUT
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-xs sm:text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/60 font-medium">Pair</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium">Type</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">Amount</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">Price</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">Total</th>
                    <th className="text-center py-3 px-4 text-white/60 font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">Time</th>
                    <th className="text-center py-3 px-4 text-white/60 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mockOrders.map((order) => (
                    <tr 
                      key={order.id}
                      onClick={() => handleRowClick(order.id)}
                      className={`border-b border-white/5 transition-colors ${
                        order.id === "1" 
                          ? "hover:bg-white/5 active:bg-white/10 cursor-pointer touch-manipulation" 
                          : "backdrop-blur-sm opacity-60 pointer-events-none"
                      }`}
                    >
                      <td className="py-3 px-4 text-white font-medium">{order.pair}</td>
                      <td className="py-3 px-4">
                        <span className={order.type.includes("Buy") ? "text-green-400" : "text-red-400"}>
                          {order.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-white">{order.amount}</td>
                      <td className="py-3 px-4 text-right text-white">${order.price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-white">${order.total.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <Pill
                          variant={
                            order.status === "Open" ? "warning" : order.status === "Filled" ? "success" : "error"
                          }
                        >
                          {order.status}
                        </Pill>
                      </td>
                      <td className="py-3 px-4 text-right text-white/50 text-xs">{order.timestamp}</td>
                      <td className="py-3 px-4 text-center">
                        {order.status === "Open" && (
                          <button className="text-white/60 hover:text-red-400 transition-colors">
                            <X size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            */}

            {/* NEW LIQUIDITY POOLS TABLE */}
            <div className="overflow-x-auto -mx-2 sm:mx-0 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent">
              <table className="w-full text-xs sm:text-sm min-w-[768px]">
                <thead className="sticky top-0 bg-black/95 backdrop-blur-md z-10">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/60 font-medium">Pool</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">Liquidity</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">Volume 24H</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">Fees 24H</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">APR 24H</th>
                    <th className="text-center py-3 px-4 text-white/60 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPools.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-white/60">
                        No pools found matching &quot;{searchQuery}&quot;
                      </td>
                    </tr>
                  ) : (
                    filteredPools.map((pool) => {
                      const poolIsActive = isPoolActive(pool)
                      return (
                        <tr 
                          key={pool.id}
                          onClick={() => handleRowClick(pool)}
                          className={`border-b border-white/5 transition-colors ${
                            poolIsActive
                              ? "hover:bg-white/5 active:bg-white/10 cursor-pointer touch-manipulation" 
                              : "backdrop-blur-sm opacity-60"
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <TokenIcon symbol={pool.tokenA} />
                              <span className="text-white font-medium">{pool.tokenA}</span>
                              <span className="text-white/40">/</span>
                              <TokenIcon symbol={pool.tokenB} />
                              <span className="text-white font-medium">{pool.tokenB}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right text-white font-medium">{pool.liquidity}</td>
                          <td className="py-4 px-4 text-right text-white/80">{pool.volume24h}</td>
                          <td className="py-4 px-4 text-right text-purple-400">{pool.fees24h}</td>
                          <td className="py-4 px-4 text-right">
                            <span className="text-green-400 font-semibold">{pool.apr24h}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="relative inline-block overflow-hidden">
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={(e) => handleTradeClick(e, pool)}
                                disabled={!poolIsActive}
                                className={`text-xs transition-transform ${
                                  poolIsActive 
                                    ? "cursor-pointer hover:scale-105" 
                                    : "opacity-50 cursor-not-allowed"
                                }`}
                              >
                                Trade Now
                              </Button>
                              {/* Animated lines for active pools */}
                              {poolIsActive && (
                                <>
                                  <div className="absolute top-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-top glow-purple" />
                                  <div className="absolute bottom-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-bottom glow-purple" />
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
