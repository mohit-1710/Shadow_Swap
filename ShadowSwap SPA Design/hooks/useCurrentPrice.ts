"use client"

import { useState, useEffect } from "react"

interface PriceData {
  price: number
  change24h: number
  isLoading: boolean
  error: string | null
}

/**
 * Fetch current SOL/USDC price from CoinGecko
 * Caches for 2 minutes to avoid rate limits
 */
export function useCurrentPrice() {
  const [priceData, setPriceData] = useState<PriceData>({
    price: 0,
    change24h: 0,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    let isMounted = true

    async function fetchCurrentPrice() {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true"
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        
        if (isMounted) {
          setPriceData({
            price: data.solana.usd,
            change24h: data.solana.usd_24h_change || 0,
            isLoading: false,
            error: null,
          })
        }
      } catch (error: any) {
        console.error("Error fetching SOL price:", error)
        if (isMounted) {
          setPriceData({
            price: 195.54, // Fallback price
            change24h: 0,
            isLoading: false,
            error: error.message,
          })
        }
      }
    }

    fetchCurrentPrice()
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchCurrentPrice, 120000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return priceData
}

