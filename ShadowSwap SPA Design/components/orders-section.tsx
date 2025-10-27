"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pill } from "@/components/ui/pill"
import { X } from "lucide-react"

const mockOrders = [
  {
    id: "1",
    pair: "SOL/USDC",
    type: "Limit Buy",
    amount: 5.5,
    price: 142.0,
    total: 780.1,
    status: "Open",
    timestamp: "2 min ago",
  },
  {
    id: "2",
    pair: "ETH/USDC",
    type: "Limit Sell",
    amount: 2.25,
    price: 2450.5,
    total: 5513.63,
    status: "Open",
    timestamp: "15 min ago",
  },
  {
    id: "3",
    pair: "SOL/USDC",
    type: "Market Buy",
    amount: 10.0,
    price: 142.5,
    total: 1425.0,
    status: "Filled",
    timestamp: "1 hour ago",
  },
  {
    id: "4",
    pair: "BTC/USDC",
    type: "Limit Buy",
    amount: 0.05,
    price: 42500.0,
    total: 2125.0,
    status: "Cancelled",
    timestamp: "3 hours ago",
  },
]

export function OrdersSection() {
  return (
    <section id="orders" className="py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Your Orders</h2>
          <p className="text-white/60 text-lg">Track and manage all your active and historical orders</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Order History</CardTitle>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm text-white/60 hover:text-white transition-colors">All</button>
                <button className="px-3 py-1 text-sm text-golden border-b-2 border-golden">Open</button>
                <button className="px-3 py-1 text-sm text-white/60 hover:text-white transition-colors">Filled</button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/60 font-medium">Pair</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium">Type</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">Amount</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">Price</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">Total</th>
                    <th className="text-center py-3 px-4 text-white/60 font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">Time</th>
                    <th className="text-center py-3 px-4 text-white/60 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mockOrders.map((order) => (
                    <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-white font-medium">{order.pair}</td>
                      <td className="py-3 px-4">
                        <span className={order.type.includes("Buy") ? "text-green-400" : "text-red-400"}>
                          {order.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-white">{order.amount}</td>
                      <td className="py-3 px-4 text-right text-white">${order.price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-white">${order.total.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <Pill
                          variant={
                            order.status === "Open" ? "warning" : order.status === "Filled" ? "success" : "error"
                          }
                        >
                          {order.status}
                        </Pill>
                      </td>
                      <td className="py-3 px-4 text-right text-white/50 text-xs">{order.timestamp}</td>
                      <td className="py-3 px-4 text-center">
                        {order.status === "Open" && (
                          <button className="text-white/60 hover:text-red-400 transition-colors">
                            <X size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
