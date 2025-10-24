# ShadowSwap - Privacy-Preserving DEX on Solana

Privacy-first decentralized exchange built on Solana using Anchor framework. All order details are encrypted client-side before on-chain submission.

## Project Structure

```
ShadowSwap_Project/
├── apps/
│   ├── anchor_program/       # Anchor smart contract
│   ├── frontend/             # Next.js UI
│   └── settlement_bot/       # Off-chain matching bot
├── packages/
│   └── shared_types/         # Shared TypeScript types
└── Project_Details/          # Design documents
```

## 📋 Current Phase

**Phase 4: Frontend Integration & Mock End-to-End Testing**

See [plan.md](./plan.md) for the complete roadmap for integrating the frontend and performing mock E2E testing.

**Current Status:**
- ✅ Phase 1-3: Backend complete (Anchor program + Keeper bot)
- ✅ Deployed to Devnet
- 🚧 Phase 4: Frontend integration (in progress)

## Quick Start

```bash
# Install dependencies
yarn install

# Build shared types
yarn build:shared

# Build Anchor program
yarn anchor:build

# Run frontend (separate terminal)
yarn dev:frontend

# Run settlement bot (separate terminal)
yarn dev:bot
```

## Development Commands

```bash
# Build all
yarn build:all

# Anchor
yarn anchor:build
yarn anchor:test
yarn anchor:deploy

# Frontend
yarn dev:frontend
yarn build:frontend

# Settlement Bot
yarn dev:bot
yarn build:bot

# Clean
yarn clean
```

## Implementation Status

### ✅ Phase 1 & 2: Account Structures
- `EncryptedOrder` - Stores encrypted order data
- `OrderBook` - Manages SOL/USDC trading pair
- `Escrow` - Holds order funds in PDA-owned accounts
- `CallbackAuth` - Authenticates matching engine

### ✅ Phase 3: Instructions Implemented
- `initialize_order_book` - Create new order book
- `place_order` - Submit encrypted order with escrow
- `cancel_order` - Cancel order and return funds
- `match_orders` - Match compatible orders (keeper-only)
- `create_callback_auth` - Authorize keeper

### ✅ Phase 3.5: Comprehensive Test Suite
- **12 test cases** covering all security vulnerabilities
- Tests: Insufficient funds, unauthorized access, state validation
- Simulated encrypted data (frontend/Arcium simulation)
- 100% coverage of unhappy paths and edge cases

See: `apps/anchor_program/IMPLEMENTATION.md` and `apps/anchor_program/TEST_SUMMARY.md`

## Architecture

### Anchor Program (apps/anchor_program/)
- Core account structures implemented
- Error codes and constants defined
- Ready for instruction implementation
- MPC logic directory: `arcis_logic/`

### Frontend (apps/frontend/)
- Next.js 14 with TypeScript
- Solana Wallet Adapter integration
- Component-based architecture

### Settlement Bot (apps/settlement_bot/)
- TypeScript bot with polling loop
- Order monitoring and matching
- Automated settlement execution

### Shared Types (packages/shared_types/)
- Common types across monorepo
- Account interfaces
- Constants and enums

## Next Steps (Phase 4+)

- [ ] Build settlement bot matching algorithm
- [ ] Implement settlement transactions
- [ ] Build frontend UI components  
- [ ] Add comprehensive tests
- [ ] Deploy to devnet

## Privacy Features

- Client-side encryption of all order details
- Encrypted amounts and volumes
- No plaintext data on-chain
- MPC-based matching (planned)

## Tech Stack

- **Smart Contract**: Rust + Anchor 0.31.1
- **Frontend**: Next.js 14 + React 18
- **Bot**: Node.js + TypeScript
- **Blockchain**: Solana

## Documentation

- Design documents: `Project_Details/`
- Account structures: `apps/anchor_program/programs/shadow_swap/src/lib.rs`
- Settlement bot: `apps/settlement_bot/README.md`
- Shared types: `packages/shared_types/README.md`

## License

MIT
