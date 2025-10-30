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

  useEffect(() => {
    // Check if wallet is connected on mount
    if (!isWalletConnected) {
      toast.error("Please connect your wallet to access the trade page", { dismissible: true })
      router.replace("/")
    }
  }, [isWalletConnected, router])

  // Don't render the trade section if wallet is not connected
  if (!isWalletConnected) {
    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <TradeSection />
      
      {/* Order History below Trade Section */}
      <section className="py-6 px-4 max-w-7xl mx-auto">
        <OrderHistory />
      </section>
    </main>
  )
}

