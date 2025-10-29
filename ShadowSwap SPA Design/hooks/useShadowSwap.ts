"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/contexts/WalletContext"
import { ShadowSwapClient, OrderParams, OrderData, OrderStatus } from "@/lib/shadowSwapClient"
import { AnchorProvider } from "@coral-xyz/anchor"
import { Connection, PublicKey } from "@solana/web3.js"

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com"

/**
 * Custom hook for interacting with ShadowSwap
 */
export function useShadowSwap() {
  const { wallet, isWalletConnected } = useWallet()
  const [client, setClient] = useState<ShadowSwapClient | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize the ShadowSwap client when wallet is connected
  useEffect(() => {
    if (isWalletConnected && wallet.publicKey && wallet.signTransaction) {
      const connection = new Connection(RPC_URL, "confirmed")
      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      })
      const shadowSwapClient = new ShadowSwapClient(provider)
      setClient(shadowSwapClient)
    } else {
      setClient(null)
    }
  }, [isWalletConnected, wallet])

  /**
   * Submit an order to the orderbook
   */
  const submitOrder = async (params: OrderParams) => {
    if (!client) {
      throw new Error("Wallet not connected")
    }

    setIsLoading(true)
    setError(null)

    try {
      const signature = await client.submitOrder(params)
      setIsLoading(false)
      return { success: true, signature }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to submit order"
      setError(errorMessage)
      setIsLoading(false)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Fetch all orders for the current user
   */
  const fetchUserOrders = async (): Promise<OrderData[]> => {
    if (!client) return []

    setIsLoading(true)
    setError(null)

    try {
      const orders = await client.fetchUserOrders()
      setIsLoading(false)
      return orders
    } catch (err: any) {
      const errorMessage = err.message || "Failed to fetch user orders"
      setError(errorMessage)
      setIsLoading(false)
      return []
    }
  }

  /**
   * Fetch all orders from the orderbook
   */
  const fetchAllOrders = async (): Promise<OrderData[]> => {
    if (!client) return []

    setIsLoading(true)
    setError(null)

    try {
      const orders = await client.fetchAllOrders()
      setIsLoading(false)
      return orders
    } catch (err: any) {
      const errorMessage = err.message || "Failed to fetch orders"
      setError(errorMessage)
      setIsLoading(false)
      return []
    }
  }

  /**
   * Cancel an existing order
   */
  const cancelOrder = async (orderPDA: string) => {
    if (!client) {
      throw new Error("Wallet not connected")
    }

    setIsLoading(true)
    setError(null)

    try {
      const signature = await client.cancelOrder(new PublicKey(orderPDA))
      setIsLoading(false)
      return { success: true, signature }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to cancel order"
      setError(errorMessage)
      setIsLoading(false)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Get token balances
   */
  const getBalances = async () => {
    if (!client) return { sol: 0, usdc: 0 }

    try {
      const [sol, usdc] = await Promise.all([
        client.getSolBalance(),
        client.getTokenBalance(new PublicKey(process.env.NEXT_PUBLIC_QUOTE_MINT!)),
      ])
      return { sol, usdc }
    } catch (err) {
      console.error("Error fetching balances:", err)
      return { sol: 0, usdc: 0 }
    }
  }

  return {
    client,
    isLoading,
    error,
    submitOrder,
    fetchUserOrders,
    fetchAllOrders,
    cancelOrder,
    getBalances,
    isReady: !!client,
  }
}

// Re-export types for convenience
export type { OrderParams, OrderData }
export { OrderStatus }
