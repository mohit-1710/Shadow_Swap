# How to Check the OrderBook Manually

## Current OrderBook Address
```
J5NkY5hUS1DoMYXtyMt4dY87RFkbS7MD4eTH7YeKY8dn
```

---

## ✅ Method 1: Use the Script (Recommended!)

Simply run:
```bash
yarn view:orderbook
```

**Output:**
- OrderBook details (base/quote mints, authority, order count, etc.)
- All active orders with status, owner, cipher, timestamp

---

## 🌐 Method 2: Solana Explorer

Open in browser:
```
https://explorer.solana.com/address/J5NkY5hUS1DoMYXtyMt4dY87RFkbS7MD4eTH7YeKY8dn?cluster=devnet
```

---

## 📋 Method 3: Raw CLI Data

```bash
solana account J5NkY5hUS1DoMYXtyMt4dY87RFkbS7MD4eTH7YeKY8dn --url devnet
```

---

## 🔍 Method 4: Check Individual Order

If you have an order address (e.g., `GkaemkbJkJVHtaDJoKG9YyyyyjSmdKZkZK77rWZVmUqh`):

```bash
solana account GkaemkbJkJVHtaDJoKG9YyyyyjSmdKZkZK77rWZVmUqh --url devnet
```

---

## 📊 Current State (as of last check)

```
📖 ORDER BOOK DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Address:         J5NkY5hUS1DoMYXtyMt4dY87RFkbS7MD4eTH7YeKY8dn
Base Mint:       So11111111111111111111111111111111111111112 (Wrapped SOL)
Quote Mint:      4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU (Your USDC)
Authority:       3QsnGf33PAhSpXGSpZzRnPHvNAwHDUQ7jdPu71Le5jue
Order Count:     1
Min Base Size:   1000000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Orders:
- 1 cancelled test order (from initial setup testing)
```

---

## 🎯 Quick Commands Reference

| Action | Command |
|--------|---------|
| View OrderBook | `yarn view:orderbook` |
| View on Explorer | Open `https://explorer.solana.com/address/J5NkY5hUS1DoMYXtyMt4dY87RFkbS7MD4eTH7YeKY8dn?cluster=devnet` |
| View Raw Account | `solana account J5NkY5hUS1DoMYXtyMt4dY87RFkbS7MD4eTH7YeKY8dn --url devnet` |
| Check Wallet Balance | `solana balance --url devnet` |
| Check Token Accounts | `spl-token accounts --url devnet` |

---

## 💡 What to Look For

✅ **Healthy OrderBook:**
- Order Count increasing as users submit orders
- Mix of Active orders (status: 0)
- Some Executed orders (status: 3)

⚠️ **Issues:**
- Many Cancelled orders → users having problems
- No orders → frontend not working
- High order count but no Executed → bot not matching

---

## 🚀 Next: Submit Your First Order!

1. Go to frontend: http://localhost:3000
2. Connect wallet
3. Submit a buy or sell order
4. Run `yarn view:orderbook` to see it appear!
5. Wait 10 seconds for the keeper bot to match it
6. Check again to see status change to "Executed"

Enjoy! 🎊


