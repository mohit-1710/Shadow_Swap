---
title: Getting Started with ShadowSwap
description: Complete guide to setting up and using ShadowSwap on Solana Devnet
lastUpdated: 2025-01-30
---

# Getting Started with ShadowSwap

## What is ShadowSwap?

ShadowSwap is a **privacy-preserving orderbook DEX** built on Solana that eliminates MEV (Maximal Extractable Value) through client-side encryption and off-chain matching. Unlike traditional AMMs where every trade is visible in the public mempool, ShadowSwap encrypts order details before submission, making it impossible for bots to front-run or sandwich your trades.

### Key Features

- **Zero MEV Exposure**: Orders encrypted client-side before blockchain submission
- **Hybrid Architecture**: On-chain storage + off-chain matching for optimal privacy and performance
- **Price-Time Priority**: Fair matching algorithm that rewards earlier orders at better prices
- **Escrow-Based Security**: Program-controlled PDAs ensure atomic settlement
- **Solana-Native**: Built with Anchor framework for maximum efficiency

### How It Works

ShadowSwap uses a three-phase architecture:

#### 1. Order Submission (Client → Blockchain)

**File**: `ShadowSwap SPA Design/components/trade-section.tsx`

When you place an order:

1. **Client-side encryption**: Your order details (price, amount, side) are encrypted using a 512-byte cipher payload
2. **Escrow creation**: A Program Derived Address (PDA) is created to hold your funds
3. **On-chain storage**: Only the encrypted payload is stored on-chain—no plaintext data

**Encryption Implementation** (`ShadowSwap SPA Design/lib/arcium.ts`):

```typescript
export function serializePlainOrder(order: PlainOrder): Uint8Array {
  const buffer = new ArrayBuffer(24); // 4 + 8 + 8 + 4 bytes
  const view = new DataView(buffer);
  
  // Side (u32, 4 bytes)
  view.setUint32(0, order.side, true); // little-endian
  
  // Amount (u64, 8 bytes)
  view.setBigUint64(4, BigInt(order.amount), true);
  
  // Price (u64, 8 bytes)
  view.setBigUint64(12, BigInt(order.price), true);
  
  // Timestamp (u32, 4 bytes)
  view.setUint32(20, order.timestamp, true);
  
  return new Uint8Array(buffer);
}
```

The encrypted payload is then padded to exactly **512 bytes** to prevent size-based analysis attacks.

#### 2. Off-Chain Matching (Keeper Bot)

**File**: `apps/settlement_bot/src/matcher.ts`

The keeper bot runs a continuous loop:

1. **Fetches encrypted orders** from the blockchain
2. **Decrypts orders** via Arcium MPC (Multi-Party Computation)
3. **Matches orders** using price-time priority algorithm
4. **Submits settlements** atomically to the blockchain

**Price-Time Priority Matching Algorithm**:

```typescript
export function matchOrders(orders: PlainOrder[]): MatchedPair[] {
  // Separate buy and sell orders
  const buyOrders = orders
    .filter(o => (o.side === 0 || o.side === 'buy') && o.remainingAmount > 0n)
    .sort((a, b) => {
      // Sort by price descending, then timestamp ascending
      if (b.price !== a.price) {
        return b.price > a.price ? 1 : -1;
      }
      return a.createdAt - b.createdAt;
    });

  const sellOrders = orders
    .filter(o => (o.side === 1 || o.side === 'sell') && o.remainingAmount > 0n)
    .sort((a, b) => {
      // Sort by price ascending, then timestamp ascending
      if (a.price !== b.price) {
        return a.price > b.price ? 1 : -1;
      }
      return a.createdAt - b.createdAt;
    });

  // Match orders where buyPrice >= sellPrice
  // Execution price is the maker's price (time priority)
  const executionPrice = buyOrder.createdAt < sellOrder.createdAt
    ? buyOrder.price  // Buy order was first (maker)
    : sellOrder.price; // Sell order was first (maker)
}
```

**Why Time-Priority Matters**: If your buy order at 142 USDC matches with a sell order at 140 USDC, and you placed your order first, you pay 142 USDC (your maker price). This incentivizes early limit orders.

#### 3. On-Chain Settlement (Keeper → Program)

**File**: `apps/anchor_program/programs/shadow_swap/src/lib.rs` (lines 217-379)

The keeper submits a `submit_match_results` instruction:

