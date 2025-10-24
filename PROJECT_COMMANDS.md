# ShadowSwap Project Commands - Yarn Edition

Quick reference for all project commands using Yarn.

## 🏗️ Root Level Commands

```bash
# Install all dependencies (entire monorepo)
yarn install

# Build all workspaces
yarn build:all

# Clean everything (node_modules, dist, target)
yarn clean

# Development
yarn dev:frontend      # Start frontend dev server
yarn dev:bot          # Start settlement bot dev

# Build individual workspaces
yarn build:frontend   # Build frontend
yarn build:bot        # Build settlement bot
yarn build:shared     # Build shared types

# Anchor commands
yarn anchor:build     # Build Solana program
yarn anchor:test      # Test Solana program
yarn anchor:deploy    # Deploy to configured cluster

# Tests
yarn test             # Run all tests
```

## 🤖 Settlement Bot Commands

```bash
cd apps/settlement_bot

# Install
yarn install

# Development
yarn dev              # Run with ts-node
yarn watch            # Auto-restart on changes

# Production
yarn build            # Compile TypeScript
yarn start            # Run compiled JS

# Testing
yarn test             # Run Jest tests
yarn lint             # Run ESLint
```

## 🎨 Frontend Commands

```bash
cd apps/frontend

# Install
yarn install

# Development
yarn dev              # Next.js dev server

# Production
yarn build            # Build for production
yarn start            # Start production server
```

## ⚙️ Anchor Program Commands

```bash
cd apps/anchor_program

# Build (uses Cargo)
anchor build

# Test
anchor test

# Deploy
anchor deploy --provider.cluster devnet
anchor deploy --provider.cluster mainnet-beta

# Generate IDL
anchor idl init <PROGRAM_ID>
anchor idl upgrade <PROGRAM_ID>
```

## 📦 Shared Types Commands

```bash
cd packages/shared_types

# Install
yarn install

# Build TypeScript declarations
yarn build
```

## 🔧 Common Workflows

### First Time Setup
```bash
# 1. From project root
cd /home/mohit/dev/solana_hackathon/ShadowSwap_Project

# 2. Install everything
yarn install

# 3. Build shared types first
yarn build:shared

# 4. Build Anchor program
yarn anchor:build

# 5. Build settlement bot
yarn build:bot
```

### Daily Development
```bash
# Terminal 1: Settlement Bot
yarn dev:bot

# Terminal 2: Frontend
yarn dev:frontend

# Terminal 3: Anchor (when needed)
cd apps/anchor_program && anchor build
```

### Deploy New Version
```bash
# 1. Build everything
yarn build:all

# 2. Deploy Anchor program
yarn anchor:deploy

# 3. Deploy frontend (e.g., Vercel)
cd apps/frontend && vercel deploy

# 4. Deploy settlement bot (e.g., PM2)
cd apps/settlement_bot
pm2 restart shadowswap-keeper
```

## 🧪 Testing

```bash
# Root level
yarn test                    # All tests

# Settlement bot
cd apps/settlement_bot
yarn test                    # Jest tests

# Anchor program
cd apps/anchor_program
anchor test                  # Solana program tests
```

## 🧹 Cleaning

```bash
# Root level - clean everything
yarn clean

# Individual workspaces
cd apps/settlement_bot && rm -rf node_modules dist
cd apps/frontend && rm -rf node_modules .next
cd apps/anchor_program && anchor clean
```

## 📊 Workspace Management

```bash
# List all workspaces
yarn workspaces info

# Run command in specific workspace
yarn workspace @shadowswap/settlement-bot dev
yarn workspace @shadowswap/frontend build

# Add dependency to workspace
cd apps/settlement_bot
yarn add <package-name>

# Add dev dependency
yarn add -D <package-name>
```

## 🚨 Troubleshooting

```bash
# Dependency issues
yarn clean
yarn install

# Rebuild everything
yarn clean
yarn install
yarn build:all

# Check yarn version
yarn --version

# Update yarn
npm install -g yarn@latest
```

## 💡 Quick Tips

- Always run `yarn install` from project root to install all workspaces
- Use `yarn build:shared` before building other workspaces
- The root `yarn.lock` is shared by all workspaces
- Anchor commands must be run from `apps/anchor_program`
- Settlement bot can use mocks: `USE_MOCK_ARCIUM=true yarn dev`

