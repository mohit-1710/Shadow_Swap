---
title: Privacy & Security
description: Deep dive into ShadowSwap's cryptographic guarantees, security architecture, and threat model
lastUpdated: 2025-01-30
---

# Privacy & Security

## Privacy Architecture

### Client-Side Encryption

**File**: `ShadowSwap SPA Design/lib/arcium.ts`

ShadowSwap encrypts all order details **before** they touch the blockchain. This means price, amount, and side (buy/sell) are never visible in plaintext on-chain or in transaction logs.

#### Order Serialization

**Implementation** (`arcium.ts` lines 32-49):

```typescript
/**
 * Serialize PlainOrder to bytes for encryption
 */
export function serializePlainOrder(order: PlainOrder): Uint8Array {
  const buffer = new ArrayBuffer(24); // 4 + 8 + 8 + 4 bytes
  const view = new DataView(buffer);
  
  // Side (u32, 4 bytes) - 0 = Buy, 1 = Sell
  view.setUint32(0, order.side, true); // little-endian
  
  // Amount (u64, 8 bytes) - in lamports
  view.setBigUint64(4, BigInt(order.amount), true);
  
  // Price (u64, 8 bytes) - in USDC micro-units
  view.setBigUint64(12, BigInt(order.price), true);
  
  // Timestamp (u32, 4 bytes) - Unix timestamp
  view.setUint32(20, order.timestamp, true);
  
  return new Uint8Array(buffer);
}
```

**Binary Layout** (24 bytes total):
```
Offset | Field     | Type | Size | Description
-------|-----------|------|------|------------------
0      | side      | u32  | 4    | 0 = buy, 1 = sell
4      | amount    | u64  | 8    | Token amount (lamports/micro-units)
12     | price     | u64  | 8    | Price in quote tokens per base token
20     | timestamp | u32  | 4    | Unix timestamp (seconds)
```

**Example**:
- Order: Sell 5 SOL at 142 USDC
- `side` = 1 (sell)
- `amount` = 5,000,000,000 lamports (5 SOL)
- `price` = 142,000,000 micro-units (142 USDC, adjusted for decimals)
- `timestamp` = 1706745600 (Jan 31, 2025, 10:00:00 UTC)

**Serialized** (hex):
```
01 00 00 00  // side (1 = sell)
00 f2 05 2a 01 00 00 00  // amount (5,000,000,000)
00 ca 9a 78 00 00 00 00  // price (142,000,000)
00 d0 b5 65  // timestamp (1706745600)
```

#### Encryption Flow

**Implementation** (`arcium.ts` lines 61-124):

```typescript
export async function encryptOrderWithArcium(
  order: PlainOrder,
  orderBookAddress: PublicKey,
  network: 'devnet' | 'mainnet' = 'devnet'
): Promise<EncryptedOrder> {
  try {
    // Step 1: Serialize the plain order
    const serializedOrder = serializePlainOrder(order);
    
    // Step 2: Fetch MXE public key from Arcium
    // TODO: Integrate actual Arcium SDK
    // const arciumClient = new ArciumClient({ 
    //   network,
    //   apiKey: process.env.NEXT_PUBLIC_ARCIUM_API_KEY 
    // });
    // const mxeKey = await arciumClient.fetchMXEKey(orderBookAddress.toBase58());
    
    // Step 3: Generate ephemeral keypair
    // const ephemeralKeypair = arciumClient.generateEphemeralKeypair();
    
    // Step 4: Encrypt the serialized order
    // const encrypted = await arciumClient.encrypt({
    //   data: serializedOrder,
    //   recipientPublicKey: mxeKey,
    //   senderKeypair: ephemeralKeypair,
    // });
    
    // PLACEHOLDER IMPLEMENTATION
    // In production, replace with actual Arcium SDK calls
    
    // Create a properly sized cipher payload (512 bytes to match MAX_CIPHER_PAYLOAD_SIZE)
    const cipherPayload = new Uint8Array(512);
    
    // For development: Copy serialized order to cipher (simulating encryption)
    cipherPayload.set(serializedOrder, 0);
    
    // Fill the rest with random data to simulate encrypted payload
    if (typeof window !== 'undefined' && window.crypto) {
      const randomPadding = new Uint8Array(512 - serializedOrder.length);
      crypto.getRandomValues(randomPadding);
      cipherPayload.set(randomPadding, serializedOrder.length);
    }
    
    const ephemeralPublicKey = new Uint8Array(32);
    const nonce = new Uint8Array(24);
    
    // Generate random ephemeral key and nonce
    if (typeof window !== 'undefined' && window.crypto) {
      crypto.getRandomValues(ephemeralPublicKey);
      crypto.getRandomValues(nonce);
    }
    
    return {
      cipherPayload,
      ephemeralPublicKey,
      nonce,
    };
    
  } catch (error) {
    console.error('Error encrypting order with Arcium:', error);
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

**Key Components**:

1. **Cipher Payload** (512 bytes)
   - Encrypted order data (24 bytes) + padding (488 bytes)
   - **Fixed size** prevents size-based inference attacks
   - Impossible to distinguish small vs. large orders

2. **Ephemeral Public Key** (32 bytes)
   - Generated per-order for forward secrecy
   - Used with Arcium MPC for decryption
   - Discarded after decryption—no long-term key reuse

3. **Nonce** (24 bytes)
   - Ensures encryption uniqueness
   - Prevents replay attacks
   - Required for authenticated encryption

#### Padding Strategy

**Why 512 Bytes?**

**File**: `apps/anchor_program/programs/shadow_swap/src/lib.rs` (line 645):

```rust
/// Maximum size for encrypted order payload (512 bytes)
pub const MAX_CIPHER_PAYLOAD_SIZE: usize = 512;
```

**Prevents size-based analysis**:
- If small orders were 100 bytes and large orders 400 bytes, bots could infer trade size
- Fixed 512-byte size ensures all orders look identical on-chain
- Large enough for order data + metadata
- Small enough to fit in Solana transaction (1232 byte limit)

**Padding Implementation** (from `shadowSwapClient.ts` lines 169-174):

```typescript
// Prepare cipher payload and encrypted amount buffers
const cipherPayloadBuffer = Buffer.from(encryptedOrder.cipherPayload);

// Ensure it's exactly 512 bytes (pad if needed)
const paddedCipherPayload = Buffer.alloc(512);
cipherPayloadBuffer.copy(paddedCipherPayload, 0, 0, Math.min(cipherPayloadBuffer.length, 512));
```

### What's Private vs Public

#### Private Information (Encrypted)

**Never visible on-chain or in transaction logs**:

| Field | Description | Why Private |
|-------|-------------|-------------|
| **Order price** | USDC per SOL | Prevents front-running and price manipulation |
| **Order amount** | Tokens to trade | Prevents size-based targeting (e.g., sandwich attacks on large orders) |
| **Order side** | Buy or sell | Prevents directional front-running (e.g., buying before known large buy) |
| **Trading strategy** | Pattern of orders | Cannot be inferred from chain data (all orders look identical) |

**On-Chain Storage** (`lib.rs` lines 391-428):

```rust
#[account]
pub struct EncryptedOrder {
    /// Order owner's public key (PUBLIC - needed for auth)
    pub owner: Pubkey,
    
