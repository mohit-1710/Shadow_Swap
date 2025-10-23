# ShadowSwap Anchor Program

Privacy-preserving DEX smart contract for Solana, built with Anchor framework and Arcium MPC.

---

## 📁 Project Structure

```
anchor_program/
├── programs/
│   └── shadow_swap/           # Anchor Rust program
│       ├── src/
│       │   └── lib.rs         # Main program (match_callback ✅)
│       └── Cargo.toml
├── tests/                     # Integration tests (TypeScript)
│   ├── shadow_swap.ts         # Main test suite
│   └── test-match-callback.ts # Callback tests
├── scripts/                   # Utility scripts (TypeScript)
│   ├── initialize-devnet.js   # Initialize OrderBook on devnet
│   ├── setup-arcium.ts        # Deploy Arcium circuit (one-time)
│   └── run-matching.ts        # Run matching keeper bot
├── src/                       # TypeScript helpers
│   └── arcium-matching.ts     # ArciumMatchingEngine class
├── arcium/                    # Arcium circuit definition
│   └── matching_logic.arc     # Matching algorithm (docs)
├── docs/                      # 📚 Documentation
│   ├── ARCIUM_CLEANUP_SUMMARY.md
│   ├── ARCIUM_SDK_GUIDE.md
│   ├── IMPLEMENTATION.md
│   ├── README_ARCIUM_MATCHING.md
│   ├── TESTING.md
│   └── TEST_SUMMARY.md
├── target/                    # Build artifacts (gitignored)
├── Anchor.toml                # Anchor configuration
├── Cargo.toml                 # Rust workspace
├── package.json               # Node dependencies
├── tsconfig.json              # TypeScript config
└── README.md                  # This file
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
solana --version     # >= 1.18.0
anchor --version     # >= 0.31.0
node --version       # >= 18.0.0
yarn --version       # >= 1.22.0
```

### Install Dependencies

```bash
yarn install
```

### Build Program

```bash
anchor build
```

### Run Tests

```bash
anchor test
```

---

## 📦 Key Commands

### Development

```bash
# Build the Anchor program
anchor build

# Run all tests
anchor test

# Run specific test
anchor test -- --grep "should place order"

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Initialization

```bash
# Initialize order book on devnet
node scripts/initialize-devnet.js
```

### Arcium Integration

```bash
# Setup Arcium circuit (one-time)
yarn arcium:setup

# Run matching keeper bot
yarn arcium:run

# Test match callback
yarn test:callback
```

---

## 🔐 Core Features

### Anchor Program (`lib.rs`)

- ✅ **`initialize_order_book`** - Create new trading pair order book
- ✅ **`place_order`** - Submit encrypted orders
- ✅ **`cancel_order`** - Cancel active orders
- ✅ **`match_callback`** - Process Arcium MPC match results
- ✅ **`create_callback_auth`** - Authorize keeper for callbacks

### Arcium Matching (`arcium-matching.ts`)

- ✅ **Price-time priority** matching algorithm
- ✅ **Privacy-preserving** MPC computation
- ✅ **SDK integration** using `@arcium-hq/client`
- ✅ **Keeper bot** for continuous matching
- ✅ **Circuit deployment** workflow

---

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

| File | Description |
|------|-------------|
| [IMPLEMENTATION.md](./docs/IMPLEMENTATION.md) | Anchor program implementation details |
| [README_ARCIUM_MATCHING.md](./docs/README_ARCIUM_MATCHING.md) | Complete Arcium integration guide |
| [ARCIUM_SDK_GUIDE.md](./docs/ARCIUM_SDK_GUIDE.md) | Arcium SDK usage reference |
| [TESTING.md](./docs/TESTING.md) | Testing guide and commands |
| [TEST_SUMMARY.md](./docs/TEST_SUMMARY.md) | Test coverage summary |
| [ARCIUM_CLEANUP_SUMMARY.md](./docs/ARCIUM_CLEANUP_SUMMARY.md) | Cleanup and refactoring notes |

---

## 🧪 Testing

### Run All Tests

```bash
anchor test
```

### Test Coverage

- ✅ Initialize order book
- ✅ Place encrypted orders
- ✅ Cancel orders
- ✅ Match callback processing
- ✅ Error handling (unhappy paths)
- ✅ Edge cases

See [docs/TEST_SUMMARY.md](./docs/TEST_SUMMARY.md) for details.

---

## 🔧 Configuration

### Environment Variables

```bash
# Program
export PROGRAM_ID="Dk9p88PPmrApGwhpTZAYQkuZApVHEnquxxeng1sCndci"
export ORDER_BOOK_ADDRESS="6n4KbFqXoLaCYnANHNuKZUW6g73A3B4JLgQRMPWQh4Wv"

