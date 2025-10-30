# ShadowSwap Backend Architecture & Program Documentation

**Last Updated**: October 28, 2025  
**Version**: 0.1.0  
**Status**: Development/MVP

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Anchor Program (On-Chain)](#anchor-program-on-chain)
4. [Settlement Bot (Keeper)](#settlement-bot-keeper)
5. [Shared Types Package](#shared-types-package)
6. [Scripts & Automation](#scripts--automation)
7. [Development Workflow](#development-workflow)
8. [Security & Privacy Model](#security--privacy-model)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Guide](#deployment-guide)

---

## Executive Summary

**ShadowSwap** is a privacy-preserving orderbook DEX built on Solana that enables users to trade tokens without revealing order details (price, size, side) on-chain. The system uses a hybrid architecture:

- **Client-side encryption**: Orders are encrypted before submission to the blockchain
- **On-chain storage**: Anchor program stores encrypted orders and manages escrow PDAs
- **Off-chain matching**: A keeper bot decrypts orders via Arcium MPC, matches them using price-time priority, and submits settlements
- **Stateless settlement**: The Anchor program executes token transfers without maintaining orderbook state

**Key Components**:
- Anchor Program: `5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt`
- Trading Pair (MVP): SOL/USDC on Devnet
- Monorepo Structure: Yarn workspaces with anchor program, settlement bot, and shared types

---

## Architecture Overview

```
┌──────────────┐
│   Frontend   │  (Next.js - not covered here)
└──────┬───────┘
       │ submit_encrypted_order
       ▼
┌─────────────────────────────────────────────────────────┐
│            Anchor Program (On-Chain)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  OrderBook   │  │ Encrypted    │  │   Escrow     │ │
│  │     PDA      │  │  Order PDA   │  │    PDA       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         Program ID: 5Lg1Bz...                          │
└──────────────┬──────────────────────────────────────────┘
               │ fetch orders
               ▼
┌─────────────────────────────────────────────────────────┐
│         Settlement Bot (Off-Chain Keeper)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Arcium   │  │ Matcher  │  │ Sanctum  │             │
│  │  MPC     │  │  Engine  │  │ Gateway  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└──────────────┬──────────────────────────────────────────┘
               │ submit_match_results
               ▼
       [Settlement Transaction]
```

### Data Flow

1. **Order Submission**:
   - User encrypts order (side, price, amount) client-side
   - Submits `submit_encrypted_order` instruction
   - Program creates EncryptedOrder + Escrow PDAs
   - User funds are transferred to escrow token account

2. **Matching Cycle** (every 10 seconds):
   - Bot fetches all active EncryptedOrder accounts
   - Decrypts payloads via Arcium MPC
   - Runs price-time priority matching algorithm
   - Validates matches (escrow balances, overflow checks)

3. **Settlement**:
   - Bot submits `submit_match_results` instruction
   - Program transfers quote tokens from buyer escrow → seller
   - Program transfers base tokens from seller escrow → buyer
   - Order statuses updated to FILLED
   - TradeSettled event emitted

---

## Anchor Program (On-Chain)

**Location**: `apps/anchor_program/programs/shadow_swap/src/lib.rs`  
**Language**: Rust (Anchor Framework 0.31.1)  
**Program ID**: `5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt`

### Instructions

#### 1. `initialize_order_book`

Creates a new order book for a trading pair.

**Parameters**:
- `base_mint`: PublicKey (e.g., SOL)
- `quote_mint`: PublicKey (e.g., USDC)
- `fee_bps`: u16 (basis points, e.g., 30 = 0.3%)
- `min_base_order_size`: u64 (minimum order size in base token lamports)

**Accounts**:
- `order_book` (init): PDA derived from `['order_book', base_mint, quote_mint]`
- `authority`: Signer (order book owner)
- `fee_collector`: Address to receive trading fees

**Validations**:
- `fee_bps <= 10000` (max 100%)

**Example**:
```rust
initialize_order_book(
    SOL_MINT,
    USDC_MINT,
    30,                  // 0.3% fee
    1_000_000           // 0.001 SOL minimum
)
```

---

#### 2. `submit_encrypted_order`

Submits an encrypted order to the orderbook.

**Parameters**:
- `cipher_payload`: Vec<u8> (max 512 bytes) - Encrypted order data
- `encrypted_amount`: Vec<u8> (max 64 bytes) - Encrypted order amount

**Accounts**:
- `order_book`: Mutable OrderBook PDA
- `order` (init): New EncryptedOrder PDA
- `escrow` (init): New Escrow PDA
- `escrow_token_account` (init): Token account owned by escrow PDA
- `user_token_account`: User's source token account
- `token_mint`: Mint of the token being escrowed
- `owner`: Signer (order submitter)

**PDA Derivations**:
- Order: `['order', order_book, order_count]`
- Escrow: `['escrow', order]`
- Escrow Token Account: `['escrow_token', order]`

**Process**:
1. Validates payload sizes (cipher ≤ 512, amount ≤ 64 bytes)
2. Increments order_count and active_orders counters
3. Creates EncryptedOrder account with encrypted payload
4. Creates Escrow account
5. Creates escrow token account (PDA-owned)
6. Transfers entire balance from user_token_account to escrow_token_account

**Security Note**: The program transfers the full balance of the user's token account. Clients must ensure proper amount isolation.

---

#### 3. `cancel_order`

Cancels an active order and returns escrowed funds.

**Accounts**:
- `order`: Mutable EncryptedOrder (must be owned by signer)
- `escrow`: Escrow PDA for this order
- `escrow_token_account`: Escrow's token account
- `user_token_account`: Destination for returned funds
- `order_book`: Mutable (to decrement active_orders)
- `owner`: Signer (must match order.owner)

**Validations**:
- Order status must be ACTIVE or PARTIAL
- Signer must be order owner

**Process**:
1. Updates order status to CANCELLED
2. Decrements active_orders counter
3. Transfers full escrow token balance back to user
4. Uses PDA signer seeds to authorize transfer

---

#### 4. `create_callback_auth`

Authorizes a keeper wallet to submit match results.

**Parameters**:
- `expires_at`: i64 (Unix timestamp)

**Accounts**:
- `order_book`: OrderBook PDA (authority must match signer)
- `callback_auth` (init): New CallbackAuth PDA
- `authority`: Signer (must be order book authority)
- `keeper`: PublicKey to authorize

**PDA Derivation**:
- `['callback_auth', order_book, keeper]`

**Validations**:
- `expires_at > current_timestamp`
- Only order book authority can create

**Use Case**: The order book owner (typically deployer) grants settlement privileges to the keeper bot's wallet.

---

#### 5. `submit_match_results`

Settles a matched order pair by transferring tokens.

**Parameters**:
- `match_input`: MatchResultInput struct
  - `buyer_pubkey`: PublicKey (buyer order account)
  - `seller_pubkey`: PublicKey (seller order account)
  - `matched_amount`: u64 (base token units)
  - `execution_price`: u64 (quote per base, decimals-adjusted)

**Accounts**:
- `callback_auth`: CallbackAuth PDA (validates keeper)
- `order_book`: Mutable OrderBook
- `buyer_order`: Mutable EncryptedOrder
- `seller_order`: Mutable EncryptedOrder
- `buyer_escrow`: Escrow PDA for buyer
- `seller_escrow`: Escrow PDA for seller
- `keeper`: Signer (must match callback_auth.authority)
- `token_program`: SPL Token program

**Remaining Accounts** (required in specific order):
1. `buyer_escrow_token_account` (writable)
2. `seller_escrow_token_account` (writable)
3. `buyer_token_account` (writable) - destination for base tokens
4. `seller_token_account` (writable) - destination for quote tokens

**Validations**:
- Callback auth is active and not expired
- Keeper signature matches callback_auth.authority
- Both orders are ACTIVE or PARTIAL status
- Escrow token accounts match expected addresses

**Settlement Math**:
```rust
quote_amount = (matched_amount * execution_price) / BASE_DECIMALS_FACTOR
BASE_DECIMALS_FACTOR = 1_000_000_000 (SOL lamports per token)
```

**Token Transfers**:
1. Quote tokens: buyer_escrow → seller (quote_amount)
2. Base tokens: seller_escrow → buyer (matched_amount)

**State Updates**:
- Both orders marked as FILLED
- active_orders decremented by 2
- last_trade_at updated to current timestamp

**Event Emitted**:
```rust
TradeSettled {
    order_book,
    buyer,
    seller,
    buyer_order_id,
    seller_order_id,
    base_amount,
    quote_amount,
    execution_price,
    timestamp
}
```

---

### Account Structures

#### OrderBook

Stores configuration and statistics for a trading pair.

```rust
pub struct OrderBook {
    pub authority: Pubkey,              // Can modify order book settings
    pub base_mint: Pubkey,              // e.g., SOL
    pub quote_mint: Pubkey,             // e.g., USDC
    pub order_count: u64,               // Total orders created (ID counter)
    pub active_orders: u64,             // Currently active orders
    pub encrypted_volume_base: Vec<u8>, // Encrypted cumulative base volume
    pub encrypted_volume_quote: Vec<u8>,// Encrypted cumulative quote volume
    pub created_at: i64,                // Unix timestamp
    pub last_trade_at: i64,             // Last settlement timestamp
    pub fee_bps: u16,                   // Fee in basis points
    pub fee_collector: Pubkey,          // Receives trading fees
    pub min_base_order_size: u64,       // Minimum order size (lamports)
    pub is_active: bool,                // Trading enabled flag
    pub bump: u8,                       // PDA bump seed
}
```

**PDA Seeds**: `['order_book', base_mint, quote_mint]`

---

#### EncryptedOrder

Stores an individual encrypted order.

```rust
pub struct EncryptedOrder {
    pub owner: Pubkey,                  // Order submitter
    pub order_book: Pubkey,             // Parent order book
    pub cipher_payload: Vec<u8>,        // Encrypted order data (max 512 bytes)
    pub status: u8,                     // 1=Active, 2=Partial, 3=Filled, 4=Cancelled
    pub encrypted_remaining: Vec<u8>,   // Encrypted unfilled amount
    pub escrow: Pubkey,                 // Associated escrow PDA
    pub created_at: i64,
    pub updated_at: i64,
    pub order_id: u64,                  // Sequential ID from order_book
    pub bump: u8,
}
```

**PDA Seeds**: `['order', order_book, order_count]`

**Status Values**:
- `1` (ACTIVE): Open, unfilled
- `2` (PARTIAL): Partially filled
- `3` (FILLED): Fully filled
- `4` (CANCELLED): Cancelled by owner
- `5` (MATCHED_PENDING): Reserved for future use

---

#### Escrow

Holds funds for an order until settlement or cancellation.

```rust
pub struct Escrow {
    pub order: Pubkey,                  // Associated order
    pub owner: Pubkey,                  // Order owner
    pub order_book: Pubkey,
    pub token_account: Pubkey,          // PDA-owned token account
    pub token_mint: Pubkey,             // Mint of escrowed token
    pub encrypted_amount: Vec<u8>,      // Original encrypted amount
    pub encrypted_remaining: Vec<u8>,   // Encrypted unfilled amount
    pub created_at: i64,
    pub bump: u8,
}
```

**PDA Seeds**: `['escrow', order]`

**Token Account**: Separate PDA-owned SPL token account holds actual tokens.

---

#### CallbackAuth

Authorizes a keeper to submit settlements.

```rust
pub struct CallbackAuth {
    pub authority: Pubkey,              // Keeper wallet
    pub order_book: Pubkey,
    pub nonce: u64,                     // For replay protection (future)
    pub expires_at: i64,                // Unix timestamp
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}
```

**PDA Seeds**: `['callback_auth', order_book, keeper]`

---

### Constants

```rust
MAX_CIPHER_PAYLOAD_SIZE: usize = 512
MAX_ENCRYPTED_AMOUNT_SIZE: usize = 64
MAX_ENCRYPTED_VOLUME_SIZE: usize = 64

ORDER_STATUS_ACTIVE: u8 = 1
ORDER_STATUS_PARTIAL: u8 = 2
ORDER_STATUS_FILLED: u8 = 3
ORDER_STATUS_CANCELLED: u8 = 4
ORDER_STATUS_MATCHED_PENDING: u8 = 5

BASE_DECIMALS_FACTOR: u128 = 1_000_000_000  // SOL decimals
```

---

### Error Codes

```rust
pub enum ShadowSwapError {
    OrderBookNotActive,
    InvalidOrderStatus,
    OrderTooSmall,
    InvalidCipherPayload,
    UnauthorizedCallback,
    CallbackAuthExpired,
    InvalidEscrow,
    InsufficientEscrowFunds,
    InvalidTokenMint,
    OrderNotFound,
    OrderAlreadyFilled,
    OrderAlreadyCancelled,
    InvalidOrderBook,
    InvalidFeeConfiguration,
    NumericalOverflow,
    OrderNotActive,
}
```

---

## Settlement Bot (Keeper)

**Location**: `apps/settlement_bot/src/`  
**Language**: TypeScript (Node.js)  
**Dependencies**: @solana/web3.js, @coral-xyz/anchor, @solana/spl-token

### Overview

The settlement bot is an off-chain daemon that:
1. Monitors on-chain encrypted orders
2. Decrypts them using Arcium MPC
3. Matches orders using price-time priority
4. Submits settlement transactions (optionally via MEV-protected gateway)

### Main Components

#### 1. Main Entry (`src/index.ts`)

**Class**: `ShadowSwapKeeper`

**Constructor Configuration**:
```typescript
interface KeeperConfig {
  rpcUrl: string                  // Solana RPC endpoint
  wssUrl?: string                 // WebSocket endpoint
  programId: string               // Anchor program ID
  orderBookPubkey: string         // Order book to monitor
  keeperKeypairPath: string       // Path to keeper wallet
  arciumMpcUrl: string            // Arcium MPC network URL
  arciumClientId: string
  arciumClientSecret: string
  sanctumGatewayUrl: string       // MEV protection gateway
  sanctumApiKey: string
  matchInterval: number           // Polling interval (ms)
  maxRetries: number              // TX retry attempts
  retryDelayMs: number
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}
```

**Main Loop**:
```typescript
async processMatchingCycle() {
  1. Fetch active orders (memcmp filter on order_book field)
  2. Decrypt orders via Arcium MPC
  3. Match orders using matcher.ts logic
  4. Validate matches (overflow checks, escrow balances)
  5. Build settlement transactions
  6. Submit via Sanctum or direct RPC
  7. Log results and statistics
  8. Sleep for matchInterval milliseconds
}
```

**Key Methods**:
- `fetchActiveOrders()`: Queries program accounts with memcmp filter
- `decryptOrders()`: Batch decrypts via Arcium client
- `buildSettlementTransaction()`: Constructs Anchor instruction with remaining accounts
- `verifyAuthorization()`: Validates callback_auth before starting

---

#### 2. Matcher Engine (`src/matcher.ts`)

**Algorithm**: Price-Time Priority

**Function**: `matchOrders(orders: PlainOrder[]): MatchedPair[]`

**Process**:
1. Separate orders into buy (side=0) and sell (side=1) arrays
2. Sort buys: price descending, timestamp ascending (best bids first)
3. Sort sells: price ascending, timestamp ascending (best asks first)
4. Iterate through sorted arrays:
   - If `buy.price >= sell.price`, create match
   - `matched_amount = min(buy.remaining, sell.remaining)`
   - `execution_price = older_order.price` (maker price)
   - Update remaining amounts
   - Move to next order when current is fully filled
5. Skip self-matches (same order on both sides)

**Example**:
```
Buys:  [150@100, 140@101, 130@102]  (price@ID)
Sells: [120@200, 130@201]

Match 1: Buy 150@100 × Sell 120@200 → 150 units @ 120 (sell was older)
Match 2: Buy 140@101 × Sell 130@201 → 140 units @ 130
```

**Validation**: `validateMatch(match: MatchedPair): boolean`
- Matched amount > 0
- Execution price > 0
- Buy side = 0 or 'buy'
- Sell side = 1 or 'sell'
- Same order book
- Buy price ≥ sell price

**Prioritization**: `prioritizeMatches(matches: MatchedPair[]): MatchedPair[]`
1. Sort by volume descending (larger trades first)
2. Secondary sort by age ascending (older orders first)

---

#### 3. Arcium Client (`src/arcium-client.ts`)

**Interface**: Handles secure decryption via Arcium MPC network

**Real Client** (production):
```typescript
class ArciumClient {
  async initialize(): Promise<void>
    // Authenticate with MPC network
    // Obtain auth token

  async decryptOrder(ciphertext: Buffer): Promise<ArciumDecryptResponse>
    // POST /compute/decrypt
    // Returns plaintext order data

  async decryptBatch(ciphertexts: Buffer[]): Promise<ArciumDecryptResponse[]>
    // Batch decrypt with concurrency limit (10 at a time)
}
```

**Mock Client** (testing):
```typescript
class MockArciumClient {
  async decryptOrder(ciphertext: Buffer): Promise<ArciumDecryptResponse>
    // Deserialize binary format:
    // Bytes 0-3:   side (u32, little-endian)
    // Bytes 4-11:  amount (u64, little-endian)
    // Bytes 12-19: price (u64, little-endian)
    // Bytes 20-23: timestamp (u32, little-endian)
    // Return JSON: {side, amount, price, timestamp}
}
```

**Environment Flag**: `USE_MOCK_ARCIUM=true` enables mock client

---

#### 4. Sanctum Client (`src/sanctum-client.ts`)

**Interface**: Submits transactions with optional MEV protection

**Real Sanctum Client** (production):
```typescript
class SanctumClient {
  async submitTransaction(tx: Transaction, maxRetries: number): Promise<SanctumSubmitResponse>
    // POST /transaction
    // Headers: Authorization: Bearer {apiKey}
    // Body: {transaction: base64, strategy: 'private_only'}
    // Returns: {signature} or {error}
}
```

**Direct RPC Client** (testing):
```typescript
class DirectRPCClient {
  async submitTransaction(tx: Transaction, maxRetries: number): Promise<SanctumSubmitResponse>
    // connection.sendRawTransaction(tx.serialize())
    // await connection.confirmTransaction(signature)
    // Returns: {signature} or {error}
}
```

**Mock Client**:
```typescript
class MockSanctumClient {
  async submitTransaction(): Promise<SanctumSubmitResponse>
    // Simulate delay
    // Return mock signature
}
```

**Environment Flags**:
- `USE_DIRECT_RPC=true`: Bypass Sanctum, use direct RPC
- `USE_MOCK_SANCTUM=true`: Use mock client

---

#### 5. Types (`src/types.ts`)

**Core Types**:
```typescript
interface PlainOrder {
  publicKey: PublicKey
  owner: PublicKey
  orderBook: PublicKey
  side: 0 | 1 | 'buy' | 'sell'
  price: bigint
  amount: bigint
  remainingAmount: bigint
  escrow: PublicKey
  createdAt: number
  orderId: number
  status: number
}

interface MatchedPair {
  buyOrder: PlainOrder
  sellOrder: PlainOrder
  matchedAmount: bigint
  executionPrice: bigint
}

enum OrderStatus {
  ACTIVE = 1,
  PARTIAL = 2,
  FILLED = 3,
  CANCELLED = 4,
  MATCHED_PENDING = 5
}
```

---

### Transaction Building

**Settlement Transaction Structure**:
```typescript
Transaction {
  // Pre-instructions (if needed)
  - createAssociatedTokenAccount (buyer base ATA)
  - createAssociatedTokenAccount (seller quote ATA)
  
  // Main instruction
  submitMatchResults({
    buyerPubkey,
    sellerPubkey,
    matchedAmount: BN,
    executionPrice: BN
  })
  .accounts({
    callbackAuth,
    orderBook,
    buyerOrder,
    sellerOrder,
    buyerEscrow,
    sellerEscrow,
    keeper,
    tokenProgram
  })
  .remainingAccounts([
    buyerEscrowTokenAccount,
    sellerEscrowTokenAccount,
    buyerTokenAccount (ATA),
    sellerTokenAccount (ATA)
  ])
}
```

**Validation Checks Before Submission**:
1. Buyer/seller ATAs exist (create if missing)
2. Buyer escrow balance ≥ quote_amount
3. Seller escrow balance ≥ matched_amount
4. matched_amount ≤ u64::MAX
5. quote_amount ≤ u64::MAX

---

### Logging & Monitoring

**Console Output**:
```
🚀 ShadowSwap Keeper Bot - Hybrid Architecture
📍 Configuration:
   RPC URL:        https://api.devnet.solana.com
   Program ID:     5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt
   Order Book:     63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ
   Keeper Wallet:  <keeper_pubkey>
   Match Interval: 10000ms

⏱️  [2025-10-28T...] Starting matching cycle #1...
📥 Fetching active orders...
   ✅ Found 5 active orders

🔐 Decrypting 5 orders via Arcium MPC...
   🔍 Order #0: side=0, price=150000000, amount=1000000000
   ...
   ✅ Successfully decrypted 5 orders

📊 Matching 5 orders...
   📈 3 buy orders (highest bid: 150000000)
   📉 2 sell orders (lowest ask: 120000000)
   ✅ Match found: Buy #100 @ 150 <-> Sell #200 @ 120 | Amount: 1000 @ 120

📈 Match Statistics:
   Matches:        2
   Base Volume:    2.0000
   Quote Volume:   250.0000
   Average Price:  125.0000
   Total Fees:     0.7500

📤 Submitting 2 matches for settlement...
   🚀 Submitting transaction to RPC (attempt 1/3)...
   ⏳ Waiting for confirmation: <signature>
   ✅ Transaction confirmed: <signature>

📊 Settlement Results:
   ✅ Successful: 2
   ❌ Failed:     0

✅ Matching cycle completed in 3421ms
```

---

## Shared Types Package

**Location**: `packages/shared_types/src/index.ts`  
**Purpose**: Common TypeScript definitions shared between frontend and bot

### Exports

**Enums**:
```typescript
enum OrderStatus {
  Active = 1,
  PartiallyFilled = 2,
  Filled = 3,
  Cancelled = 4
}

enum OrderSide {
  Buy = 'buy',
  Sell = 'sell'
}
```

**Account Interfaces**:
```typescript
interface OrderBookData {
  authority: PublicKey
  baseMint: PublicKey
  quoteMint: PublicKey
  orderCount: bigint
  activeOrders: bigint
  encryptedVolumeBase: Uint8Array
  encryptedVolumeQuote: Uint8Array
  createdAt: number
  lastTradeAt: number
  feeBps: number
  feeCollector: PublicKey
  minBaseOrderSize: bigint
  isActive: boolean
  bump: number
}

interface EncryptedOrderData { ... }
interface EscrowData { ... }
interface CallbackAuthData { ... }
```

**Constants**:
```typescript
const MAX_CIPHER_PAYLOAD_SIZE = 512
const MAX_ENCRYPTED_AMOUNT_SIZE = 64
const MAX_ENCRYPTED_VOLUME_SIZE = 64

const ORDER_BOOK_SEED = 'order_book'
const ORDER_SEED = 'order'
const ESCROW_SEED = 'escrow'
const CALLBACK_AUTH_SEED = 'callback_auth'
```

**Build Command**: `yarn build:shared` (must run before building other packages)

---

## Scripts & Automation

**Location**: `apps/anchor_program/scripts/`

### Setup Scripts

#### `setup-simple.js`
**Usage**: `yarn anchor:setup`

**Actions**:
1. Load program IDL from `target/idl/shadow_swap.json`
2. Derive order book PDA for SOL/USDC
3. Initialize order book (if not exists):
   - Base: SOL (`So11111111111111111111111111111111111111112`)
   - Quote: USDC (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)
   - Fee: 30 bps (0.3%)
   - Min order: 0.001 SOL
4. Create callback auth (if not exists):
   - Keeper: wallet pubkey
   - Expires: 365 days from now
5. Generate `.env` file in `apps/settlement_bot/`

**Output**: `.env` file with:
```bash
RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt
ORDER_BOOK_PUBKEY=<derived_pda>
KEEPER_KEYPAIR_PATH=~/.config/solana/id.json
USE_MOCK_ARCIUM=true
USE_DIRECT_RPC=true
...
```

---

#### `setup-devnet.ts`
**Usage**: `ts-node scripts/setup-devnet.ts`

Similar to `setup-simple.js` but with:
- TypeScript implementation
- More detailed logging
- Explicit wait for confirmations
- Comprehensive environment file generation

---

### Inspection Scripts

#### `inspect-state.ts`
**Usage**: `yarn anchor:inspect`

**Output**:
```
====================================
  ShadowSwap State Inspector
====================================

📖 Order Book
------------------
  Authority:           <pubkey>
  Base Mint:           So11111...
  Quote Mint:          4zMMC9s...
  Order Count:         42
  Fee (bps):           30
  Min Base Order Size: 1000000

🔐 Callback Authorization
---------------------------
  PDA:         <callback_auth_pda>
  Authority:   <keeper_pubkey>
  Expires At:  2026-10-28T...
  Created At:  2025-10-28T...

📝 Encrypted Orders
---------------------
  Found 5 order(s)

  Order 1:
    Address:      <order_pda>
    Owner:        <user_pubkey>
    Order ID:     0
    Status:       Active (1)
    Order Book:   <orderbook_pda>
    Escrow:       <escrow_pda>
    Created At:   2025-10-28T...
    Cipher Size:  512 bytes
  
  ...

📊 Summary
----------
  Total Orders:      5
  Active:            3
  Executed:          1
  Cancelled:         1
```

---

#### `view-orderbook.js`
**Usage**: `yarn view:orderbook`

Prints all orders in the configured order book with:
- Order IDs
- Owner addresses
- Status
- Creation timestamps
- Escrow addresses

---

### Cleanup Scripts

#### `clear-orders.js`
Cancels all active orders for the current wallet.

#### `clear-orderbook-simple.js`
Cancels all orders across all accounts (requires authority).

#### `cancel-all-orders.js`
Batch cancellation with error handling and retry logic.

---

## Development Workflow

### Initial Setup

1. **Install Dependencies**:
   ```bash
   cd /path/to/Shadow_Swap
   yarn install
   ```

2. **Build Shared Types**:
   ```bash
   yarn build:shared
   ```

3. **Build Anchor Program**:
   ```bash
   yarn anchor:build
   ```

4. **Deploy to Devnet** (optional):
   ```bash
   cd apps/anchor_program
   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
   ANCHOR_WALLET=~/.config/solana/id.json \
   anchor deploy
   ```

5. **Initialize Order Book**:
   ```bash
   yarn anchor:setup
   ```

### Running the Bot

1. **Review Configuration**:
   ```bash
   cat apps/settlement_bot/.env
   ```

2. **Start Bot**:
   ```bash
   cd apps/settlement_bot
   yarn dev
   ```

### Testing

1. **Anchor Program Tests**:
   ```bash
   yarn anchor:test
   ```

2. **Bot Development**:
   - Enable mock clients: `USE_MOCK_ARCIUM=true`, `USE_DIRECT_RPC=true`
   - Lower match interval: `MATCH_INTERVAL=5000`
   - Increase logging: `LOG_LEVEL=debug`

### State Inspection

```bash
# View order book state
yarn anchor:inspect

# View orders only
yarn view:orderbook

# Clear all orders (testing)
cd apps/anchor_program
node scripts/clear-orders.js
```

---

## Security & Privacy Model

### Privacy Guarantees

**On-Chain Opacity**:
- Order details (price, amount, side) are encrypted with 512-byte ciphertext
- Only encrypted remainders are stored, not plaintext amounts
- Volume statistics are stored encrypted

**Off-Chain Decryption**:
- Keeper decrypts via Arcium MPC (threshold cryptography)
- No single party sees plaintext data
- Decryption requires multiple MPC nodes

### Security Mechanisms

**Authorization**:
- `CallbackAuth` PDA restricts settlement to authorized keeper
- Time-based expiration (`expires_at` timestamp)
- PDA derivation includes keeper pubkey (one auth per keeper)

**Escrow Safety**:
- Funds held in PDA-owned token accounts
- Transfers use PDA signer seeds (program-controlled)
- Full balance transferred on submission (prevents dust attacks)

**Validation**:
- Overflow checks on all arithmetic (`checked_add`, `checked_mul`)
- Status checks prevent double-settlement
- Ownership validation on cancellations

**Event Emission**:
- `TradeSettled` events for audit trails
- Includes order IDs, amounts, prices, timestamps

### Attack Vectors & Mitigations

**1. Front-Running**:
- Mitigation: Use Sanctum Gateway for MEV-protected submission
- Encrypted orders hide intent from MEV bots

**2. Order Replay**:
- Current: Orders are single-use (marked FILLED after settlement)
- Future: Add nonce field to `CallbackAuth` for replay protection

**3. Keeper Misbehavior**:
- Keeper cannot steal funds (only program controls escrow PDAs)
- Keeper could censor trades (mitigation: multi-keeper architecture)
- Keeper could front-run with own orders (mitigation: on-chain delay + slashing)

**4. Escrow Underfunding**:
- Bot validates escrow balances before submission
- Program would fail transfer if insufficient (transaction reverts)

**5. Cipher Payload Manipulation**:
- Encrypted payloads are integrity-protected by Arcium encryption
- Tampering would fail MPC decryption

---

## Testing Strategy

### Unit Tests

**Anchor Program** (`apps/anchor_program/tests/`):
- Initialization: order book creation
- Order submission: PDA derivation, escrow funding
- Cancellation: fund return, status updates
- Settlement: token transfers, status changes
- Validation: overflow, authority, status checks

**Settlement Bot**:
- Matcher: price-time priority, self-match prevention
- Validation: overflow checks, side verification
- Mocking: Arcium decryption, Sanctum submission

### Integration Tests

**Full Flow**:
1. Deploy program to localnet
2. Initialize order book
3. Submit encrypted orders (mock encryption)
4. Run keeper bot with mock clients
5. Verify settlements on-chain
6. Check event logs and balance changes

### Devnet Testing

**Prerequisites**:
- Solana devnet airdrop: `solana airdrop 2 --url devnet`
- USDC devnet mint: Faucet at https://spl-token-faucet.com

**Test Scenarios**:
- Single buy/sell match
- Multiple partial fills
- Order cancellation
- Keeper authorization expiry
- Insufficient escrow funds
- MEV protection via Sanctum

---

## Deployment Guide

### Devnet Deployment

**1. Configure Environment**:
```bash
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json
```

**2. Deploy Program**:
```bash
cd apps/anchor_program
anchor build
anchor deploy
```

**3. Update Program ID**:
- Copy program ID from deploy output
- Update `Anchor.toml` (programs.devnet.shadow_swap)
- Update `lib.rs` (declare_id! macro)
- Rebuild: `anchor build`

**4. Initialize Infrastructure**:
```bash
yarn anchor:setup
```

**5. Start Keeper**:
```bash
cd apps/settlement_bot
yarn dev
```

---

### Mainnet Deployment

**Pre-Deployment Checklist**:
- [ ] Audit smart contract code
- [ ] Integrate real Arcium SDK (remove mock client)
- [ ] Set up Sanctum API key
- [ ] Configure monitoring and alerting
- [ ] Fund keeper wallet with SOL for transaction fees
- [ ] Test on devnet with real tokens
- [ ] Document emergency procedures

**Deployment Steps**:
1. Configure mainnet provider: `ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com`
2. Deploy program: `anchor deploy`
3. Update all `.env` files with mainnet RPCs and program ID
4. Initialize order book for production pairs
5. Create callback auth with keeper wallet
6. Start keeper bot with monitoring
7. Monitor logs and on-chain state

**Security Recommendations**:
- Use separate keeper wallet (not deployer)
- Set conservative `expires_at` for callback auth (renew monthly)
- Enable Sanctum MEV protection (`USE_DIRECT_RPC=false`)
- Run keeper on secure infrastructure (VPS with SSH key auth)
- Set up alerts for failed settlements, RPC errors, escrow balance discrepancies

---

## Appendix

### Environment Variables Reference

**Anchor Program** (`apps/anchor_program/.env`):
```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json
SHADOWSWAP_PROGRAM_ID=5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt
```

**Settlement Bot** (`apps/settlement_bot/.env`):
```bash
# Solana
RPC_URL=https://api.devnet.solana.com
WSS_URL=wss://api.devnet.solana.com
PROGRAM_ID=5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt
ORDER_BOOK_PUBKEY=63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ

# Keeper
KEEPER_KEYPAIR_PATH=~/.config/solana/id.json

# Arcium
ARCIUM_MPC_URL=https://mpc.arcium.com
ARCIUM_CLIENT_ID=<client_id>
ARCIUM_CLIENT_SECRET=<client_secret>

# Sanctum
SANCTUM_GATEWAY_URL=https://gateway.sanctum.so
SANCTUM_API_KEY=<api_key>

# Behavior
MATCH_INTERVAL=10000
MAX_RETRIES=3
RETRY_DELAY_MS=1000

# Testing Flags
USE_MOCK_ARCIUM=true
USE_MOCK_SANCTUM=true
USE_DIRECT_RPC=true
LOG_LEVEL=info
```

---

### PDA Derivation Reference

| Account | Seeds | Example |
|---------|-------|---------|
| OrderBook | `['order_book', base_mint, quote_mint]` | `63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ` |
| EncryptedOrder | `['order', order_book, order_count (u64 LE)]` | `<order_pda>` |
| Escrow | `['escrow', order]` | `<escrow_pda>` |
| EscrowTokenAccount | `['escrow_token', order]` | `<token_account_pda>` |
| CallbackAuth | `['callback_auth', order_book, keeper]` | `<callback_auth_pda>` |

---

### Mainnet Addresses

**Program**: TBD (not deployed yet)  
**Order Books**: TBD  
**Keeper**: TBD

---

### Links & Resources

- **Repository**: [ShadowSwap Monorepo](https://github.com/yourusername/shadowswap)
- **Anchor Docs**: https://www.anchor-lang.com/docs
- **Solana Docs**: https://docs.solana.com/
- **Arcium MPC**: https://docs.arcium.com/ (placeholder)
- **Sanctum Gateway**: https://docs.sanctum.so/ (placeholder)

---

**Document Maintained By**: ShadowSwap Development Team  
**Last Audit**: N/A (pre-production)  
**Next Review**: Before mainnet deployment


