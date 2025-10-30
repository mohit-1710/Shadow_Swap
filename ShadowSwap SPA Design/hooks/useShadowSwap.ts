"use client"

import { useState, useEffect, useCallback } from "react"
import { useWallet } from "@/contexts/WalletContext"
import { ShadowSwapClient, OrderParams, OrderResult, BalanceData } from "@/lib/shadowSwapClient"
import { AnchorProvider } from "@coral-xyz/anchor"
import { Connection, PublicKey } from "@solana/web3.js"

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com"
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!)
const ORDER_BOOK = new PublicKey(process.env.NEXT_PUBLIC_ORDER_BOOK!)
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
        const connection = new Connection(RPC_URL, "confirmed")
        
        const walletAdapter = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        }

        const provider = new AnchorProvider(connection, walletAdapter as any, {
          preflightCommitment: "confirmed",
        })
        
        const client = new ShadowSwapClient(provider, PROGRAM_ID, ORDER_BOOK, BASE_MINT, QUOTE_MINT)
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

  return {
    shadowSwapClient,
    submitOrder,
    getBalances,
    cancelOrder,
    isLoading,
    error,
  }
}

