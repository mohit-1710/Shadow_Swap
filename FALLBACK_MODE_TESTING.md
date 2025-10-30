# Fallback Mode Testing Guide

## Overview
The Fallback Mode allows orders to be matched privately first, and if no match is found within 10 seconds, the order automatically routes through Solana's public liquidity network (via Jupiter).

---

## 🔍 How to Test Fallback Mode

### **Current Behavior on Devnet**

Since you're running on **devnet**, Jupiter API is **NOT available** (Jupiter only works on mainnet). Here's what happens:

1. ✅ **Order submits to private orderbook** - This works fine
2. ⏱️ **10-second countdown starts** - You'll see "Private matching… (10s, 9s, 8s...)"
3. ⚠️ **Fallback triggers** - After 10 seconds, you'll see a warning toast:
   - "Fallback triggered: Jupiter API is only available on mainnet. On devnet, your order remains in the private orderbook."
4. ℹ️ **Order stays active** - Your order continues waiting in the private orderbook for a match

---

## 🎯 How to Verify It's Working

### **Step 1: Enable Fallback Toggle**
1. Open the Trade page
2. Look for the **"Fallback"** toggle in the top-right of the "Place Order" card
3. Click it to enable (it should turn purple)
4. You'll see a tooltip: "Enable this to allow your order to be matched privately first..."

### **Step 2: Submit an Order with Fallback Enabled**
1. Enter an amount (e.g., 0.1 SOL)
2. Set a limit price or use market order
3. Click "Place Limit Order" / "Execute Market Order"
4. **Watch the console logs** in your browser DevTools (F12 → Console tab)

### **Step 3: Observe the Countdown**
After order submission succeeds, you should see:

**In the UI:**
- 🟣 Purple banner appears with spinning icon
- Text changes: "Private matching… (10s)" → "Private matching… (9s)" → ... → "Private matching… (1s)"
- Button text: "Matching... (10s)" → "Matching... (9s)" → etc.

**In the Console:**
```
Order submitted successfully with signature: <signature>
🔄 Fallback triggered - no private match found in 10 seconds
⚠️ Fallback mode triggered, but Jupiter API only works on mainnet
```

**In the Toast Notifications:**
- ⚠️ Warning: "Fallback triggered: Jupiter API is only available on mainnet..."
- ℹ️ Info: "Your order is still active in the private orderbook..."

---

## 📊 Console Logs to Watch

Open **DevTools → Console** and look for these emoji markers:

| Emoji | Log Message | Meaning |
|-------|-------------|---------|
| ✅ | `Order submitted successfully with signature: ...` | Order was submitted to blockchain |
| 🔄 | `Fallback triggered - no private match found in 10 seconds` | Countdown finished, fallback executing |
| ⚠️ | `Fallback mode triggered, but Jupiter API only works on mainnet` | Devnet limitation detected |
| 📊 | `Getting quote from public liquidity network...` | (Mainnet only) Fetching Jupiter quote |
| ✍️ | `Requesting signature for fallback transaction...` | (Mainnet only) Asking user to sign |
| ✅ | `Fallback swap executed successfully: <txid>` | (Mainnet only) Jupiter swap completed |
| ❌ | `Fallback swap error: ...` | Something went wrong |

---

## 🧪 Testing Scenarios

### **Scenario 1: Fallback Disabled (Default)**
**Expected:** Order submits to orderbook → Toast shows "Order submitted successfully!" → Form resets

**How to test:**
1. Keep Fallback toggle **OFF** (gray)
2. Submit an order
3. Should see immediate success message
4. **No countdown** should appear

---

### **Scenario 2: Fallback Enabled - Devnet (Current)**
**Expected:** Order submits → 10-second countdown → Warning about Jupiter mainnet-only → Order stays in orderbook

**How to test:**
1. Enable Fallback toggle (purple)
2. Submit an order
3. Watch countdown: 10s → 9s → ... → 1s
4. After 10s: Warning toast appears
5. Check console for: `⚠️ Fallback mode triggered, but Jupiter API only works on mainnet`

---

### **Scenario 3: Fallback Enabled - Mainnet (Production)**
**Expected:** Order submits → 10-second countdown → Jupiter swap executes → Success toast

**How to test (when deployed to mainnet):**
1. Update `.env` to use mainnet RPC: `NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com`
2. Use mainnet program addresses
3. Enable Fallback toggle
4. Submit order
5. Wait 10 seconds
6. Should see: "Getting quote from public liquidity network..."
7. Sign the transaction
8. Success: "Order executed through Solana public liquidity network."

---

## 🐛 Troubleshooting

### **Error: "Transaction has already been processed"**
**Cause:** You clicked submit multiple times, or refreshed during submission.

**Solution:** 
- ✅ **This is now handled automatically** - the order was submitted successfully
- The error is caught and treated as success
- Your order is in the orderbook

**To prevent:**
- Don't click submit multiple times
- Wait for the loading state to finish

---

### **Error: "Failed to fetch" from Jupiter API**
**Cause:** Trying to use Jupiter on devnet (not supported)

