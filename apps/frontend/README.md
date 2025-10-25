# ShadowSwap Frontend

Next.js-based frontend for ShadowSwap - a privacy-preserving DEX on Solana.

## Overview

This is the user interface for ShadowSwap, allowing users to:
- Connect their Solana wallet
- Place encrypted orders
- Auto-manage WSOL: wrap SOL before sells, unwrap refunds, and surface live status updates when orders fill
- View order status
- Cancel orders
- Trade with privacy

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **@solana/web3.js** - Solana interaction
- **@solana/wallet-adapter** - Wallet integration
- **@coral-xyz/anchor** - Anchor program client

## Development

```bash
# From monorepo root
yarn dev:frontend

# Or from this directory
yarn dev
```

Visit `http://localhost:3000`

## Build

```bash
# From monorepo root
yarn build:frontend

# Or from this directory
yarn build
```

## Project Structure

```
frontend/
├── pages/          # Next.js pages
├── components/     # React components
├── styles/         # CSS/styling
├── public/         # Static assets
└── package.json
```

## Environment Variables

Create `.env.local` (see `env.example` for current devnet values):

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt
NEXT_PUBLIC_ORDER_BOOK_PUBKEY=FWSgsP1rt8jQT3MXNQyyXfgpks1mDQCFZz25ZktuuJg8
NEXT_PUBLIC_BASE_MINT=So11111111111111111111111111111111111111112
NEXT_PUBLIC_QUOTE_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

## Features (To Be Implemented)

- [ ] Wallet connection
- [ ] Order placement with encryption
- [ ] Order management dashboard
- [ ] Real-time order status updates
- [ ] Transaction history
- [ ] Privacy-preserving UI

## Dependencies

- Shared types from `@shadowswap/shared-types`
- Anchor program client from `apps/anchor_program`

## License

MIT