```rust
pub fn submit_match_results<'info>(
    ctx: Context<'_, '_, '_, 'info, SubmitMatchResults<'info>>,
    match_input: MatchResultInput,
) -> Result<()> {
    // Verify keeper authorization via callback_auth
    require!(
        callback_auth.is_active,
        ShadowSwapError::UnauthorizedCallback
    );
    
    // Calculate transfer amounts
    let quote_amount_u128 = (match_input.matched_amount as u128)
        .checked_mul(match_input.execution_price as u128)
        .ok_or(ShadowSwapError::NumericalOverflow)?
        .checked_div(BASE_DECIMALS_FACTOR)
        .ok_or(ShadowSwapError::NumericalOverflow)?;

    // Transfer quote tokens (USDC) from buyer's escrow to seller
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: buyer_escrow_token_info,
                to: seller_token_info,
                authority: ctx.accounts.buyer_escrow.to_account_info(),
            },
            buyer_escrow_signer,
        ),
        quote_amount,
    )?;

    // Transfer base tokens (WSOL) from seller's escrow to buyer
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: seller_escrow_token_info,
                to: buyer_token_info,
                authority: ctx.accounts.seller_escrow.to_account_info(),
            },
            seller_escrow_signer,
        ),
        base_amount,
    )?;

    // Update order statuses to Filled
    buyer_order.status = ORDER_STATUS_FILLED;
    seller_order.status = ORDER_STATUS_FILLED;

    // Emit settlement event
    emit!(TradeSettled {
        order_book: order_book.key(),
        buyer: match_input.buyer_pubkey,
        seller: match_input.seller_pubkey,
        buyer_order_id: buyer_order.order_id,
        seller_order_id: seller_order.order_id,
        base_amount: match_input.matched_amount,
        quote_amount,
        execution_price: match_input.execution_price,
        timestamp: clock.unix_timestamp,
    });
}
```

---

## Devnet Setup Guide

### Prerequisites

- **Phantom** or **Solflare** wallet installed (browser extension)
- Wallet network set to **Solana Devnet**

### Step 1: Get Devnet SOL

#### Method 1: Solana CLI
```bash
# Install Solana CLI first if you haven't
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Request airdrop
solana airdrop 2 --url https://api.devnet.solana.com
```

