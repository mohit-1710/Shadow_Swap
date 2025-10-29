"use client"

import { createContext, useContext, useMemo, ReactNode } from "react"
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import { clusterApiUrl } from "@solana/web3.js"
import "@solana/wallet-adapter-react-ui/styles.css"

// Get RPC URL from environment
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet")

interface WalletContextType {
  isWalletConnected: boolean
  walletAddress: string | null
  connectWallet: () => Promise<boolean>
  disconnectWallet: () => void
  wallet: ReturnType<typeof useSolanaWallet>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

/**
 * Internal wrapper that provides our custom wallet context
 */
function WalletContextProvider({ children }: { children: ReactNode }) {
  const solanaWallet = useSolanaWallet()

  const isWalletConnected = solanaWallet.connected
  const walletAddress = solanaWallet.publicKey?.toBase58() || null

  const connectWallet = async (): Promise<boolean> => {
    try {
      if (!solanaWallet.wallet) {
        // If no wallet selected, open the modal
        solanaWallet.select(null)
        return false
      }
      
      await solanaWallet.connect()
      return true
    } catch (error) {
      console.error("Error connecting wallet:", error)
      return false
    }
  }

  const disconnectWallet = async () => {
    try {
      await solanaWallet.disconnect()
    } catch (error) {
      console.error("Error disconnecting wallet:", error)
    }
  }

  return (
    <WalletContext.Provider
      value={{
        isWalletConnected,
        walletAddress,
        connectWallet,
        disconnectWallet,
        wallet: solanaWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

/**
 * Main wallet provider that sets up Solana wallet adapters
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContextProvider>
            {children}
          </WalletContextProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}

/**
 * Hook to access wallet context
 */
export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

