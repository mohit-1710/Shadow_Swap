"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { TradeSection } from "@/components/trade-section"
import { useWallet } from "@/contexts/WalletContext"
import { toast } from "sonner"

export default function TradePage() {
  const router = useRouter()
  const { isWalletConnected } = useWallet()

  useEffect(() => {
    // Check if wallet is connected on mount
    if (!isWalletConnected) {
      toast.error("Please connect your wallet to access the trade page")
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
    </main>
  )
}