**Solution:**
- ✅ **Now shows user-friendly warning** instead of error
- On devnet, fallback just keeps order in orderbook
- To test real Jupiter swap, deploy to mainnet

---

### **Countdown doesn't start**
**Check:**
1. Is Fallback toggle enabled? (Should be purple)
2. Did order submit successfully? (Check for success toast)
3. Check console for errors

---

### **Order never gets matched**
**This is expected on devnet!** 
- There might not be any counterparty orders
- Matching happens via the settlement bot
- To test matching, you need to:
  - Run the settlement bot (`yarn dev:bot`)
  - Submit opposing orders (buy + sell at same price)

---

## 📝 Expected User Flow

### **WITH Fallback Enabled:**
```
1. User enters trade details
2. Enables "Fallback" toggle
3. Clicks "Place Order"
   ↓
4. Loading toast: "Submitting order to blockchain..."
   ↓
5. Order submits successfully
   ↓
6. DEVNET: Purple countdown banner appears
   "Private matching… (10s, 9s, 8s...)"
   Button shows: "Matching... (Xs)"
   ↓
7. After 10 seconds:
   DEVNET: Warning toast + Info toast
   MAINNET: Jupiter swap executes
   ↓
8. Form resets
```

### **WITHOUT Fallback Enabled:**
```
1. User enters trade details
2. Fallback toggle is OFF (gray)
3. Clicks "Place Order"
   ↓
4. Loading toast: "Submitting order to blockchain..."
   ↓
5. Order submits successfully
   ↓
6. Success toast: "Order submitted successfully!"
   ↓
7. Form resets
   ↓
8. Order waits in private orderbook indefinitely
```

---

## 🔧 Implementation Details

### **State Management**
- `allowLiquidityPool` - Boolean flag for fallback enabled/disabled
- `isFallbackCountdown` - Boolean flag for countdown active
- `fallbackCountdown` - Number (10 → 0) for countdown display
- `orderSignature` - Stores order signature for tracking

### **Countdown Logic**
- Starts at 10 seconds
- Updates every 1 second via `setInterval`
- Polls order status every 500ms (currently not implemented - waits full 10s)
- After 10s, calls `executeFallbackSwap()`

### **Future Enhancement: Real-time Order Matching Detection**
Currently, the code waits the full 10 seconds before triggering fallback. To detect if an order was matched early:

```typescript
// TODO: Implement real-time order status checking
const checkOrderFilledStatus = async (signature: string) => {
  // Query blockchain for order account status
  // Return 'filled', 'active', or 'cancelled'
}

// In checkOrderStatus():
const orderStatus = await checkOrderFilledStatus(result.signature)
if (orderStatus === 'filled') {
  clearInterval(statusCheckInterval)
  clearInterval(countdownInterval)
  // Show success, reset form
}
```

---

## ✅ How to Confirm Everything Works

### **Checklist:**
- [ ] Toggle shows "Fallback" label (not "LP Fallback")
- [ ] Tooltip text updated with 10-second mention
- [ ] Toggle turns purple when enabled
- [ ] Warning banner shows when enabled
- [ ] Countdown starts after order submission (with fallback enabled)
- [ ] Countdown updates every second (10s → 9s → ... → 1s)
- [ ] Button text changes to "Matching... (Xs)"
- [ ] Console shows emoji logs (🔄, ⚠️, etc.)
- [ ] After 10s on devnet: Warning toast appears
- [ ] Form resets after countdown completes
- [ ] Order submission works WITHOUT fallback enabled

### **Manual Test Script:**
```bash
# 1. Start the dev server
cd "ShadowSwap SPA Design"
pnpm dev

# 2. Open http://localhost:3000/trade
# 3. Connect wallet
# 4. Open DevTools Console (F12)
# 5. Enable Fallback toggle
# 6. Submit order (e.g., 0.01 SOL)
# 7. Watch console logs and UI countdown
# 8. Wait 10 seconds
# 9. Verify warning toast appears
# 10. Check that form resets
```

---

## 🚀 Testing on Mainnet (Future)

When you deploy to mainnet:

1. Update environment variables:
```env
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_PROGRAM_ID=<your_mainnet_program_id>
NEXT_PUBLIC_ORDER_BOOK=<your_mainnet_orderbook>
```

2. Update token mints in `lib/jupiter.ts` (already done - automatically detects mainnet)

3. Test with small amounts first (e.g., 0.001 SOL)

4. Verify Jupiter swap executes after countdown

5. Check transaction on Solscan: `https://solscan.io/tx/<txid>`

---

## 📞 Support

If something isn't working:
1. Check the console logs for errors
2. Verify your RPC connection is working
3. Ensure wallet has enough SOL for transaction fees
4. Check that the settlement bot is running (for private matches)

**Common Issues:**
- "Already processed" error → This is normal, order was submitted successfully
- "Failed to fetch" → Expected on devnet, Jupiter is mainnet-only
- Countdown doesn't start → Make sure toggle is enabled before submitting

