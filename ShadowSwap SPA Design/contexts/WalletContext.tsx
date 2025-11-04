"use client"

import { createContext, useContext, ReactNode, useMemo } from "react"
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import { clusterApiUrl } from "@solana/web3.js"
import { WalletReadyState } from "@solana/wallet-adapter-base"

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css"

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet")

type WalletConnectResult = "success" | "no-wallet" | "error"

interface WalletContextType {
  isWalletConnected: boolean
  walletAddress: string | null
  connectWallet: () => Promise<WalletConnectResult>
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

  const connectWallet = async (): Promise<WalletConnectResult> => {
    try {
      // Identify wallets that are ready for use (extension installed)
      const readyWallets = wallets.filter(({ adapter }) => {
        const state = adapter.readyState
        return state === WalletReadyState.Installed
      })

      if (!connected && readyWallets.length === 0) {
        return "no-wallet"
      }

      // If not connected, try to select and connect
      if (!connected && readyWallets.length > 0) {
        // Prefer Phantom when available, otherwise fall back to the first ready wallet
        const phantomWallet = readyWallets.find((w) => w.adapter.name === "Phantom")
        const targetWallet = phantomWallet ?? readyWallets[0]

        if (!targetWallet) {
          return "no-wallet"
        }

        select(targetWallet.adapter.name)
        await targetWallet.adapter.connect()
        
        // Wait a bit to ensure the connected state has been updated
        // The wallet adapter updates the state asynchronously
        await new Promise(resolve => setTimeout(resolve, 100))
        
        return "success"
      }

      return "success"
    } catch (error) {
      console.error("Error connecting wallet:", error)
      return "error"
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