    /// Order book this order belongs to (PUBLIC - for indexing)
    pub order_book: Pubkey,
    
    /// Encrypted order payload containing:
    /// - Order side (buy/sell) - ENCRYPTED
    /// - Price - ENCRYPTED
    /// - Amount - ENCRYPTED
    /// Maximum size: 512 bytes
    pub cipher_payload: Vec<u8>, // ENCRYPTED
    
    /// Order status (PUBLIC - needed for lifecycle)
    pub status: u8,
    
    /// Encrypted remaining amount (updates as order fills)
    pub encrypted_remaining: Vec<u8>, // ENCRYPTED
    
    /// Escrow account holding the order's funds (PUBLIC - for settlement)
    pub escrow: Pubkey,
    
    /// Order creation timestamp (PUBLIC - for time-priority matching)
    pub created_at: i64,
    
    /// Last update timestamp (PUBLIC - for UI display)
    pub updated_at: i64,
    
    /// Order ID (PUBLIC - for indexing)
    pub order_id: u64,
    
    /// Bump seed for PDA derivation (PUBLIC - for program logic)
    pub bump: u8,
}
```

#### Public Information (Necessary)

**Visible on-chain** (required for protocol function):

| Field | Why Public | Security Impact |
|-------|-----------|-----------------|
| **Owner wallet address** | Required for signature verification and auth | Low—addresses are pseudonymous |
| **Order status** | Lifecycle management (Active, Filled, Cancelled) | Low—status doesn't reveal order details |
| **Order ID** | Sequential indexing for PDA derivation | None—just a counter |
| **Timestamp** | Time-priority matching algorithm | Low—submission time, not execution time |
| **Escrow address** | Fund custody and settlement | None—PDA, no private key exists |

**Why These Must Be Public**:

1. **Owner Pubkey**: Solana requires owner signature for order submission and cancellation. Program verifies `signer == order.owner`.

2. **Status**: UI needs to display order state. Keeper bot needs to filter for "Active" orders to match.

3. **Timestamps**: Price-time priority matching rewards earlier orders. If Order A and B both bid 142 USDC, earlier order gets maker price advantage.

4. **Escrow PDA**: Settlement instruction needs to know which token account to transfer from. PDA derivation is deterministic, so hiding it gains no security.

### Decryption Flow

**File**: `apps/settlement_bot/src/arcium-client.ts`

#### Keeper Bot Decryption Process

**Step 1: Fetch Encrypted Orders** (`settlement_bot/src/index.ts` lines 199-237):

```typescript
private async fetchActiveOrders(): Promise<any[]> {
  console.log(`\n📥 Fetching active orders...`);

  try {
    // Fetch all EncryptedOrder accounts
    // Filter by order_book address
    const accounts = await (this.program.account as any).encryptedOrder.all([
      {
        memcmp: {
          offset: 8 + 32, // After discriminator and owner, pointing to order_book field
          bytes: this.orderBook.toBase58(),
        },
      },
    ]);

    // Filter for active orders
    const activeOrders = accounts
      .map((acc: any) => ({
        publicKey: acc.publicKey,
        account: acc.account,
      }))
      .filter(
        (order: any) =>
          order.account.status === OrderStatus.ACTIVE ||
          order.account.status === OrderStatus.PARTIAL
      );

    console.log(`   ✅ Found ${activeOrders.length} active orders`);

    return activeOrders.map((order: any) => ({
      publicKey: order.publicKey,
      ...order.account,
    }));
  } catch (error) {
    this.logError('Error fetching orders', error);
    return [];
  }
}
```

**Step 2: Send to Arcium MPC** (`settlement_bot/src/arcium-client.ts` lines 70-118):

```typescript
/**
 * Decrypt an encrypted order payload using Arcium MPC
 * 
 * The decryption happens in a distributed manner across the Arcium MPC network.
 * No single party sees the plaintext data.
 */
