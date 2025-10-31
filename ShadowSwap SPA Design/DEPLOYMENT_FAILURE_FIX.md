# Deployment Failure - Most Common Causes

Based on your environment variables, here are the most likely causes of deployment failure:

## Your Environment Variables (✅ Correct)
```env
NEXT_PUBLIC_PROGRAM_ID=ESHkd14KmUUJthjVqKoh7JP1oVVMFJCqPPkpsrJrT5Kt
NEXT_PUBLIC_ORDER_BOOK=DneZLDgRwDoa7XViSEaAb9BGMj2R8frinJ3ydwAucyfz
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_BASE_MINT=So11111111111111111111111111111111111111112
NEXT_PUBLIC_QUOTE_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

## Most Common Issues

### Issue #1: Variables Set AFTER Build (90% of failures)

**Problem:**
- You set environment variables in your deployment platform
- But the build already happened BEFORE you set them
- Next.js embeds `NEXT_PUBLIC_*` variables at BUILD time, not runtime

**Fix:**
1. **Vercel**: After adding env vars, go to "Deployments" → Click "..." → "Redeploy"
2. **Netlify**: After adding env vars, go to "Deploys" → "Trigger deploy"
3. **Custom**: Run `pnpm build` again after setting env vars

### Issue #2: Wrong Environment Scope

**Problem:**
- Variables set only for "Development" but app runs in "Production"
- Or vice versa

**Fix:**
- Set variables for ALL scopes: Production, Preview, AND Development
- Or at minimum, set for the scope you're deploying to

### Issue #3: Typo or Missing Prefix

**Problem:**
- Variable named `PROGRAM_ID` instead of `NEXT_PUBLIC_PROGRAM_ID`
- Missing `NEXT_PUBLIC_` prefix

**Fix:**
- Double-check exact variable names (case-sensitive)
- Must start with `NEXT_PUBLIC_`

### Issue #4: IDL File Missing

**Problem:**
- `lib/idl/shadow_swap.json` not included in deployment
- File excluded by `.gitignore`

**Fix:**
- Verify file exists in repository
- Check it's not in `.gitignore`
- Ensure it's committed and pushed

## Quick Diagnostic

Run this in your browser console after deployment:

```javascript
console.log({
  hasProgramId: !!process.env.NEXT_PUBLIC_PROGRAM_ID,
  hasOrderBook: !!process.env.NEXT_PUBLIC_ORDER_BOOK,
  hasRpcUrl: !!process.env.NEXT_PUBLIC_RPC_URL,
  programId: process.env.NEXT_PUBLIC_PROGRAM_ID,
  orderBook: process.env.NEXT_PUBLIC_ORDER_BOOK,
})
```

**Expected Output:**
```javascript
{
  hasProgramId: true,
  hasOrderBook: true,
  hasRpcUrl: true,
  programId: "ESHkd14KmUUJthjVqKoh7JP1oVVMFJCqPPkpsrJrT5Kt",
  orderBook: "DneZLDgRwDoa7XViSEaAb9BGMj2R8frinJ3ydwAucyfz"
}
```

**If any are `false` or `undefined`:**
- Variables not set correctly
- Build happened before variables were set
- Wrong environment scope

## Step-by-Step Fix

### For Vercel:
1. Go to Project Settings → Environment Variables
2. Verify all 5 variables are there (exact names)
3. Check they're set for "Production" (and Preview/Development)
4. Go to Deployments tab
5. Click "..." on latest deployment → "Redeploy"
6. Wait for rebuild
7. Test again

### For Netlify:
1. Go to Site Settings → Environment Variables
2. Verify all 5 variables are there
3. Go to Deploys tab
4. Click "Trigger deploy"
5. Select "Clear cache and deploy"
6. Wait for rebuild
7. Test again

### For Custom Server:
1. Set environment variables in your system/deployment tool
2. Run `pnpm build` (with vars set)
3. Run `pnpm start`
4. Test

## What Error Are You Seeing?

Tell me the specific error and I can help more:

1. **404 Not Found** → Likely env vars not set before build
2. **Blank white page** → Check browser console for errors
3. **"Cannot read properties of undefined"** → Env vars missing
4. **Build succeeds but runtime error** → Env vars not in correct scope

## Next Steps

After you rebuild with env vars set, check:
- ✅ Browser console (F12) - any red errors?
- ✅ Network tab - is `/api/idl/shadow_swap` returning 200?
- ✅ Does the page load (even if empty)?
- ✅ Can you connect wallet?

Let me know what specific error you're seeing and I'll help fix it!

