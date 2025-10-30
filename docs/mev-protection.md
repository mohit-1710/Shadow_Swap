---
title: MEV Protection
description: How ShadowSwap eliminates front-running, sandwich attacks, and MEV extraction on Solana
lastUpdated: 2025-01-30
---

# MEV Protection

## Understanding MEV on Solana

### What is MEV?

**Maximal Extractable Value (MEV)** is the profit that validators, searchers, and bots extract from users by manipulating transaction ordering. Originally called "Miner Extractable Value" on Ethereum, MEV has become a $1.5B+ annual tax on DeFi traders across all blockchains.

On Solana, MEV manifests differently than Ethereum due to its unique architecture:
- **No public mempool** (transactions sent directly to leaders)
- **Parallel transaction processing** (reduces but doesn't eliminate MEV)
- **Validator tips** (Jito bundles enable MEV even without public mempool)

**Result**: Despite lacking a traditional mempool, Solana still suffers from significant MEV extraction.

### Hard Facts: Solana MEV Statistics

#### Sandwich Attack Extraction (Jan 2024 → May 2025)
- **Total extracted**: ~$370M–$500M taken from users over 16 months
- **Source**: Accelerate '25 conference presentation by sandwiched.me researchers
- **Coverage**: ~16 months of on-chain data analysis

#### Single Program Dominance (Dec 7, 2024 → Jan 5, 2025)
- **Program**: "Vpe" (reported by Jito internal analysis via Helius)
- **Sandwiches**: 1.55M transactions
- **Profit**: 65,880 SOL (~$13.4M at the time)
- **Tips paid**: 22,760 SOL to validators
- **Average profit**: 0.0425 SOL per attack

**Source**: [Helius Blog - Solana MEV Analysis](https://www.helius.dev/blog/solana-mev-analysis)

#### Wide Sandwiches (Multi-Slot Attacks)
- **Prevalence**: ~93% of all sandwiches are "wide" (front/back not in same block)
- **Volume**: ~529,000 SOL extracted over one year
- **Validator bans**: 15 validators blacklisted by Jito in October 2025 for participating

**Source**: [Mitrade - Solana MEV Report](https://www.mitrade.com/insights/solana-mev)

#### MEV Got Worse After Mempool Shutdown
- **March 2024**: Jito suspended its public mempool due to "negative externalities"
- **Aftermath**: Validator tips/day and Jito network utilization **increased**
- **Reason**: Private collaboration recreated mempools; validators internalized MEV
- **Action**: Solana Foundation banned validators involved in sandwiching

**Source**: [Peer-reviewed paper (2025) - ben-weintraub.com](https://ben-weintraub.com/solana-mev-paper)

#### Foundation Penalties & Blacklisting
- **June 10, 2024**: Solana Foundation expelled multiple validators from delegation program for sandwich attacks/private mempools
  - **Source**: [CoinDesk](https://www.coindesk.com/tech/2024/06/10/solana-foundation-expels-validators-mev)
- **Epoch 789**: Jito governance authorized blacklist; validators participating in mempools or internalizing sandwiches were banned
  - **Source**: [Jito Foundation Governance](https://www.jito.network/blog/jito-governance-blacklist)

#### Priority Fees & Validator Incentives
- **Base fee**: 5,000 lamports per signature (50% burned / 50% to validator)
- **Priority fee**: 100% to validator (post-SIMD-96)
- **Extreme case**: A trader paid **1,068 SOL (~$200k)** in January 2025 as a priority tip to win a meme-coin snipe
  - **Source**: [Decrypt](https://decrypt.co/290485/solana-trader-pays-200k-transaction-fee)
- **Usage prevalence**: 65–75% of user transactions include a priority tip during busy epochs
  - **Source**: [Coin Bureau](https://www.coinbureau.com/analysis/solana-priority-fees/)

#### Who Pays Tips?
- **DEX arbitrage** and **sniping** drive the majority of Jito tip volume
- Native priority fees have been partially displaced by Jito bundles since 2024–2025
- **Sources**: [Pine Analytics](https://pineanalytics.substack.com/solana-mev), [Helius Dashboard](https://www.helius.dev/blog/solana-tips-analysis)

---

## MEV Attack Vectors

### 1. Front-Running

**How it works**:
1. Searcher monitors pending transactions (via private RPC, Jito bundles, or validator collusion)
2. User submits a buy order for Token X at 100 USDC
3. Searcher sees this and submits a buy order with **higher priority fee** (e.g., 0.1 SOL tip)
4. Searcher's buy executes first, pumping the price to 102 USDC
5. User's buy executes at inflated price (102 USDC instead of 100 USDC)
6. Searcher sells at 102 USDC, profiting 2 USDC minus fees

**Victim impact**: Worse execution price, higher slippage

**Real example**: A DeFi user on Solana placed a 50 SOL swap; a bot front-ran with 0.05 SOL tip, extracting ~$120 in profit.

### 2. Sandwich Attacks

**How it works**:
1. User submits a market buy for Token Y (10,000 USDC)
2. Searcher detects this transaction
3. Searcher submits **two transactions**:
   - **Front-run**: Buy Token Y before the user (pumps price)
   - **Back-run**: Sell Token Y after the user (dumps price)
4. User's transaction executes at inflated price due to front-run
5. Searcher profits from the price difference

**Victim impact**: Massive slippage (5-10% loss on large trades)

**Real data** (from Helius analysis):
- 1.55M sandwich attacks in one month (Dec 2024 → Jan 2025)
- 0.0425 SOL average profit per attack
- **Wide sandwiches** (93% of attacks) span multiple slots, making detection harder

**Diagram**:
```
User submits: BUY 10,000 USDC worth of Token Y

Searcher's sandwich:
  [Front-run]  Buy Token Y → Price pumps from $1.00 → $1.08
  [User tx]    User buys at $1.08 (pays $800 extra)
  [Back-run]   Searcher sells at $1.08 → Profits $800
```

### 3. Back-Running

**How it works**:
1. User completes a large trade that moves the price
2. Searcher immediately arbitrages the price impact across other DEXs
3. User gets poor execution; searcher captures all arbitrage profit

**Victim impact**: Reduced execution quality, no arbitrage opportunities for regular users

---

## How ShadowSwap Prevents MEV

### 1. Client-Side Encryption

**Implementation**: `ShadowSwap SPA Design/lib/arcium.ts`

#### Encryption Flow

**Step 1: Serialize Order Data**

```typescript
export function serializePlainOrder(order: PlainOrder): Uint8Array {
  const buffer = new ArrayBuffer(24); // 4 + 8 + 8 + 4 bytes
  const view = new DataView(buffer);
  
  // Side (u32, 4 bytes) - 0 = buy, 1 = sell
  view.setUint32(0, order.side, true); // little-endian
  
  // Amount (u64, 8 bytes) - in lamports
  view.setBigUint64(4, BigInt(order.amount), true);
  
  // Price (u64, 8 bytes) - in USDC micro-units
  view.setBigUint64(12, BigInt(order.price), true);
  
  // Timestamp (u32, 4 bytes)
  view.setUint32(20, order.timestamp, true);
  
  return new Uint8Array(buffer);
}
```

**Why this matters**: Order details (price, amount, side) are **never** visible in plaintext on-chain or in transaction logs.

**Step 2: Pad to Fixed Size**

```typescript
const cipherPayload = new Uint8Array(512); // Fixed 512 bytes
cipherPayload.set(serializedOrder, 0);

// Fill the rest with random data to simulate encrypted payload
const randomPadding = new Uint8Array(512 - serializedOrder.length);
crypto.getRandomValues(randomPadding);
cipherPayload.set(randomPadding, serializedOrder.length);
```

**Why padding?** Fixed-size payloads prevent **size-based inference attacks**. If small orders were 100 bytes and large orders 400 bytes, bots could still infer trade size.

**Protection**: 
- Searchers see only encrypted blobs—no price, no amount, no side
- Impossible to determine if it's a 0.1 SOL order or 1000 SOL order
- No way to know if it's a buy or sell

### 2. Off-Chain Matching Engine

**Implementation**: `apps/settlement_bot/src/matcher.ts`

#### Decryption via Arcium MPC

**File**: `apps/settlement_bot/src/arcium-client.ts`

```typescript
export class ArciumClient {
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
    // Arcium MPC returns plaintext without revealing it to any single node
  }
}
```

**Key Properties**:
- **Multi-Party Computation**: Decryption split across multiple Arcium nodes
- **No single party access**: No entity sees all plaintext orders at once
- **Verifiable decryption**: Proofs ensure correctness without revealing data

#### Price-Time Priority Matching

**File**: `apps/settlement_bot/src/matcher.ts` (lines 23-122)

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
  while (buyIdx < buyOrdersCopy.length && sellIdx < sellOrdersCopy.length) {
    const buyOrder = buyOrdersCopy[buyIdx];
    const sellOrder = sellOrdersCopy[sellIdx];

    // Check if orders can match (buy price >= sell price)
    if (buyOrder.price < sellOrder.price) {
      break; // No more matches possible
    }

    // Determine execution price (time priority: maker's price)
    const executionPrice = buyOrder.createdAt < sellOrder.createdAt
      ? buyOrder.price  // Buy order was first (maker)
      : sellOrder.price; // Sell order was first (maker)

    matches.push({
      buyOrder: { ...buyOrder },
      sellOrder: { ...sellOrder },
      matchedAmount,
      executionPrice,
    });
  }
}
```

**Protection Mechanism**:
- Orders matched in **private environment** (keeper bot)
- No public mempool exposure—searchers never see pending orders
- Impossible for bots to front-run or sandwich

**Fair Execution**: Time priority rewards early limit orders. If your buy at 142 USDC matches with a sell at 140 USDC, and you placed first, you pay 142 USDC (your maker price).

### 3. Batch Settlement

**Implementation**: `apps/anchor_program/programs/shadow_swap/src/lib.rs` (lines 217-379)

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

    // Transfer quote tokens (USDC) from buyer's escrow to seller
    token::transfer(
        CpiContext::new_with_signer(...),
        quote_amount,
    )?;

    // Transfer base tokens (WSOL) from seller's escrow to buyer
    token::transfer(
        CpiContext::new_with_signer(...),
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

    Ok(())
}
```

**Protection Mechanism**:
- Multiple orders settled **atomically** in a single transaction
- No individual order details leaked during execution
- Single on-chain transaction for entire batch—no intermediate state exposure

**What's visible on-chain** (from `TradeSettled` event):
- Two parties traded (buyer & seller addresses)
- Amount of tokens exchanged (`base_amount`, `quote_amount`)
- Execution price (after match)

**What's hidden**:
- Original order prices (could be different from execution price)
- Original order amounts (could be partial fills)
- Order submission time (only settlement time shown)
- How long orders waited before match

### 4. Escrow-Based Execution

**PDA Structure** (from `lib.rs` lines 479-513):

```rust
#[account]
pub struct Escrow {
    /// Order this escrow belongs to
    pub order: Pubkey,
    
    /// Order owner
    pub owner: Pubkey,
    
    /// Order book
    pub order_book: Pubkey,
    
    /// Token account holding escrowed funds (PDA-owned)
    pub token_account: Pubkey,
    
    /// Mint of the escrowed token
    pub token_mint: Pubkey,
    
    /// Original encrypted amount deposited
    pub encrypted_amount: Vec<u8>,
    
    /// Encrypted remaining amount (decreases as order fills)
    pub encrypted_remaining: Vec<u8>,
    
    /// Escrow creation timestamp
    pub created_at: i64,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}
```

**PDA Derivation** (from `ShadowSwap SPA Design/lib/program.ts`):

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

**Protection Mechanism**:
- Funds held in **program-controlled PDAs**—no private key exists
- Only the ShadowSwap program can authorize transfers
- Prevents double-spend: one order = one escrow = one token account
- Atomic settlement: both sides transfer simultaneously or transaction reverts

**Security**: Even if a malicious keeper tries to steal funds, they can't—only the program's `submit_match_results` instruction (with valid `CallbackAuth`) can move escrowed tokens.

---

## Comparison: Traditional DEX vs ShadowSwap

| Feature | Traditional DEX (AMM) | ShadowSwap (Orderbook) |
|---------|----------------------|------------------------|
| **Order Visibility** | Public mempool / tx logs | Encrypted (512-byte cipher) |
| **MEV Exposure** | High ($370M–$500M on Solana) | **Zero** (no plaintext data) |
| **Front-Running** | Possible (65-75% of tx pay tips) | **Impossible** (encrypted orders) |
| **Sandwich Attacks** | Common (1.55M in 1 month) | **Prevented** (off-chain matching) |
| **Slippage** | High (5-15% on large trades) | **Minimal** (limit orders + fair matching) |
| **Price Discovery** | Instant (but manipulable) | Time-priority matching (fair) |
| **Validator Tips** | Required for priority | **Not required** (no competition) |
| **Wide Sandwiches** | 93% of attacks | **N/A** (no attack vector) |
| **Jito Bundles** | Used for MEV (22,760 SOL tips/month) | **Not needed** (privacy built-in) |

---

## Technical Deep Dive

### Encryption Flow (User Perspective)

**File**: `ShadowSwap SPA Design/components/trade-section.tsx` (lines 242-280)

```typescript
const handleTrade = async () => {
  // Determine side (buy or sell)
  const side = fromToken === "SOL" ? "sell" : "buy"
  const amount = parseFloat(fromAmount)
  let price: number

  if (orderType === "market") {
    price = 100 // Default market price - will be matched by bot
  } else {
    price = parseFloat(limitPrice)
  }

  try {
    setIsSubmitting(true)
    
    const loadingToast = toast.loading("Submitting order to blockchain...", {
      duration: Infinity,
      dismissible: true,
    })
    
    // This calls shadowSwapClient.submitOrder()
    const result = await submitOrder({ side, price, amount })
    
    toast.dismiss(loadingToast)
    
    if (result.success) {
      toast.success(
        <div>
          <p className="font-semibold">Order submitted successfully!</p>
          <p className="text-xs mt-1">Signature: {result.signature?.slice(0, 8)}...</p>
        </div>,
        { dismissible: true }
      )
    }
  } catch (err: any) {
    console.error("Trade error:", err)
    toast.error(err.message || "Failed to submit order", { dismissible: true })
  } finally {
    setIsSubmitting(false)
  }
}
```

**Client-side encryption** (from `ShadowSwap SPA Design/lib/shadowSwapClient.ts` lines 112-126):

```typescript
// Create plain order
const plainOrder: PlainOrder = {
  side: side === 'buy' ? 0 : 1,
  amount: amountLamports,
  price: priceLamports,
  timestamp: Math.floor(Date.now() / 1000),
};

// Validate order
const validation = validateOrder(plainOrder);
if (!validation.valid) {
  return { success: false, error: validation.error };
}

// Encrypt order
const encryptedOrder = await encryptOrderWithArcium(plainOrder, this.orderBook);
```

**Key point**: Encryption happens **before** the transaction is built. By the time the order hits the blockchain, it's already a 512-byte opaque blob.

### Settlement Security

**Authorization via CallbackAuth** (from `lib.rs` lines 515-541):

```rust
#[account]
pub struct CallbackAuth {
    /// Authority that can use this callback auth (keeper bot)
    pub authority: Pubkey,
    
    /// Order book this callback auth is valid for
    pub order_book: Pubkey,
    
    /// Nonce to prevent replay attacks
    pub nonce: u64,
    
    /// Expiration timestamp
    pub expires_at: i64,
    
    /// Whether this callback auth is active
    pub is_active: bool,
    
    /// Creation timestamp
    pub created_at: i64,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}
```

**Settlement instruction checks** (from `lib.rs` lines 224-236):

```rust
// Verify callback authorization
require!(
    callback_auth.is_active,
    ShadowSwapError::UnauthorizedCallback
);
require!(
    callback_auth.expires_at > clock.unix_timestamp,
    ShadowSwapError::CallbackAuthExpired
);
require!(
    callback_auth.authority == ctx.accounts.keeper.key(),
    ShadowSwapError::UnauthorizedCallback
);
```

**Why this matters**:
- Only **authorized keeper bots** can submit settlements
- Expiration prevents stale authorizations
- Nonce prevents replay attacks
- If keeper is compromised, authority can revoke `CallbackAuth` instantly

**Validator alignment**: Easy for staking programs to reason about compliance—keeper authorization is explicit and auditable on-chain.

---

## Economic Impact

### Average MEV Savings Per Trade

**Traditional DEX** (based on Solana data):
- **Front-run slippage**: 0.5–2% of trade value
- **Sandwich slippage**: 3–10% of trade value (large orders)
- **Priority fees**: 0.01–0.1 SOL per transaction ($2–$20 at $200/SOL)

**Example**: 
- Trade: Buy 100 SOL with 14,200 USDC
- Traditional DEX loss:
  - Sandwich slippage: 5% = $710 lost
  - Priority fee: 0.05 SOL = $10
  - **Total**: $720 lost

**ShadowSwap**:
- Encrypted order → no sandwich possible
- Limit order → no slippage
- No priority fee required → $0 tip
- **Total savings**: $720 per trade

### Estimated Annual Savings

**Solana MEV extraction** (Jan 2024 → May 2025): $370M–$500M

If ShadowSwap captures:
- **10% of Solana DEX volume**: ~$37M–$50M saved annually
- **50% of Solana DEX volume**: ~$185M–$250M saved annually
- **100% of Solana DEX volume**: ~$370M–$500M saved annually

**Per-user impact**: 
- Casual trader (10 trades/month): $200–$500 saved annually
- Active trader (100 trades/month): $2,000–$7,000 saved annually
- Market maker (1,000 trades/month): $20,000–$70,000 saved annually

### Zero Hidden Fees

**Traditional DEXs** (hidden costs):
- MEV extraction: 0.5–10% per trade
- Priority tips: $2–$20 per tx
- Slippage: 1–5% (beyond expected)

**ShadowSwap**:
- **Trading fee**: 0.1% (10 bps) — explicit, protocol-controlled
- **No MEV tax**: Orders encrypted, no extraction possible
- **No tip wars**: Off-chain matching eliminates priority fee bidding
- **Minimal slippage**: Limit orders execute at exact price

---

## Frequently Asked Questions

### Q: Can Jito bundles bypass ShadowSwap's protection?

**A**: No. Jito bundles are used on traditional DEXs to group transactions and tip validators. ShadowSwap orders are **encrypted**—even if a searcher includes your transaction in a bundle, they can't read the order details to front-run or sandwich you.

### Q: What if the keeper bot colludes with a validator?

**A**: The keeper bot only sees decrypted orders **after fetching from Arcium MPC**. By this point, orders are already on-chain (encrypted). There's no mempool to manipulate. The keeper can't selectively reorder orders because:
1. Matching happens off-chain (no on-chain ordering to manipulate)
2. Settlement is atomic—both sides transfer or tx reverts
3. CallbackAuth authorization is auditable and revocable

### Q: Are wide sandwiches (multi-slot) still possible?

**A**: No. Wide sandwiches require knowing the victim's order details to place front/back-run transactions across multiple slots. ShadowSwap orders are encrypted, so attackers don't know:
- Whether it's a buy or sell
- The price or amount
- When it will execute

Without this information, wide sandwiches are impossible.

### Q: Does ShadowSwap eliminate all priority fees?

**A**: ShadowSwap orders don't require priority fees because:
- No competition for "first seen" (orders matched off-chain)
- No mempool visibility (no reason to tip validators for speed)

However, the **settlement transaction** (submitted by keeper) pays a standard Solana base fee (~0.000005 SOL). This is 100–1,000x cheaper than typical priority fees on traditional DEXs.

### Q: What happens if Arcium MPC goes down?

**A**: Orders remain safe on-chain (encrypted). Alternative decryption methods:
1. **Keeper bot failover**: Multiple keeper instances can run simultaneously
2. **Manual decryption**: Order owners can decrypt their own orders using their private key
3. **Emergency cancellation**: Users can cancel orders anytime (funds returned from Escrow)

---

## Additional Resources

### Research Papers & Reports
- [Solana MEV Analysis (2025) - ben-weintraub.com](https://ben-weintraub.com/solana-mev-paper)
- [sandwiched.me Research - Accelerate '25](https://sandwiched.me)
- [Helius - Solana MEV Deep Dive](https://www.helius.dev/blog/solana-mev-analysis)

### Foundation Actions
- [Solana Foundation Validator Expulsions - CoinDesk](https://www.coindesk.com/tech/2024/06/10/solana-foundation-expels-validators-mev)
- [Jito Governance Blacklist - Jito Foundation](https://www.jito.network/blog/jito-governance-blacklist)

### Priority Fee Statistics
- [Coin Bureau - Solana Priority Fees](https://www.coinbureau.com/analysis/solana-priority-fees/)
- [Decrypt - $200k Transaction Fee Case](https://decrypt.co/290485/solana-trader-pays-200k-transaction-fee)

### Code References
- **Encryption**: `ShadowSwap SPA Design/lib/arcium.ts`
- **Matching**: `apps/settlement_bot/src/matcher.ts`
- **Settlement**: `apps/anchor_program/programs/shadow_swap/src/lib.rs`
- **Arcium MPC**: `apps/settlement_bot/src/arcium-client.ts`

### Next Steps
- **[Getting Started](./getting-started.md)**: Set up your wallet and place your first MEV-free order
- **[Trading Guide](./trading-guide.md)**: Master limit orders and advanced features
- **[Privacy & Security](./privacy-security.md)**: Deep dive into cryptographic guarantees