# Tokens (devnet)
export BASE_MINT="So11111111111111111111111111111111111111112"  # SOL
export QUOTE_MINT="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"  # USDC

# Keeper
export KEEPER_KEYPAIR='[...]'
export RPC_ENDPOINT="https://api.devnet.solana.com"
```

### Anchor.toml

```toml
[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[programs.devnet]
shadow_swap = "Dk9p88PPmrApGwhpTZAYQkuZApVHEnquxxeng1sCndci"
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   ARCIUM MPC NETWORK                         │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Privacy-Preserving Matching Algorithm             │     │
│  │  • Price-time priority sorting                     │     │
│  │  • Secure comparisons on encrypted data            │     │
│  │  • Returns MatchResult[]                           │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                     ▲                        │
           [Encrypted Orders]        [Match Results]
                     │                        ▼
┌─────────────────────────────────────────────────────────────┐
│         KEEPER BOT (ArciumMatchingEngine)                    │
│  • Fetch orders from order book                              │
│  • Submit to Arcium MPC                                      │
│  • Invoke match_callback with results                        │
└─────────────────────────────────────────────────────────────┘
                     ▲                        │
           [Query Orders]            [match_callback]
                     │                        ▼
┌─────────────────────────────────────────────────────────────┐
│           ANCHOR PROGRAM (lib.rs) ✅                         │
│  • place_order() - Store encrypted orders                    │
│  • match_callback() - Process matches                        │
│  • Settlement logic                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security

### Privacy Features

- ✅ **Client-side encryption** - Orders encrypted before submission
- ✅ **MPC computation** - Matching in secure Arcium network
- ✅ **Zero-knowledge proofs** - No plaintext order data on-chain
- ✅ **Authorization checks** - Callback auth required

### Auditing

- PDAs derived correctly
- Token transfers verified
- Escrow accounts secured
- Event emission for transparency

---

## 📝 Development Workflow

### 1. Build & Test Locally

```bash
anchor build
anchor test
```

### 2. Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

### 3. Initialize Order Book

```bash
node scripts/initialize-devnet.js
```

### 4. Setup Arcium (One-Time)

```bash
yarn arcium:setup
```

### 5. Run Keeper Bot

```bash
yarn arcium:run
```

---

## 🤝 Contributing

1. Follow Rust and Anchor best practices
2. Write tests for new features
3. Update documentation
4. Run `anchor test` before committing

---

## 📄 License

ISC

---

## 🔗 Links

- **Anchor Framework**: https://www.anchor-lang.com/
- **Arcium SDK**: https://github.com/arcium-hq/arcium-tooling
- **Solana Docs**: https://docs.solana.com/

---

## 💡 Key Files

| File | Purpose |
|------|---------|
| `programs/shadow_swap/src/lib.rs` | Main Anchor program |
| `src/arcium-matching.ts` | Arcium matching engine |
| `scripts/run-matching.ts` | Keeper bot |
| `tests/shadow_swap.ts` | Integration tests |
| `docs/README_ARCIUM_MATCHING.md` | Complete Arcium guide |

---

## 🎯 Status

| Component | Status |
|-----------|--------|
| Anchor Program | ✅ Production-ready |
| Match Callback | ✅ Implemented |
| Arcium Integration | ✅ SDK ready |
| Keeper Bot | ✅ Ready |
| Tests | ✅ Passing |
| Documentation | ✅ Complete |

---

**For detailed documentation, see the [`docs/`](./docs/) directory.**
