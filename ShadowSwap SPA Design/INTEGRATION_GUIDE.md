# ShadowSwap Frontend Integration Guide

## ✅ Completed Setup

All the foundational integration work has been completed! Here's what was set up:

### 1. Dependencies Installed
- `@solana/web3.js` - Solana blockchain interaction
- `@solana/wallet-adapter-react` - React hooks for wallet connection
- `@solana/wallet-adapter-react-ui` - Pre-built UI components
- `@solana/wallet-adapter-wallets` - Support for Phantom, Solflare, etc.
- `@coral-xyz/anchor` - Anchor framework client library
- `@solana/spl-token` - SPL token utilities

### 2. Configuration Files Created

#### `.env.local`
Contains all necessary environment variables:
- Program ID: `5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt`
- OrderBook PDA: `FWSgsP1rt8jQT3MXNQyyXfgpks1mDQCFZz25ZktuuJg8`
- SOL and USDC mint addresses
- RPC URL (devnet)

#### `lib/idl/shadow_swap.json`
The Anchor IDL file (25.8 KB) generated from the backend program.

### 3. Integration Files Created

#### `lib/shadowSwapClient.ts`
Main client library with methods:
- `submitOrder()` - Submit encrypted orders
- `fetchUserOrders()` - Get user's order history
- `fetchAllOrders()` - Get all orderbook orders
- `cancelOrder()` - Cancel existing orders
- `getTokenBalance()` - Check SPL token balances
- `getSolBalance()` - Check SOL balance
- `getOrderBook()` - Fetch orderbook data

#### `contexts/WalletContext.tsx`
Updated to use Solana wallet adapters:
- Supports Phantom & Solflare wallets
- Auto-connect functionality
- Proper TypeScript types
- Exposes the full Solana wallet object for signing transactions

#### `hooks/useShadowSwap.ts`
Custom React hook that provides:
- `submitOrder(params)` - Submit orders with loading states
- `fetchUserOrders()` - Get user's orders
- `fetchAllOrders()` - Get all orders
- `cancelOrder(orderPDA)` - Cancel orders
- `getBalances()` - Fetch SOL & USDC balances
- `isReady`, `isLoading`, `error` - UI state management

---

## 🚀 How to Use in Your Components

### Step 1: Make sure WalletProvider is in your layout

Your `app/layout.tsx` should already have the `WalletProvider`. If not, wrap your app:

```tsx
import { WalletProvider } from "@/contexts/WalletContext"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  )
}
```

### Step 2: Use in your components

#### Example: Submit Order (in `trade-section.tsx`)

```tsx
"use client"

import { useShadowSwap } from "@/hooks/useShadowSwap"
import { useWallet } from "@/contexts/WalletContext"
import { toast } from "sonner"

export function TradeSection() {
  const { isWalletConnected, connectWallet } = useWallet()
  const { submitOrder, isLoading, isReady } = useShadowSwap()

  const handleSubmitOrder = async () => {
    if (!isWalletConnected) {
      await connectWallet()
      return
    }

    try {
      const result = await submitOrder({
        side: "buy", // or "sell"
        price: 100.5, // USDC per SOL
        amount: 1.0, // SOL amount
      })

      if (result.success) {
        toast.success(`Order submitted! Signature: ${result.signature}`)
      } else {
        toast.error(`Failed: ${result.error}`)
      }
    } catch (err) {
      toast.error("Failed to submit order")
    }
  }

  return (
    <button 
      onClick={handleSubmitOrder} 
      disabled={isLoading || !isReady}
    >
      {isLoading ? "Submitting..." : "Submit Order"}
    </button>
  )
}
```

#### Example: Display Order History (in `order-history.tsx`)

```tsx
"use client"

import { useEffect, useState } from "react"
import { useShadowSwap, OrderData, OrderStatus } from "@/hooks/useShadowSwap"

export function OrderHistory() {
  const { fetchUserOrders, isReady } = useShadowSwap()
  const [orders, setOrders] = useState<OrderData[]>([])

  useEffect(() => {
    if (isReady) {
      loadOrders()
    }
  }, [isReady])

  const loadOrders = async () => {
    const userOrders = await fetchUserOrders()
    setOrders(userOrders)
  }

  return (
    <div>
      {orders.map((order, idx) => (
        <div key={idx}>
          <p>Side: {order.side === 0 ? "Buy" : "Sell"}</p>
          <p>Amount: {order.baseAmount.toString()}</p>
          <p>Status: {OrderStatus[order.status]}</p>
        </div>
      ))}
    </div>
  )
}
```

#### Example: Display Balances