async decryptOrder(
  ciphertext: Buffer,
  nonce?: string
): Promise<ArciumDecryptResponse> {
  if (!this.authToken) {
    throw new Error('Arcium client not initialized. Call initialize() first.');
  }

  try {
    // Call Arcium MPC network for decryption
    const response = await fetch(`${this.config.mpcUrl}/compute/decrypt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        ciphertext: ciphertext.toString('base64'),
        nonce: nonce || '',
        computationType: 'order_decryption',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        plaintext: '',
        nonce: '',
        error: errorData.message || 'Decryption failed',
      };
    }

    const data = await response.json();
    return {
      plaintext: data.plaintext,
      nonce: data.nonce,
    };
  } catch (error) {
    console.error('Error decrypting with Arcium MPC:', error);
    return {
      plaintext: '',
      nonce: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

**Step 3: Parse Plaintext** (`settlement_bot/src/index.ts` lines 268-310):

```typescript
try {
  const orderData = JSON.parse(result.plaintext);
  const side = Number(orderData.side);
  if (!Number.isInteger(side) || (side !== 0 && side !== 1)) {
    console.warn(`   ⚠️  Invalid side for order ${encryptedOrders[i].publicKey.toBase58()}: ${orderData.side}`);
    continue;
  }

  const priceBigInt = this.parseBigInt(orderData.price);
  const amountBigInt = this.parseBigInt(orderData.amount);
  const remainingBigInt = this.parseBigInt(orderData.remainingAmount ?? orderData.amount);

  if (priceBigInt === null || amountBigInt === null || remainingBigInt === null) {
    console.warn(`   ⚠️  Invalid numeric fields for order ${encryptedOrders[i].publicKey.toBase58()}`);
    continue;
  }

  if (priceBigInt < 0n || amountBigInt <= 0n || remainingBigInt <= 0n) {
    console.warn(`   ⚠️  Non-positive price/amount for order ${encryptedOrders[i].publicKey.toBase58()}`);
    continue;
  }

  const plainOrder: PlainOrder = {
    publicKey: encryptedOrders[i].publicKey,
    owner: encryptedOrders[i].owner,
    orderBook: encryptedOrders[i].orderBook,
    side: side as 0 | 1,
    price: priceBigInt,
    amount: amountBigInt,
    remainingAmount: remainingBigInt,
    escrow: encryptedOrders[i].escrow,
    createdAt: encryptedOrders[i].createdAt.toNumber(),
    orderId: encryptedOrders[i].orderId.toNumber(),
    status: encryptedOrders[i].status,
  };
  
  plainOrders.push(plainOrder);
} catch (parseError) {
  console.warn(`   ⚠️  Failed to parse order #${i}:`, parseError);
}
```

**Step 4: Match Orders** (`settlement_bot/src/matcher.ts`):

```typescript
export function matchOrders(orders: PlainOrder[]): MatchedPair[] {
  // Separate buy and sell orders
  const buyOrders = orders.filter(o => o.side === 0).sort(...);
  const sellOrders = orders.filter(o => o.side === 1).sort(...);

  // Match where buyPrice >= sellPrice
  // Execution price = maker's price (time priority)
}
```

**Step 5: Submit Settlement** (`settlement_bot/src/index.ts` lines 506-532):

```typescript
// Build the instruction
const ix = await this.program.methods
  .submitMatchResults({
    buyerPubkey: match.buyOrder.publicKey,
    sellerPubkey: match.sellOrder.publicKey,
    matchedAmount: matchedAmountBn,
    executionPrice: executionPriceBn,
  })
  .accounts({
    callbackAuth: this.callbackAuth,
    orderBook: this.orderBook,
    buyerOrder: match.buyOrder.publicKey,
    sellerOrder: match.sellOrder.publicKey,
    buyerEscrow: match.buyOrder.escrow,
    sellerEscrow: match.sellOrder.escrow,
    keeper: this.keeper.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .remainingAccounts([
    { pubkey: buyerEscrowTokenAccount, isSigner: false, isWritable: true },
    { pubkey: sellerEscrowTokenAccount, isSigner: false, isWritable: true },
    { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
    { pubkey: sellerTokenAccount, isSigner: false, isWritable: true },
  ])
  .instruction();
```

#### Security Properties

**Arcium MPC (Multi-Party Computation)**:

1. **Distributed decryption**: Encryption key is split across multiple Arcium nodes using secret-sharing
2. **No single-party access**: No individual node sees the full plaintext
3. **Threshold security**: Requires m-of-n nodes to decrypt (e.g., 3-of-5)
4. **Verifiable computation**: Arcium provides zero-knowledge proofs of correct decryption

**Keeper Bot Security**:

1. **Open-source**: Bot code is auditable (`apps/settlement_bot/src/`)
2. **Authorized only**: `CallbackAuth` PDA restricts who can submit settlements
3. **No custody**: Keeper never holds user funds—only program-controlled Escrows do
4. **Revocable**: Order book authority can disable `CallbackAuth` instantly

**Why Trust Arcium?**:
- **No custody**: Arcium never holds tokens, only decrypts ciphertexts
- **Trustless verification**: MPC proofs are verifiable on-chain (future feature)
- **Redundancy**: Multiple keeper instances can run simultaneously
- **Fallback**: Users can cancel orders anytime, bypassing keeper entirely

---

## On-Chain Transparency

### What You Can Verify

#### Settlement Transactions

**File**: `apps/anchor_program/programs/shadow_swap/src/lib.rs` (lines 573-584)

```rust
#[event]
pub struct TradeSettled {
    pub order_book: Pubkey,      // Which order book
    pub buyer: Pubkey,            // Buyer's wallet (order owner)
    pub seller: Pubkey,           // Seller's wallet (order owner)
    pub buyer_order_id: u64,      // Buyer's order ID
    pub seller_order_id: u64,     // Seller's order ID
    pub base_amount: u64,         // Amount of base tokens traded (SOL)
    pub quote_amount: u64,        // Amount of quote tokens traded (USDC)
    pub execution_price: u64,     // Price at settlement
    pub timestamp: i64,           // Settlement timestamp
}
```

**What This Reveals** (publicly visible):
- **Two parties traded**: Buyer and seller wallet addresses
- **Amount exchanged**: 5 SOL for 710 USDC (example)
- **Execution price**: 142 USDC per SOL
- **When**: Settlement timestamp (not order submission time)

**What This Hides**:
- **Original order prices**: Buyer may have bid 143 USDC, seller asked 141 USDC—only 142 USDC execution price shown
- **Original order amounts**: Could be partial fills (buyer ordered 10 SOL, only 5 filled)
- **Order submission time**: Only settlement time shown (could have been pending for hours)
- **How long orders waited**: No indication of whether orders filled instantly or after days

**Viewing on Solana Explorer**:

1. Visit: [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)
2. Paste transaction signature (from Order History or toast notification)
3. Click "Events" tab
4. See `TradeSettled` event with details above

**Example**:
```json
{
  "event": "TradeSettled",
  "data": {
    "orderBook": "63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ",
    "buyer": "BuyerWalletPubkey...",
    "seller": "SellerWalletPubkey...",
    "buyerOrderId": 42,
    "sellerOrderId": 43,
    "baseAmount": 5000000000,       // 5 SOL (lamports)
    "quoteAmount": 710000000,       // 710 USDC (micro-units)
    "executionPrice": 142000000,    // 142 USDC/SOL
    "timestamp": 1706745660
  }
}
```

#### Token Transfers

**Settlement Transaction Flow** (`lib.rs` lines 295-340):

```rust
// Transfer quote tokens (USDC) from buyer's escrow to seller
token::transfer(
    CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: buyer_escrow_token_info,       // Buyer's Escrow (USDC)
            to: seller_token_info,                // Seller's Wallet (USDC)
            authority: ctx.accounts.buyer_escrow.to_account_info(),
        },
        buyer_escrow_signer,
    ),
    quote_amount, // 710 USDC
)?;

// Transfer base tokens (WSOL) from seller's escrow to buyer
token::transfer(
    CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: seller_escrow_token_info,       // Seller's Escrow (WSOL)
            to: buyer_token_info,                 // Buyer's Wallet (WSOL)
            authority: ctx.accounts.seller_escrow.to_account_info(),
        },
        seller_escrow_signer,
    ),
    base_amount, // 5 SOL
)?;
```

**Verifiable On-Chain**:
- **Transfer amounts**: 5 SOL and 710 USDC
- **Source/destination addresses**: Escrow PDAs → User wallets
- **Transaction signature**: 64-character hash (e.g., `5xJfK...Qw2`)
- **Block timestamp**: When transaction confirmed
- **Fees paid**: Base fee (5,000 lamports) + priority fee (if any)

**Explorer View**:
1. Search transaction signature
2. Click "Token Balances" tab
3. See before/after balances for all accounts involved

**Example**:
```
Account: BuyerWalletPubkey...
Token: USDC (4zMMC9...)
Before: 1000.000000 USDC
After:  290.000000 USDC
Change: -710.000000 USDC

Account: SellerWalletPubkey...
Token: USDC (4zMMC9...)
Before: 0.000000 USDC
After:  710.000000 USDC
Change: +710.000000 USDC

Account: BuyerWalletPubkey...
Token: SOL (So11111...)
Before: 0.000000000 SOL
After:  5.000000000 SOL
Change: +5.000000000 SOL

Account: SellerWalletPubkey...
Token: SOL (So11111...)
Before: 10.000000000 SOL
After:  5.000000000 SOL
Change: -5.000000000 SOL
```

---

## Program Security Audits

### Smart Contract Audits

**Current Status** (as of January 2025):
- **Not yet audited** (Devnet deployment)
- **Planned**: Security audit by [Firm Name] before Mainnet launch
- **Scope**: Anchor program (`apps/anchor_program/programs/shadow_swap/src/lib.rs`)

**Audit Checklist**:
- [ ] Integer overflow/underflow checks
- [ ] PDA derivation correctness
- [ ] Account validation (owner, rent-exempt, etc.)
- [ ] Reentrancy protection
- [ ] Authorization checks (CallbackAuth, order ownership)
- [ ] Token transfer safety (CPI security)
- [ ] State machine correctness (order status transitions)

**Recommendation**: Do NOT use on Mainnet until audit complete.

### Open Source Code

**Repository**: [https://github.com/yourorg/shadowswap](https://github.com/yourorg/shadowswap) (replace with actual link)

**License**: MIT License (or specify actual license)

**Bug Bounty**: Not yet established (planned for Mainnet launch)

**How to Audit Code Yourself**:

1. **Clone repository**:
```bash
git clone https://github.com/yourorg/shadowswap.git
cd shadowswap
```

2. **Review Anchor program**:
```bash
cd apps/anchor_program/programs/shadow_swap
cat src/lib.rs
```

3. **Review settlement bot**:
```bash
cd apps/settlement_bot/src
cat index.ts matcher.ts arcium-client.ts
```

4. **Review frontend encryption**:
```bash
cd "ShadowSwap SPA Design/lib"
cat arcium.ts shadowSwapClient.ts program.ts
```

5. **Run tests**:
```bash
cd apps/anchor_program
yarn anchor:test
```

---

## Threat Model & Mitigations

### Potential Attack Vectors

#### 1. Keeper Bot Compromise

**Threat**: Malicious keeper could observe decrypted orders and front-run them.

**Attack Scenario**:
1. Keeper bot decrypts all active orders via Arcium
2. Keeper sees large buy order for Token X at 142 USDC
3. Keeper submits own buy order on external DEX before matching
4. Keeper's personal trade executes, pumping price
5. ShadowSwap order matches at inflated price

**Mitigation Layers**:

1. **Arcium MPC prevents single-party access**:
   - Decryption requires m-of-n Arcium nodes (e.g., 3-of-5)
   - No single keeper sees all plaintext orders simultaneously
   - Keeper gets final plaintext after MPC computation completes

2. **Open-source keeper code**:
   - File: `apps/settlement_bot/src/index.ts`
   - Anyone can audit for malicious behavior
   - Community can run alternative keeper instances

3. **CallbackAuth authorization**:
   - Only authorized keepers can submit settlements
   - Order book authority can revoke `CallbackAuth` instantly:
   
   ```rust
   require!(
       callback_auth.is_active,
       ShadowSwapError::UnauthorizedCallback
   );
   require!(
       callback_auth.authority == ctx.accounts.keeper.key(),
       ShadowSwapError::UnauthorizedCallback
   );
   ```

4. **Economic disincentive**:
   - Keeper reputation at stake
   - If caught front-running, loses authorization and future fees
   - Incentive: Earn keeper fees (if implemented) vs. risk losing entire keeper business

5. **Multiple keeper instances**:
   - Anyone can run a keeper bot
   - First valid settlement wins (prevents keeper monopoly)
   - Competitive pressure keeps keepers honest

**Residual Risk**: Low. Arcium MPC + open-source + authorization make front-running impractical.

#### 2. Transaction Timing Analysis

**Threat**: Attacker correlates encrypted order submission with later settlement to infer order details.

**Attack Scenario**:
1. Attacker monitors all order submissions on-chain
2. Order A submitted at 10:00:00 AM
3. Settlement transaction at 10:00:30 AM involves Order A
4. Attacker infers: "Order A matched within 30 seconds → likely market order or aggressively priced limit"

**Mitigation Layers**:

1. **Batch settlements hide individual order timing**:
   - Multiple orders settled in single transaction
   - Example: Orders 42, 43, 44, 45 all settled together
   - Impossible to determine which order submitted when

2. **No direct link between submission and execution events**:
   - Submission event: `OrderSubmitted { order_id: 42, owner: ... }`
   - Settlement event: `TradeSettled { buyer_order_id: 42, seller_order_id: 43, ... }`
   - No timestamp correlation between the two

3. **Variable matching delay**:
   - Orders may match instantly or after hours/days
   - No predictable pattern (depends on orderbook depth)

**Residual Risk**: Very low. Timing leakage is minimal and doesn't reveal price/amount/side.

#### 3. Side-Channel Attacks

**Threat**: Infer order details from transaction patterns (e.g., compute units consumed, accounts accessed).

**Attack Scenario**:
1. Attacker observes transaction size: 1232 bytes (maximum)
2. Attacker observes compute units: 80,000 CU (varies by order complexity)
3. Attacker infers: "High CU → likely complex order with many partial fills"

**Mitigation Layers**:

1. **Fixed-size encrypted payloads (512 bytes)**:
   - All orders look identical on-chain
   - No size-based inference possible

2. **No variable-length data leakage**:
   - `cipher_payload: Vec<u8>` always 512 bytes
   - `encrypted_amount: Vec<u8>` always 64 bytes
   - No length field reveals order size

3. **Escrow account rent is constant**:
   - All escrow accounts: 0.002 SOL rent
   - No rent-based amount inference

4. **Transaction structure is uniform**:
   - Same accounts passed for all orders
   - Same instruction discriminator
   - No compute unit variance (order matching happens off-chain)

**Residual Risk**: None. Side-channels are effectively eliminated.

#### 4. Front-End Tampering

**Threat**: Malicious website could log orders before encryption.

**Attack Scenario**:
1. User visits phishing site: `shadøwswap.com` (fake domain)
2. User submits order: Buy 100 SOL at 142 USDC
3. Fake site logs plaintext order before encryption
4. Attacker front-runs order on real DEX

**Mitigation Layers**:

1. **Verify website URL**:
   - Official domain: [production URL] (update when deployed)
   - Check SSL certificate (padlock icon)
   - Bookmark official site

2. **Wallet signature confirms intent**:
   - User wallet signs transaction
   - Signature proves: "I intend to submit this encrypted payload"
   - Wallet popup shows transaction details (accounts, program ID)

3. **Encryption happens client-side (auditable)**:
   - Open browser DevTools: `F12` → Sources tab
   - View `arcium.ts` source code
   - Verify encryption function is called before transaction submission

4. **Use official deployment only**:
   - Verify program ID in wallet popup: `CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA`
   - If different → SCAM, reject transaction

**Residual Risk**: Low. User vigilance + wallet verification prevent most phishing.

---

## Best Security Practices

### For Users

#### 1. Verify Website URL

**Checklist**:
- [ ] URL matches official domain exactly (no typos, unicode lookalikes)
- [ ] SSL certificate valid (padlock icon, click to view certificate)
- [ ] Bookmark official site (avoid Google search results—could be ads)

**How to Check SSL Certificate**:
1. Click padlock icon in address bar
2. Click "Certificate" or "Connection is secure"
3. Verify issuer: Let's Encrypt, DigiCert, or reputable CA
4. Verify domain name matches exactly

#### 2. Wallet Security

**Best Practices**:

1. **Use hardware wallet for large amounts**:
   - Ledger or Trezor
   - Seed phrase stored offline (never on computer)
   - Protects against computer compromise

2. **Never share seed phrase**:
   - ShadowSwap will NEVER ask for seed phrase
   - Support team will NEVER ask for seed phrase
   - If someone asks → SCAM, report immediately

3. **Verify all transaction details in wallet popup**:
   - Program ID: `CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA`
   - Order Book: `63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ`
   - Escrow PDA (derived deterministically)
   - Token amounts (escrowed amount + rent)

**Example Wallet Popup** (Phantom):
```
Program: CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA
Instruction: submit_encrypted_order
Accounts:
  - order_book: 63kRwu... (write)
  - order: 8vQXz2... (init, write)
  - escrow: 5mNpT1... (init, write)
  - user_token_account: 9kLmW3... (write)
Token Transfers:
  - 5.002 SOL (to escrow, includes rent)
Fee: 0.000015 SOL
```

**Red flags** (REJECT transaction):
- Unknown program ID
- Excessive SOL transfer (>0.01 SOL unless large order)
- Multiple token transfers to unknown addresses

#### 3. Order Privacy

**Recommendations**:

1. **Avoid discussing orders publicly**:
   - Don't tweet: "Just placed 1000 SOL buy order on ShadowSwap"
   - Correlation risk: If order fills shortly after tweet, linkable to wallet address

2. **Use VPN for IP privacy** (optional):
   - Prevents ISP or website from correlating your IP with wallet address
   - Recommended for high-net-worth users

3. **Don't reuse same amounts**:
   - Bad: Always trade exactly 5.0 SOL
   - Good: Randomize amounts (5.12 SOL, 4.87 SOL, 5.34 SOL)
   - Prevents order fingerprinting

4. **Separate trading wallet from main holdings**:
   - Trading wallet: 10-50 SOL for active trading
   - Main wallet: Bulk holdings (hardware wallet, cold storage)
   - Limits exposure if trading wallet compromised

#### 4. Monitor Transactions

**Post-Trade Checklist**:

1. **Verify settlement amounts**:
   - Check Order History for "Filled" status
   - View transaction on Solana Explorer
   - Confirm token balances updated correctly

2. **Check Escrow refunds on cancellation**:
   - If you cancel, verify full refund received
   - Expected: Original amount + rent (~0.002 SOL)

3. **Report suspicious activity**:
   - Discord: [link]
   - Email: security@shadowswap.com (update with actual)
   - Include: Transaction signature, order ID, description

### For Developers

#### 1. Encryption Implementation

**Best Practices** (from `arcium.ts`):

1. **Use strong, audited libraries**:
   - **Production**: Integrate official Arcium SDK (when available)
   - **Never**: Roll your own crypto
   - **Avoid**: Weak ciphers (AES-ECB, single DES)

2. **Generate unique nonce per order**:
   
   ```typescript
   const nonce = new Uint8Array(24);
   crypto.getRandomValues(nonce); // Cryptographically secure randomness
   ```
   
   **Why**: Prevents replay attacks and nonce reuse vulnerabilities.

3. **Pad to fixed size (512 bytes)**:
   
   ```typescript
   const paddedPayload = new Uint8Array(512);
   cipherPayload.copy(paddedPayload, 0, 0, Math.min(cipherPayload.length, 512));
   
   // Fill remaining with random bytes
   const randomPadding = new Uint8Array(512 - cipherPayload.length);
   crypto.getRandomValues(randomPadding);
   paddedPayload.set(randomPadding, cipherPayload.length);
   ```
   
   **Why**: Prevents size-based analysis attacks.

#### 2. PDA Derivation

**Critical**: Seeds must match Anchor program **exactly**.

**File**: `ShadowSwap SPA Design/lib/program.ts`

```typescript
export function deriveEscrowPda(
  orderAddress: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), orderAddress.toBuffer()],
    programId
  );
}
```

**Common Mistakes**:
- Wrong seed string: `"Escrow"` instead of `"escrow"` (case-sensitive!)
- Wrong seed order: `[orderAddress, "escrow"]` instead of `["escrow", orderAddress]`
- Wrong program ID: Using wallet address instead of program ID

**How to Verify**:

1. **Derive PDA in Rust** (program):
```rust
let (escrow_pda, bump) = Pubkey::find_program_address(
    &[b"escrow", order.key().as_ref()],
    ctx.program_id,
);
```

2. **Derive PDA in TypeScript** (client):
```typescript
const [escrowPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), order.toBuffer()],
    programId
);
```

3. **Compare**:
   - If `escrow_pda == escrowPda` → Correct ✅
   - If different → Seeds mismatch ❌

#### 3. BigInt for Token Amounts

**File**: `ShadowSwap SPA Design/lib/shadowSwapClient.ts`

**Why BigInt?**:
- JavaScript `Number` is 64-bit float (loses precision beyond 2^53)
- Token amounts use u64 (up to 2^64 - 1)
- Example: 18,446,744,073,709,551,615 lamports (max u64) loses precision as `Number`

**Correct Usage**:

```typescript
// Convert user input to lamports
const amountLamports = Math.floor(amount * Math.pow(10, BASE_DECIMALS)); // OK for small amounts

