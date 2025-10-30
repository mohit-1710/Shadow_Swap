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
    let retryCount = 0
    const MAX_RETRIES = 3

    async function fetchCurrentPrice() {
      let timeoutId: NodeJS.Timeout | null = null

      try {
        // Create abort controller for timeout
        const controller = new AbortController()
        timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

        const response = await fetch(
          "/api/price", // Use the new API route
          {
            signal: controller.signal,
            cache: 'no-cache',
          }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        
        if (isMounted && data?.solana?.usd) {
          setPriceData({
            price: data.solana.usd,
            change24h: data.solana.usd_24h_change || 0,
            isLoading: false,
            error: null,
          })
          retryCount = 0 // Reset retry count on success
        }
      } catch (error: any) {
        if (timeoutId) clearTimeout(timeoutId)
        // Only log error if we've exhausted retries
        if (retryCount >= MAX_RETRIES) {
          console.warn("Could not fetch live SOL price, using fallback")
        }
        
        if (isMounted) {
          setPriceData({
            price: 195.54, // Fallback price
            change24h: 0,
            isLoading: false,
            error: retryCount >= MAX_RETRIES ? "Using fallback price" : null,
          })
        }

        // Retry with exponential backoff
        if (retryCount < MAX_RETRIES && isMounted) {
          retryCount++
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
          setTimeout(() => {
            if (isMounted) fetchCurrentPrice()
          }, delay)
        }
      }
    }

    fetchCurrentPrice()
    
    // Refresh every 2 minutes
    const interval = setInterval(() => {
      retryCount = 0 // Reset retry count for scheduled fetches
      fetchCurrentPrice()
    }, 120000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return priceData
}

