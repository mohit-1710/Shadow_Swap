"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pill } from "@/components/ui/pill"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/contexts/WalletContext"
import { useOrderBook } from "@/hooks/useOrderBook"
import { useShadowSwap } from "@/hooks/useShadowSwap"
import { PublicKey } from "@solana/web3.js"
import { RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ORDER_STATUS } from "@/lib/program"

export function OrderHistory() {
  const { isWalletConnected } = useWallet()
  const { orders, isLoading, error, refresh } = useOrderBook(5000) // Refresh every 5s
  const { cancelOrder } = useShadowSwap()
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)

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
