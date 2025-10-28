"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface WalletContextType {
  isWalletConnected: boolean
  walletAddress: string | null
  connectWallet: () => Promise<boolean>
  disconnectWallet: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (typeof window !== "undefined") {
        const solana = (window as any).solana
        if (solana?.isPhantom && solana.isConnected) {
          try {
            const response = await solana.connect({ onlyIfTrusted: true })
            setWalletAddress(response.publicKey.toString())
            setIsWalletConnected(true)
          } catch (error) {
            // Wallet not connected yet
            console.log("Wallet not connected")
          }
        }
      }
    }
    checkWalletConnection()
  }, [])

  const connectWallet = async (): Promise<boolean> => {
    try {
      if (typeof window === "undefined") {
        return false
      }

      const solana = (window as any).solana

      // Check if Phantom wallet is installed
      if (!solana) {
        window.open("https://phantom.app/", "_blank")
        return false
      }

      // Try Phantom first
      if (solana.isPhantom) {
        const response = await solana.connect()
        const address = response.publicKey.toString()
        setWalletAddress(address)
        setIsWalletConnected(true)
        return true
      }

      // Try Solflare if Phantom not available
      const solflare = (window as any).solflare
      if (solflare?.isSolflare) {
        await solflare.connect()
        const address = solflare.publicKey.toString()
        setWalletAddress(address)
        setIsWalletConnected(true)
        return true
      }

      return false
    } catch (error) {
      console.error("Error connecting wallet:", error)
      return false
    }
  }

  const disconnectWallet = () => {
    if (typeof window !== "undefined") {
      const solana = (window as any).solana
      if (solana?.disconnect) {
        solana.disconnect()
      }
      const solflare = (window as any).solflare
      if (solflare?.disconnect) {
        solflare.disconnect()
      }
    }
    setIsWalletConnected(false)
    setWalletAddress(null)
  }

  return (
    <WalletContext.Provider
      value={{
        isWalletConnected,
        walletAddress,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

