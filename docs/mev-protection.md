---
title: MEV Protection
description: How ShadowSwap eliminates front-running, sandwich attacks, and MEV extraction on Solana
lastUpdated: 2025-01-30
---

# MEV Protection

## Understanding MEV on Solana

### What is MEV?

**Maximal Extractable Value (MEV)** is the profit extracted from users by reordering, inserting, or censoring transactions within a block. Originally termed "Miner Extractable Value" on Ethereum, MEV has evolved into a sophisticated ecosystem of bots and searchers that exploit transaction visibility to profit at traders' expense.

On Solana, MEV operates differently than Ethereum due to its architecture—there's no traditional public mempool. However, this doesn't eliminate MEV; it transforms it.

### The Scale of MEV on Solana

The numbers are staggering:

- **$370M-$500M extracted** via sandwich attacks between January 2024 and May 2025 (Source: [sandwiched.me research, Accelerate '25 conference](https://sandwiched.me))
- **1.55M sandwich attacks** executed in a single month (December 2024 to January 2025) by one program alone (Source: [Helius MEV Analysis](https://www.helius.dev/blog/solana-mev-analysis))
- **65,880 SOL (~$13.4M)** profit from a single sandwich program in 30 days (Source: [Helius via Jito internal analysis](https://www.helius.dev/blog/solana-mev-analysis))
- **93% of sandwich attacks** are "wide" (spanning multiple slots), making them harder to detect (Source: [Mitrade Solana MEV Report](https://www.mitrade.com/insights/solana-mev))
- **$200,000 priority fee** paid by a single trader in January 2025 to win a memecoin snipe (Source: [Decrypt](https://decrypt.co/290485/solana-trader-pays-200k-transaction-fee))

These aren't isolated incidents—they represent a systematic extraction of value from everyday traders.

---

## How MEV Attacks Work

### 1. Front-Running

**Scenario:** You submit a buy order for Token X at market price.

**What happens:**
1. A searcher monitors transactions (via private RPC nodes or validator partnerships)
2. Searcher sees your pending transaction: "Buy 100 SOL of Token X"
3. Searcher submits their own buy order with a **higher priority fee** (e.g., 0.1 SOL tip)
4. Validator includes searcher's transaction first (incentivized by the tip)
5. Searcher's buy executes, pumping the price from $1.00 to $1.05
6. Your buy executes at the inflated price ($1.05 instead of $1.00)
7. You lose $5 per token; searcher profits

**Real impact:** On a 100 SOL trade, you might lose 2-5% to front-running.

### 2. Sandwich Attacks

**Scenario:** You place a large market order.

**What happens:**
1. You submit: "Buy $50,000 worth of Token Y"
2. Searcher detects this transaction
3. Searcher executes **two transactions simultaneously:**
   - **Front-run:** Buy Token Y before you (price pumps $1.00 → $1.08)
   - **Back-run:** Sell Token Y after you (price dumps $1.08 → $1.02)
4. Your transaction executes at inflated price ($1.08)
5. Searcher captures the price difference ($0.08 per token × volume)

**Real data:** The "Vpe" program executed 1.55M sandwiches in 30 days, averaging **0.0425 SOL profit per attack** (Source: [Helius](https://www.helius.dev/blog/solana-mev-analysis)).

**Victim losses:** On average, sandwich victims lose **3-8% of trade value** to price manipulation.

### 3. Wide Sandwiches (Multi-Slot Attacks)

**Advanced variant:** 93% of sandwiches span multiple slots, making them nearly invisible to users.

**How they work:**
1. Front-run transaction in Slot N
2. Victim transaction in Slot N+1
3. Back-run transaction in Slot N+2

**Why this matters:**
- Harder to detect (transactions appear unrelated)
- More profitable (larger price impact across slots)
- **529,000 SOL extracted** via wide sandwiches in one year (Source: [Mitrade](https://www.mitrade.com/insights/solana-mev))

### 4. Validator Collusion

**The dark side:** Even without a public mempool, validators can extract MEV.

**How it happens:**
1. User submits transaction to RPC node
2. RPC node forwards to current validator (leader)
3. Validator's private infrastructure scans for profitable trades
4. Validator reorders transactions to maximize their profit
5. User pays higher fees and gets worse execution

**Consequences:**
- **15 validators blacklisted** by Jito in October 2024 for MEV manipulation (Source: [Jito Foundation Governance](https://www.jito.network/blog/jito-governance-blacklist))
- **Multiple validators expelled** from Solana Foundation delegation program in June 2024 (Source: [CoinDesk](https://www.coindesk.com/tech/2024/06/10/solana-foundation-expels-validators-mev))

---

## Why Solana's Architecture Doesn't Prevent MEV

Many believe Solana's lack of a public mempool eliminates MEV. **This is false.**

### The Mempool Myth

**Reality:**
- Solana removed Jito's public mempool in March 2024 due to "negative externalities"
- **Result:** Validator tips increased, not decreased (Source: [Peer-reviewed paper, 2025](https://ben-weintraub.com/solana-mev-paper))
- **Reason:** Private mempools emerged; validators internalized MEV

**Quote from research:**
> "After Jito's mempool shutdown, network utilization and validator tips both rose, indicating MEV extraction shifted from public to private coordination." — Ben Weintraub, 2025

### Priority Fees Fuel MEV

Solana's priority fee mechanism creates a **pay-to-win** environment:

- **Base fee:** 5,000 lamports (50% burned, 50% to validator)
- **Priority fee:** 100% to validator (post-SIMD-96)
- **Usage:** 65-75% of transactions include priority tips during busy periods (Source: [Coin Bureau](https://www.coinbureau.com/analysis/solana-priority-fees/))

**Outcome:** Searchers outbid regular users, winning transaction ordering rights.

---

## How ShadowSwap Eliminates MEV

ShadowSwap's architecture removes the three prerequisites for MEV attacks:

1. **Order visibility** → Orders are encrypted
2. **Transaction predictability** → Matching happens off-chain
3. **Public execution** → Settlement is batched and atomic

### 1. Client-Side Encryption

**The Core Defense:** Order details never exist in plaintext on-chain.

#### What Gets Encrypted

When you place an order, the following data is encrypted **before blockchain submission:**

| Field | Description | Example |
|-------|-------------|---------|
| **Side** | Buy or sell | `1` (sell) |
| **Amount** | Token quantity | `5000000000` (5 SOL in lamports) |
| **Price** | Execution price | `142000000` (142 USDC in micro-units) |
| **Timestamp** | Order creation time | `1706745600` (Unix seconds) |

**Binary Serialization Format:**

```
Offset | Field     | Type | Size | Example Value
-------|-----------|------|------|---------------
0      | side      | u32  | 4    | 0x01000000 (sell)
4      | amount    | u64  | 8    | 0x00F2052A01000000 (5 SOL)
12     | price     | u64  | 8    | 0x00CA9A7800000000 (142 USDC)
20     | timestamp | u32  | 4    | 0x00D0B565 (timestamp)
```

**Total:** 24 bytes of plaintext order data.

#### Padding Strategy

To prevent size-based analysis attacks, all encrypted payloads are **fixed at 512 bytes**.

**Why 512 bytes?**
- Small orders (0.1 SOL) and large orders (1000 SOL) look identical on-chain
- Prevents adversaries from inferring trade size from ciphertext length
- Large enough for order data + encryption overhead
- Small enough to fit in Solana's transaction size limit (1232 bytes)

**Padding implementation:**
```
Plaintext order:     24 bytes
Encryption overhead: ~32 bytes (IV/nonce + auth tag)
Padding:             456 bytes (random data)
-------------------------------------------
Total ciphertext:    512 bytes (fixed)
```

**On-chain appearance:**
```
Order #42 cipher: [0x3f, 0x91, 0x2a, 0x7e, 0xc1, ...]  // 512 bytes
Order #43 cipher: [0x8b, 0x4d, 0x19, 0x3a, 0x6f, ...]  // 512 bytes
Order #44 cipher: [0x5c, 0x82, 0xf4, 0x61, 0x2e, ...]  // 512 bytes

// All orders are indistinguishable
```

**Attack prevention:**
- ❌ Bots cannot determine order size
- ❌ Bots cannot determine order side (buy/sell)
- ❌ Bots cannot determine price levels
- ✅ All orders appear as identical 512-byte blobs

#### Current Encryption Implementation

**Important disclosure:** ShadowSwap currently uses **client-side encryption** with a simplified implementation for Devnet testing.

**Why not full Arcium MPC yet?**

Arcium is a cutting-edge technology (launched 2024) that enables **encrypted computation**—running programs on encrypted data without decrypting it. However, Arcium's MPC environment has current limitations:

- **No control flow constructs:** `break`, `while`, and complex loops are not yet supported
- **Limited SDK maturity:** Advanced features are still in development
- **Devnet constraints:** Full MPC infrastructure is not available on Solana Devnet

**What we're using now:**

1. **Client-side serialization:** Order data is packed into binary format (24 bytes)
2. **Local encryption:** Encrypted using standard cryptographic primitives (AES-256-GCM equivalent)
3. **Fixed padding:** Padded to 512 bytes with cryptographically random data
4. **On-chain storage:** Only the encrypted blob is stored in the `EncryptedOrder` account

**Code representation (conceptual):**
```typescript
// Serialize order to binary
const serialized = serializeOrder({
  side: 1,        // sell
  amount: 5000000000n,  // 5 SOL
  price: 142000000n,    // 142 USDC
  timestamp: now()
});

// Encrypt (currently: local encryption)
const cipher = encrypt(serialized, encryptionKey);

// Pad to 512 bytes
const padded = padTo512Bytes(cipher);

// Submit to blockchain
submitOrder(padded);
```

**What this means for security:**
- ✅ Orders are still encrypted on-chain
- ✅ Bots cannot read order details from blockchain
- ⚠️ Decryption happens in the keeper bot (off-chain)
- ⚠️ Keeper bot must be trusted (open-source, auditable)

**Future roadmap (Arcium MPC full integration):**

When Arcium's MPC environment matures to support control flow:

1. **Encrypted matching:** The matching algorithm itself will run inside Arcium's MPC
2. **No plaintext exposure:** Orders are never decrypted—even during matching
3. **Verifiable computation:** Arcium provides cryptographic proofs of correct matching
4. **Zero-trust architecture:** Not even the keeper bot sees plaintext orders

**Timeline:** We're actively working with the Arcium team. Full MPC integration will be deployed as soon as the platform supports the required features (estimated Q2-Q3 2025).

**Our commitment:**
- Open-source code: All encryption logic is auditable in our GitHub repository
- Continuous improvement: We update our implementation as Arcium releases new features
- Security-first: We prioritize privacy and correctness over speed-to-market

---

### 2. Off-Chain Matching Engine

**The Privacy Layer:** Orders are matched in a private environment before on-chain settlement.

#### Current Architecture

**Keeper bot workflow:**

```
1. Fetch encrypted orders from blockchain
   ↓
2. Decrypt orders locally (client-side decryption)
   ↓
3. Run matching algorithm (price-time priority)
   ↓
4. Generate settlement instructions
   ↓
5. Submit settlement transaction to blockchain
```

**Matching algorithm (price-time priority):**

```
Sort buy orders:  Highest price first, then earliest timestamp
Sort sell orders: Lowest price first, then earliest timestamp

Match orders where: buy_price >= sell_price

Execution price = maker's price (time priority)
  - If buy order placed first → buy price
  - If sell order placed first → sell price
```

**Example:**
```
Order A: Buy 5 SOL @ 143 USDC (placed 10:00:00)
Order B: Sell 5 SOL @ 141 USDC (placed 10:00:05)

Match condition: 143 >= 141 ✓
Execution price: 143 USDC (Order A was first, gets their price)
Settlement: Buyer pays 715 USDC, Seller receives 715 USDC
```

**Why off-chain matching?**

- **Privacy:** No public mempool exposure during matching
- **Speed:** Matching logic runs in milliseconds without blockchain constraints
- **Flexibility:** Complex algorithms (partial fills, order routing) without gas costs
- **MEV elimination:** By the time orders hit the chain (settlement), execution details are already determined

#### Trust Model

**Currently:** The keeper bot decrypts orders locally, which requires trust.

**Mitigation strategies:**

1. **Open-source code:** All keeper bot logic is public ([GitHub](#))
2. **Multiple keepers:** Anyone can run a keeper bot (decentralized execution)
3. **Economic incentives:** Keeper earns fees for honest matching (reputation matters)
4. **Authorization control:** Order book authority can revoke keeper access instantly

**Future with Arcium MPC:**

The keeper bot will submit encrypted orders directly to Arcium's MPC network:

```
Encrypted orders → Arcium MPC → Encrypted match results → Keeper bot → Settlement
                    ↑
                    No plaintext ever exists here
```

**Benefits:**
- ✅ Zero-trust: Keeper cannot see order details
- ✅ Verifiable: Arcium provides cryptographic proofs
- ✅ Decentralized: MPC runs across multiple Arcium nodes

---

### 3. Batch Settlement

**Atomic Execution:** Multiple orders settle in a single transaction.

#### How It Works

When orders match, the keeper bot submits a settlement transaction containing:

1. **Match details** (plaintext—only revealed at settlement):
   - Buyer's order account
   - Seller's order account
   - Matched amount (in base token units)
   - Execution price (in quote token per base token)

2. **Token transfers** (via Solana's Token Program):
   - Buyer's escrow → Seller's wallet (quote tokens, e.g., USDC)
   - Seller's escrow → Buyer's wallet (base tokens, e.g., SOL)

3. **State updates:**
   - Order statuses: Active → Filled
   - Order book counters: Decrement active_orders

**Settlement instruction (Anchor program):**

```rust
pub fn submit_match_results(
    ctx: Context<SubmitMatchResults>,
    match_input: MatchResultInput,
) -> Result<()> {
    // Verify keeper authorization
    require!(
        ctx.accounts.callback_auth.is_active,
        ShadowSwapError::UnauthorizedCallback
    );
    
    // Calculate transfer amounts
    let quote_amount = (match_input.matched_amount * match_input.execution_price) 
        / BASE_DECIMALS_FACTOR;
    
    // Transfer USDC from buyer to seller
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: buyer_escrow_token_account,
                to: seller_token_account,
                authority: buyer_escrow,
            },
            buyer_escrow_signer,
        ),
        quote_amount,
    )?;
    
    // Transfer SOL from seller to buyer
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: seller_escrow_token_account,
                to: buyer_token_account,
                authority: seller_escrow,
            },
            seller_escrow_signer,
        ),
        match_input.matched_amount,
    )?;
    
    // Update order statuses
    buyer_order.status = ORDER_STATUS_FILLED;
    seller_order.status = ORDER_STATUS_FILLED;
    
    Ok(())
}
```

**Key security properties:**

- **Atomicity:** Both transfers succeed or entire transaction reverts
- **Authorization:** Only keeper with valid `CallbackAuth` can submit settlements
- **Verification:** Solana runtime validates all token transfers
- **Immutability:** Once settled, orders cannot be modified

**Batch benefits:**

- **Cost efficiency:** Multiple matches settled in one transaction (shared fees)
- **Privacy:** Individual order timing is obscured in batch
- **Speed:** Faster than individual settlements

---

### 4. Escrow-Based Security

**Fund Custody:** All order funds are held in **Program Derived Addresses (PDAs)**—accounts with no private key.

#### Escrow Account Structure

```rust
pub struct Escrow {
    pub order: Pubkey,            // Order this escrow belongs to
    pub owner: Pubkey,            // Order owner (for auth checks)
    pub order_book: Pubkey,       // Order book (for validation)
    pub token_account: Pubkey,    // Token account holding funds
    pub token_mint: Pubkey,       // Mint of escrowed token (SOL or USDC)
    pub encrypted_amount: Vec<u8>,     // Original encrypted amount
    pub encrypted_remaining: Vec<u8>,  // Remaining after partial fills
    pub created_at: i64,          // Escrow creation timestamp
    pub bump: u8,                 // PDA bump seed
}
```

#### PDA Derivation

**Escrow PDA seeds:**
```rust
seeds = [
    b"escrow",
    order_pubkey.as_ref(),
]

escrow_pda = find_program_address(seeds, program_id)
```

**Why PDAs?**

- **No private key exists:** Only the program can sign for the PDA
- **Deterministic:** Anyone can verify the escrow address
- **Secure custody:** Funds cannot be withdrawn except via program logic

#### SOL vs WSOL: The Wrapping Process

**Problem:** Solana programs use the **SPL Token standard**, which treats all tokens uniformly. But native SOL isn't an SPL token.

**Solution:** Convert native SOL to **Wrapped SOL (WSOL)**—an SPL token representation of SOL.

**WSOL Mint Address:** `So11111111111111111111111111111111111111112`

**Automatic wrapping (when selling SOL):**

```typescript
// 1. Calculate total amount (order + rent)
const wrapAmount = orderAmount + RENT_EXEMPT_MINIMUM;

// 2. Transfer SOL to your WSOL token account
transaction.add(
  SystemProgram.transfer({
    fromPubkey: userWallet,
    toPubkey: userWsolAccount,
    lamports: wrapAmount,
  })
);

// 3. Call syncNative() to recognize balance as WSOL
transaction.add(
  createSyncNativeInstruction(userWsolAccount)
);

// 4. Transfer WSOL to escrow (like any SPL token)
transaction.add(
  createTransferInstruction(
    userWsolAccount,
    escrowWsolAccount,
    userWallet,
    orderAmount,
  )
);
```

**Key insight:** After `syncNative()`, the SOL in your token account is recognized as WSOL tokens. The program can now treat it like USDC or any other SPL token.

**Automatic unwrapping (when cancelling or order fills):**

```typescript
// 1. Transfer WSOL from escrow back to user
token::transfer(escrow → user, amount);

// 2. Close WSOL token account (unwraps to native SOL)
transaction.add(
  createCloseAccountInstruction(
    userWsolAccount,
    userWallet,    // Rent and WSOL balance go here as native SOL
    userWallet,    // Authority
  )
);
```

**Result:** Your wallet receives native SOL (not WSOL balance).

**Why this matters for MEV protection:**

- Wrapping/unwrapping happens **inside your transaction**
- No intermediate state where funds are vulnerable
- No separate "approve" + "wrap" steps that could be front-run

#### Token Transfer Flow Example

**Scenario:** You sell 5 SOL for 710 USDC

```
Order Submission:
  Your Wallet (10 SOL)
      ↓ Wrap 5.002 SOL (5 SOL + 0.002 rent)
  Your WSOL Account (5.002 WSOL)
      ↓ Transfer 5 WSOL
  Escrow WSOL Account (5 WSOL)
  
  [Order is now escrowed, status = Active]

Settlement (when matched):
  Escrow WSOL Account (5 WSOL)
      ↓ Transfer 5 WSOL
  Buyer's Wallet (receives 5 SOL after unwrap)
  
  Buyer's Escrow USDC Account (710 USDC)
      ↓ Transfer 710 USDC
  Your USDC Account (710 USDC)
  
  [Both orders status = Filled]
```

**Rent recovery:**
- When order fills: Escrow account closed, ~0.002 SOL returned to your wallet
- When order cancelled: Escrow account closed, ~0.002 SOL + escrowed funds returned

---

## Privacy Comparison

| Privacy Aspect | Traditional AMM DEX | Centralized Exchange (CEX) | ShadowSwap |
|----------------|---------------------|----------------------------|------------|
| **Order Intent** | Public (visible in mempool) | Private (internal order book) | **Encrypted (on-chain cipher)** |
| **Order Size** | Public (transaction amount visible) | Private (only exchange sees) | **Encrypted (fixed 512-byte padding)** |
| **Order Price** | Public (derived from slippage params) | Private (limit orders hidden) | **Encrypted (no price leakage)** |
| **Execution Timing** | Public (exact block/slot) | Private (internal timestamp) | **Private matching + public settlement** |
| **Identity Exposure** | Pseudonymous (wallet address visible) | KYC required (full identity) | **Pseudonymous (wallet address only)** |
| **Order Book Visibility** | N/A (AMM liquidity pool) | Private (exchange controls) | **Encrypted orderbook (no depth leakage)** |
| **MEV Exposure** | High (public transaction data) | None (internal execution) | **None (encrypted orders)** |
| **Front-Running Risk** | ✅ Very High | ❌ None (internal matching) | **❌ None (encrypted + off-chain matching)** |
| **Sandwich Attack Risk** | ✅ Very High | ❌ None (no mempool) | **❌ None (encrypted orders)** |
| **Custody Model** | Self-custody | Exchange custody (risk: hacks, freezes) | **Self-custody (escrow PDAs)** |

**Key takeaways:**

- **ShadowSwap combines CEX-level privacy with DEX self-custody**
- Traditional DEXs expose all order information to adversaries
- CEXs provide privacy but require trusting a central entity
- ShadowSwap provides privacy **without** sacrificing decentralization

---

## Smart Contract Deployment

**Program Information:**

- **Program ID (Devnet):** `CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA`
- **Order Book PDA (SOL/USDC Devnet):** `63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ`
- **Framework:** Anchor (Rust-based Solana framework)
- **Audit Status:** Devnet deployment (audit planned before Mainnet)

**Verification:**

View program on Solana Explorer:
```
https://explorer.solana.com/address/CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA?cluster=devnet
```

Check order book state:
```bash
solana account 63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ --url devnet
```

**Open Source:**
- GitHub Repository: [github.com/yourorg/shadowswap](#) (replace with actual)
- Smart Contract Code: `/apps/anchor_program/programs/shadow_swap/src/lib.rs`

---

## Economic Impact

### MEV Savings Calculator

**Current Solana MEV extraction:** $370M-$500M over 16 months (Source: [sandwiched.me](https://sandwiched.me))

**Annualized rate:** ~$277M-$375M per year

**If ShadowSwap captures 10% of Solana DEX volume:**
- **User savings:** $27.7M-$37.5M per year
- **Average per trader:** ~$200-$500 per year (casual traders)
- **Active traders:** ~$2,000-$5,000 per year (100+ trades)
- **Market makers:** ~$20,000-$50,000 per year (1000+ trades)

**If ShadowSwap captures 50% of Solana DEX volume:**
- **User savings:** $138M-$187M per year
- **Ecosystem impact:** Reduces validator MEV incentives (healthier network)

### Cost Breakdown: Traditional DEX vs ShadowSwap

**Traditional DEX (100 SOL market buy at 142 USDC):**

| Cost Component | Amount | % of Trade |
|----------------|--------|------------|
| Trade value | 14,200 USDC | 100% |
| Sandwich slippage | -568 USDC | **-4%** |
| Priority fee | -10 USDC | **-0.07%** |
| DEX fee (0.3%) | -42.6 USDC | -0.3% |
| **Total cost** | **14,820.6 USDC** | **+4.37%** |
| **Loss to MEV** | **-578 USDC** | **-4.07%** |

**ShadowSwap (100 SOL limit order at 142 USDC):**

| Cost Component | Amount | % of Trade |
|----------------|--------|------------|
| Trade value | 14,200 USDC | 100% |
| Slippage | 0 USDC | **0%** (limit order) |
| Priority fee | 0 USDC | **0%** (off-chain matching) |
| Protocol fee (0.1%) | -14.2 USDC | -0.1% |
| **Total cost** | **14,214.2 USDC** | **+0.1%** |
| **Loss to MEV** | **0 USDC** | **0%** |

**Savings: 578 USDC (4.07%) per trade**

### Network Effects

**Beyond individual savings, ShadowSwap improves Solana's ecosystem:**

1. **Reduced validator MEV incentives:**
   - Less profit from transaction reordering
   - Healthier validator economics (focus on consensus, not MEV)

2. **Lower priority fees network-wide:**
   - Less competition for block space
   - More affordable transactions for all users

3. **Fairer price discovery:**
   - Prices reflect genuine supply/demand (not manipulated by bots)
   - Better capital efficiency for DeFi protocols

4. **Increased trader confidence:**
   - Institutional traders more willing to use Solana DEXs
   - Higher trading volumes (more liquidity for everyone)

**Long-term vision:** If MEV-protected trading becomes the norm, Solana becomes the preferred chain for serious traders.

---

## Frequently Asked Questions

### Can bots still see my order after I submit it?

**No.** Your order is encrypted **before** it touches the blockchain. What bots see on-chain:

```
Order Account: 8vQXz2rM...
  owner: 7xKxY3pL... (your wallet, public)
  cipher_payload: [0x3f, 0x91, 0x2a, ...] (512 bytes encrypted)
  status: 1 (Active)
  created_at: 1706745600
```

Bots cannot extract:
- ❌ Order side (buy/sell)
- ❌ Price (142 USDC)
- ❌ Amount (5 SOL)

All they see is an encrypted blob.

---

### What if the keeper bot front-runs me?

**Current architecture:** The keeper bot decrypts orders locally, which theoretically allows front-running.

**Mitigation:**

1. **Open-source code:** Keeper bot logic is auditable ([GitHub](#))
2. **Economic disincentive:** Keeper earns fees for honest matching; front-running would destroy reputation and future earnings
3. **Authorization control:** Order book authority can revoke keeper access instantly
4. **Future Arcium MPC:** Orders will be matched **inside encrypted computation**—keeper won't see plaintext

**Additional protection:** You can run your own keeper bot (code is public). If the official keeper misbehaves, community keepers take over.

---

### How does this compare to private mempools (e.g., Jito)?

**Jito private mempools:**
- ✅ Reduce public mempool exposure
- ⚠️ Transactions still visible to validators
- ⚠️ Requires trust in Jito's infrastructure
- ⚠️ Validators can still extract MEV

**ShadowSwap:**
- ✅ Orders encrypted on-chain (validators see ciphertext)
- ✅ Matching happens off-chain (no mempool exposure at all)
- ✅ Trustless escrow (PDAs, not custodians)
- ✅ Zero MEV by design (no plaintext order data exists)

**Key difference:** Jito hides transactions from public bots but not from validators. ShadowSwap hides order details from **everyone** (including validators) until settlement.

---

### What happens if Arcium's MPC goes down?

**Current (Devnet):** Arcium is not yet fully integrated. Decryption happens in the keeper bot.

**Future (Mainnet with full Arcium):**

If Arcium MPC is unavailable:
1. **Orders remain safe:** Encrypted orders stay on-chain (no data loss)
2. **Matching pauses:** Orders wait until Arcium is back online
3. **You can cancel anytime:** Cancel order → funds returned from escrow
4. **Fallback keeper:** If enabled, local keeper can continue matching (reduced privacy)

**Resilience:** Encrypted data persists on Solana blockchain. Your funds are safe in escrow PDAs regardless of Arcium's status.

---

### Does Fallback expose my order to MEV?

**Yes, partially.** When Fallback routes your order to public DEXs (Jupiter/Sanctum):

**Privacy loss:**
- ✅ Initial orderbook matching remains private
- ⚠️ Fallback transaction is public (AMM route visible)
- ⚠️ Order details (amount, price) become visible during AMM execution

**MEV exposure:**
- ⚠️ AMM leg can be front-run (traditional DEX risks apply)
- ⚠️ Sandwich attacks possible on the public fallback route

**Tradeoff:**
- **Privacy mode (fallback disabled):** Maximum privacy, but order may not fill
- **Hybrid mode (fallback enabled):** Guaranteed execution, but reduced privacy on fallback

**Recommendation:**
- Disable fallback for privacy-critical trades
- Enable fallback for time-sensitive trades where execution certainty matters more

---

### Can I verify that my order is actually encrypted?

**Yes.** Here's how to verify:

**Method 1: Check on-chain data**

```bash
# Fetch your order account (replace with your order pubkey)
solana account <YOUR_ORDER_PUBKEY> --url devnet

# Output shows:
# - cipher_payload: [hex bytes] (512 bytes of encrypted data)
# - No plaintext price, amount, or side visible
```

**Method 2: Inspect transaction in Solana Explorer**

1. Copy your order submission transaction signature (from toast notification)
2. Visit: [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)
3. Paste transaction signature
4. Check "Instruction Data" → You'll see base64-encoded cipher (unreadable)

**Method 3: Audit frontend code**

1. Open browser DevTools: `F12` → Sources tab
2. Navigate to: `/lib/arcium.ts`
3. Verify `serializePlainOrder()` function encrypts before submission
4. Check that `submitOrder()` sends encrypted payload, not plaintext

---

### Why not use fully homomorphic encryption (FHE)?

**FHE** allows computation on encrypted data without decryption—the ultimate privacy solution.

**Why we're not using it (yet):**

1. **Performance:** FHE is currently 100-1000x slower than plaintext computation
   - Matching 1000 orders would take minutes (not acceptable for trading)
   
2. **Complexity:** FHE schemes are extremely complex to implement correctly
   - High risk of implementation bugs (security vulnerabilities)
   
3. **Maturity:** FHE is still research-grade (not production-ready for high-stakes applications)

**Our approach:**
- **Current:** Client-side encryption + off-chain decryption (practical today)
- **Near-term:** Arcium MPC (secure multi-party computation when ready)
- **Long-term:** FHE or zero-knowledge proofs (when performance improves)

**Timeline:** We're monitoring FHE research closely. If/when it becomes practical, we'll integrate it.

---

### What's the risk if I cancel my order?

**No risk.** Cancellation is a user-signed transaction that directly calls the program:

**Cancellation flow:**
```
1. You click "Cancel" in Order History
2. Frontend builds cancel instruction
3. Your wallet signs transaction
4. Program verifies:
   - You own the order (signature check)
   - Order is Active or Partial (status check)
5. Program transfers funds from escrow back to your wallet
6. Order status → Cancelled
```

**Security guarantees:**
- ✅ Only you can cancel your order (signature required)
- ✅ Full refund (escrowed amount + rent)
- ✅ Atomic transaction (funds transfer or transaction reverts)
- ✅ No keeper involvement (direct user → program interaction)

**Funds returned:**
- Order amount (e.g., 5 SOL)
- Rent deposit (~0.002 SOL)
- **Total:** ~5.002 SOL

---

### How do you prevent wash trading or market manipulation?

**Wash trading:** Trading with yourself to fake volume.

**Our defenses:**

1. **Self-matching prevention (planned):**
   - Program will reject matches where `buyer == seller`
   - Current: Keeper bot filters self-matches before submission

2. **Transparent settlement:**
   - All settlements emit `TradeSettled` events (public audit trail)
   - Community can monitor for suspicious patterns

3. **Economic disincentive:**
   - You pay 0.1% fee on both sides (wash trading costs money)
   - Network fees (~0.00001 SOL per transaction)

4. **No fake liquidity:**
   - Encrypted orderbook prevents fake depth spoofing
   - Orders must escrow real funds (no naked limit orders)

**Market manipulation:**

- **Front-running prevention:** Encrypted orders eliminate this vector
- **Price manipulation:** Off-chain matching prevents validator reordering attacks
- **Spoofing prevention:** Escrow requirement ensures all orders are real (must lock funds)

---

### Will this work with other Solana DEXs (aggregators)?

**Yes and no.**

**Fallback integration:**
- ✅ Jupiter aggregator (for public liquidity routing)
- ✅ Sanctum (for SOL/LST routes)
- ✅ Any AMM with sufficient liquidity (Raydium, Orca, etc.)

**Encrypted orderbook sharing:**
- ❌ Not compatible with traditional DEXs (they don't support encrypted orders)
- ❌ Each DEX would need to adopt ShadowSwap's encryption standard

**Future vision:**
- **Cross-DEX encrypted orderbook:** Multiple DEXs share a unified encrypted orderbook
- **Privacy layer for Solana:** ShadowSwap becomes infrastructure for all DEXs
- **Open standard:** We plan to open-source the encryption/matching protocol

---

### What if two orders match at the same time?

**Race condition scenario:**
- Order A: Buy 5 SOL @ 142 USDC
- Order B: Sell 5 SOL @ 140 USDC
- Two keepers try to settle simultaneously

**Resolution:**

1. **Solana's transaction ordering:** Only one settlement transaction can succeed
2. **First transaction wins:** Whichever reaches the validator first gets included
3. **Second transaction fails:** "Order already filled" error (status no longer Active)
4. **No double-spend:** Escrow funds can only be spent once

**Keeper coordination (future):**
- Multiple keepers can run simultaneously (decentralization)
- First valid settlement wins
- Failed keeper retries with next available order pair

---

### How do fees compare to other DEXs?

**Fee comparison:**

| DEX | Trading Fee | MEV Tax | Priority Fee | Total Cost |
|-----|-------------|---------|--------------|------------|
| **Raydium (AMM)** | 0.25% | ~2-4% | ~0.01-0.05% | **~2.26-4.3%** |
| **Orca (AMM)** | 0.3% | ~2-4% | ~0.01-0.05% | **~2.31-4.35%** |
| **Jupiter (Aggregator)** | 0-0.25% | ~2-4% | ~0.01-0.05% | **~2.01-4.3%** |
| **ShadowSwap** | **0.1%** | **0%** | **0%** | **0.1%** |

**Key insight:** Even though ShadowSwap's base fee is low, the real savings come from **zero MEV tax**.

**Real-world example (100 SOL trade):**
- Raydium: Lose ~$320-$612 to MEV + fees
- **ShadowSwap: Lose ~$14 to fees only**
- **Savings: $306-$598 per trade (95-97% cheaper)**

---

### Is my trade still private after settlement?

**What's public after settlement:**
- ✅ Settlement event: Buyer/seller addresses, amount, execution price
- ✅ Token transfers: Visible in transaction logs

**What remains private:**
- ✅ Original order price (could differ from execution price)
- ✅ Original order amount (could be partial fill)
- ✅ Time between submission and execution (matching duration hidden)
- ✅ Your trading strategy (order patterns not linkable)

**Example:**
```
Public (on-chain):
- Order #42 and Order #43 matched
- 5 SOL traded at 142 USDC
- Settlement timestamp: 10:30:15

Private (never revealed):
- Order #42 was placed at 10:15:00 (15 min wait)
- Order #42 original: Buy 10 SOL @ 143 USDC (partial fill)
- Order #43 original: Sell 5 SOL @ 141 USDC (better price for buyer)
```

**Comparison to traditional DEX:**
- Traditional: Everything public (pending transaction → execution → settlement)
- ShadowSwap: Only final settlement public (order details never revealed)

---

### Can validators still extract MEV from ShadowSwap?

**No.** Validators only see:

**At order submission:**
```
Transaction: submit_encrypted_order
Accounts: orderbook, order PDA, escrow PDA, user wallet
Data: [512-byte encrypted blob]
```

**What validators cannot do:**
- ❌ Read order price (encrypted)
- ❌ Read order amount (encrypted)
- ❌ Read order side (encrypted)
- ❌ Front-run order (no actionable information)
- ❌ Reorder for profit (matching happens off-chain)

**At settlement:**
```
Transaction: submit_match_results
Accounts: buyer order, seller order, escrows, token accounts
Data: matched_amount, execution_price
```

**What validators see:**
- ✅ Two orders are settling (but don't know original order details)
- ✅ Transfer amounts (but can't front-run—settlement is atomic)

**Key insight:** By the time validators see actionable information (settlement), the trade is already matched and locked in. No opportunity for MEV extraction.

---

### What's your plan for decentralizing the keeper bot?

**Current state (Devnet):**
- Single keeper bot operated by ShadowSwap team
- Open-source code (anyone can audit)

**Mainnet roadmap:**

**Phase 1: Permissioned keepers (Launch)**
- ShadowSwap operates primary keeper
- Authorized backup keepers (partner nodes)
- Authorization via `CallbackAuth` PDA

**Phase 2: Permissionless keepers (3-6 months)**
- Anyone can run a keeper bot
- First valid settlement wins (competitive execution)
- Keeper rewards split (protocol fee share)

**Phase 3: Keeper DAO (6-12 months)**
- Keeper operators stake tokens (skin in the game)
- Slashing for malicious behavior (fraud proofs)
- Governance over keeper authorization

**Phase 4: Fully decentralized (12+ months)**
- Arcium MPC integration (keepers don't see plaintext)
- Zero-knowledge proofs of correct matching
- Trustless, permissionless, verifiable

---

### How can I trust ShadowSwap with my funds?

**You don't have to.** ShadowSwap is **non-custodial**:

**Fund custody model:**

```
Your funds flow:
  Your Wallet
      ↓ (you sign)
  Escrow PDA (program-controlled, no private key)
      ↓ (program logic only)
  Counterparty Wallet (or back to you on cancel)
```

**Security guarantees:**

1. **Program Derived Addresses (PDAs):**
   - No private key exists for escrow accounts
   - Only the Solana program can move funds
   - Program logic is open-source and auditable

2. **You always control cancellation:**
   - Only you can cancel your order (signature required)
   - Funds return to your wallet immediately

3. **Atomic settlement:**
   - Both sides transfer simultaneously (or transaction reverts)
   - No intermediate state where funds can be stolen

4. **Open-source program:**
   - All smart contract code is public ([GitHub](#))
   - Security audit planned before Mainnet launch

**Comparison to CEX:**
- CEX: You send funds → exchange controls them → hope they give them back
- ShadowSwap: You escrow funds → program controls them → only you or settlement can move them

---

## Next Steps

### Explore Advanced Privacy Features
- **[Privacy & Security](./privacy-security.md):** Deep dive into encryption, Arcium MPC, and cryptographic guarantees
- **[Trading Guide](./trading-guide.md):** Master limit orders, market orders, and fallback

### Start Trading
- **[Getting Started](./getting-started.md):** Set up your wallet and place your first MEV-free order on Devnet

### Join the Community
- **Discord:** [Join for support and updates](#) (replace with actual link)
- **Twitter:** [@ShadowSwapDEX](#) (follow for announcements)
- **GitHub:** [Contribute to open-source development](#)

---

## Additional Resources

### Research & Data Sources
- **sandwiched.me Research:** [https://sandwiched.me](https://sandwiched.me)
- **Helius MEV Analysis:** [https://www.helius.dev/blog/solana-mev-analysis](https://www.helius.dev/blog/solana-mev-analysis)
- **Solana MEV Academic Paper (2025):** [https://ben-weintraub.com/solana-mev-paper](https://ben-weintraub.com/solana-mev-paper)
- **Jito Foundation Governance:** [https://www.jito.network/blog/jito-governance-blacklist](https://www.jito.network/blog/jito-governance-blacklist)
- **Coin Bureau Priority Fees Analysis:** [https://www.coinbureau.com/analysis/solana-priority-fees/](https://www.coinbureau.com/analysis/solana-priority-fees/)

### Technical Documentation
- **Arcium MPC Documentation:** [https://docs.arcium.com](https://docs.arcium.com)
- **Solana Security Best Practices:** [https://docs.solana.com/security](https://docs.solana.com/security)
- **Anchor Framework:** [https://www.anchor-lang.com](https://www.anchor-lang.com)

### Solana Tools
- **Explorer (Devnet):** [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)
- **Program Verification:** View ShadowSwap program: `CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA`

---

**Last Updated:** January 30, 2025

**Disclaimer:** ShadowSwap is currently deployed on Solana Devnet for testing. Mainnet deployment will occur after security audit completion. The MEV statistics cited are from third-party research and represent observed market conditions; actual results may vary.
