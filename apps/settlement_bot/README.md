# ShadowSwap Settlement Bot

Off-chain Node.js bot that monitors the ShadowSwap order book and triggers settlement transactions.

## Features

- 🔄 Continuous order monitoring
- 🔐 Encrypted order decryption
- 🤝 Order matching logic
- ⚡ Automatic settlement execution
- 📊 Performance metrics

## Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Configuration

Edit `.env`:

- `RPC_URL`: Solana RPC endpoint
- `PROGRAM_ID`: ShadowSwap program address
- `BOT_KEYPAIR_PATH`: Path to bot's signing keypair
- `POLLING_INTERVAL`: How often to check for orders (ms)

## Architecture

```
src/
├── index.ts              # Main bot entry point
├── matching/             # Order matching logic
├── settlement/           # Settlement transaction handlers
└── utils/                # Helper utilities
```

## TODO

- [ ] Implement order fetching from program accounts
- [ ] Add order matching algorithm
- [ ] Create settlement transaction builder
- [ ] Add metrics and monitoring
- [ ] Implement retry logic
- [ ] Add unit tests

