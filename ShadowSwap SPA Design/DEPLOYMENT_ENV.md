# Frontend Deployment Environment Variables

This document lists all environment variables required to deploy the ShadowSwap frontend.

## Required Environment Variables

These variables **must** be set for the frontend to work properly. All frontend variables must have the `NEXT_PUBLIC_` prefix to be accessible in the browser.

### 1. **NEXT_PUBLIC_PROGRAM_ID** (Required)
- **Description**: Solana Program ID of the deployed ShadowSwap smart contract
- **Example**: `ESHkd14KmUUJthjVqKoh7JP1oVVMFJCqPPkpsrJrT5Kt`
- **Used in**: 
  - `lib/shadowSwapClient.ts`
  - `hooks/useShadowSwap.ts`
  - `app/admin/page.tsx`

### 2. **NEXT_PUBLIC_ORDER_BOOK** (Required)
- **Description**: Order Book PDA (Program Derived Address) public key
- **Example**: `DneZLDgRwDoa7XViSEaAb9BGMj2R8frinJ3ydwAucyfz`
- **Used in**: 
  - `lib/shadowSwapClient.ts`
  - `hooks/useShadowSwap.ts`
- **Note**: This is the PDA address derived from the program ID and token mints

### 3. **NEXT_PUBLIC_RPC_URL** (Required)
- **Description**: Solana RPC endpoint URL
- **Example (Devnet)**: `https://api.devnet.solana.com`
- **Example (Mainnet)**: `https://api.mainnet-beta.solana.com`
- **Example (Custom RPC)**: `https://your-rpc-provider.com`
- **Default**: Falls back to `https://api.devnet.solana.com`
- **Used in**: 
  - `lib/rpc.ts`
  - `components/trade-section.tsx`
  - `app/admin/page.tsx`
  - `contexts/WalletContext.tsx`
  - `components/order-history.tsx`

### 4. **NEXT_PUBLIC_BASE_MINT** (Optional but Recommended)
- **Description**: Base token mint address (usually SOL/Wrapped SOL)
- **Default**: `So11111111111111111111111111111111111111112` (Native SOL mint)
- **Example**: `So11111111111111111111111111111111111111112`
- **Used in**: 
  - `lib/shadowSwapClient.ts`
  - `hooks/useShadowSwap.ts`

### 5. **NEXT_PUBLIC_QUOTE_MINT** (Optional but Recommended)
- **Description**: Quote token mint address (usually USDC)
- **Default**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Devnet USDC)
- **Example (Devnet)**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **Example (Mainnet)**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **Used in**: 
  - `lib/shadowSwapClient.ts`
  - `hooks/useShadowSwap.ts`

## Optional Environment Variables

These variables enhance functionality but are not strictly required.

### 6. **NEXT_PUBLIC_RPC_URLS** (Optional)
- **Description**: Comma-separated list of fallback RPC URLs for automatic failover
- **Example**: `https://api.devnet.solana.com,https://rpc.ankr.com/solana_devnet,https://solana-devnet.rpc.extrnode.com`
- **Used in**: `lib/rpc.ts` for RPC failover when rate limits are hit

### 7. **NEXT_PUBLIC_SHADOWSWAP_IDL_URL** (Optional)
- **Description**: URL to fetch the ShadowSwap IDL (Interface Definition Language) file
- **Default**: `/api/idl/shadow_swap` (uses the API route)
- **Example**: `https://your-cdn.com/idl/shadow_swap.json`
- **Used in**: `lib/shadowSwapIdl lowder.ts`

### 8. **NEXT_PUBLIC_SHADOWSWAP_IDL_JSON** (Optional)
- **Description**: Inline IDL JSON string (alternative to fetching from URL)
- **Note**: If set, takes precedence over `NEXT_PUBLIC_SHADOWSWAP_IDL_URL`
- **Used in**: `lib/shadowSwapIdlLoader.ts`

### 9. **JUPITER_API_KEY** (Optional, Server-Side Only)
- **Description**: Jupiter aggregator API key for better rate limits
- **Note**: This is **server-side only** (no `NEXT_PUBLIC_` prefix) - used in API routes
- **Used in**: 
  - `app/api/jupiter/quote/route.ts`
  - `app/api/jupiter/swap/route.ts`

### 10. **NEXT_PUBLIC_ARCIUM_API_KEY** (Optional, Currently Unused)
- **Description**: Arcium MPC API key for encrypted order processing
- **Status**: Currently commented out in code, reserved for future use
- **Used in**: `lib/arcium.ts` (currently disabled)

