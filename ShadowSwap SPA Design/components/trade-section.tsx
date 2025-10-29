"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PriceCharts } from "./price-charts"
import { ArrowRightLeft, ChevronDown, AlertCircle } from "lucide-react"

// All available tokens for selection (only tokens with icons from liquidity pool)
const ALL_TOKENS = [
  "SOL", "USDC", "TRUMP", "USDT", "jlUSDC", "JLP", "cbBTC", "MET",
  "ETH", "PUMP", "JitoSOL", "PAYAI", "WBTC", "USELESS", "USD1",
  "JUP", "USDG", "mSOL", "syrupUSDC", "BTC"
]

// Token Icon Component
const TokenIcon = ({ token }: { token: string }) => {
  // Map token symbols to their actual icon filenames
  const iconMap: { [key: string]: string } = {
    'SOL': 'SOL-logo.png',
    'USDC': 'USDC-logo.png',
    'USDT': 'USDT-logo.png',
    'ETH': 'ETH-logo.png',
    'TRUMP': 'TRUMP-logo.jpg',
    'BTC': 'WBTC-logo.png',
    'WBTC': 'WBTC-logo.png',
    'cbBTC': 'cbBTC-logo.png',
    'JLP': 'JLP-logo.png',
    'MET': 'MET-logo.png',
    'JitoSOL': 'JitoSOL-logo.png',
    'PAYAI': 'PAYAI-logo.webp',
    'PUMP': 'PUMP-logo.png',
    'JUP': 'JUP-logo.png',
    'mSOL': 'mSOL-logo.png',
    'USDG': 'USDG-logo.png',
    'USD1': 'USD1-logo.png',
    'USELESS': 'USELESS-logo.png',
    'jlUSDC': 'jiUSDC.logo.png',
    'syrupUSDC': 'syrupUSDC-logo.png',
    'CASH': 'CASH-logo.png',
  }

  const iconFile = iconMap[token] || `${token}-logo.png`

  return (
    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center overflow-hidden relative">
      <img
        src={`/icons/${iconFile}`}
        alt={token}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          if (target.parentElement) {
            target.parentElement.innerHTML = `<span class="text-xs font-bold text-purple-400">${token.charAt(0)}</span>`
          }
        }}
      />
    </div>
  )
}

