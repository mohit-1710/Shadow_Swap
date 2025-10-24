# Migration Guide: Native MXE → Hybrid Architecture

This guide explains the key differences between the Native Arcium MXE implementation and the new Hybrid architecture for developers working on ShadowSwap.

## Architecture Comparison

### Native MXE Approach (`.shadow_swap_mxe_native_attempt/`)

**Concept:** Encrypted computation happens entirely on-chain using Arcium's MPC network.

**Flow:**
1. Client submits encrypted order → `place_order`
2. Keeper invokes Arcium MPC → `invoke_matching`
3. Arcium MPC performs encrypted matching (on-chain)
4. Arcium calls back with results → `arcium_match_callback`
5. Program processes encrypted results

**Pros:**
- Fully decentralized matching
- No single point of trust
- Encrypted computation provably correct

**Cons:**
- Dependent on Arcium infrastructure
- Higher complexity
- Limited to Arcium's MPC capabilities
- Higher on-chain costs

### Hybrid Approach (`anchor_program/`)

**Concept:** Encrypted storage on-chain, matching in off-chain TEE, settlement on-chain.

**Flow:**
1. Client submits encrypted order → `submit_encrypted_order`
2. Keeper fetches orders, decrypts in TEE (off-chain)
3. Keeper performs matching in TEE (off-chain)
4. Keeper submits results → `submit_match_results`
5. Program settles trades atomically

**Pros:**
- Standard Anchor program (no special dependencies)
- Flexible TEE choice (Arcium, SGX, Nitro, etc.)
- Lower on-chain costs
- Easier to maintain and deploy

**Cons:**
- Requires trusted keeper (mitigated by TEE)
- Matching not provably on-chain
- Relies on keeper liveness

## Code Changes

### Program Declaration

**Native MXE:**
```rust
use arcium_anchor::prelude::*;

#[arcium_program]
pub mod shadow_swap {
    // ...
}
```

**Hybrid:**
```rust
use anchor_lang::prelude::*;

#[program]
pub mod shadow_swap {
    // ...
}
```

### Dependencies

**Native MXE (Cargo.toml):**
```toml
[dependencies]
anchor-lang = "0.31.1"
anchor-spl = "0.31.1"
arcium-anchor = "0.3.0"

[workspace]
members = [
    "programs/shadow_swap",
    "encrypted-ixs"  # Arcium encrypted instructions
]
```

**Hybrid (Cargo.toml):**
```toml
[dependencies]
anchor-lang = "0.31.1"
anchor-spl = "0.31.1"
# No Arcium dependencies

[workspace]
members = [
    "programs/shadow_swap"
    # No encrypted-ixs needed
]
```

### Order Submission

**Native MXE:**
```rust
pub fn place_order(
    ctx: Context<PlaceOrder>,
    cipher_payload: Vec<u8>,
    encrypted_amount: Vec<u8>,
) -> Result<()> {
    // Stores order with Arcium-specific account structure
    // ...
}
```

**Hybrid:**
```rust
pub fn submit_encrypted_order(
    ctx: Context<SubmitEncryptedOrder>,
    cipher_payload: Vec<u8>,
    encrypted_amount: Vec<u8>,
) -> Result<()> {
    // Standard Anchor instruction
    // Stores encrypted order on-chain
    // ...
}
```

### Matching & Settlement

**Native MXE:**
```rust
// Invokes Arcium MPC for encrypted matching
pub fn invoke_matching(
    ctx: Context<InvokeMatching>,
    computation_offset: u64,
    buy_order_ciphertext: [u8; 32],
    sell_order_ciphertext: [u8; 32],
    client_pubkey: [u8; 32],
    nonce: u128,
) -> Result<()> {
    // Queue computation with Arcium
    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        None,
        vec![ArciumMatchCallback::callback_ix(&[])],
    )?;
    Ok(())
}

// Callback from Arcium with encrypted results
#[arcium_callback(encrypted_ix = "match_two_orders")]
pub fn arcium_match_callback(
    ctx: Context<ArciumMatchCallback>,
    output: ComputationOutputs<MatchTwoOrdersOutput>,
) -> Result<()> {
    // Process encrypted match results
    // ...
}
```

**Hybrid:**
```rust
// Keeper submits plaintext match results (computed in TEE)
pub fn submit_match_results(
    ctx: Context<SubmitMatchResults>,
    match_input: MatchResultInput,
) -> Result<()> {
    // Verify keeper authorization
    require!(
        callback_auth.is_active,
        ShadowSwapError::UnauthorizedCallback
    );
    
    // Calculate amounts
    let quote_amount = match_input.matched_amount
        .checked_mul(match_input.execution_price)
        .ok_or(ShadowSwapError::NumericalOverflow)?;
    
    // Transfer quote tokens: buyer escrow → seller
    token::transfer(/* ... */)?;
    
    // Transfer base tokens: seller escrow → buyer
    token::transfer(/* ... */)?;
    
    // Update order statuses
    buyer_order.status = ORDER_STATUS_FILLED;
    seller_order.status = ORDER_STATUS_FILLED;
    
    Ok(())
}
```

### Keeper Authorization

**Native MXE:**
```rust
// Authorization handled by Arcium infrastructure
// Callback verification is built into #[arcium_callback]
```

**Hybrid:**
```rust
// Explicit keeper authorization
pub fn create_callback_auth(
    ctx: Context<CreateCallbackAuth>,
    expires_at: i64,
) -> Result<()> {
    let callback_auth = &mut ctx.accounts.callback_auth;
    callback_auth.authority = ctx.accounts.keeper.key();
    callback_auth.expires_at = expires_at;
    callback_auth.is_active = true;
    Ok(())
}

// Used in submit_match_results:
require!(
    callback_auth.authority == ctx.accounts.keeper.key(),
    ShadowSwapError::UnauthorizedCallback
);
```

