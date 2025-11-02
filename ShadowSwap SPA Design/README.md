# ShadowSwap SPA Design

This directory contains a standalone Next.js 16 single-page application used for UI and UX explorations. It is **not** part of the Yarn workspaces monorepo—treat it as an independent prototype that talks to the same Anchor program.

## Features

- Modern trade interface with responsive layout and scripted sample data.
- Wallet-adapter integration for Phantom, Solflare, and other Solana wallets.
- Analytics dashboard and admin surfaces for future operational tooling.
- Tailwind-based design system with Radix primitives and custom charts.

## Prerequisites

- Node.js ≥ 18
- pnpm ≥ 10.19.0 (see `package.json`'s `packageManager`)
- A Solana RPC endpoint and program/order book IDs if you intend to connect to live data.

## Getting Started

```bash
cd "ShadowSwap SPA Design"
pnpm install
cp env.template .env.local   # populate with NEXT_PUBLIC_* values
pnpm dev                     # launches Next.js on http://localhost:3000
```

### Minimum Environment Variables

```env
NEXT_PUBLIC_PROGRAM_ID=YourAnchorProgramId
NEXT_PUBLIC_ORDER_BOOK=YourOrderBookPda
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

Add any additional keys (analytics, sentry, etc.) as needed—all `NEXT_PUBLIC_*` values are baked at build time.

## Project Structure

```
ShadowSwap SPA Design/
├── app/                 # App Router entrypoints (marketing, trade, admin, docs)
├── components/          # UI primitives and feature components
├── contexts/            # React context providers
├── hooks/               # Custom hooks (wallet, charts, preferences)
├── lib/                 # IDL, RPC helpers, analytics clients
├── public/              # Static assets
├── styles/              # Tailwind layers & global styling
└── deploy-vercel.sh     # Example deployment helper
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the development server with hot reload. |
| `pnpm build` | Produce an optimized production build. |
| `pnpm start` | Serve the compiled build (`next start`). |
| `pnpm lint` | Run ESLint over the project (warnings do not fail the build). |

## Deployment Notes

- The app works on Vercel, Netlify, or any platform that supports Next.js 16.
- Update `lib/idl/shadow_swap.json` whenever the Anchor IDL changes, or pipe it in from the monorepo during CI.
- Because this folder is outside the Yarn workspace, ensure dependencies stay up to date separately (`pnpm update`).

## Keeping It in Sync

- Pull shared type definitions from `packages/shared_types` when new accounts or instructions land.
- Treat `.env.local` as sensitive—never commit program secrets or wallet keys.
- Document significant UI changes here so newcomers can understand the purpose of the prototype.
