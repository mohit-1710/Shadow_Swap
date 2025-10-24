# Submit Match Results Instruction

## Overview

The `submit_match_results` instruction is the settlement mechanism for the ShadowSwap hybrid approach. It allows an authorized keeper bot to submit matched order details and execute the actual token transfers to settle trades.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HYBRID APPROACH                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Orders Placed (Encrypted)                              │
│     ↓                                                       │
│  2. Keeper Fetches Orders                                  │
│     ↓                                                       │
│  3. Off-Chain Matching (Privacy-Preserving)                │
│     ↓                                                       │
│  4. submit_match_results (This Instruction)                │
│     ↓                                                       │
│  5. On-Chain Settlement                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Instruction Signature

```rust
pub fn submit_match_results(
    ctx: Context<SubmitMatchResults>,
    match_input: MatchResultInput,
) -> Result<()>
```

## Input Structure

### MatchResultInput

```rust
pub struct MatchResultInput {
    /// Buyer's order account pubkey
    pub buyer_pubkey: Pubkey,
    
    /// Seller's order account pubkey
    pub seller_pubkey: Pubkey,
    
    /// Matched amount in base token units (e.g., lamports for WSOL)
    pub matched_amount: u64,
    
    /// Execution price: quote tokens per base token
    /// (adjusted for decimals, e.g., USDC micro-units per WSOL lamport)
    pub execution_price: u64,
}
```

**Example:**
- `matched_amount`: 1000000000 (1 SOL in lamports)
- `execution_price`: 100000000 (100 USDC, assuming 6 decimals)
- `quote_amount` = 1000000000 * 100000000 / 1000000000 = 100000000 (100 USDC)

## Account Context

### SubmitMatchResults Accounts

| Account | Type | Mut | Seeds | Description |
|---------|------|-----|-------|-------------|
| `callback_auth` | `Account<CallbackAuth>` | ❌ | `["callback_auth", order_book, keeper]` | Authorization verification |
| `order_book` | `Account<OrderBook>` | ✅ | - | Order book to update |
| `buyer_order` | `Account<EncryptedOrder>` | ✅ | - | Buyer's order to mark as filled |
| `seller_order` | `Account<EncryptedOrder>` | ✅ | - | Seller's order to mark as filled |
| `buyer_escrow` | `Account<Escrow>` | ✅ | `["escrow", buyer_order]` | Buyer's escrow (USDC) |
| `seller_escrow` | `Account<Escrow>` | ✅ | `["escrow", seller_order]` | Seller's escrow (WSOL) |
| `buyer_escrow_token_account` | `Account<TokenAccount>` | ✅ | - | Buyer's escrow token account |
| `seller_escrow_token_account` | `Account<TokenAccount>` | ✅ | - | Seller's escrow token account |
| `buyer_token_account` | `Account<TokenAccount>` | ✅ | - | Buyer's wallet (receives WSOL) |
| `seller_token_account` | `Account<TokenAccount>` | ✅ | - | Seller's wallet (receives USDC) |
| `keeper` | `Signer` | ❌ | - | Authorized keeper bot |
| `token_program` | `Program<Token>` | ❌ | - | SPL Token program |

## Execution Flow

### 1. Authorization Check
```rust
// Verify keeper is authorized via callback_auth PDA
require!(callback_auth.is_active, ShadowSwapError::UnauthorizedCallback);
require!(callback_auth.expires_at > clock.unix_timestamp, ShadowSwapError::CallbackAuthExpired);
require!(callback_auth.authority == keeper.key(), ShadowSwapError::UnauthorizedCallback);
```

### 2. Order Status Verification
```rust
// Verify both orders are active or partially filled
require!(
    buyer_order.status == ORDER_STATUS_ACTIVE || buyer_order.status == ORDER_STATUS_PARTIAL,
    ShadowSwapError::InvalidOrderStatus
);
require!(
    seller_order.status == ORDER_STATUS_ACTIVE || seller_order.status == ORDER_STATUS_PARTIAL,
    ShadowSwapError::InvalidOrderStatus
);
```

### 3. Amount Calculation
```rust
// Calculate quote amount to transfer
let quote_amount = matched_amount
    .checked_mul(execution_price)
    .ok_or(ShadowSwapError::NumericalOverflow)?;
```

