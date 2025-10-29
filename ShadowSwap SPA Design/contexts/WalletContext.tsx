"use client"

import { createContext, useContext, ReactNode, useMemo } from "react"
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import { clusterApiUrl } from "@solana/web3.js"

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css"

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet")

interface WalletContextType {
  isWalletConnected: boolean
  walletAddress: string | null
  connectWallet: () => Promise<boolean>
  disconnectWallet: () => void
  wallet: ReturnType<typeof useSolanaWallet> | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

/**
 * Inner provider that uses the Solana wallet adapter
 */
function WalletContextProvider({ children }: { children: ReactNode }) {
  const wallet = useSolanaWallet()
  const { connected, publicKey, disconnect, select, wallets } = wallet

  const connectWallet = async (): Promise<boolean> => {
    try {
      // If not connected, try to select and connect
      if (!connected && wallets.length > 0) {
        // Try Phantom first
        const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom')
        if (phantomWallet) {
          select(phantomWallet.adapter.name)
          await phantomWallet.adapter.connect()
          return true
        }
        
        // Fallback to first available wallet
        select(wallets[0].adapter.name)
        await wallets[0].adapter.connect()
        return true
      }
      return connected
    } catch (error) {
      console.error("Error connecting wallet:", error)
      return false
    }
  }

  const disconnectWallet = () => {
    disconnect()
  }

  return (
    <WalletContext.Provider
      value={{
        isWalletConnected: connected,
        walletAddress: publicKey?.toString() || null,
        connectWallet,
        disconnectWallet,
        wallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

/**
 * Main wallet provider that wraps Solana wallet adapter
 */
export function WalletProvider({ children }: { children: ReactNode }) {
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
          <WalletContextProvider>{children}</WalletContextProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