## Example `.env.local` File

Create a `.env.local` file in the `ShadowSwap SPA Design/` directory with these values:

```env
# Required - Core Configuration
NEXT_PUBLIC_PROGRAM_ID=ESHkd14KmUUJthjVqKoh7JP1oVVMFJCqPPkpsrJrT5Kt
NEXT_PUBLIC_ORDER_BOOK=DneZLDgRwDoa7XViSEaAb9BGMj2R8frinJ3ydwAucyfz
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Optional - Token Mints (with defaults)
NEXT_PUBLIC_BASE_MINT=So11111111111111111111111111111111111111112
NEXT_PUBLIC_QUOTE_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Optional - RPC Failover
NEXT_PUBLIC_RPC_URLS=https://api.devnet.solana.com,https://rpc.ankr.com/solana_devnet

# Optional - IDL Configuration (uses API route by default)
NEXT_PUBLIC_SHADOWSWAP_IDL_URL=/api/idl/shadow_swap

# Optional - Jupiter API (server-side only, no NEXT_PUBLIC_ prefix)
JUPITER_API_KEY=your_jupiter_api_key_here
```

## Example `.env.production` File

For production deployment, update the values:

```env
# Production Configuration
NEXT_PUBLIC_PROGRAM_ID=YOUR_MAINNET_PROGRAM_ID
NEXT_PUBLIC_ORDER_BOOK=YOUR_MAINNET_ORDER_BOOK_PDA
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_BASE_MINT=So11111111111111111111111111111111111111112
NEXT_PUBLIC_QUOTE_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Production RPC with failover (recommended)
NEXT_PUBLIC_RPC_URLS=https://api.mainnet-beta.solana.com,https://solana-api.projectserum.com,https://rpc.ankr.com/solana

# Jupiter API Key (recommended for production)
JUPITER_API_KEY=your_production_jupiter_api_key
```

## Deployment Platform Setup

### Vercel

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each variable with the exact name (including `NEXT_PUBLIC_` prefix)
4. Set the environment scope (Production, Preview, Development)
5. Redeploy your application

### Netlify

1. Go to Site settings → Environment variables
2. Add each variable
3. Redeploy your site

### Other Platforms

For any platform, ensure:
- All `NEXT_PUBLIC_` variables are set (they're embedded in the build)
- Server-side variables (like `JUPITER_API_KEY`) are available at build/runtime
- Variables are set before building the application

## Important Notes

1. **NEXT_PUBLIC_ Prefix**: Only variables with `NEXT_PUBLIC_` are accessible in the browser. Never put sensitive keys in `NEXT_PUBLIC_` variables.

2. **Build-Time vs Runtime**: `NEXT_PUBLIC_` variables are embedded at build time. You need to rebuild after changing them.

3. **RPC Rate Limits**: For production, consider using a dedicated RPC provider (Helius, QuickNode, Alchemy) instead of the public endpoints to avoid rate limits.

4. **IDL File**: The frontend fetches the IDL from `/api/idl/shadow_swap` by default. This API route loads it from `lib/idl/shadow_swap.json`. Make sure this file exists and is up to date with your deployed program.

5. **Network Selection**: 
   - Devnet: Use devnet RPC and devnet token mints
   - Mainnet: Use mainnet RPC and mainnet token mints

## Verification

After deployment, verify your environment variables are set correctly by:

1. Opening browser console on your deployed site
2. Running: `console.log(process.env)` (only shows `NEXT_PUBLIC_` vars)
3. Checking that your program ID and order book match your deployment

## Current Deployment Values (from env.example)

Based on the root `env.example` file, your current devnet deployment uses:

```env
PROGRAM_ID=ESHkd14KmUUJthjVqKoh7JP1oVVMFJCqPPkpsrJrT5Kt
ORDER_BOOK_PUBKEY=DneZLDgRwDoa7XViSEaAb9BGMj2R8frinJ3ydwAucyfz
SOL_MINT=So11111111111111111111111111111111111111112
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

Convert these to frontend format:
- `PROGRAM_ID` → `NEXT_PUBLIC_PROGRAM_ID`
- `ORDER_BOOK_PUBKEY` → `NEXT_PUBLIC_ORDER_BOOK`
- `SOL_MINT` → `NEXT_PUBLIC_BASE_MINT`
- `USDC_MINT` → `NEXT_PUBLIC_QUOTE_MINT`

