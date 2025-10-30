/**
 * Fetch real liquidity pool stats from DexScreener API
 * for the Raydium SOL/USDC CLMM pool
 */

export interface PoolStats {
  id: string
  tokenA: string
  tokenB: string
  liquidity: string
  volume24h: string
  fees24h: string
  apr24h: string
  active: boolean
}

/**
 * Fetch pool statistics from DexScreener API
 * Pool: Raydium SOL/USDC CLMM
 * Address: 7nX3SLt83wFpEYtWmozDCCFZctdeSB7E6QGpU1fxAiTa
 */
export async function getPoolStats(): Promise<PoolStats> {
  try {
    const url = "https://api.dexscreener.com/latest/dex/pairs/solana/7nX3SLt83wFpEYtWmozDCCFZctdeSB7E6QGpU1fxAiTa"
    
    const res = await fetch(url, {
      next: { revalidate: 60 } // Cache for 60 seconds
    })
    
    if (!res.ok) {
      throw new Error(`DexScreener API error: ${res.status}`)
    }
    
    const json = await res.json()
    const pair = json.pair

    // Gracefully handle missing pair without throwing an error in UI
    if (!pair) {
      console.warn('[DexScreener] No pair data returned; using fallback stats')
      return {
        id: "1",
        tokenA: "SOL",
        tokenB: "USDC",
        liquidity: "$2.4M",
        volume24h: "$850K",
        fees24h: "$2.5K",
        apr24h: "12.5%",
        active: true,
      }
    }

    // Extract values
    const liquidityUSD = parseFloat(pair.liquidity?.usd || 0)
    const volume24h = parseFloat(pair.volume?.h24 || 0)
    
    // Raydium CLMM fee tier = 0.05% = 0.0005
    const feeTier = 0.0005
    
    // Calculate fees and APR
    const fees24h = volume24h * feeTier
    const apr24h = liquidityUSD > 0 ? (fees24h * 365 / liquidityUSD) * 100 : 0

    // Format values with proper units
    const formatNumber = (num: number): string => {
      if (num >= 1_000_000) {
        return `$${(num / 1_000_000).toFixed(2)}M`
      } else if (num >= 1_000) {
        return `$${(num / 1_000).toFixed(2)}K`
      } else {
        return `$${num.toFixed(2)}`
      }
    }

    return {
      id: "1",
      tokenA: pair.baseToken?.symbol || "SOL",
      tokenB: pair.quoteToken?.symbol || "USDC",
      liquidity: formatNumber(liquidityUSD),
      volume24h: formatNumber(volume24h),
      fees24h: formatNumber(fees24h),
      apr24h: `${apr24h.toFixed(2)}%`,
      active: true,
    }
  } catch (error) {
    console.warn('Error fetching pool stats. Falling back to mock data:', error)
    
    // Return fallback data
    return {
      id: "1",
      tokenA: "SOL",
      tokenB: "USDC",
      liquidity: "$2.4M",
      volume24h: "$850K",
      fees24h: "$2.5K",
      apr24h: "12.5%",
      active: true,
    }
  }
}

/**
 * Get all mock pools (for non-SOL/USDC pools)
 * This will be the fallback for pools that don't have live data yet
 */
export function getMockPools(): PoolStats[] {
  return [
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
}