### 4. Token Transfers

**Transfer 1: USDC from Buyer to Seller**
```rust
// Buyer's escrow PDA signs the transfer
let buyer_escrow_seeds = &[
    ESCROW_SEED,
    buyer_order_key.as_ref(),
    &[buyer_escrow.bump],
];

token::transfer(
    CpiContext::new_with_signer(
        token_program,
        Transfer {
            from: buyer_escrow_token_account,
            to: seller_token_account,
            authority: buyer_escrow (PDA),
        },
        buyer_escrow_signer,
    ),
    quote_amount,
)?;
```

**Transfer 2: WSOL from Seller to Buyer**
```rust
// Seller's escrow PDA signs the transfer
let seller_escrow_seeds = &[
    ESCROW_SEED,
    seller_order_key.as_ref(),
    &[seller_escrow.bump],
];

token::transfer(
    CpiContext::new_with_signer(
        token_program,
        Transfer {
            from: seller_escrow_token_account,
            to: buyer_token_account,
            authority: seller_escrow (PDA),
        },
        seller_escrow_signer,
    ),
    matched_amount,
)?;
```

### 5. Update State
```rust
// Mark orders as filled
buyer_order.status = ORDER_STATUS_FILLED;
seller_order.status = ORDER_STATUS_FILLED;

// Update order book
order_book.active_orders -= 2;
order_book.last_trade_at = clock.unix_timestamp;
```

### 6. Emit Event
```rust
emit!(TradeSettled {
    order_book: order_book.key(),
    buyer: match_input.buyer_pubkey,
    seller: match_input.seller_pubkey,
    buyer_order_id: buyer_order.order_id,
    seller_order_id: seller_order.order_id,
    base_amount: matched_amount,
    quote_amount,
    execution_price,
    timestamp: clock.unix_timestamp,
});
```

## Usage Example

### TypeScript Client

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ShadowSwap } from "../target/types/shadow_swap";

