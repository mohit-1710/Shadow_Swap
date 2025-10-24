# ShadowSwap - Standard Anchor Program (Hybrid Architecture)

This is the refactored **standard Anchor program** for ShadowSwap, implementing the **Hybrid architecture** approach where:

- **Encrypted order submission** happens on-chain via standard Anchor instructions
- **Order matching** happens off-chain by an authorized keeper bot
- **Settlement** happens on-chain via the `submit_match_results` instruction

## Architecture Overview

### Hybrid Model

The Hybrid architecture combines the best of both worlds:

1. **On-chain encrypted storage**: Orders are encrypted client-side and stored on-chain via `submit_encrypted_order`
2. **Off-chain matching**: A keeper bot with TEE (Trusted Execution Environment) fetches encrypted orders, decrypts them in the TEE, performs matching, and generates settlement instructions
3. **On-chain settlement**: The keeper submits match results via `submit_match_results`, which performs atomic token swaps

### Key Instructions

#### 1. `initialize_order_book`
Creates a new order book for a trading pair (e.g., WSOL/USDC).

**Parameters:**
- `base_mint`: Base token mint (e.g., WSOL)
- `quote_mint`: Quote token mint (e.g., USDC)
- `fee_bps`: Fee in basis points (e.g., 30 = 0.3%)
- `min_base_order_size`: Minimum order size in base token units

#### 2. `submit_encrypted_order`
Submits an encrypted order to the order book.

**Parameters:**
- `cipher_payload`: Encrypted order data (side, price, amount)
- `encrypted_amount`: Encrypted amount field

**Process:**
1. Validates payload size
2. Assigns sequential order ID
3. Creates escrow account
4. Transfers tokens to escrow
5. Stores encrypted order on-chain

#### 3. `cancel_order`
Cancels an active order and returns escrowed funds.

**Requirements:**
- Must be called by order owner
- Order must be active or partially filled

#### 4. `create_callback_auth`
Authorizes a keeper to submit match results.

**Parameters:**
- `expires_at`: Unix timestamp when authorization expires

**Requirements:**
- Must be called by order book authority

#### 5. `submit_match_results`
Executes settlement for a matched pair of orders.

**Parameters:**
- `match_input`: Contains buyer/seller pubkeys, matched amount, and execution price

**Process:**
1. Verifies keeper authorization
2. Validates orders are active
3. Calculates quote token amount (matched_amount × execution_price)
4. Transfers quote tokens from buyer's escrow to seller
5. Transfers base tokens from seller's escrow to buyer
6. Updates order statuses to "Filled"
7. Emits `TradeSettled` event

### Account Structures

#### `EncryptedOrder`
Stores encrypted order data with the following fields:
- `owner`: Order owner's public key
- `order_book`: Associated order book
- `cipher_payload`: Encrypted order details (up to 512 bytes)
- `status`: Order status (Active, Partial, Filled, Cancelled)
- `encrypted_remaining`: Encrypted remaining amount
- `escrow`: Associated escrow account
- `order_id`: Sequential order identifier

#### `OrderBook`
Manages orders for a trading pair:
- `authority`: Order book manager
- `base_mint` / `quote_mint`: Token pair
- `order_count`: Total orders created
- `active_orders`: Currently active orders
- `fee_bps`: Trading fee
- `is_active`: Whether order book is accepting orders

#### `Escrow`
Holds escrowed tokens for an order:
- `order`: Associated order account
- `owner`: Order owner
- `token_account`: PDA-owned token account
- `token_mint`: Escrowed token mint
- `encrypted_amount`: Original encrypted deposit

#### `CallbackAuth`
Authorization for keeper operations:
- `authority`: Authorized keeper public key
- `order_book`: Associated order book
- `expires_at`: Authorization expiration
- `is_active`: Whether authorization is active

## Building

```bash
anchor build
```

## Testing

```bash
anchor test
```

## Deployment

### Devnet
```bash
anchor deploy --provider.cluster devnet
```

### Mainnet
```bash
anchor deploy --provider.cluster mainnet
```

## Key Differences from Native MXE Attempt

The native MXE attempt (hidden in `../.shadow_swap_mxe_native_attempt/`) used:
- `#[arcium_program]` macro instead of `#[program]`
- `arcium-anchor` dependency
- Arcium MPC callbacks for encrypted computation
- `invoke_matching` instruction to trigger Arcium MPC

This standard Anchor version:
- Uses standard `#[program]` macro
- Removes all Arcium dependencies
- Implements `submit_match_results` for keeper-driven settlement
- Allows for flexible off-chain matching strategies (TEE, MPC, ZK, etc.)

## Security Considerations

1. **Keeper Authorization**: Only authorized keepers (via `CallbackAuth`) can submit match results
2. **Order Validation**: Extensive validation of order states and token accounts
3. **Escrow Safety**: All token transfers go through PDA-controlled escrow accounts
4. **Expiration**: Keeper authorizations expire after a set time

## Future Enhancements

1. **Partial Fills**: Support for partially filling large orders
2. **Fee Collection**: Implement fee collection mechanism
3. **Multi-keeper**: Support multiple authorized keepers for redundancy
4. **Advanced Matching**: Support for limit orders, market orders, etc.

