"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { TradeSection } from "@/components/trade-section"
import { OrderHistory } from "@/components/order-history"
import { useWallet } from "@/contexts/WalletContext"
import { toast } from "sonner"

export default function TradePage() {
  const router = useRouter()
  const { isWalletConnected } = useWallet()

  // Do not hard-redirect away on reload. If not connected, show a friendly prompt.
  // Wallet adapters may need a moment to autoConnect after reload.

  return (
    <main className="min-h-screen bg-background">
      {isWalletConnected ? (
        <TradeSection />
      ) : (
        <section className="py-10 px-4 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">Connect your wallet to trade</h2>
          <p className="text-white/60">Once connected, your balances and the trade form will appear here.</p>
        </section>
      )}
      
      {/* Order History below Trade Section */}
      <section className="py-6 px-4 max-w-7xl mx-auto">
        <OrderHistory />
      </section>
    </main>
  )
}
