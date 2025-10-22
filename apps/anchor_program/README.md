# ShadowSwap - Privacy-Preserving DEX on Solana

## Overview

ShadowSwap is a privacy-preserving decentralized exchange (DEX) built on Solana using the Anchor framework. The protocol enables private trading by encrypting order details (price, amount, side) client-side before submitting them on-chain.

## Phase 1 & 2: Anchor Smart Contract - Account Structures ✅

This implementation contains the core account structures for the ShadowSwap protocol, following the specifications in the Low-Level Design (LLD) documents.

### Project Structure

```
shadow_swap/
├── programs/
│   └── shadow_swap/
│       ├── src/
│       │   └── lib.rs          # Core account structures and error codes
│       └── Cargo.toml           # Rust dependencies
├── tests/
│   └── shadow_swap.ts           # TypeScript tests
├── Anchor.toml                  # Anchor configuration
└── README.md                    # This file
```

## Account Structures

### 1. EncryptedOrder

Stores individual encrypted order data. The on-chain program never sees plaintext order details.

**Fields:**
- `owner`: Pubkey - Order owner's public key
- `order_book`: Pubkey - Order book this order belongs to
- `cipher_payload`: Vec<u8> - Encrypted order data (max 512 bytes)
  - Contains: order side, price, amount, and other parameters (all encrypted)
- `status`: u8 - Order status (1=active, 2=partial, 3=filled, 4=cancelled)
- `encrypted_remaining`: Vec<u8> - Encrypted remaining amount
- `escrow`: Pubkey - Escrow account holding the order's funds
- `created_at`: i64 - Order creation timestamp
- `updated_at`: i64 - Last update timestamp
- `order_id`: u64 - Sequential order ID assigned by order book
- `bump`: u8 - PDA bump seed

**PDA Seeds:** `[b"order", order_book.key, order_id.to_le_bytes()]`

### 2. OrderBook

Manages the order book for a trading pair. MVP supports SOL/USDC pair.

**Fields:**
- `authority`: Pubkey - Order book management authority
- `base_mint`: Pubkey - Base token mint (SOL for MVP)
- `quote_mint`: Pubkey - Quote token mint (USDC for MVP)
- `order_count`: u64 - Total orders created (for sequential IDs)
- `active_orders`: u64 - Number of active orders
- `encrypted_volume_base`: Vec<u8> - Total volume in base token (encrypted)
- `encrypted_volume_quote`: Vec<u8> - Total volume in quote token (encrypted)
- `created_at`: i64 - Order book creation timestamp
- `last_trade_at`: i64 - Last trade timestamp
- `fee_bps`: u16 - Fee in basis points (e.g., 30 = 0.3%)
- `fee_collector`: Pubkey - Fee collection account
- `min_base_order_size`: u64 - Minimum order size in base token
- `is_active`: bool - Whether order book is active
- `bump`: u8 - PDA bump seed

**PDA Seeds:** `[b"order_book", base_mint.key, quote_mint.key]`

### 3. Escrow

Holds funds for an order until matched or cancelled.

**Fields:**
- `order`: Pubkey - Associated order
- `owner`: Pubkey - Order owner
- `order_book`: Pubkey - Order book reference
- `token_account`: Pubkey - PDA-owned token account holding funds
- `token_mint`: Pubkey - Mint of escrowed token
- `encrypted_amount`: Vec<u8> - Original deposited amount (encrypted)
- `encrypted_remaining`: Vec<u8> - Remaining amount (encrypted)
- `created_at`: i64 - Escrow creation timestamp
- `bump`: u8 - PDA bump seed

**PDA Seeds:** `[b"escrow", order.key]`

### 4. CallbackAuth

Authentication token for callback operations from the keeper/matching engine.

**Fields:**
- `authority`: Pubkey - Authorized callback user
- `order_book`: Pubkey - Valid for this order book
- `nonce`: u64 - Nonce to prevent replay attacks
- `expires_at`: i64 - Expiration timestamp
- `is_active`: bool - Whether callback auth is active
- `created_at`: i64 - Creation timestamp
- `bump`: u8 - PDA bump seed

**PDA Seeds:** `[b"callback_auth", order_book.key, authority.key]`

## Error Codes

The contract defines comprehensive error codes for various failure scenarios:

- `OrderBookNotActive` - Order book is not active
- `InvalidOrderStatus` - Invalid order status
- `OrderTooSmall` - Order amount too small
- `InvalidCipherPayload` - Invalid cipher payload
- `UnauthorizedCallback` - Unauthorized callback attempt
- `CallbackAuthExpired` - Callback auth has expired
- `InvalidEscrow` - Invalid escrow account
- `InsufficientEscrowFunds` - Insufficient funds in escrow
- `InvalidTokenMint` - Invalid token mint
- `OrderNotFound` - Order not found
- `OrderAlreadyFilled` - Order already filled
- `OrderAlreadyCancelled` - Order already cancelled
- `InvalidOrderBook` - Invalid order book
- `InvalidFeeConfiguration` - Invalid fee configuration
- `NumericalOverflow` - Numerical overflow occurred

## Constants

```rust
MAX_CIPHER_PAYLOAD_SIZE: 512 bytes       // Max encrypted order payload
MAX_ENCRYPTED_AMOUNT_SIZE: 64 bytes      // Max encrypted amount field
MAX_ENCRYPTED_VOLUME_SIZE: 64 bytes      // Max encrypted volume field

ORDER_STATUS_ACTIVE: 1                   // Active order
ORDER_STATUS_PARTIAL: 2                  // Partially filled
ORDER_STATUS_FILLED: 3                   // Fully filled
ORDER_STATUS_CANCELLED: 4                // Cancelled

// PDA Seeds
ORDER_BOOK_SEED: b"order_book"
ORDER_SEED: b"order"
ESCROW_SEED: b"escrow"
CALLBACK_AUTH_SEED: b"callback_auth"
```

## Privacy Features

1. **Encrypted Order Data**: All order details (price, amount, side) are encrypted client-side
2. **Encrypted Volumes**: Trading volumes are stored encrypted
3. **Encrypted Amounts**: All token amounts in escrow are encrypted
4. **On-Chain Privacy**: Smart contract never processes plaintext order data
5. **Minimal Public Data**: Only order status and timestamps are public

## Development

### Prerequisites

- Rust 1.75+
- Solana CLI 1.18+
- Anchor 0.31.1+
- Node.js 16+

### Build

```bash
anchor build
```

### Test

```bash
anchor test
```

### Deploy (Devnet)

```bash
anchor deploy --provider.cluster devnet
```

## Code Quality

✅ **Clean Code**: Clear variable names, proper error handling, concise comments  
✅ **Scalability**: Modular structure, extensible for multi-token support  
✅ **LLD Adherence**: Exact struct definitions, seeds, and field names  
✅ **Privacy-First**: No plaintext order details in contract  
✅ **Rust Best Practices**: Proper use of Anchor framework patterns  

## Next Steps (Phase 3+)

- [ ] Implement instruction handlers (place_order, cancel_order, match_orders)
- [ ] Add order matching logic
- [ ] Implement settlement mechanism
- [ ] Add fee collection
- [ ] Create TypeScript SDK
- [ ] Build frontend UI
- [ ] Deploy to devnet/mainnet

## Security Considerations

1. All encryption/decryption happens client-side
2. PDA-based account security
3. Proper authority checks in instructions (to be implemented)
4. Replay attack prevention via nonces
5. Callback authentication for matching engine

## License

MIT

## Contributing

This is a hackathon project for Solana. Contributions welcome!