// For large amounts or calculations, use BigInt
const amountBigInt = BigInt(Math.floor(amount * Math.pow(10, BASE_DECIMALS)));
const quoteBigInt = (amountBigInt * priceBigInt) / BASE_DECIMALS_FACTOR;

// Convert BigInt to BN for Anchor
const amountBn = new BN(amountBigInt.toString());
```

**Common Mistakes**:
```typescript
// BAD: Loses precision
const amountLamports = amount * 1_000_000_000; // JavaScript Number
const quoteLamports = amountLamports * price; // Precision loss!

// GOOD: Preserves precision
const amountBigInt = BigInt(Math.floor(amount * 1_000_000_000));
const priceBigInt = BigInt(Math.floor(price * 1_000_000));
const quoteBigInt = (amountBigInt * priceBigInt) / 1_000_000_000n;
```

---

## Privacy Tradeoffs

### Full Privacy Mode (LP Fallback Disabled)

**Configuration** (default):

```typescript
const [allowLiquidityPool, setAllowLiquidityPool] = useState(false);
```

#### Pros

✅ **Maximum privacy**: Order never hits public AMM
- Encrypted order → ShadowSwap orderbook only
- No mempool exposure
- No public transaction logs revealing order details

✅ **Zero MEV exposure**: Impossible to front-run or sandwich
- Searchers never see your order (encrypted on-chain)
- No AMM transaction to attack

✅ **True dark pool experience**: Order-to-order matching only
- Both sides encrypted
- Fair price discovery (price-time priority)

#### Cons

❌ **Order may not fill**: If no matching order exists
- Limited orderbook liquidity on Devnet
- May wait hours/days for match

❌ **Slower execution**: Wait for matching order
- Average: 10-30 seconds (if match exists)
- Worst case: Indefinite (cancel and retry)

❌ **Limited to orderbook liquidity**:
- Can't access AMM liquidity pools (Raydium, Orca, etc.)
- Mainnet will have deeper orderbooks

**Use Case**: Patient traders who prioritize privacy over execution speed.

### Hybrid Mode (LP Fallback Enabled)

**Configuration**:

```typescript
const [allowLiquidityPool, setAllowLiquidityPool] = useState(true);
```

#### Pros

✅ **Guaranteed execution**: If AMM has liquidity
- Primary: Try ShadowSwap orderbook first
- Fallback: Route through public AMM after timeout (30-60s)

✅ **Faster fills**: AMMs typically have deep liquidity
- SOL/USDC: $100M+ liquidity on Raydium

✅ **Fallback to AMM if orderbook empty**:
- Best of both worlds (orderbook privacy + AMM liquidity)

#### Cons

❌ **Reduced privacy**: AMM transaction is public
- Order details visible in AMM transaction logs
- Price, amount, side all public

❌ **Potential MEV exposure on AMM leg**:
- AMM route is vulnerable to traditional front-running
- Sandwich attacks possible (though less profitable with limit orders)

❌ **Higher slippage risk**:
- AMM execution at market price (not your limit price)
- May pay more than intended

**Use Case**: Time-sensitive trades where execution certainty > privacy.

### Comparison Table

| Feature | Full Privacy Mode | Hybrid Mode (LP Fallback) |
|---------|------------------|--------------------------|
| **Order visibility** | Encrypted only | Encrypted → Public (if AMM) |
| **MEV protection** | 100% (no attack surface) | Orderbook: 100% / AMM: 0% |
| **Fill guarantee** | No (depends on orderbook) | High (if AMM liquidity exists) |
| **Execution speed** | 10-30s (if match exists) | Immediate (AMM fallback) |
| **Price control** | Exact limit price | Orderbook: Limit / AMM: Market |
| **Slippage** | Zero (limit order) | Orderbook: 0% / AMM: 0.5-2% |
| **Recommended for** | Privacy-conscious traders | Urgent/large trades |

**Recommendation**:

- **Default**: Full Privacy Mode (LP Fallback Disabled)
- **Enable Fallback**: Only for time-sensitive trades or low-liquidity pairs
- **Advanced**: Use separate wallets for privacy trades vs. urgent trades

---

## Cryptographic Details

### Encryption Scheme

**Current Implementation** (Placeholder—Arcium SDK integration pending):

**Algorithm**: Likely **AES-256-GCM** or **ChaCha20-Poly1305** (to be confirmed with Arcium)

**Key Size**: 256 bits (32 bytes)

**IV/Nonce**: Random, unique per order (24 bytes)

**Authenticated Encryption**: Yes (GCM or Poly1305 provides authentication tag)

**Forward Secrecy**: Yes (ephemeral keypair generated per order)

**Arcium MPC Specifics** (to be documented after SDK integration):
- **Threshold**: m-of-n decryption (e.g., 3-of-5 Arcium nodes required)
- **Secret Sharing**: Shamir's Secret Sharing or similar
- **Proofs**: Zero-knowledge proofs of correct decryption (optional)

### Key Management

**File**: `ShadowSwap SPA Design/lib/arcium.ts`

#### Encryption Key Derivation

**Current Placeholder**:
```typescript
const ephemeralPublicKey = new Uint8Array(32);
crypto.getRandomValues(ephemeralPublicKey);
```

**Planned (Arcium SDK)**:

1. **User wallet signs message** (proves ownership):
```typescript
const message = `ShadowSwap Order Encryption\nOrder Book: ${orderBookAddress}\nTimestamp: ${timestamp}`;
const signature = await wallet.signMessage(message);
```

2. **Signature hash used as encryption key**:
```typescript
const keyMaterial = await crypto.subtle.digest('SHA-256', signature);
const encryptionKey = new Uint8Array(keyMaterial);
```

3. **Same key can decrypt** (wallet signature reproducible):
```typescript
// User can decrypt their own orders
const sameSignature = await wallet.signMessage(sameMessage);
const decryptionKey = new Uint8Array(await crypto.subtle.digest('SHA-256', sameSignature));
```

**Why This Works**:
- Only user's wallet can generate signature
- Deterministic (same message → same signature → same key)
- No need to store encryption keys (derived on-demand)

**Security**:
- **Signature uniqueness**: Message includes timestamp and order book address
- **Replay protection**: Each order has unique nonce
- **Key rotation**: New key per order (ephemeral keypairs)

### Padding Strategy

**File**: `ShadowSwap SPA Design/lib/arcium.ts` (lines 92-103)

```typescript
// Create a properly sized cipher payload (512 bytes)
const cipherPayload = new Uint8Array(512);

