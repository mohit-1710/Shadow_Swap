"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pill } from "@/components/ui/pill"

// Mock order data with real timestamps
const mockOrders = [
  {
    id: "ORD-12345",
    pair: "SOL/USDC",
    type: "Limit Buy",
    amount: 5.5,
    price: 142.0,
    status: "Filled",
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: "ORD-12344",
    pair: "ETH/USDC",
    type: "Market Sell",
    amount: 2.0,
    price: 2450.0,
    status: "Ongoing",
    createdAt: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
  },
  {
    id: "ORD-12343",
    pair: "SOL/USDC",
    type: "Limit Sell",
    amount: 10.0,
    price: 145.0,
    status: "Canceled",
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  },
  {
    id: "ORD-12342",
    pair: "SOL/USDC",
    type: "Market Buy",
    amount: 3.2,
    price: 141.5,
    status: "Filled",
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
]

export function OrderHistory() {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusVariant = (status: string): "success" | "warning" | "error" => {
    switch (status) {
      case "Filled":
        return "success"
      case "Ongoing":
        return "warning"
      case "Canceled":
        return "error"
      default:
        return "warning"
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Order History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full text-xs sm:text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-white/10">
                {/* Old: Order # - keeping for reference
                <th className="text-left py-3 px-4 text-white/60 font-medium">Order #</th>
                */}
                <th className="text-left py-3 px-4 text-white/60 font-medium">Order id</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Pair</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Type</th>
                {/* Removed Amount and Price columns */}
                <th className="text-center py-3 px-4 text-white/60 font-medium">Status</th>
                <th className="text-right py-3 px-4 text-white/60 font-medium">Created At</th>
              </tr>
            </thead>
            <tbody>
              {mockOrders.map((order) => (
                <tr 
                  key={order.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4 text-white font-medium">{order.id}</td>
                  <td className="py-3 px-4 text-white">{order.pair}</td>
                  <td className="py-3 px-4">
                    <span className={order.type.includes("Buy") ? "text-green-400" : "text-red-400"}>
                      {order.type}
                    </span>
                  </td>
                  {/* Removed Amount and Price cells */}
                  <td className="py-3 px-4 text-center">
                    <Pill variant={getStatusVariant(order.status)}>
                      {order.status}
                    </Pill>
                  </td>
                  <td className="py-3 px-4 text-right text-white/50 text-xs">
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {mockOrders.length === 0 && (
          <div className="py-12 text-center text-white/40">
            No orders yet. Place your first trade to see your order history here.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

