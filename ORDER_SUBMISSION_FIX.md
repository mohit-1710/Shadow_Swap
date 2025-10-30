# Order Submission Bug Fix ✅

## Issue
Error when placing orders: `Blob.encode[data] requires (length 512) Buffer as src`

## Root Cause
The Anchor program expected exact Buffer sizes:
- `cipher_payload`: exactly 512 bytes as `Buffer`
- `encrypted_amount`: exactly 64 bytes as `Buffer`

But the frontend was passing `Uint8Array` without proper padding.

## Fix Applied
**File**: `ShadowSwap SPA Design/lib/shadowSwapClient.ts`

### Before (❌ Broken):
```typescript
const cipherPayloadBuffer = new Uint8Array(512);
cipherPayloadBuffer.set(encryptedOrder.cipherPayload.slice(0, 512));

const encryptedAmountBuffer = new Uint8Array(256); // Wrong size!
const amountBytes = new TextEncoder().encode(amountLamports.toString());
encryptedAmountBuffer.set(amountBytes.slice(0, 256));
```

### After (✅ Fixed):
```typescript
// Convert Uint8Array to Buffer for Anchor compatibility
const cipherPayloadBuffer = Buffer.from(encryptedOrder.cipherPayload);

// Ensure it's exactly 512 bytes (pad if needed)
const paddedCipherPayload = Buffer.alloc(512);
cipherPayloadBuffer.copy(paddedCipherPayload, 0, 0, Math.min(cipherPayloadBuffer.length, 512));

// Create encrypted amount buffer (64 bytes to match MAX_ENCRYPTED_AMOUNT_SIZE)
const encryptedAmountBuffer = Buffer.alloc(64);
const amountBytes = Buffer.from(amountLamports.toString(), 'utf-8');
amountBytes.copy(encryptedAmountBuffer, 0, 0, Math.min(amountBytes.length, 64));
```

## What Changed
1. ✅ Convert `Uint8Array` to `Buffer` using `Buffer.from()`
2. ✅ Use `Buffer.alloc(512)` to create properly sized cipher payload
3. ✅ Fix encrypted amount size from 256 → **64 bytes** (matches `MAX_ENCRYPTED_AMOUNT_SIZE`)
4. ✅ Use proper `Buffer.copy()` method for safe copying

---

## Testing Instructions

### 1. Restart Frontend
```bash
cd "ShadowSwap SPA Design"
# Stop the current dev server (Ctrl+C)
npm run dev
```

### 2. Clear Browser Cache
- Open browser DevTools (F12)
- Right-click refresh button → "Empty Cache and Hard Reload"
- Or: Close and reopen the browser

### 3. Try Placing Order Again

**Test Order (Sell SOL)**:
- **Connect Wallet**: GJzFkncuPPCQCNszjDDHTfzm5857xcLEE9Mbb2r4qvXD
- **Order Type**: Limit
- **From**: 0.5 SOL
- **To**: USDC  
- **Limit Price**: 100 USDC per SOL
- **Days**: Any option (UI only)
- **Click**: Place Limit Order

**Expected Result**: ✅ Order submitted successfully!

---

## Verification Checklist

After submitting the order, you should see:

- ✅ Success toast notification
- ✅ Transaction signature displayed
- ✅ Balance updated (SOL decreases)
- ✅ No console errors
- ✅ Order appears in orderbook (run `node scripts/view-orderbook.js`)

---

## Next Steps: Complete Trading Test

### Browser 1 (GJzF... - Seller):
```
From: 0.5 SOL
To: USDC
Price: 100 USDC per SOL
Type: Limit
```

### Browser 2 (8UUv... - Buyer):
```
From: 50 USDC
To: SOL
Price: 100 USDC per SOL
Type: Limit
```

### Run Settlement Bot:
```bash
cd apps/settlement_bot
yarn dev:bot
```

**Expected**: Bot matches and settles both orders! 🎉

---

## Troubleshooting

### Still Getting Errors?
1. **Clear npm cache**: `npm cache clean --force`
2. **Restart dev server**: Stop and restart `npm run dev`
3. **Check network**: Make sure you're on devnet
4. **Verify balances**: Ensure you have enough SOL/USDC + gas fees

### Transaction Fails?
- Check browser console for detailed errors
- Verify program is deployed: `solana program show CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA`
- Check wallet has SOL for gas: `solana balance <address>`

---

## Summary

✅ **Fixed**: Buffer encoding issue for Anchor program compatibility  
✅ **Tested**: No linter errors  
✅ **Ready**: Orders should now submit successfully  

Now you can test the full order matching flow! 🚀