export function TradeSection() {
  const [fromToken, setFromToken] = useState("SOL")
  const [toToken, setToToken] = useState("USDC")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [orderType, setOrderType] = useState<"limit" | "market">("limit")
  const [allowLiquidityPool, setAllowLiquidityPool] = useState(false)
  
  // Dropdown state
  const [showFromDropdown, setShowFromDropdown] = useState(false)
  const [showToDropdown, setShowToDropdown] = useState(false)
  const [visibleTokenCount, setVisibleTokenCount] = useState(8)
  
  // Refs for click outside detection
  const fromDropdownRef = useRef<HTMLDivElement>(null)
  const toDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fromDropdownRef.current && !fromDropdownRef.current.contains(event.target as Node)) {
        setShowFromDropdown(false)
      }
      if (toDropdownRef.current && !toDropdownRef.current.contains(event.target as Node)) {
        setShowToDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle lazy loading on scroll
  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setVisibleTokenCount(prev => Math.min(prev + 8, ALL_TOKENS.length))
    }
  }

  const handleSwap = () => {
    setFromToken(toToken)
    setToToken(fromToken)
  }

  return (
    <section id="trade" className="py-2 sm:py-4 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">Trade with Privacy</h2>
          <p className="text-white/60 text-base sm:text-lg">Execute orders without exposing your positions to the mempool</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Trade Form - Mobile First (shows first on mobile) */}
          <div className="lg:col-span-1 lg:order-2">
            <Card>
              <CardHeader>
                {/* Old: Simple title only - keeping for reference
                <CardTitle className="text-lg sm:text-xl">Place Order</CardTitle>
                */}
                
                {/* New: Title with LP Fallback Toggle */}
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl">Place Order</CardTitle>
                  
                  {/* Liquidity Pool Fallback Toggle */}
                  <div className="relative group">
                    <button
                      onClick={() => setAllowLiquidityPool(!allowLiquidityPool)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        allowLiquidityPool
                          ? 'bg-purple-500/20 border-purple-400/50 text-purple-400'
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                        allowLiquidityPool ? 'border-purple-400' : 'border-white/40'
                      }`}>
                        {allowLiquidityPool && (
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        )}
                      </div>
                      <span>LP Fallback</span>
                    </button>

                    {/* Tooltip - positioned above button */}
                    <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <p className="text-xs text-white/80 leading-relaxed">
                        Enable this to allow your order to execute through liquidity pools if no direct orderbook match is found. 
                        <span className="text-purple-400 font-medium"> Note:</span> This may reduce privacy guarantees but ensures order execution.
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* LP Fallback Warning */}
                {allowLiquidityPool && (
                  <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-3">
                    <p className="text-xs text-purple-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Liquidity pool fallback enabled - order may execute with reduced privacy</span>
                    </p>
                  </div>
                )}
                
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
                    {/* Old static button - keeping for reference
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-md text-white font-medium transition-colors touch-manipulation">
                      {fromToken}
                    </button>
                    */}
                    
                    {/* New clickable token selector with dropdown */}
                    <div className="relative" ref={fromDropdownRef}>
                      <button
                        onClick={() => {
                          setShowFromDropdown(!showFromDropdown)
                          setShowToDropdown(false)
                          setVisibleTokenCount(8)
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-md text-white font-medium transition-colors touch-manipulation"
                      >
                        <TokenIcon token={fromToken} />
                        {fromToken}
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {showFromDropdown && (
                        <div 
                          className="absolute top-full mt-2 left-0 w-48 max-h-64 overflow-y-auto bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl z-50 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent"
                          onScroll={handleDropdownScroll}
                        >
                          {ALL_TOKENS.slice(0, visibleTokenCount).map((token) => (
                            <button
                              key={token}
                              onClick={() => {
                                setFromToken(token)
                                setShowFromDropdown(false)
                                setVisibleTokenCount(8)
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 active:bg-white/20 transition-colors text-left"
                            >
                              <TokenIcon token={token} />
                              <span className="text-white font-medium">{token}</span>
                            </button>
                          ))}
                          {visibleTokenCount < ALL_TOKENS.length && (
                            <div className="py-2 text-center text-white/40 text-xs">
                              Scroll for more...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
                    {/* Old static button - keeping for reference
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-md text-white font-medium transition-colors touch-manipulation">
                      {toToken}
                    </button>
                    */}
                    
                    {/* New clickable token selector with dropdown */}
                    <div className="relative" ref={toDropdownRef}>
                      <button
                        onClick={() => {
                          setShowToDropdown(!showToDropdown)
                          setShowFromDropdown(false)
                          setVisibleTokenCount(8)
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-md text-white font-medium transition-colors touch-manipulation"
                      >
                        <TokenIcon token={toToken} />
                        {toToken}
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {showToDropdown && (
                        <div 
                          className="absolute top-full mt-2 left-0 w-48 max-h-64 overflow-y-auto bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl z-50 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent"
                          onScroll={handleDropdownScroll}
                        >
                          {ALL_TOKENS.slice(0, visibleTokenCount).map((token) => (
                            <button
                              key={token}
                              onClick={() => {
                                setToToken(token)
                                setShowToDropdown(false)
                                setVisibleTokenCount(8)
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 active:bg-white/20 transition-colors text-left"
                            >
                              <TokenIcon token={token} />
                              <span className="text-white font-medium">{token}</span>
                            </button>
                          ))}
                          {visibleTokenCount < ALL_TOKENS.length && (
                            <div className="py-2 text-center text-white/40 text-xs">
                              Scroll for more...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
            <PriceCharts fromToken={fromToken} toToken={toToken} />
          </div>
        </div>
      </div>
    </section>
  )
}
