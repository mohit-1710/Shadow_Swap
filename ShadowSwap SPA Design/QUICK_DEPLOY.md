# 🚀 Quick Deployment Guide - Frontend Environment Variables

## Minimum Required Variables

Copy these **exact** variable names to your deployment platform:

```env
NEXT_PUBLIC_PROGRAM_ID=ESHkd14KmUUJthjVqKoh7JP1oVVMFJCqPPkpsrJrT5Kt
NEXT_PUBLIC_ORDER_BOOK=DneZLDgRwDoa7XViSEaAb9BGMj2R8frinJ3ydwAucyfz
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

## Full Configuration (Recommended)

```env
NEXT_PUBLIC_PROGRAM_ID=ESHkd14KmUUJthjVqKoh7JP1oVVMFJCqPPkpsrJrT5Kt
NEXT_PUBLIC_ORDER_BOOK=DneZLDgRwDoa7XViSEaAb9BGMj2R8frinJ3ydwAucyfz
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_BASE_MINT=So11111111111111111111111111111111111111112
NEXT_PUBLIC_QUOTE_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

## Deployment Steps

### Vercel
1. Go to **Project Settings** → **Environment Variables**
2. Add each variable above
3. Select environment scope (Production/Preview/Development)
4. **Redeploy** your application

### Netlify
1. Go to **Site Settings** → **Environment Variables**
2. Add each variable
3. Redeploy

### Other Platforms
- Set all `NEXT_PUBLIC_*` variables before building
- Rebuild after adding/changing variables

## Important Notes

⚠️ **All variables MUST start with `NEXT_PUBLIC_`** to work in the browser

⚠️ **Rebuild required** after changing environment variables

📖 See `DEPLOYMENT_ENV.md` for detailed documentation