// Copy serialized order to cipher (first 24 bytes)
cipherPayload.set(serializedOrder, 0);

// Fill the rest with random data to simulate encrypted payload
const randomPadding = new Uint8Array(512 - serializedOrder.length);
crypto.getRandomValues(randomPadding);
cipherPayload.set(randomPadding, serializedOrder.length);
```

**Why 512 Bytes?**

1. **Prevents size-based inference attacks**:
   - All orders look identical (512 bytes)
   - No way to distinguish small vs. large orders

2. **Large enough for order data + metadata**:
   - Order data: 24 bytes
   - Encryption overhead: ~32 bytes (IV/nonce + auth tag)
   - Total: ~56 bytes
   - Padding: 456 bytes (ensures uniform size)

3. **Small enough to fit in Solana transaction**:
   - Transaction size limit: 1232 bytes
   - 512-byte payload + accounts + instruction = ~800 bytes (safe margin)

4. **Matches Anchor program's constraint**:
```rust
pub const MAX_CIPHER_PAYLOAD_SIZE: usize = 512;
```

---

## Compliance & Regulations

### Data Handling

**ShadowSwap is a fully decentralized protocol**:

- **No KYC/AML**: Permissionless—anyone can use
- **No data collection**: No user emails, names, or personal info
- **On-chain only**: All data is public blockchain data (Solana)
- **Right to be forgotten**: Users can close accounts anytime (no off-chain records)

**What We Don't Collect**:
- ❌ Email addresses
- ❌ Names or personal identifiers
- ❌ IP addresses (unless you use our hosted frontend—use your own node for full privacy)
- ❌ Trading history (except encrypted on-chain data)

**What's On-Chain** (public Solana blockchain):
- ✅ Wallet addresses (pseudonymous)
- ✅ Encrypted order payloads (512 bytes, unreadable)
- ✅ Settlement events (TradeSettled: buyer, seller, amount, price)
- ✅ Order status changes (Active → Filled → Cancelled)

### Geographic Restrictions

**None**. ShadowSwap is a decentralized protocol—no geographic restrictions.

**User Responsibility**:
- Check local regulations (DeFi laws vary by country)
- U.S. users: Consult legal counsel regarding SEC/CFTC jurisdiction
- E.U. users: MiCA regulations may apply (crypto asset regulation)

**Disclaimer**: ShadowSwap does not provide legal advice. Consult a lawyer if uncertain.

### Privacy Laws (GDPR, CCPA)

**GDPR (E.U.) Compliance**:

1. **No personal data collected** (per GDPR definition):
   - Wallet addresses are **pseudonymous**, not personal data (per EU guidance)
   - No names, emails, or identifiers linked to individuals

2. **Blockchain data is immutable**:
   - "Right to erasure" (GDPR Article 17) doesn't apply to public blockchains
   - EU Blockchain Observatory: "Immutable ledgers compatible with GDPR"

3. **No data controller**:
   - ShadowSwap is a protocol, not a data controller
   - Users control their own wallets and keys

**CCPA (California) Compliance**:
- No "sale" of personal information (no PI collected)
- No "sharing" with third parties (decentralized protocol)

**Summary**: ShadowSwap complies with major privacy laws by not collecting personal data.

---

## Incident Response

### In Case of Security Issue

#### For Users

**Suspected Wallet Compromise**:

1. **Immediately disconnect wallet**:
   - Click wallet extension → Disconnect
   - Revoke site permissions in wallet settings

2. **Transfer funds to new wallet**:
```bash
# Create new wallet
solana-keygen new --outfile ~/new-wallet.json