## Client-Side Changes

### Order Submission

**Native MXE:**
```typescript
// Submit order with Arcium-specific encryption
const tx = await program.methods
    .placeOrder(cipherPayload, encryptedAmount)
    .accounts({
        orderBook,
        order,
        escrow,
        // ... Arcium-specific accounts
    })
    .rpc();
```

**Hybrid:**
```typescript
// Submit encrypted order (encryption method is flexible)
const tx = await program.methods
    .submitEncryptedOrder(cipherPayload, encryptedAmount)
    .accounts({
        orderBook,
        order,
        escrow,
        // ... standard Anchor accounts
    })
    .rpc();
```

### Encryption Method

**Native MXE:**
```typescript
// Must use Arcium SDK for encryption
import { ArciumSDK } from '@arcium/sdk';

const arcium = new ArciumSDK(/*...*/);
const encrypted = await arcium.encrypt(orderData);
```

**Hybrid:**
```typescript
// Flexible: can use Arcium, custom TEE, or any encryption
import { ArciumSDK } from '@arcium/sdk';
// OR
import { customTEEEncrypt } from './encryption';

// Example with Arcium:
const arcium = new ArciumSDK(/*...*/);
const encrypted = await arcium.encrypt(orderData);

// Example with custom TEE:
const encrypted = await customTEEEncrypt(orderData);
```

## Keeper Bot Changes

### Native MXE Keeper

**Not needed** - Arcium MPC network handles matching automatically via callbacks.

### Hybrid Keeper

**Required** - Must implement a keeper bot with TEE integration:

```typescript
// Pseudocode for Hybrid keeper bot
class HybridKeeper {
    async run() {
        while (true) {
            // 1. Fetch encrypted orders from chain
            const orders = await this.fetchOrders();
            
            // 2. Decrypt in TEE
            const decryptedOrders = await this.tee.decrypt(orders);
            
            // 3. Match orders
            const matches = this.matchOrders(decryptedOrders);
            
            // 4. Submit match results on-chain
            for (const match of matches) {
                await this.program.methods
                    .submitMatchResults({
                        buyerPubkey: match.buyer,
                        sellerPubkey: match.seller,
                        matchedAmount: match.amount,
                        executionPrice: match.price,
                    })
                    .accounts({
                        callbackAuth,
                        orderBook,
                        buyerOrder: match.buyerOrder,
                        sellerOrder: match.sellerOrder,
                        buyerEscrow,
                        sellerEscrow,
                        // ... token accounts
                        keeper: this.wallet.publicKey,
                    })
                    .signers([this.wallet])
                    .rpc();
            }
            
            await sleep(1000); // Wait before next iteration
        }
    }
}
```

## Testing Changes

### Native MXE Testing

```bash
# Requires Arcium localnet/devnet
cd .shadow_swap_mxe_native_attempt
anchor test  # May require Arcium-specific setup
```

### Hybrid Testing

```bash
# Standard Anchor testing
cd anchor_program
anchor test  # Works with standard Solana localnet
```

## Deployment Changes

### Native MXE Deployment

```bash
# Must deploy to Arcium-enabled Solana cluster
cd .shadow_swap_mxe_native_attempt
anchor deploy --provider.cluster devnet
# Also need to initialize Arcium computation definitions
```

### Hybrid Deployment

```bash
# Standard Anchor deployment
cd anchor_program
anchor deploy --provider.cluster devnet
# Then authorize keeper:
# Call create_callback_auth instruction
```

## Security Considerations

### Native MXE
- ✅ Provably correct encrypted computation
- ✅ Decentralized matching
- ❌ Dependent on Arcium security
- ❌ Complex attack surface

### Hybrid
- ✅ Standard Anchor security model
- ✅ Flexible TEE choice
- ✅ Simpler attack surface
- ❌ Requires trusted keeper (mitigated by TEE attestation)
- ❌ Keeper liveness required

## Migration Checklist

If migrating from Native MXE to Hybrid:

- [ ] Update program to use `#[program]` instead of `#[arcium_program]`
- [ ] Remove `arcium-anchor` dependency
- [ ] Remove `encrypted-ixs` workspace member
- [ ] Rename `place_order` → `submit_encrypted_order`
- [ ] Remove Arcium MPC instructions:
  - [ ] `init_match_comp_def`
  - [ ] `invoke_matching`
  - [ ] `arcium_match_callback`
- [ ] Add `submit_match_results` instruction
- [ ] Add `create_callback_auth` instruction
- [ ] Update client to call new instruction names
- [ ] Implement keeper bot with TEE
- [ ] Test on devnet
- [ ] Update frontend to handle new flow
- [ ] Security audit

## When to Use Each Approach

### Use Native MXE When:
- Fully decentralized matching is a hard requirement
- You trust Arcium infrastructure
- Cost is not a primary concern
- You need provably correct on-chain computation

### Use Hybrid When:
- You want flexibility in TEE provider
- Lower costs are important
- Faster iteration and development is needed
- Standard Anchor tooling compatibility is desired
- You can implement a reliable keeper bot

## Questions?

For more details, see:
- `README.md` - Architecture overview
- `../HYBRID_REFACTORING_SUMMARY.md` - Refactoring details
- `.shadow_swap_mxe_native_attempt/` - Original implementation (for reference)

## Support

For issues or questions about the migration:
1. Check the Native MXE code in `.shadow_swap_mxe_native_attempt/`
2. Review the new Hybrid implementation in `programs/shadow_swap/src/lib.rs`
3. Read the Anchor documentation: https://book.anchor-lang.com/
4. Check Solana documentation: https://docs.solana.com/