```tsx
"use client"

import { useEffect, useState } from "react"
import { useShadowSwap } from "@/hooks/useShadowSwap"

export function BalanceDisplay() {
  const { getBalances, isReady } = useShadowSwap()
  const [balances, setBalances] = useState({ sol: 0, usdc: 0 })

  useEffect(() => {
    if (isReady) {
      loadBalances()
    }
  }, [isReady])

  const loadBalances = async () => {
    const bal = await getBalances()
    setBalances(bal)
  }

  return (
    <div>
      <p>SOL: {balances.sol.toFixed(4)}</p>
      <p>USDC: {balances.usdc.toFixed(2)}</p>
    </div>
  )
}
```

---

## 🔧 Testing the Integration

### Prerequisites
1. Install Phantom wallet extension
2. Switch to Devnet in Phantom settings
3. Get devnet SOL from https://faucet.solana.com
4. Get devnet USDC (you may need to ask the backend engineer for this)

### Test Steps

1. **Start the dev server:**
   ```bash
   cd "/Users/vansh/Coding/Shadow_Swap/ShadowSwap SPA Design"
   pnpm dev
   ```

2. **Test wallet connection:**
   - Click "Connect Wallet" button
   - Approve connection in Phantom
   - Verify wallet address displays

3. **Test order submission:**
   - Enter trade details (side, price, amount)
   - Click submit
   - Approve transaction in Phantom
   - Check console for transaction signature

4. **Test order fetching:**
   - After submitting an order, refresh the order history
   - Verify your order appears with correct details

---

## 🐛 Common Issues & Solutions

### Issue: "Wallet not connected" error
**Solution:** Make sure the WalletProvider is wrapping your app in `layout.tsx`

### Issue: "Program not found" error
**Solution:** Verify the program is deployed on devnet. Check with backend engineer.

### Issue: "Insufficient funds" error
**Solution:** You need devnet SOL and USDC. Get SOL from faucet, ask backend engineer for USDC.

### Issue: TypeScript errors about PublicKey
**Solution:** Import PublicKey from `@solana/web3.js`

### Issue: Transaction timeout
**Solution:** The devnet RPC can be slow. Try using a custom RPC like Helius or Alchemy.

---

## 📝 Next Steps (Optional Enhancements)

### 1. Real-time Order Updates
Add WebSocket connection to listen for order settlements:
```tsx
// Listen for TradeSettled events
connection.onLogs(PROGRAM_ID, (logs) => {
  // Parse and update UI
})
```

### 2. Better Error Handling
Add specific error messages for different failure scenarios:
- Insufficient balance
- Order size too small
- Invalid price range

### 3. Transaction Confirmation UI
Show pending transaction status with Solana Explorer link:
```tsx
const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`
```

### 4. Order Cancellation UI
Add cancel buttons to order history items:
```tsx
const handleCancel = async (orderPDA: string) => {
  const result = await cancelOrder(orderPDA)
  if (result.success) {
    toast.success("Order cancelled!")
    refreshOrders()
  }
}
```

### 5. Price Chart Integration
Fetch historical trades and display in the price charts component.

---

## 🎯 What You CAN Do Now (Without Backend Engineer)

✅ **Test wallet connection** - Works independently  
✅ **Display user balances** - Just needs wallet connection  
✅ **Submit orders** - Will work if program is deployed  
✅ **Fetch order history** - Will work if orders exist  
✅ **Cancel orders** - Will work for your own orders  
✅ **UI/UX improvements** - All frontend work  

## ❌ What You CANNOT Do (Needs Backend Engineer)

❌ **See orders settle** - Needs settlement bot running  
❌ **Get devnet USDC** - Backend engineer has the token mint authority  
❌ **Initialize new orderbooks** - Requires admin authority  
❌ **Modify program logic** - Backend engineer's domain  

---

## 📞 Questions for Backend Engineer (When Available)

1. **Is the settlement bot running?** If not, orders won't match.
2. **Can you send me devnet USDC?** Need it for testing buy orders.
3. **What's the current orderbook status?** Any existing orders to test against?
4. **Any recent program updates?** May need to rebuild IDL.

---

## 🎉 Success Criteria

You'll know the integration is working when:
1. ✅ Wallet connects without errors
2. ✅ Balances display correctly
3. ✅ Order submission returns a transaction signature
4. ✅ Submitted orders appear in order history
5. ✅ Orders eventually settle (when bot is running)

---

## 📚 Additional Resources

- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [Anchor Client Docs](https://www.anchor-lang.com/docs/client-typescript)
- [Wallet Adapter Docs](https://github.com/solana-labs/wallet-adapter)
- [Backend Documentation](../FINAL.md)

---

**Integration completed by AI Assistant on October 29, 2025**  
**All foundational work is done - you can start building UI features now!** 🚀

