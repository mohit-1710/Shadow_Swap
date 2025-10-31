# ShadowSwap Frontend

A privacy-preserving decentralized exchange (DEX) frontend built with Next.js and Solana.

## Features

- 🔒 Privacy-preserving encrypted order submission
- 💼 Multi-wallet support (Phantom, Solflare, etc.)
- 📊 Real-time order book and price charts
- 🎨 Modern, responsive UI with dark theme
- ⚡ Built with Next.js 16 and Turbopack

## Quick Start

### Prerequisites

- Node.js >= 16.0.0
- pnpm >= 10.19.0

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables template
cp env.template .env.local

# Edit .env.local with your configuration
# Required variables:
# - NEXT_PUBLIC_PROGRAM_ID
# - NEXT_PUBLIC_ORDER_BOOK
# - NEXT_PUBLIC_RPC_URL
```

### Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## Environment Variables

See `DEPLOYMENT_ENV.md` for a complete list of environment variables.

### Minimum Required Variables

```env
NEXT_PUBLIC_PROGRAM_ID=your_program_id
NEXT_PUBLIC_ORDER_BOOK=your_order_book_pda
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

## Project Structure

```
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── docs/              # Documentation pages
│   └── trade/             # Trading interface
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...               # Feature components
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
│   ├── idl/              # Anchor IDL files
│   └── ...               # Client libraries
└── public/               # Static assets
```

## Deployment

This is a standalone Next.js application that can be deployed to any platform that supports Next.js:

- **Vercel**: Connect your repository and set environment variables
- **Netlify**: Deploy with `pnpm build` and set environment variables
- **Custom Server**: Run `pnpm build && pnpm start` after setting environment variables

### Important Notes

- All `NEXT_PUBLIC_*` environment variables must be set before building
- The application must be rebuilt after changing environment variables
- Make sure `lib/idl/shadow_swap.json` exists in your deployment

## Documentation

- `DEPLOYMENT_ENV.md` - Environment variables guide
- `QUICK_DEPLOY.md` - Quick deployment reference
- `INTEGRATION_GUIDE.md` - Integration guide for developers

## License

MIT

