"use client"

import { useState, useEffect, useCallback } from "react"
import { useWallet } from "@/contexts/WalletContext"
import { useShadowSwap } from "./useShadowSwap"
import { OrderData } from "@/lib/shadowSwapClient"

export function useOrderBook(refreshInterval: number = 5000) {
  const { isWalletConnected } = useWallet()
  const { shadowSwapClient } = useShadowSwap()
  const [orders, setOrders] = useState<OrderData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!shadowSwapClient || !isWalletConnected) {
      setOrders([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const userOrders = await shadowSwapClient.fetchUserOrders()
      setOrders(userOrders)
    } catch (e: any) {
      console.error("Error fetching orders:", e)
      setError(e.message || "Failed to fetch orders")
    } finally {
      setIsLoading(false)
    }
  }, [shadowSwapClient, isWalletConnected])

  // Initial fetch
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Auto-refresh
  useEffect(() => {
    if (!isWalletConnected || !shadowSwapClient) {
      return
    }

    const interval = setInterval(() => {
      fetchOrders()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchOrders, refreshInterval, isWalletConnected, shadowSwapClient])

  return {
    orders,
    isLoading,
    error,
    refresh: fetchOrders,
  }
}

