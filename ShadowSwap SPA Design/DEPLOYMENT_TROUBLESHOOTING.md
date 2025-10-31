# Deployment Troubleshooting Guide

## Common Deployment Failures

### 1. **404 Error or Blank Page After Deployment**

**Symptoms:**
- Page loads but shows blank screen
- Browser console shows: `Cannot read properties of undefined (reading '_bn')`
- Network tab shows 404 errors

**Cause:**
Missing or incorrect environment variables. The app crashes during initialization if `NEXT_PUBLIC_PROGRAM_ID` or `NEXT_PUBLIC_ORDER_BOOK` are not set.

**Fix:**
1. Verify all environment variables are set in your deployment platform
2. **IMPORTANT**: `NEXT_PUBLIC_*` variables must be set BEFORE building
3. After adding/changing env vars, you MUST rebuild:
   - Vercel: Triggers rebuild automatically
   - Netlify: Go to "Deploys" → "Trigger deploy"
   - Custom: Run `pnpm build` again

**Required Variables:**
```env
NEXT_PUBLIC_PROGRAM_ID=ESHkd14KmUUJthjVqKoh7JP1oVVMFJCqPPkpsrJrT5Kt
NEXT_PUBLIC_ORDER_BOOK=DneZLDgRwDoa7XViSEaAb9BGMj2R8frinJ3ydwAucyfz
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

### 2. **Build Succeeds but Runtime Error**

**Symptoms:**
- Build completes successfully
- App loads but shows error in browser console
- Error: "NEXT_PUBLIC_PROGRAM_ID environment variable is not set"

**Cause:**
Environment variables were set AFTER the build, or they're in the wrong scope (e.g., only set for Development but app is running in Production).

**Fix:**
1. Check variable scopes:
   - Vercel: Set for "Production", "Preview", AND "Development"
   - Netlify: Set for "All scopes"
2. Rebuild after setting variables
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

### 3. **IDL File Missing**

**Symptoms:**
- Error: "ShadowSwap IDL not found"
- API route `/api/idl/shadow_swap` returns 404

**Cause:**
`lib/idl/shadow_swap.json` file not included in deployment.

**Fix:**
1. Verify the file exists: `ShadowSwap SPA Design/lib/idl/shadow_swap.json`
2. Check `.gitignore` doesn't exclude `.json` files (except for `!lib/idl/*.json`)
3. Ensure the file is committed to your repository
4. For platforms like Vercel/Netlify, the file should be in the repository

### 4. **Monorepo Detection Warning**

**Symptoms:**
- Build warning: "Next.js inferred your workspace root, but it may not be correct"
- Multiple lockfiles detected

**Cause:**
Deployment platform detects parent directory's lockfile.

**Fix:**
This is just a warning and shouldn't cause build failures. The `turbopack.root` config in `next.config.mjs` should prevent this, but if it persists:
1. Make sure you're deploying from `ShadowSwap SPA Design/` folder only
2. Don't deploy the entire monorepo root

### 5. **RPC Rate Limiting**

**Symptoms:**
- App works but slow to load
- Console errors: "429 Too Many Requests"
- Order book not loading

**Cause:**
Public RPC endpoints have rate limits.

**Fix:**
1. Use a dedicated RPC provider (Helius, QuickNode, Alchemy)
2. Set `NEXT_PUBLIC_RPC_URL` to your provider's endpoint
3. Optionally set `NEXT_PUBLIC_RPC_URLS` for failover:
   ```env
   NEXT_PUBLIC_RPC_URLS=https://api.devnet.solana.com,https://rpc.ankr.com/solana_devnet
   ```

## Verification Steps

### After Deployment:

1. **Check Environment Variables:**
   ```javascript
   // Open browser console on your deployed site
   console.log({
     PROGRAM_ID: process.env.NEXT_PUBLIC_PROGRAM_ID,
     ORDER_BOOK: process.env.NEXT_PUBLIC_ORDER_BOOK,
     RPC_URL: process.env.NEXT_PUBLIC_RPC_URL
   })
   ```

2. **Test IDL Loading:**
   - Visit: `https://your-domain.com/api/idl/shadow_swap`
   - Should return JSON, not 404

3. **Test Wallet Connection:**
   - Click "Connect Wallet"
   - Should show wallet address

4. **Check Browser Console:**
   - No red errors about `PublicKey` or `undefined`
   - No errors about missing environment variables

## Platform-Specific Notes

### Vercel
- **Env Vars**: Project Settings → Environment Variables
- **Build**: Automatically triggers on git push
- **Important**: Set variables BEFORE pushing, or manually trigger rebuild after

### Netlify
- **Env Vars**: Site Settings → Environment Variables
- **Build**: Site Settings → Build & deploy → Build command: `pnpm build`
- **Important**: After changing env vars, go to "Deploys" → "Trigger deploy"

### Custom Server
- **Build**: Run `pnpm build` with env vars set
- **Runtime**: Make sure `.env.production` or system env vars are set
- **Important**: `NEXT_PUBLIC_*` vars must be set at BUILD time, not just runtime

## Quick Fix Checklist

- [ ] All `NEXT_PUBLIC_*` variables set in deployment platform
- [ ] Variables set for correct environment (Production/Preview/Development)
- [ ] Rebuilt after setting/changing variables
- [ ] `lib/idl/shadow_swap.json` exists and is committed
- [ ] Checked browser console for errors
- [ ] Verified IDL API route works (`/api/idl/shadow_swap`)
- [ ] Cleared browser cache
- [ ] Tested wallet connection

## Still Having Issues?

1. **Check Build Logs**: Look for any errors during the build phase
2. **Check Runtime Logs**: Platform-specific logs (Vercel/Netlify dashboard)
3. **Browser Console**: Look for specific error messages
4. **Network Tab**: Check if API routes are accessible
5. **Compare with Local**: Does `pnpm build && pnpm start` work locally?

## Contact Information

If none of these steps resolve your issue, provide:
- Deployment platform (Vercel/Netlify/Custom)
- Build logs (full output)
- Browser console errors (screenshot)
- Environment variable names (verify spelling/typos)

