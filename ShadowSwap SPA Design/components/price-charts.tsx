"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  LineChart, 
  Line,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts"
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react"

/* ============================================================
   OLD MOCK DATA IMPLEMENTATION - COMMENTED OUT FOR REFERENCE
   ============================================================

/* OLD DUAL-CHART IMPLEMENTATION - COMMENTED OUT FOR REFERENCE
// Generate mock data for SOL/USDC price (SOL in terms of USDC)
const generateSolUsdcData = () => {
  const data = []
  let basePrice = 142.5
  
  for (let i = 0; i < 30; i++) {
    const volatility = (Math.random() - 0.5) * 4 // Random fluctuation
    basePrice += volatility
    basePrice = Math.max(135, Math.min(150, basePrice)) // Keep in realistic range
    
    data.push({
      time: `${i}h`,
      price: parseFloat(basePrice.toFixed(2)),
    })
  }
  
  return data
}

// Generate mock data for USDC/SOL price (USDC in terms of SOL)
const generateUsdcSolData = () => {
  const data = []
  let basePrice = 0.007 // 1 USDC ≈ 0.007 SOL (inverse of ~142.5)
  
  for (let i = 0; i < 30; i++) {
    const volatility = (Math.random() - 0.5) * 0.0002
    basePrice += volatility
    basePrice = Math.max(0.0066, Math.min(0.0074, basePrice))
    
    data.push({
      time: `${i}h`,
      price: parseFloat(basePrice.toFixed(6)),
    })
  }
  
  return data
}

const solUsdcData = generateSolUsdcData()
const usdcSolData = generateUsdcSolData()

export function PriceCharts() {
  return (
    <div className="space-y-4 sm:space-y-6">
      // SOL/USDC Chart
      <Card className="glass">...</Card>
      // USDC/SOL Chart
      <Card className="glass">...</Card>
    </div>
  )
}

   ============================================================
   END OLD MOCK DATA IMPLEMENTATION
   ============================================================ */

// ============================================================
// NEW LIVE DATA IMPLEMENTATION WITH COINGECKO API
// ============================================================

interface PriceChartsProps {
  fromToken: string
  toToken: string
}

type ViewType = "line" | "area"
type TimeRange = "1D" | "1W" | "1M" | "6M" | "1Y"

// CoinGecko API Types
interface CoinGeckoPricePoint {
  timestamp: number
  price: number
}

interface ApiResponse {
  prices: [number, number][] // [timestamp_ms, price]
}

interface CachedData {
  data: CoinGeckoPricePoint[]
  timestamp: number
}

// Map time range to CoinGecko days parameter
const TIME_RANGE_TO_DAYS: Record<TimeRange, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "6M": 180,
  "1Y": 365,
}

// Cache storage (in-memory for this session)
const apiCache = new Map<string, CachedData>()
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

// Retry configuration
const RETRY_DELAYS = [5000, 10000, 30000] // 5s, 10s, 30s

// Refresh cooldown
const REFRESH_COOLDOWN_MS = 2 * 60 * 1000 // 2 minutes