async function submitMatchResults(
  program: Program<ShadowSwap>,
  keeper: anchor.web3.Keypair,
  orderBook: anchor.web3.PublicKey,
  buyerOrder: anchor.web3.PublicKey,
  sellerOrder: anchor.web3.PublicKey,
  matchedAmount: anchor.BN,
  executionPrice: anchor.BN
) {
  // Derive callback_auth PDA
  const [callbackAuth] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("callback_auth"),
      orderBook.toBuffer(),
      keeper.publicKey.toBuffer(),
    ],
    program.programId
  );

  // Derive escrow PDAs
  const [buyerEscrow] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), buyerOrder.toBuffer()],
    program.programId
  );

  const [sellerEscrow] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), sellerOrder.toBuffer()],
    program.programId
  );

  // Create match input
  const matchInput = {
    buyerPubkey: buyerOrder,
    sellerPubkey: sellerOrder,
    matchedAmount,
    executionPrice,
  };

  // Submit match results
  const tx = await program.methods
    .submitMatchResults(matchInput)
    .accountsStrict({
      callbackAuth,
      orderBook,
      buyerOrder,
      sellerOrder,
      buyerEscrow,
      sellerEscrow,
      buyerEscrowTokenAccount, // Fetch from buyer_escrow.token_account
      sellerEscrowTokenAccount, // Fetch from seller_escrow.token_account
      buyerTokenAccount, // Buyer's ATA for base token
      sellerTokenAccount, // Seller's ATA for quote token
      keeper: keeper.publicKey,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    })
    .signers([keeper])
    .rpc();

  console.log("Trade settled:", tx);
  return tx;
}
```

## Security Considerations

### 1. Authorization
- ✅ Keeper must be authorized via `callback_auth` PDA
- ✅ `callback_auth` must be active and not expired
- ✅ Keeper's signature required on transaction

### 2. Order Validation
- ✅ Both orders must belong to the same order book
- ✅ Orders must be in valid state (ACTIVE or PARTIAL)
- ✅ Escrow accounts must match orders

### 3. Token Safety
- ✅ Token accounts validated against order book mints
- ✅ Escrow PDAs own the escrowed tokens
- ✅ PDA signers prevent unauthorized transfers
- ✅ Checked arithmetic prevents overflows

### 4. Atomicity
- ✅ Both transfers or neither (transaction atomicity)
- ✅ State updates only after successful transfers
- ✅ Event emission confirms successful settlement

## Event

### TradeSettled Event

```rust
#[event]
pub struct TradeSettled {
    pub order_book: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub buyer_order_id: u64,
    pub seller_order_id: u64,
    pub base_amount: u64,
    pub quote_amount: u64,
    pub execution_price: u64,
    pub timestamp: i64,
}
```

**Listening to Events:**

```typescript
const listener = program.addEventListener("TradeSettled", (event, slot) => {
  console.log("Trade settled:", {
    buyer: event.buyer.toString(),
    seller: event.seller.toString(),
    baseAmount: event.baseAmount.toString(),
    quoteAmount: event.quoteAmount.toString(),
    price: event.executionPrice.toString(),
  });
});
```

## Error Handling

| Error | Code | Description |
|-------|------|-------------|
| `UnauthorizedCallback` | - | Keeper not authorized or callback_auth invalid |
| `CallbackAuthExpired` | - | Authorization token has expired |
| `InvalidOrderStatus` | - | Order not in valid state for settlement |
| `InvalidEscrow` | - | Escrow account mismatch |
| `InvalidTokenMint` | - | Token account mint doesn't match expected |
| `NumericalOverflow` | - | Amount calculation overflow |
| `InvalidOrderBook` | - | Order doesn't belong to specified order book |

## Testing

### Test Scenario: Successful Settlement

```typescript
it("should settle a matched trade", async () => {
  // 1. Create orders
  const buyOrderId = await placeBuyOrder(program, buyer, orderBook, 1_000_000_000, 100_000_000);
  const sellOrderId = await placeSellOrder(program, seller, orderBook, 1_000_000_000, 100_000_000);

  // 2. Keeper matches off-chain
  const matchInput = {
    buyerPubkey: buyOrderPda,
    sellerPubkey: sellOrderPda,
    matchedAmount: new anchor.BN(1_000_000_000), // 1 SOL
    executionPrice: new anchor.BN(100_000_000), // 100 USDC
  };

  // 3. Submit match results
  await program.methods
    .submitMatchResults(matchInput)
    .accountsStrict({
      // ... all accounts
    })
    .signers([keeper])
    .rpc();

  // 4. Verify settlement
  const buyerOrderAccount = await program.account.encryptedOrder.fetch(buyOrderPda);
  const sellerOrderAccount = await program.account.encryptedOrder.fetch(sellOrderPda);
  
  assert.equal(buyerOrderAccount.status, ORDER_STATUS_FILLED);
  assert.equal(sellerOrderAccount.status, ORDER_STATUS_FILLED);
});
```

## Integration with Keeper Bot

```typescript
// keeper-bot.ts
async function runMatchingLoop() {
  while (true) {
    // 1. Fetch active orders
    const orders = await fetchActiveOrders(program, orderBook);

    // 2. Match orders off-chain
    const matches = await matchOrdersOffChain(orders);

    // 3. Submit each match
    for (const match of matches) {
      try {
        await submitMatchResults(
          program,
          keeper,
          orderBook,
          match.buyerOrder,
          match.sellerOrder,
          match.amount,
          match.price
        );
        console.log("Match settled:", match);
      } catch (err) {
        console.error("Failed to settle match:", err);
      }
    }

    // 4. Wait before next iteration
    await sleep(5000); // 5 seconds
  }
}
```

## Deployment Checklist

- [ ] Deploy Anchor program
- [ ] Initialize order book
- [ ] Create callback_auth for keeper
- [ ] Deploy keeper bot
- [ ] Monitor `TradeSettled` events
- [ ] Set up error alerting

## Future Enhancements

1. **Partial Fills**: Support partially filling orders
2. **Batch Settlement**: Submit multiple matches in one transaction
3. **Fee Distribution**: Implement protocol fee collection
4. **Price Oracle**: Verify execution prices against oracle
5. **Circuit Breakers**: Pause trading during extreme volatility

## References

- [ShadowSwap LLD](/home/mohit/dev/solana_hackathon/Project_Details/ShadowSwap_Detailed_LLD.pdf)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [SPL Token Program](https://spl.solana.com/token)
- [Program Derived Addresses](https://solanacookbook.com/core-concepts/pdas.html)