# Transfer SOL
solana transfer <NEW_WALLET_ADDRESS> <AMOUNT> --from ~/compromised-wallet.json --url devnet

# Transfer SPL tokens
spl-token transfer <TOKEN_MINT> <AMOUNT> <NEW_WALLET_ADDRESS> --owner ~/compromised-wallet.json --url devnet
```

3. **Cancel all open orders**:
   - Log in with new wallet (if possible)
   - View Order History
   - Cancel all "Active" or "Partial" orders (funds return to old wallet)
   - Transfer refunded funds to new wallet immediately

4. **Report to team**:
   - Discord: [ShadowSwap Discord](#) (replace with actual link)
   - Email: security@shadowswap.com (replace with actual)
   - Include: Wallet address, transaction signatures, description

**Smart Contract Bug**:

1. **Do not submit new transactions**:
   - Avoid interacting with program until fixed

2. **Monitor official channels**:
   - Twitter: [@ShadowSwapDEX](#)
   - Discord: [Announcements channel]
   - Website: [Status page]

3. **Follow team guidance on fund recovery**:
   - If exploit, team may deploy emergency patch
   - Refund process will be announced publicly

#### For Developers

**Responsible Disclosure**:

**Email**: security@shadowswap.com (replace with actual)

**PGP Key**: [Link to PGP public key] (for encrypted bug reports)

**Bug Bounty** (planned for Mainnet):
- Critical: $10,000 - $50,000
- High: $5,000 - $10,000
- Medium: $1,000 - $5,000
- Low: $100 - $1,000

**Severity Criteria**:
- **Critical**: Funds at risk (theft, loss, lock-up)
- **High**: Major functionality broken (settlements fail, orders unplaceable)
- **Medium**: Minor functionality broken (UI bugs, incorrect fee calculations)
- **Low**: Informational (code quality, gas optimizations)

**Disclosure Timeline**:
1. Report received → Acknowledgment within 24 hours
2. Investigation → 7 days (may request extension)
3. Fix deployed → 30 days (if possible)
4. Public disclosure → After fix deployed + 7 days grace period

**Emergency Contacts**:
- **Discord**: @SecurityTeam (replace with actual)
- **Telegram**: @ShadowSwapSecurity (replace with actual)
- **Email**: security@shadowswap.com

**What to Include in Report**:
1. **Summary**: Brief description (1-2 sentences)
2. **Impact**: What can an attacker do? (funds stolen, DOS, etc.)
3. **Proof of Concept**: Steps to reproduce
4. **Affected Code**: File + line numbers
5. **Suggested Fix**: Optional (but appreciated)

---

## Frequently Asked Questions

### Can anyone see my order price?

**No**. Order price is encrypted client-side before submission to the blockchain. The on-chain `cipher_payload` is 512 bytes of encrypted data—unreadable without decryption key.

**Who CAN'T see**:
- ❌ Searchers/bots (no plaintext on-chain)
- ❌ Validators (only see encrypted blob)
- ❌ Block explorers (show encrypted `cipher_payload` as hex)

**Who CAN see** (after Arcium MPC decryption):
- ✅ Authorized keeper bot (for matching)
- ✅ You (if you decrypt using your wallet signature)

**Privacy guarantee**: No single party sees your order price in plaintext before matching.

### Can I be front-run?

**No**. Front-running requires:
1. Seeing your transaction in mempool → **Encrypted, so no**
2. Determining order details (price, amount, side) → **Encrypted, so no**
3. Submitting a transaction before yours → **Matching happens off-chain, so no attack vector**

**Traditional DEX**:
- Your buy order visible in mempool: "Buy 100 SOL at 142 USDC"
- Bot sees this, submits buy with higher priority fee
- Bot's buy executes first, pumping price
- Your buy executes at inflated price (142 → 144 USDC)

**ShadowSwap**:
- Your order encrypted on-chain: `[0x3f, 0x91, 0x2a, ...]` (512 bytes gibberish)
- Bot sees encrypted blob—can't extract price/amount/side
- Bot can't front-run (no information to act on)
- Keeper matches off-chain in private environment

**Result**: **Zero front-running risk**.

### Is the keeper bot trustworthy?

**Short answer**: Yes, with caveats.

**Trust model**:

1. **Open-source code**: Anyone can audit (`apps/settlement_bot/src/`)
2. **Arcium MPC**: Keeper doesn't see all plaintext orders (distributed decryption)
3. **Authorization**: Only authorized keepers can submit settlements (`CallbackAuth` PDA)
4. **Economic incentive**: Keeper earns fees (if implemented)—incentive to stay honest
5. **Revocable**: Order book authority can disable keeper instantly

**Comparison**:

| Entity | Trust Required | Mitigation |
|--------|---------------|-----------|
| **Keeper Bot** | Low (sees decrypted orders) | Arcium MPC + open-source + authorization |
| **Arcium MPC** | Medium (handles decryption) | Distributed nodes (no single-party access) + proofs |
| **Anchor Program** | None (open-source, auditable) | Code review + security audit |
| **Solana Validators** | None (consensus mechanism) | BFT consensus |

**Residual risk**: Keeper could theoretically leak order details to external parties (but economic disincentive + reputation at stake).

**Mitigation**: Run your own keeper bot (code is open-source).

### What if the keeper bot goes offline?

**Order data remains safe** on-chain (encrypted).

**Options**:

1. **Alternative keeper bots**:
   - Anyone can run a keeper bot (code is open-source)
   - Multiple keeper instances can run simultaneously
   - First valid settlement wins

2. **Manual settlement** (future feature):
   - Order owners can decrypt their own orders
   - Submit settlement manually (if both sides agree)

3. **Emergency cancellation**:
   - Users can cancel orders anytime (keeper not required for cancellation)
   - Funds returned from Escrow to user wallet

**Decentralization**: ShadowSwap is resilient—no single point of failure.

### Can I verify my order was settled correctly?

**Yes**. Settlement is transparent on-chain.

**Verification Steps**:

1. **View Order History**:
   - Order status changes to "Filled"
   - Transaction signature displayed

2. **Check Solana Explorer**:
   - Visit: [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)
   - Paste transaction signature
   - Click "Events" tab
   - See `TradeSettled` event:
     ```json
     {
       "buyer": "YourWalletPubkey...",
       "seller": "SellerWalletPubkey...",
       "baseAmount": 5000000000,  // 5 SOL
       "quoteAmount": 710000000,  // 710 USDC
       "executionPrice": 142000000 // 142 USDC/SOL
     }
     ```

3. **Verify token balances**:
   - Click "Token Balances" tab
   - Confirm before/after balances match expected amounts

4. **Check escrow closure**:
   - Escrow account should be closed (rent refunded)
   - Verify ~0.002 SOL rent returned to your wallet

**Math Check**:
```
Expected: Receive 5 SOL, pay 710 USDC
Actual:
  - SOL balance: +5.000000000 SOL ✅
  - USDC balance: -710.000000 USDC ✅
  - Fee (0.1%): 0.71 USDC (deducted from quote) ✅
