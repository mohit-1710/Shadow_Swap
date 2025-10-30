# 🚀 Quick Start - 5 Minutes to First Order

## Step 1: Start the Dev Server (30 seconds)

```bash
cd "/Users/vansh/Coding/Shadow_Swap/ShadowSwap SPA Design"
pnpm dev
```

Visit: http://localhost:3000

---

## Step 2: Connect Phantom Wallet (1 minute)

1. Install [Phantom Wallet Extension](https://phantom.app/)
2. Create/import wallet
3. **Switch to Devnet:**
   - Settings → Developer Settings → Testnet Mode: ON
   - Change Network → Devnet
4. Get devnet SOL: https://faucet.solana.com

---

## Step 3: Update Your Trade Component (2 minutes)

Open `components/trade-section.tsx` and add at the top:

```tsx
"use client"

import { useShadowSwap } from "@/hooks/useShadowSwap"
import { useWallet } from "@/contexts/WalletContext"
import { toast } from "sonner"
```

Add this function inside your component:

```tsx
const { submitOrder, isLoading } = useShadowSwap()
const { isWalletConnected, connectWallet } = useWallet()

const handleTrade = async (side: "buy" | "sell", price: number, amount: number) => {
  if (!isWalletConnected) {
    await connectWallet()
    return
  }

  const result = await submitOrder({ side, price, amount })
  
  if (result.success) {
    toast.success(`Order submitted! Tx: ${result.signature.slice(0, 8)}...`)
  } else {
    toast.error(result.error || "Failed to submit order")
  }
}
```

---

## Step 4: Test It! (1 minute)

1. Click "Connect Wallet" in your UI
2. Approve connection in Phantom
3. Enter trade details:
   - Side: Buy or Sell
   - Price: e.g., 100 USDC
   - Amount: e.g., 1 SOL
4. Click submit
5. Approve transaction in Phantom
6. 🎉 You'll see a success toast with transaction signature!

---

## Step 5: View Your Order (30 seconds)

Update `components/order-history.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { useShadowSwap, OrderData } from "@/hooks/useShadowSwap"

export function OrderHistory() {
  const { fetchUserOrders, isReady } = useShadowSwap()
  const [orders, setOrders] = useState<OrderData[]>([])

  useEffect(() => {
    if (isReady) {
      fetchUserOrders().then(setOrders)
    }
  }, [isReady])

  return (
    <div>
      <h2>Your Orders ({orders.length})</h2>
      {orders.map((order, i) => (
        <div key={i}>
          {order.side === 0 ? "BUY" : "SELL"} | 
          Price: {order.price.toString()} | 
          Status: {order.status}
        </div>
      ))}
    </div>
  )
}
```

---

## 🎯 That's It!

You now have a fully functional ShadowSwap integration:
- ✅ Wallet connection
- ✅ Order submission
- ✅ Order history
- ✅ Transaction signing
- ✅ Error handling

---

## 🐛 Troubleshooting

**"Wallet not connected"**  
→ Make sure you clicked "Connect Wallet" first

**"Transaction failed"**  
→ Check you're on Devnet and have SOL balance

**"Insufficient funds"**  
→ Get more devnet SOL from faucet  
→ For USDC, ask backend engineer

**Orders not settling?**  
→ Settlement bot needs to be running (backend engineer's responsibility)

---

## 📚 More Info

- **Detailed Guide:** `INTEGRATION_GUIDE.md`
- **Setup Details:** `SETUP_COMPLETE.md`
- **Backend Docs:** `../FINAL.md`

---

**Ready to ship! 🚀**