// Fetch SOL price data from CoinGecko
async function fetchSolanaPrice(days: number, retryCount = 0): Promise<CoinGeckoPricePoint[]> {
  const cacheKey = `solana-${days}`
  
  // Check cache first
  const cached = apiCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=${days}&precision=full`
    )

    if (response.status === 429) {
      // Rate limited
      throw new Error("RATE_LIMIT")
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data: ApiResponse = await response.json()
    const pricePoints: CoinGeckoPricePoint[] = data.prices.map(([timestamp, price]) => ({
      timestamp,
      price,
    }))

    // Cache the result
    apiCache.set(cacheKey, { data: pricePoints, timestamp: Date.now() })

    return pricePoints
  } catch (error: any) {
    // Handle rate limiting with retry
    if (error.message === "RATE_LIMIT" && retryCount < RETRY_DELAYS.length) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[retryCount]))
      return fetchSolanaPrice(days, retryCount + 1)
    }
    
    // If we have cached data (even expired), return it
    if (cached) {
      return cached.data
    }
    
    throw error
  }
}

// Format timestamp for display
function formatTimestamp(timestamp: number, timeRange: TimeRange): string {
  const date = new Date(timestamp)
  
  switch (timeRange) {
    case "1D":
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    case "1W":
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    case "1M":
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    case "6M":
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    case "1Y":
      return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    default:
      return date.toLocaleDateString()
  }
}

/* OLD MOCK DATA GENERATION - COMMENTED OUT
const generatePriceData = (fromToken: string, toToken: string, timeRange: TimeRange) => {
  const data = []
  // Determine base price based on token pair
  let basePrice = 100
  
  // Set realistic base prices for common pairs
  if (fromToken === "SOL" && toToken === "USDC") basePrice = 142.5
  else if (fromToken === "USDC" && toToken === "SOL") basePrice = 0.007
  else if (fromToken === "ETH" && toToken === "USDC") basePrice = 2450
  else if (fromToken === "BTC" && toToken === "USDC") basePrice = 42500
  
  // Determine data points and time labels based on range
  const rangeConfig = {
    "24h": { points: 24, label: (i: number) => `${i}h`, volatility: 0.02 },
    "1W": { points: 7, label: (i: number) => `Day ${i + 1}`, volatility: 0.03 },
    "1M": { points: 30, label: (i: number) => `Day ${i + 1}`, volatility: 0.05 },
    "6M": { points: 26, label: (i: number) => `Week ${i + 1}`, volatility: 0.08 },
    "1Y": { points: 52, label: (i: number) => `Week ${i + 1}`, volatility: 0.12 }
  }
  
  const config = rangeConfig[timeRange]
  
  for (let i = 0; i < config.points; i++) {
    const volatility = basePrice * config.volatility
    const change = (Math.random() - 0.5) * volatility
    
    const open = basePrice
    const close = basePrice + change
    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5
    
    basePrice = close
    
    data.push({
      time: config.label(i),
      price: parseFloat(close.toFixed(basePrice < 1 ? 6 : 2)),
      open: parseFloat(open.toFixed(basePrice < 1 ? 6 : 2)),
      high: parseFloat(high.toFixed(basePrice < 1 ? 6 : 2)),
      low: parseFloat(low.toFixed(basePrice < 1 ? 6 : 2)),
      close: parseFloat(close.toFixed(basePrice < 1 ? 6 : 2)),
    })
  }
  
  return data
}
END OLD MOCK DATA */

/* OLD Custom candlestick shape component - NOT USED IN PHASE 1
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props
  const { open, close, high, low } = payload
  
  const isGreen = close > open
  const fill = isGreen ? "#22c55e" : "#ef4444"
  const candleWidth = Math.max(width * 0.6, 2)
  const candleX = x + (width - candleWidth) / 2
  
  // Calculate positions
  const bodyHeight = Math.abs(y - (y + height))
  const bodyY = Math.min(y, y + height)
  
  return (
    <g>
      <line
        x1={x + width / 2}
        y1={y - 10}
        x2={x + width / 2}
        y2={y + height + 10}
        stroke={fill}
        strokeWidth={1}
      />
      <rect
        x={candleX}
        y={bodyY}
        width={candleWidth}
        height={Math.max(bodyHeight, 1)}
        fill={fill}
        stroke={fill}
        strokeWidth={1}
      />
    </g>
  )
}
END OLD CANDLESTICK */

// Custom tooltip component for live price data
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const price = payload[0].value
    const decimals = price < 1 ? 6 : 2
    
    return (
      <div className="bg-black/90 border border-purple-500/30 rounded-lg p-3 backdrop-blur-md">
        <p className="text-white/60 text-sm mb-1">{label}</p>
        <p className="text-purple-400 font-bold text-base">
          ${price.toFixed(decimals)}
        </p>
      </div>
    )
  }
  return null
}

// ============================================================
// NEW LIVE PRICE CHARTS COMPONENT
// ============================================================

export function PriceCharts({ fromToken, toToken }: PriceChartsProps) {
  const [viewType, setViewType] = useState<ViewType>("line")
  const [timeRange, setTimeRange] = useState<TimeRange>("1W")
  const [priceData, setPriceData] = useState<CoinGeckoPricePoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const countdownInterval = useRef<NodeJS.Timeout | null>(null)

  // Determine if we're working with SOL/USDC pair
  const isSolUsdcPair = 
    (fromToken === "SOL" && toToken === "USDC") || 
    (fromToken === "USDC" && toToken === "SOL")

  // Determine if prices should be inverted based on token order
  // When fromToken is USDC and toToken is SOL, we show USDC/SOL (inverted prices)
  const shouldInvert = fromToken === "USDC" && toToken === "SOL"

  // Check if refresh is allowed
  const canRefresh = () => {
    const now = Date.now()
    return (now - lastRefreshTime) >= REFRESH_COOLDOWN_MS
  }

  // Get remaining cooldown in seconds
  const getRemainingCooldown = () => {
    const now = Date.now()
    const elapsed = now - lastRefreshTime
    const remaining = REFRESH_COOLDOWN_MS - elapsed
    return Math.max(0, Math.ceil(remaining / 1000))
  }

  // Update countdown when hovering
  useEffect(() => {
    if (showTooltip && !canRefresh()) {
      setCountdown(getRemainingCooldown())
      countdownInterval.current = setInterval(() => {
        const remaining = getRemainingCooldown()
        setCountdown(remaining)
        if (remaining === 0 && countdownInterval.current) {
          clearInterval(countdownInterval.current)
        }
      }, 1000)
    }
    
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current)
        countdownInterval.current = null
      }
    }
  }, [showTooltip, lastRefreshTime])

  // Fetch price data
  const fetchData = useCallback(async (isManualRefresh = false) => {
    // Only fetch for SOL/USDC pairs
    if (!isSolUsdcPair) {
      setError("Live price data only available for SOL/USDC pair")
      return
    }

    if (isManualRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const days = TIME_RANGE_TO_DAYS[timeRange]
      const data = await fetchSolanaPrice(days)
      setPriceData(data)
      setError(null)
      
      if (isManualRefresh) {
        setLastRefreshTime(Date.now())
      }
    } catch (err: any) {
      if (err.message === "RATE_LIMIT") {
        setError("CoinGecko rate limit. Try again in 60s")
      } else {
        setError("Failed to load price data. Using cached data if available.")
      }
      // Don't start cooldown on error
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [timeRange, isSolUsdcPair])

  // Initial data fetch and refetch on timeRange change
  useEffect(() => {
    fetchData(false)
  }, [fetchData])

  // Handle manual refresh
  const handleRefresh = () => {
    if (canRefresh() && !isLoading && !isRefreshing) {
      fetchData(true)
    }
  }

  // Process chart data with pair inversion if needed
  const chartData = useMemo(() => {
    if (!priceData.length) return []

    return priceData.map((point) => {
      const price = shouldInvert ? (1 / point.price) : point.price
      return {
        time: formatTimestamp(point.timestamp, timeRange),
        price: parseFloat(price.toFixed(price < 1 ? 6 : 2)),
        timestamp: point.timestamp,
      }
    })
  }, [priceData, shouldInvert, timeRange])

  // Calculate current price and 24h change
  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0
  const firstPrice = chartData.length > 0 ? chartData[0].price : 0
  const priceChange = currentPrice - firstPrice
  const priceChangePercent = firstPrice !== 0 ? (priceChange / firstPrice) * 100 : 0
  const isPriceUp = priceChange >= 0
  const decimals = currentPrice < 1 ? 6 : 2

  // Get tooltip content
  const getTooltipContent = () => {
    if (isLoading || isRefreshing) return "Loading..."
    if (canRefresh()) return "Refresh chart data"
    return `Refresh available in ${countdown}s`
  }

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex flex-col gap-4">
          {/* Title Row with Price Stats and Refresh Button */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2 flex-1">
              {/* Price Pair Title */}
              <CardTitle className="text-base sm:text-lg">
                {fromToken}/{toToken}
            </CardTitle>
            
              {/* Current Price and Change */}
              {!isLoading && !error && chartData.length > 0 && (
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    ${currentPrice.toFixed(decimals)}
                  </span>
                  <div className={`flex items-center gap-1 text-sm ${isPriceUp ? "text-green-400" : "text-red-400"}`}>
                    {isPriceUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="font-medium">
                      {isPriceUp ? "+" : ""}{priceChangePercent.toFixed(2)}%
                    </span>
                    <span className="text-white/40 text-xs">
                      ({isPriceUp ? "+" : ""}${priceChange.toFixed(decimals)})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <div className="relative">
              <button
                onClick={handleRefresh}
                disabled={!canRefresh() || isLoading || isRefreshing || !isSolUsdcPair}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={`p-2 rounded-lg transition-all ${
                  canRefresh() && !isLoading && !isRefreshing && isSolUsdcPair
                    ? "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 cursor-pointer"
                    : "bg-white/5 text-white/30 cursor-not-allowed opacity-50"
                }`}
                title={getTooltipContent()}
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>

              {/* Tooltip */}
              {showTooltip && (
                <div className="absolute top-full right-0 mt-2 w-48 p-3 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl z-50">
                  <p className="text-xs text-white/80 leading-relaxed">
                    {getTooltipContent()}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Chart Type and Time Range Selectors */}
          <div className="flex gap-2 flex-wrap">
            {/* Chart Type Toggle */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
              <button
                onClick={() => setViewType("line")}
                disabled={isLoading}
                className={`px-3 py-1.5 rounded text-xs transition-all ${
                  viewType === "line" 
                    ? "bg-purple-500 text-white font-medium" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setViewType("area")}
                disabled={isLoading}
                className={`px-3 py-1.5 rounded text-xs transition-all ${
                  viewType === "area" 
                    ? "bg-purple-500 text-white font-medium" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                Area
              </button>
            </div>
          
          {/* Time Range Selector */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
              {(["1D", "1W", "1M", "6M", "1Y"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                  disabled={isLoading}
                className={`px-3 py-1.5 rounded text-xs transition-all ${
                  timeRange === range 
                    ? "bg-purple-500 text-white font-medium" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-[300px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-white/60 text-sm">Loading price data...</p>
            </div>
          </div>
        )}

        {/* Error State (no data) */}
        {!isLoading && error && chartData.length === 0 && (
          <div className="flex items-center justify-center h-[300px]">
            <div className="flex flex-col items-center gap-3 max-w-md text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-white/80 font-medium mb-1">Unable to load price data</p>
                <p className="text-white/50 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Chart Display */}
        {!isLoading && chartData.length > 0 && (
          <>
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={300} minWidth={300}>
                {viewType === "line" ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="time" 
                      stroke="rgba(255,255,255,0.3)"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.3)"
                      style={{ fontSize: '12px' }}
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => `$${value.toFixed(decimals)}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#a855f7" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </LineChart>
                ) : (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="time" 
                      stroke="rgba(255,255,255,0.3)"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.3)"
                      style={{ fontSize: '12px' }}
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => `$${value.toFixed(decimals)}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
            
            {/* Chart Footer */}
        <div className="mt-4 flex justify-between text-xs text-white/50">
          <span>
                {timeRange === "1D" && "Last 24 hours"}
            {timeRange === "1W" && "Last 7 days"}
            {timeRange === "1M" && "Last 30 days"}
            {timeRange === "6M" && "Last 6 months"}
            {timeRange === "1Y" && "Last 12 months"}
          </span>
              <span>Live Data via CoinGecko</span>
        </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