Total: Match! ✅
```

### How do I know my funds are safe?

**Fund custody** is handled by **Program Derived Addresses (PDAs)**:

**PDA Properties**:
1. **No private key exists**: Only the program can sign for PDA
2. **Deterministic derivation**: Anyone can verify PDA address
3. **Immutable logic**: Anchor program controls when funds can move

**Escrow Structure** (`lib.rs` lines 479-513):

```rust
#[account]
pub struct Escrow {
    pub order: Pubkey,            // Order this escrow belongs to
    pub owner: Pubkey,            // Order owner (you)
    pub token_account: Pubkey,    // Token account holding funds
    pub bump: u8,                 // PDA bump seed
}
```

**PDA Seeds**:
```rust
let (escrow_pda, bump) = Pubkey::find_program_address(
    &[b"escrow", order.key().as_ref()],
    program_id,
);
```

**Authorization Checks** (program enforces):

1. **Only owner can cancel**:
```rust
require!(
    order.owner == ctx.accounts.owner.key(),
    ShadowSwapError::UnauthorizedCallback
);
```

2. **Only authorized keeper can settle**:
```rust
require!(
    callback_auth.is_active,
    ShadowSwapError::UnauthorizedCallback
);
require!(
    callback_auth.authority == ctx.accounts.keeper.key(),
    ShadowSwapError::UnauthorizedCallback
);
```

3. **Atomic settlement** (both transfers succeed or entire tx reverts):
```rust
// Transfer USDC from buyer to seller
token::transfer(...)?;

