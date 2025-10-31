"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pill } from "@/components/ui/pill"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/contexts/WalletContext"
import { useOrderBook } from "@/hooks/useOrderBook"
import { useShadowSwap } from "@/hooks/useShadowSwap"
import { PublicKey } from "@solana/web3.js"
import { getSignaturesForAddressRL } from "@/lib/rpc"
import { RefreshCw, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { ORDER_STATUS } from "@/lib/program"

export function OrderHistory() {
  const { isWalletConnected } = useWallet()
  const { orders, isLoading, error, refresh } = useOrderBook(5000) // Refresh every 5s
  const { cancelOrder, shadowSwapClient } = useShadowSwap()
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [txByOrder, setTxByOrder] = useState<Record<string, string | null>>({})

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000) // Convert Unix timestamp to milliseconds
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusText = (status: number): string => {
    switch (status) {
      case ORDER_STATUS.ACTIVE:
        return "Active"
      case ORDER_STATUS.PARTIAL:
        return "Partial"
      case ORDER_STATUS.FILLED:
      case ORDER_STATUS.EXECUTED:
        return "Filled"
      case ORDER_STATUS.CANCELLED:
        return "Cancelled"
      case ORDER_STATUS.MATCHED_PENDING:
        return "Matching"
      default:
        return "Unknown"
    }
  }

  const getStatusVariant = (status: number): "success" | "warning" | "error" => {
    switch (status) {
      case ORDER_STATUS.FILLED:
      case ORDER_STATUS.EXECUTED:
        return "success"
      case ORDER_STATUS.ACTIVE:
      case ORDER_STATUS.PARTIAL:
      case ORDER_STATUS.MATCHED_PENDING:
        return "warning"
      case ORDER_STATUS.CANCELLED:
        return "error"
      default:
        return "warning"
    }
  }

  // Determine explorer cluster param from RPC
  const explorerCluster = useMemo(() => {
    const rpc = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com"
    if (/mainnet|api.mainnet/i.test(rpc)) return undefined // default mainnet, omit param
    if (/testnet/i.test(rpc)) return "testnet"
    return "devnet"
  }, [])

  const getExplorerUrl = (sig: string) => {
    const base = `https://explorer.solana.com/tx/${sig}`
    return explorerCluster ? `${base}?cluster=${explorerCluster}` : base
  }

  // Fetch latest tx signature that touched each FILLED order account
  useEffect(() => {
    if (!shadowSwapClient) return
    const filled = orders.filter(o => o.status === ORDER_STATUS.FILLED || o.status === ORDER_STATUS.EXECUTED)
    if (filled.length === 0) return

    let aborted = false
    const conn = shadowSwapClient.getConnection?.() || null
    if (!conn) return

    ;(async () => {
      const updates: Record<string, string | null> = {}
      for (const o of filled) {
        if (txByOrder[o.publicKey] !== undefined) continue
        try {
          const sigs = await getSignaturesForAddressRL(new PublicKey(o.publicKey), { limit: 1 }, conn)
          updates[o.publicKey] = sigs.length > 0 ? sigs[0].signature : null
        } catch (e) {
          console.error('Failed to fetch signatures for order', o.publicKey, e)
          updates[o.publicKey] = null
        }
      }
      if (!aborted && Object.keys(updates).length > 0) {
        setTxByOrder(prev => ({ ...prev, ...updates }))
      }
    })()

    return () => { aborted = true }
  }, [orders, shadowSwapClient])

  const handleCancelOrder = async (orderAddress: string) => {
    // Prevent double-clicks
    if (cancellingOrderId) {
      return
    }

    try {
      setCancellingOrderId(orderAddress)
      
      const loadingToast = toast.loading("Cancelling order...", {
        duration: Infinity,
        dismissible: true,
      })
      
      const result = await cancelOrder(new PublicKey(orderAddress))
      
      // Dismiss loading toast
      toast.dismiss(loadingToast)
      
      if (result.success) {
        toast.success("Order cancelled successfully!", { dismissible: true })
        // Refresh immediately to show updated status
        refresh()
      } else {
        toast.error(`${result.error}`, { 
          dismissible: true,
          duration: 5000,
        })
        // Refresh anyway to show latest order status
        setTimeout(() => refresh(), 500)
      }
    } catch (err: any) {
      console.error("Error cancelling order:", err)
      toast.error(err.message || "Failed to cancel order", { dismissible: true })
      // Refresh to show latest order status
      setTimeout(() => refresh(), 500)
    } finally {
      setCancellingOrderId(null)
    }
  }

  if (!isWalletConnected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-white/40">
            Connect your wallet to view your order history
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort orders by latest createdAt (desc)
  const sortedOrders = [...orders].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Order History</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="overflow-x-auto -mx-2 sm:mx-0 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent">
          <table className="w-full text-xs sm:text-sm min-w-[600px]">
            <thead className="sticky top-0 bg-black/95 backdrop-blur-md z-10">
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/60 font-medium">Order ID</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Pair</th>
                <th className="text-center py-3 px-4 text-white/60 font-medium">Status</th>
                <th className="text-right py-3 px-4 text-white/60 font-medium">Created At</th>
                <th className="text-center py-3 px-4 text-white/60 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-white/40">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-white/40">
                    No orders yet. Place your first trade to see your order history here.
                  </td>
                </tr>
              ) : (
                sortedOrders.map((order) => (
                  <tr 
                    key={order.publicKey}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-white font-mono text-xs">
                      {order.orderId.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-white">SOL/USDC</td>
                    <td className="py-3 px-4 text-center">
                      <Pill variant={getStatusVariant(order.status)}>
                        {getStatusText(order.status)}
                      </Pill>
                    </td>
                    <td className="py-3 px-4 text-right text-white/50 text-xs">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {order.status === ORDER_STATUS.ACTIVE || order.status === ORDER_STATUS.PARTIAL ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelOrder(order.publicKey)}
                          disabled={cancellingOrderId !== null}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Cancel this order"
                        >
                          {cancellingOrderId === order.publicKey ? 'Cancelling' : 'Cancel'}
                        </Button>
                      ) : order.status === ORDER_STATUS.MATCHED_PENDING ? (
                        <span className="text-yellow-400 text-xs" title="Order is being matched">Processing...</span>
                      ) : order.status === ORDER_STATUS.FILLED || order.status === ORDER_STATUS.EXECUTED ? (
                        txByOrder[order.publicKey] ? (
                          <a
                            href={getExplorerUrl(txByOrder[order.publicKey] as string)}
                            target="_blank"
                            rel="noreferrer"
                            className="pill-button text-xs"
                            title="View settlement transaction on Solana Explorer"
                          >
                            <ExternalLink className="pill-icon w-3.5 h-3.5 text-white/80" />
                            <span>View Tx</span>
                          </a>
                        ) : (
                          <span className="text-white/30 text-xs">Locating tx…</span>
                        )
                      ) : (
                        <span className="text-white/30 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
