# Jupiter API Proxy Fix

## 🚨 Problem
Your network is blocking DNS resolution for `quote-api.jup.ag`, causing `net::ERR_NAME_NOT_RESOLVED` errors.

## ✅ Solution
Created **Next.js API proxy routes** that run server-side and bypass client-side DNS/CORS restrictions.

## 📁 Files Created

### 1. `/app/api/jupiter/quote/route.ts`
- **Purpose**: Proxies Jupiter quote API requests
- **Method**: GET
- **Parameters**: `inputMint`, `outputMint`, `amount`, `slippageBps`
- **Example**: `/api/jupiter/quote?inputMint=So11...&outputMint=EPj...&amount=30000000`

### 2. `/app/api/jupiter/swap/route.ts`
- **Purpose**: Proxies Jupiter swap API requests
- **Method**: POST
- **Body**: `{ quote, userPublicKey, wrapAndUnwrapSol, ... }`
- **Returns**: Base64 encoded swap transaction

## 📝 Files Modified

### `/lib/jupiter.ts`
**Before:**
```typescript
const url = `https://quote-api.jup.ag/v6/quote?...`
```

**After:**
```typescript
const url = `/api/jupiter/quote?...`  // Uses local API proxy
```

## 🔄 How It Works

```
┌──────────────┐      ┌──────────────────┐      ┌───────────────┐
│   Browser    │ ───> │  Next.js API     │ ───> │  Jupiter API  │
│  (Frontend)  │      │   (Proxy)        │      │  (External)   │
└──────────────┘      └──────────────────┘      └───────────────┘
    Your Network       Your Server-Side         External Service
    (DNS blocked)      (DNS works fine)         (quote-api.jup.ag)
```

### Flow:
1. **Frontend** calls `/api/jupiter/quote` (local Next.js route)
2. **API proxy** runs server-side where DNS works
3. **Proxy** fetches from `quote-api.jup.ag` 
4. **Proxy** returns data to frontend
5. No CORS, no DNS errors! ✅

## 🧪 Testing

### Step 1: Restart your dev server
```bash
cd "ShadowSwap SPA Design"
pnpm dev
```

### Step 2: Test the proxy directly in browser
Open: `http://localhost:3000/api/jupiter/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000&slippageBps=100`

You should see a JSON response with quote data.

### Step 3: Test fallback swap
1. Connect wallet
2. Enable "Fallback" toggle
3. Place a small order (0.001 SOL)
4. Wait 10 seconds
5. Watch console logs - should now succeed!

## 📊 Expected Console Output

```
🔍 Fetching Jupiter quote via proxy (MAINNET)...
   URL: /api/jupiter/quote?inputMint=So11...
   Input Mint: So11111111111111111111111111111111111111112
   Output Mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
   Amount: 30000000
   ⚠️  Using MAINNET Jupiter API (devnet has no liquidity)
📥 Jupiter API response status: 200
✅ Quote received successfully
   In Amount: 30000000
   Out Amount: 6000000
   Price Impact: 0.01 %
```

## 🔧 Troubleshooting

### If proxy still fails:
1. **Check dev server is running**: Look for "Ready" message
2. **Check server logs**: Look for Jupiter proxy messages in terminal
3. **Try direct proxy URL**: Test in browser (Step 2 above)
4. **Network firewall**: Your network might block ALL outbound HTTPS
5. **Alternative**: Use mobile hotspot to test

### If you see 404:
- Make sure dev server restarted after creating API routes
- Check files exist: `ls -la app/api/jupiter/*/route.ts`

### If you see 500:
- Check server console logs for detailed error messages
- Jupiter API might be down (rare)

## 🎯 Why This Works

**Before:** Browser → Jupiter API ❌ (DNS blocked)  
**After:** Browser → Your Server → Jupiter API ✅ (Server-side DNS works)

Server-side DNS typically works better because:
- Different network stack
- No browser CORS restrictions
- More reliable DNS resolution
- Can use system DNS settings

## 🚀 Next Steps

1. Restart your dev server if not already done
2. Test the fallback flow with a tiny amount (0.001 SOL)
3. Check console logs for "via proxy" messages
4. If it works, you're good to go! 🎉

## 💡 Alternative Solutions (if proxy doesn't work)

If your entire machine/network is blocking Jupiter:

1. **Use mobile hotspot**: Bypass network restrictions
2. **Change DNS**: Use Cloudflare DNS (1.1.1.1) or Google DNS (8.8.8.8)
3. **VPN**: Route through different network
4. **Mock mode**: Test UI without real Jupiter (for development only)

---

**Status**: ✅ Implemented and ready to test  
**Created**: $(date)

