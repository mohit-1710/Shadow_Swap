/**
 * Public Liquidity Pool Integration (Jupiter API)
 * 
 * Provides fallback swap execution through Solana's public liquidity network
 */

import { Connection, VersionedTransaction, PublicKey } from "@solana/web3.js"

/**
 * Get a quote from the public liquidity network (MAINNET ONLY)
 * 
 * NOTE: Jupiter only has liquidity on mainnet, so we ALWAYS use mainnet
 * for fallback swaps, even when the orderbook is on devnet.
 */
export async function getPublicLiquidityQuote(
  inputMint: string,
  outputMint: string,
  amount: number
) {
  try {
    // Use Next.js API proxy to bypass DNS/CORS restrictions
    const url = `/api/jupiter/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=100`
    
    console.log('🔍 Fetching Jupiter quote via proxy (MAINNET)...')
    console.log('   URL:', url)
    console.log('   Input Mint:', inputMint)
    console.log('   Output Mint:', outputMint)
    console.log('   Amount:', amount)
    console.log('   ⚠️  Using MAINNET Jupiter API (devnet has no liquidity)')
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache'
    })
    
    console.log('📥 Jupiter API response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Quote API error response:', errorText)
      
      if (response.status === 404) {
        throw new Error(`No routes found for this token pair`)
      } else if (response.status === 400) {
        throw new Error(`Invalid request parameters`)
      }
      
      throw new Error(`Failed to get quote: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('✅ Quote received successfully')
    console.log('   In Amount:', data.inAmount)
    console.log('   Out Amount:', data.outAmount)
    console.log('   Price Impact:', data.priceImpactPct, '%')
    
    return data
  } catch (error: any) {
    console.error("❌ Error getting public liquidity quote:", error)
    
    // Check for specific error types
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error('🚫 Network error: Unable to reach Jupiter API')
      throw new Error('Network error: Unable to reach Jupiter API. Please check your connection.')
    }
    
    throw new Error(error.message || "Failed to get quote from public liquidity network")
  }
}

/**
 * Get a swap transaction from the public liquidity network (MAINNET ONLY)
 */
export async function getPublicLiquiditySwapTx(
  quote: any,
  userPublicKey: PublicKey
) {
  try {
    const swapBody = {
      quote,
      userPublicKey: userPublicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto"
    }
    
    console.log('📤 Requesting swap transaction via proxy (MAINNET)')
    console.log('   User:', userPublicKey.toBase58())
    
    // Use Next.js API proxy to bypass DNS/CORS restrictions
    const response = await fetch("/api/jupiter/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(swapBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Swap API error response:', errorText)
      throw new Error(`Failed to get swap transaction: ${response.statusText}`)
    }
    
    const json = await response.json()
    console.log('✅ Swap transaction received')
    return json.swapTransaction // base64 encoded transaction
  } catch (error: any) {
    console.error("❌ Error getting public liquidity swap transaction:", error)
    throw new Error(error.message || "Failed to get swap transaction")
  }
}

/**
 * Execute a swap through the public liquidity network
 */
export async function executePublicLiquiditySwap(
  base64Tx: string,
  wallet: any,
  connection: Connection
): Promise<string> {
  try {
    // Deserialize the transaction
    const rawTx = Buffer.from(base64Tx, "base64")
    const tx = VersionedTransaction.deserialize(rawTx)

    // Sign the transaction
    const signedTx = await wallet.signTransaction(tx)
    
    // Send the transaction
    const txid = await connection.sendRawTransaction(
      signedTx.serialize(),
      { 
        skipPreflight: false,
        maxRetries: 3
      }
    )

    // Wait for confirmation
    await connection.confirmTransaction(txid, "confirmed")

    return txid
  } catch (error: any) {
    console.error("Error executing public liquidity swap:", error)
    throw new Error(error.message || "Failed to execute swap")
  }
}

/**
 * Token mint addresses for Jupiter (MAINNET ONLY)
 * 
 * IMPORTANT: These are MAINNET mints because Jupiter only has liquidity on mainnet.
 * Even if your orderbook is on devnet, fallback swaps will use mainnet tokens.
 */
const MAINNET_MINTS: { [key: string]: string } = {
  SOL: "So11111111111111111111111111111111111111112", // Native SOL (wrapped)
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mainnet
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  ETH: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", // ETH (Wormhole)
  WBTC: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh", // WBTC (Wormhole)
}

/**
 * Get MAINNET token mint address by symbol for Jupiter swaps
 * 
 * NOTE: Always returns mainnet mints, regardless of your RPC network.
 * This is intentional because Jupiter only has liquidity on mainnet.
 */
export function getTokenMintForJupiter(symbol: string): string {
  const mint = MAINNET_MINTS[symbol]
  
  if (!mint) {
    throw new Error(`Token mint not found for symbol: ${symbol}. Available: ${Object.keys(MAINNET_MINTS).join(', ')}`)
  }
  
  console.log(`📍 Using MAINNET mint for ${symbol}:`, mint)
  return mint
}

