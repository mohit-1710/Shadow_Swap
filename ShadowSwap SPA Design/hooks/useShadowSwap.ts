"use client"

import { useState, useEffect, useCallback } from "react"
import { useWallet } from "@/contexts/WalletContext"
import { ShadowSwapClient, OrderParams, OrderResult, BalanceData } from "@/lib/shadowSwapClient"
import { AnchorProvider } from "@coral-xyz/anchor"
import { PublicKey } from "@solana/web3.js"
import { getSharedConnection } from "@/lib/rpc"

// Lazy initialization to prevent crash if env vars are missing
function getProgramId(): PublicKey {
  const id = process.env.NEXT_PUBLIC_PROGRAM_ID
  if (!id) {
    throw new Error('NEXT_PUBLIC_PROGRAM_ID environment variable is not set')
  }
  return new PublicKey(id)
}

function getOrderBook(): PublicKey {
  const id = process.env.NEXT_PUBLIC_ORDER_BOOK
  if (!id) {
    throw new Error('NEXT_PUBLIC_ORDER_BOOK environment variable is not set')
  }
  return new PublicKey(id)
}

const BASE_MINT = new PublicKey(process.env.NEXT_PUBLIC_BASE_MINT || "So11111111111111111111111111111111111111112")
const QUOTE_MINT = new PublicKey(process.env.NEXT_PUBLIC_QUOTE_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")

export function useShadowSwap() {
  const { wallet, isWalletConnected } = useWallet()
  const [shadowSwapClient, setShadowSwapClient] = useState<ShadowSwapClient | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (wallet?.publicKey && wallet?.signTransaction) {
      try {
        console.log('🔌 Initializing ShadowSwapClient...')
        const connection = getSharedConnection()
        
        const walletAdapter = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        }

        const provider = new AnchorProvider(connection, walletAdapter as any, {
          preflightCommitment: "confirmed",
        })
        
        // Initialize PublicKeys with error handling
        const programId = getProgramId()
        const orderBook = getOrderBook()
        const client = new ShadowSwapClient(provider, programId, orderBook, BASE_MINT, QUOTE_MINT)
        setShadowSwapClient(client)
        setError(null)
        console.log('✅ ShadowSwapClient initialized successfully')
      } catch (e: any) {
        console.error("❌ Failed to initialize ShadowSwapClient:", e)
        setError(e.message || "Failed to initialize ShadowSwap client")
        setShadowSwapClient(null)
      }
    } else {
      setShadowSwapClient(null)
    }
  }, [wallet?.publicKey, wallet?.signTransaction, wallet?.signAllTransactions])

  const submitOrder = useCallback(async (params: OrderParams): Promise<OrderResult> => {
    if (!shadowSwapClient) {
      return { success: false, error: "Client not initialized" }
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await shadowSwapClient.submitOrder(params)
      if (!result.success) {
        setError(result.error || "Order submission failed")
      }
      return result
    } catch (e: any) {
      const errorMsg = e.message || "Failed to submit order"
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [shadowSwapClient])

  const getBalances = useCallback(async (): Promise<BalanceData> => {
    if (!shadowSwapClient) {
      console.warn("⚠️ getBalances called but shadowSwapClient is null - client not initialized yet")
      return { sol: 0, usdc: 0 }
    }

    try {
      return await shadowSwapClient.getBalances()
    } catch (e: any) {
      console.error("❌ Error fetching balances in useShadowSwap:", e)
      return { sol: 0, usdc: 0 }
    }
  }, [shadowSwapClient])

  const cancelOrder = useCallback(async (orderAddress: PublicKey): Promise<OrderResult> => {
    if (!shadowSwapClient) {
      return { success: false, error: "Client not initialized" }
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await shadowSwapClient.cancelOrder(orderAddress)
      if (!result.success) {
        setError(result.error || "Order cancellation failed")
      }
      return result
    } catch (e: any) {
      const errorMsg = e.message || "Failed to cancel order"
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [shadowSwapClient])

  const getWsolBalance = useCallback(async (): Promise<number> => {
    if (!shadowSwapClient) return 0
    try {
      return await shadowSwapClient.getWsolBalance()
    } catch {
      return 0
    }
  }, [shadowSwapClient])

  const unwrapWsol = useCallback(async (): Promise<OrderResult> => {
    if (!shadowSwapClient) return { success: false, error: 'Client not initialized' }
    try {
      return await shadowSwapClient.unwrapWsol()
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to unwrap WSOL' }
    }
  }, [shadowSwapClient])

  return {
    shadowSwapClient,
    submitOrder,
    getBalances,
    cancelOrder,
    getWsolBalance,
    unwrapWsol,
    isLoading,
    error,
  }
}