#### Method 2: Web Faucet
1. Visit: [https://faucet.solana.com](https://faucet.solana.com)
2. Paste your wallet address
3. Request **2 SOL** (maximum per request)
4. Wait 30-60 seconds for confirmation

#### Method 3: Using ShadowSwap Script
```bash
cd /Users/vansh/Coding/Shadow_Swap
./get-devnet-usdc.sh
```

**Note**: If the faucet rate-limits you, wait 24 hours or try from a different IP address.

### Step 2: Get Devnet USDC

Devnet USDC Mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

#### Method 1: SPL Token Faucet
```bash
# Install SPL Token CLI
cargo install spl-token-cli

# Create USDC token account
spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU --url devnet

# Mint USDC to your account (if faucet is available)
spl-token mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU 1000 --url devnet
```

#### Method 2: Web Faucet
1. Visit: [https://spl-token-faucet.com](https://spl-token-faucet.com) (if available)
2. Select **USDC (Devnet)**
3. Enter your wallet address
4. Request **1000 USDC**

**Alternative**: Ask in the Solana Discord (#devnet-support) for devnet USDC airdrops.

### Step 3: Connect Wallet

1. Visit the ShadowSwap Devnet deployment (URL provided by team)
2. Click **"Connect Wallet"** in the top-right corner
3. Approve the connection in Phantom/Solflare
4. **Verify** your wallet shows "Devnet" in the network selector

**Troubleshooting**:
- If balance shows $0, refresh the page
- Ensure wallet is on Devnet (not Mainnet)
- Check browser console for connection errors

### Step 4: Place Your First Order

1. Navigate to the **Trade** page
2. Select **SOL/USDC** pair (only supported pair in MVP)
3. Enter amount (e.g., 0.1 SOL)
4. Enter limit price (e.g., 142.50 USDC per SOL)
5. (Optional) Enable **LP Fallback** for guaranteed execution
6. Click **"Place Limit Order"**
7. Confirm the transaction in your wallet

**Transaction Details**:
- **Signature**: 64-character transaction hash (e.g., `5xJ...Qw2`)
- **Network Fee**: ~0.000005 SOL per signature
- **Rent**: ~0.002 SOL per account (refundable on close)

**Expected Behavior**:
- Order appears in **Order History** table with "Active" status
- Balance updates to reflect escrowed tokens
- Keeper bot matches your order within 10-30 seconds (if match exists)

---

## Key Concepts

### Program Derived Addresses (PDAs)

PDAs are deterministic addresses derived from seeds—no private key exists, so only the program can sign for them.

**Actual PDA Seeds** (from `ShadowSwap SPA Design/lib/program.ts`):

```typescript
// OrderBook PDA
// Seeds: ["order_book", base_mint, quote_mint]
export function deriveOrderBookPda(
  baseMint: PublicKey,
  quoteMint: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('order_book'),
      baseMint.toBuffer(),
      quoteMint.toBuffer(),
    ],
    programId
  );
}

// Order PDA
// Seeds: ["order", order_book, order_count]
export function deriveOrderPda(
  orderBookAddress: PublicKey,
  orderCount: BN,
  programId: PublicKey
): [PublicKey, number] {
  const orderCountBuffer = orderCount.toArrayLike(Buffer, 'le', 8);
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('order'),
      orderBookAddress.toBuffer(),
      orderCountBuffer,
    ],
    programId
  );
}

// Escrow PDA
// Seeds: ["escrow", order_pubkey]
export function deriveEscrowPda(
  orderAddress: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), orderAddress.toBuffer()],
    programId
  );
}

// CallbackAuth PDA
// Seeds: ["callback_auth", order_book, keeper]
export function deriveCallbackAuthPda(
  orderBookAddress: PublicKey,
  keeperAddress: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('callback_auth'),
      orderBookAddress.toBuffer(),
      keeperAddress.toBuffer(),
    ],
    programId
  );
}
```

**Current Devnet Addresses**:
- **Program ID**: `CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA`
- **Order Book (SOL/USDC)**: `63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ`
- **Base Mint (WSOL)**: `So11111111111111111111111111111111111111112`
- **Quote Mint (USDC)**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

### Token Decimals

Solana tokens use fixed-point arithmetic to represent fractional amounts:

| Token | Decimals | Smallest Unit | Example |
|-------|----------|---------------|---------|
| SOL   | 9        | 1 lamport = 0.000000001 SOL | 1 SOL = 1,000,000,000 lamports |
| USDC  | 6        | 1 micro-unit = 0.000001 USDC | 1 USDC = 1,000,000 micro-units |

**Price Representation**:
- On-chain price: USDC micro-units per SOL lamport
- UI price: USDC per SOL (human-readable)
- Conversion factor: `1_000_000_000` (BASE_DECIMALS_FACTOR in `lib.rs`)

**Example Calculation** (from `lib.rs` lines 277-284):
```rust
// matched_amount is in base token (WSOL) smallest units (lamports)
// execution_price is quote tokens (USDC) smallest units per base token
let quote_amount_u128 = (match_input.matched_amount as u128)
    .checked_mul(match_input.execution_price as u128)
    .ok_or(ShadowSwapError::NumericalOverflow)?
    .checked_div(BASE_DECIMALS_FACTOR) // 1_000_000_000
    .ok_or(ShadowSwapError::NumericalOverflow)?;
```

If you buy 5 SOL at 142.00 USDC/SOL:
- `matched_amount` = 5,000,000,000 lamports (5 SOL)
- `execution_price` = 142 USDC/SOL = 142,000,000 micro-units (adjusted for decimals)
- `quote_amount` = (5,000,000,000 * 142,000,000) / 1,000,000,000 = 710,000,000 micro-units = 710 USDC

### Order States

Orders follow a strict lifecycle (from `lib.rs` lines 654-667):

```rust
/// Order status: Active
pub const ORDER_STATUS_ACTIVE: u8 = 1;

/// Order status: Partially filled
pub const ORDER_STATUS_PARTIAL: u8 = 2;

/// Order status: Fully filled
pub const ORDER_STATUS_FILLED: u8 = 3;

/// Order status: Cancelled
pub const ORDER_STATUS_CANCELLED: u8 = 4;

/// Order status: Matched, pending execution
pub const ORDER_STATUS_MATCHED_PENDING: u8 = 5;
```

**State Transitions**:

```
ACTIVE (1)
   ├─> MATCHED_PENDING (5) ─> FILLED (3)  [successful match]
   ├─> PARTIAL (2) ─> FILLED (3)           [multiple partial fills]
   └─> CANCELLED (4)                        [user cancels]
```

**UI Display** (from `ShadowSwap SPA Design/components/order-history.tsx`):

```typescript
const getStatusText = (status: number): string => {
  switch (status) {
    case ORDER_STATUS.ACTIVE:
      return "Active"
    case ORDER_STATUS.PARTIAL:
      return "Partial"
    case ORDER_STATUS.FILLED:
    case ORDER_STATUS.EXECUTED:
      return "Filled"
    case ORDER_STATUS.CANCELLED:
      return "Cancelled"
    case ORDER_STATUS.MATCHED_PENDING:
      return "Matching"
    default:
      return "Unknown"
  }
}
```

**Important**: Only **ACTIVE** or **PARTIAL** orders can be cancelled. Once an order reaches **FILLED** or **CANCELLED**, it is immutable.

### Wrapped SOL (WSOL)

Solana programs use **Wrapped SOL** (SPL token format) instead of native SOL for consistency with other tokens.

**Why Wrapping?**
- SPL Token Program requires all tokens (including SOL) to use token accounts
- Wrapped SOL (WSOL) = SOL in SPL token format
- Mint address: `So11111111111111111111111111111111111111112`

**Automatic Wrapping** (from `ShadowSwap SPA Design/lib/shadowSwapClient.ts` lines 154-165):

```typescript
// If selling, we need to wrap SOL first
if (side === 'sell') {
  // Add wrap SOL instruction
  const wrapAmount = BigInt(amountLamports) + BigInt(2_039_280); // Add rent for token account
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: this.provider.publicKey,
      toPubkey: userTokenAccount,
      lamports: Number(wrapAmount),
    })
  );
  transaction.add(createSyncNativeInstruction(userTokenAccount));
}
```

The frontend handles this automatically—no manual wrapping required!

---

## Common Issues & Solutions

### Issue: "Order book not active"

**Cause**: The order book for your selected pair doesn't exist or is paused.

**Solution**:
```bash
# Check if order book is active
solana account 63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ --url devnet

# If not initialized, run setup script
cd apps/anchor_program
yarn anchor:setup
```

### Issue: "Insufficient balance"

**Cause**: You don't have enough SOL or USDC to place the order.

**Solution**:
- Check wallet balances in the UI
- Request more devnet SOL/USDC (see Step 1 & 2 above)
- Ensure you account for network fees (~0.005 SOL)

### Issue: "Transaction failed: Order already exists"

**Cause**: A previous transaction succeeded but the UI didn't update.

**Solution**:
- Refresh the page
- Check Order History—your order likely exists
- If duplicate orders appear, cancel the extras

### Issue: "Program not deployed"

**Cause**: Program ID in `.env` doesn't match deployed program.

**Solution**:
```bash
# Verify program ID
cat apps/anchor_program/target/deploy/shadow_swap-keypair.json | solana-keygen pubkey

# Should output: CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA
```

---

## Next Steps

- **[MEV Protection](./mev-protection.md)**: Learn how ShadowSwap eliminates front-running and sandwich attacks
- **[Trading Guide](./trading-guide.md)**: Master limit orders, market orders, and LP fallback
- **[Privacy & Security](./privacy-security.md)**: Understand encryption, decryption, and security guarantees

## Additional Resources

### Code References
- **Anchor Program**: `apps/anchor_program/programs/shadow_swap/src/lib.rs`
- **Settlement Bot**: `apps/settlement_bot/src/index.ts`
- **Frontend Client**: `ShadowSwap SPA Design/lib/shadowSwapClient.ts`
- **Matching Engine**: `apps/settlement_bot/src/matcher.ts`

### Developer Tools
- **Solana Explorer (Devnet)**: [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)
- **Solana CLI Docs**: [https://docs.solana.com/cli](https://docs.solana.com/cli)
- **Anchor Framework**: [https://www.anchor-lang.com](https://www.anchor-lang.com)

### Community
- **Discord**: [ShadowSwap Discord](#) (replace with actual link)
- **GitHub**: [https://github.com/yourorg/shadowswap](https://github.com/yourorg/shadowswap)
- **Twitter**: [@ShadowSwapDEX](#) (replace with actual handle)

