# 🚨 Quick Fix: Deployment Failed

## The #1 Cause (90% of failures)

**Environment variables were set AFTER the build happened!**

### Why This Happens

1. You deploy the code
2. Build runs (without env vars)
3. You add env vars in platform settings
4. App still fails because build already happened

**Next.js embeds `NEXT_PUBLIC_*` variables at BUILD time, not runtime.**

## Fix (2 Steps)

### Step 1: Verify Variables Are Set

Go to your deployment platform and check these exact names:

```env
NEXT_PUBLIC_PROGRAM_ID=ESHkd14KmUUJthjVqKoh7JP1oVVMFJCqPPkpsrJrT5Kt
NEXT_PUBLIC_ORDER_BOOK=DneZLDgRwDoa7XViSEaAb9BGMj2R8frinJ3ydwAucyfz
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_BASE_MINT=So11111111111111111111111111111111111111112
NEXT_PUBLIC_QUOTE_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

### Step 2: Rebuild After Setting Variables

**Vercel:**
1. Go to "Deployments" tab
2. Click "..." on latest deployment
3. Click "Redeploy"
4. ✅ Done

**Netlify:**
1. Go to "Deploys" tab
2. Click "Trigger deploy"
3. Select "Clear cache and deploy site"
4. ✅ Done

**Custom Server:**
```bash
# Set env vars first, then:
pnpm build
pnpm start
```

## Verify It Worked

After rebuild, open your deployed site and run in browser console:

```javascript
console.log({
  programId: process.env.NEXT_PUBLIC_PROGRAM_ID,
  orderBook: process.env.NEXT_PUBLIC_ORDER_BOOK,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL
})
```

Should show your values, not `undefined`.

## Still Not Working?

1. **Check variable scope**: Set for "Production" (not just "Development")
2. **Check for typos**: Variable names are case-sensitive
3. **Check IDL file**: Verify `lib/idl/shadow_swap.json` exists in your repo
4. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)

## What Error Are You Seeing?

Tell me:
- Platform (Vercel/Netlify/Custom)?
- Error message (from browser console or deployment logs)?
- Does the page load at all (even blank)?

I'll help fix the specific issue!

