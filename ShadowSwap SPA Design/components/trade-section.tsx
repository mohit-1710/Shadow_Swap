"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PriceCharts } from "./price-charts"
import { ArrowRightLeft, ChevronDown, AlertCircle } from "lucide-react"
import { useWallet } from "@/contexts/WalletContext"
import { useShadowSwap } from "@/hooks/useShadowSwap"
import { useCurrentPrice } from "@/hooks/useCurrentPrice"
import { toast } from "sonner"

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
  // Wallet and backend integration
  const { isWalletConnected, walletAddress, connectWallet } = useWallet()
  const { submitOrder, getBalances, isLoading, error } = useShadowSwap()
  
  // Get real-time SOL price
  const { price: currentMarketPrice, isLoading: isPriceLoading } = useCurrentPrice()
  
  const [fromToken, setFromToken] = useState("SOL")
  const [toToken, setToToken] = useState("USDC")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [limitPrice, setLimitPrice] = useState("")
  const [orderType, setOrderType] = useState<"limit" | "market">("limit")
  const [allowLiquidityPool, setAllowLiquidityPool] = useState(false)
  const [daysToKeepOpen, setDaysToKeepOpen] = useState("7") // Default 7 days
  
  // Balance state
  const [solBalance, setSolBalance] = useState(0)
  const [usdcBalance, setUsdcBalance] = useState(0)
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Dropdown state
  const [showFromDropdown, setShowFromDropdown] = useState(false)
  const [showToDropdown, setShowToDropdown] = useState(false)
  const [showDaysDropdown, setShowDaysDropdown] = useState(false)
  const [visibleTokenCount, setVisibleTokenCount] = useState(8)
  
  // Refs for click outside detection
  const fromDropdownRef = useRef<HTMLDivElement>(null)
  const toDropdownRef = useRef<HTMLDivElement>(null)
  const daysDropdownRef = useRef<HTMLDivElement>(null)

  // Load balances when wallet connects
  useEffect(() => {
    if (isWalletConnected) {
      loadBalances()
    }
  }, [isWalletConnected])

  // Auto-calculate "To" amount based on price and amount
  useEffect(() => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setToAmount("")
      return
    }

    const amount = parseFloat(fromAmount)
    let calculatedAmount = 0

    if (orderType === "market") {
      // Use current market price
      if (fromToken === "SOL") {
        // Selling SOL for USDC: amount * price
        calculatedAmount = amount * currentMarketPrice
      } else {
        // Buying SOL with USDC: amount / price
        calculatedAmount = amount / currentMarketPrice
      }
    } else {
      // Limit order - use limit price
      if (!limitPrice || parseFloat(limitPrice) <= 0) {
        setToAmount("")
        return
      }
      
      const price = parseFloat(limitPrice)
      if (fromToken === "SOL") {
        // Selling SOL for USDC: amount * price
        calculatedAmount = amount * price
      } else {
        // Buying SOL with USDC: amount / price
        calculatedAmount = amount / price
      }
    }

    setToAmount(calculatedAmount.toFixed(6))
  }, [fromAmount, limitPrice, orderType, fromToken, currentMarketPrice])

  const loadBalances = async () => {
    try {
      const balances = await getBalances()
      setSolBalance(balances.sol)
      setUsdcBalance(balances.usdc)
    } catch (err) {
      console.error("Error loading balances:", err)
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fromDropdownRef.current && !fromDropdownRef.current.contains(event.target as Node)) {
        setShowFromDropdown(false)
      }
      if (toDropdownRef.current && !toDropdownRef.current.contains(event.target as Node)) {
        setShowToDropdown(false)
      }
      if (daysDropdownRef.current && !daysDropdownRef.current.contains(event.target as Node)) {
        setShowDaysDropdown(false)
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
    setFromAmount(toAmount)
    // toAmount will auto-calculate via useEffect
  }

  const handleTrade = async () => {
    // Prevent double-clicks
    if (isSubmitting) {
      return
    }

    // Validate wallet connection
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first", { dismissible: true })
      return
    }

    // Currently only SOL/USDC pair is supported
    if ((fromToken !== "SOL" && fromToken !== "USDC") || (toToken !== "SOL" && toToken !== "USDC")) {
      toast.warning("Currently only SOL/USDC trading pair is supported", { dismissible: true })
      return
    }

    // Validate amount
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast.error("Please enter a valid amount", { dismissible: true })
      return
    }

    // Validate price for limit orders
    if (orderType === "limit") {
      if (!limitPrice || parseFloat(limitPrice) <= 0) {
        toast.error("Please enter a valid limit price", { dismissible: true })
        return
      }
    }

    // Determine side (buy or sell)
    const side = fromToken === "SOL" ? "sell" : "buy"
    const amount = parseFloat(fromAmount)
    let price: number

    if (orderType === "market") {
      price = 100 // Default market price - will be matched by bot
      toast.info("Market orders use best available price", { dismissible: true })
    } else {
      price = parseFloat(limitPrice)
    }

    // Note: Days dropdown is UI-only for now - expiration feature coming soon
    if (orderType === "limit" && daysToKeepOpen !== "0") {
      console.log("Selected order duration:", daysToKeepOpen, "days (UI only - not implemented yet)")
    }

    try {
      setIsSubmitting(true)
      
      const loadingToast = toast.loading("Submitting order to blockchain...", {
        duration: Infinity, // Don't auto-dismiss
        dismissible: true, // Allow manual dismiss with X button
      })
      
      const result = await submitOrder({ side, price, amount })
      
      // Dismiss the loading toast before showing result
      toast.dismiss(loadingToast)
      
      if (result.success) {
        toast.success(
          <div>
            <p className="font-semibold">Order submitted successfully!</p>
            <p className="text-xs mt-1">Signature: {result.signature?.slice(0, 8)}...</p>
          </div>,
          { dismissible: true }
        )
        
        // Reset form
        setFromAmount("")
        setToAmount("")
        setLimitPrice("")
        
        // Refresh balances
        loadBalances()
      } else {
        toast.error(`Order failed: ${result.error}`, { dismissible: true })
      }
    } catch (err: any) {
      console.error("Trade error:", err)
      toast.error(err.message || "Failed to submit order", { dismissible: true })
    } finally {
      setIsSubmitting(false)
    }
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
                    <div className="relative overflow-hidden">
                      <button
                        onClick={() => setAllowLiquidityPool(!allowLiquidityPool)}
                        className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
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
                      {/* Animated lines - same as connect wallet button */}
                      {!allowLiquidityPool && (
                        <>
                          <div className="absolute top-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-top glow-purple" />
                          <div className="absolute bottom-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-bottom glow-purple" />
                        </>
                      )}
                    </div>

                    {/* Tooltip - positioned above button */}
                    <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
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
                  <div className="text-xs text-white/40 mt-1">
                    Balance: {isWalletConnected ? `${solBalance.toFixed(4)} SOL` : 'Connect wallet'}
                  </div>
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
                  <label className="block text-sm text-white/70 mb-2">
                    To (Estimated)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={toAmount}
                      disabled
                      readOnly
                      className="flex-1 bg-white/5 cursor-not-allowed"
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
                  <div className="text-xs text-white/40 mt-1">
                    Balance: {isWalletConnected ? `${usdcBalance.toFixed(2)} USDC` : 'Connect wallet'}
                  </div>
                  <div className="text-xs text-purple-400/60 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Auto-calculated based on {orderType === "limit" ? "your limit price" : "market price"}
                  </div>
                </div>

                {/* Price Input (for limit orders) */}
                {orderType === "limit" && (
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Limit Price (USDC per SOL)</label>
                    <Input 
                      type="number" 
                      placeholder="100.00" 
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      className="w-full" 
                    />
                  </div>
                )}

                {/* Current Market Price Info */}
                <div className="bg-white/5 p-3 rounded-lg text-sm">
                  <div className="flex justify-between items-center text-white/60">
                    <span>Current Market Price</span>
                    {isPriceLoading ? (
                      <span className="text-white/40 text-xs">Loading...</span>
                    ) : (
                      <span className="text-purple-400 font-medium">
                        {fromToken === "SOL" && toToken === "USDC" 
                          ? `1 SOL = $${currentMarketPrice.toFixed(2)} USDC`
                          : fromToken === "USDC" && toToken === "SOL"
                          ? `1 USDC = ${(1 / currentMarketPrice).toFixed(6)} SOL`
                          : `1 ${fromToken} = ${toToken}`
                        }
                      </span>
                    )}
                  </div>
                </div>

                {/* Warning Banner for SOL/USDC only */}
                {(fromToken !== "SOL" && fromToken !== "USDC") || (toToken !== "SOL" && toToken !== "USDC") ? (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                    <p className="text-xs text-orange-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Currently only SOL/USDC trading pair is supported. Please select SOL and USDC.</span>
                    </p>
                  </div>
                ) : null}

                {/* Action Button & Days Dropdown (Side by Side) */}
                <div className="flex gap-3">
                  {/* Place Order Button */}
                  <Button 
                    variant="default" 
                    size="lg" 
                    className={orderType === "limit" ? "flex-1" : "w-full"}
                    onClick={handleTrade}
                    disabled={isSubmitting || !isWalletConnected}
                  >
                    {isSubmitting 
                      ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </span>
                      )
                      : !isWalletConnected 
                      ? "Connect Wallet to Trade" 
                      : orderType === "limit" 
                      ? "Place Limit Order" 
                      : "Execute Market Order"}
                  </Button>

                  {/* Days Dropdown - Only for Limit Orders */}
                  {orderType === "limit" && (
                    <div className="relative" ref={daysDropdownRef}>
                      <button
                        onClick={() => {
                          setShowDaysDropdown(!showDaysDropdown)
                          setShowFromDropdown(false)
                          setShowToDropdown(false)
                        }}
                        className="h-full flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-md text-white transition-colors whitespace-nowrap"
                      >
                        <span className="text-xs font-medium">
                          {daysToKeepOpen === "0" 
                            ? "∞" 
                            : `${daysToKeepOpen}d`
                          }
                        </span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {showDaysDropdown && (
                        <div className="absolute bottom-full right-0 mb-2 w-40 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl z-[200]">
                          <div className="py-0.5">
                            {[
                              { value: "1", label: "1 Day" },
                              { value: "3", label: "3 Days" },
                              { value: "7", label: "7 Days" },
                              { value: "14", label: "14 Days" },
                              { value: "30", label: "30 Days" },
                              { value: "90", label: "90 Days" },
                              { value: "0", label: "Until Cancelled" },
                            ].map((option) => (
                              <button
                                key={option.value}
                                onClick={() => {
                                  setDaysToKeepOpen(option.value)
                                  setShowDaysDropdown(false)
                                }}
                                className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/10 transition-colors text-left ${
                                  daysToKeepOpen === option.value ? "bg-purple-500/20" : ""
                                }`}
                              >
                                <span className="text-white text-xs">{option.label}</span>
                                {daysToKeepOpen === option.value && (
                                  <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