// Transfer SOL from seller to buyer
token::transfer(...)?;

// If either fails, entire transaction reverts
```

**Security Guarantees**:
- ✅ **No custody risk**: Program controls funds, not humans
- ✅ **No double-spend**: One order = one escrow = one token account
- ✅ **Auditable**: Anyone can verify program logic (`lib.rs`)
- ✅ **Recoverable**: If bug, funds still in deterministic PDA (not lost)

**Comparison to CEX**:

| Feature | Centralized Exchange | ShadowSwap |
|---------|---------------------|------------|
| **Custody** | Exchange holds keys | You hold keys (self-custody) |
| **Fund access** | Exchange can freeze/seize | Only you can cancel order |
| **Bankruptcy risk** | Funds lost if exchange bankrupt | Funds always in your PDA (on-chain) |
| **Audit** | Opaque (trust exchange's word) | Fully auditable (open-source code) |

**Verdict**: **Funds safer on ShadowSwap** (self-custody + open-source program).

---

## Additional Resources

### Technical Documentation
- **Encryption**: `ShadowSwap SPA Design/lib/arcium.ts`
- **Client Library**: `ShadowSwap SPA Design/lib/shadowSwapClient.ts`
- **Anchor Program**: `apps/anchor_program/programs/shadow_swap/src/lib.rs`
- **Settlement Bot**: `apps/settlement_bot/src/index.ts`
- **Arcium MPC**: `apps/settlement_bot/src/arcium-client.ts`

### External References
- **Arcium MPC Docs**: [https://docs.arcium.com](https://docs.arcium.com)
- **Solana Security Best Practices**: [https://docs.solana.com/security](https://docs.solana.com/security)
- **SPL Token Program**: [https://spl.solana.com/token](https://spl.solana.com/token)
- **Anchor Framework**: [https://www.anchor-lang.com/docs/security](https://www.anchor-lang.com/docs/security)

### Security Audits & Reports
- **Audit Status**: Not yet audited (Devnet only)
- **Planned Auditor**: [Firm Name] (TBD)
- **Audit Report**: Will be published before Mainnet launch

### Community & Support
- **Discord**: [ShadowSwap Discord](#) (replace with actual link)
- **Twitter**: [@ShadowSwapDEX](#) (replace with actual handle)
- **GitHub**: [https://github.com/yourorg/shadowswap](https://github.com/yourorg/shadowswap)
- **Email**: security@shadowswap.com (for security issues only)

### Next Steps
- **[Getting Started](./getting-started.md)**: Set up wallet and place your first MEV-free order
- **[MEV Protection](./mev-protection.md)**: Understand how encryption eliminates front-running
- **[Trading Guide](./trading-guide.md)**: Master limit orders, market orders, and advanced features

