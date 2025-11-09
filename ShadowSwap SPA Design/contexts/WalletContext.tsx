"use client"

import { createContext, useContext, ReactNode, useMemo, useRef, useEffect, useCallback } from "react"
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
  const walletRef = useRef(wallet)
  const { connected, publicKey } = wallet

  useEffect(() => {
    walletRef.current = wallet
  }, [wallet])

  const waitForWalletSelection = useCallback(async (targetName: string) => {
    const timeoutMs = 2000
    const start = performance.now()

    // Poll until the wallet adapter in context matches the target selection.
    while (performance.now() - start < timeoutMs) {
      const current = walletRef.current.wallet
      if (current && current.adapter.name === targetName) {
        return
      }
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }

    throw new Error("Timed out waiting for wallet selection")
  }, [])

  const connectWallet = useCallback(async (): Promise<WalletConnectResult> => {
    try {
      const { wallets, connected } = walletRef.current

      // Identify wallets that are ready for use (extension installed)
      const readyWallets = wallets.filter(({ adapter }) => {
        const state = adapter.readyState
        return state === WalletReadyState.Installed || state === WalletReadyState.Loadable
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

        const targetName = targetWallet.adapter.name
        walletRef.current.select(targetName)

        await waitForWalletSelection(targetName)
        await walletRef.current.connect()
        return "success"
      }

      return "success"
    } catch (error) {
      console.error("Error connecting wallet:", error)
      return "error"
    }
  }, [waitForWalletSelection])

  const disconnectWallet = useCallback(() => {
    void walletRef.current.disconnect()
  }, [])

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
