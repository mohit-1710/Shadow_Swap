# ShadowSwap Hybrid Architecture - Quick Start

## Build the Program

```bash
cd /home/mohit/dev/solana_hackathon/ShadowSwap_Project/apps/anchor_program
anchor build
```

**Expected output:**
```
Compiling shadow_swap v0.1.0
Finished `release` profile [optimized]
```

**Generated files:**
- `target/deploy/shadow_swap.so` - Compiled program binary
- `target/idl/shadow_swap.json` - Program IDL
- `target/types/shadow_swap.ts` - TypeScript types

## Deploy to Devnet

```bash
# Configure Solana CLI for devnet
solana config set --url devnet

# Airdrop SOL for deployment (if needed)
solana airdrop 2

# Deploy the program
anchor deploy --provider.cluster devnet
```

## Initialize Order Book

```bash
# Using Anchor CLI
anchor run initialize-orderbook --provider.cluster devnet
```

Or using TypeScript:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ShadowSwap } from "../target/types/shadow_swap";

const program = anchor.workspace.ShadowSwap as Program<ShadowSwap>;

// SOL and USDC mints (devnet)
const baseMint = new PublicKey("So11111111111111111111111111111111111111112"); // Wrapped SOL
const quoteMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // USDC devnet

const [orderBook] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("order_book"),
    baseMint.toBuffer(),
    quoteMint.toBuffer(),
  ],
  program.programId
);

await program.methods
  .initializeOrderBook(
    baseMint,
    quoteMint,
    30, // 0.3% fee
    1_000_000 // min order size (1 SOL in lamports)
  )
  .accounts({
    orderBook,
    authority: wallet.publicKey,
    feeCollector: feeCollectorPubkey,
    baseMint,
    quoteMint,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Submit an Encrypted Order

```typescript
// 1. Encrypt order data (using your chosen encryption method)
const orderData = {
  side: 'buy', // or 'sell'
  price: 50.0, // USDC per SOL
  amount: 1.5, // SOL
};

// Example: using Arcium SDK
import { ArciumSDK } from '@arcium/sdk';
const arcium = new ArciumSDK({/* config */});
const cipherPayload = await arcium.encrypt(JSON.stringify(orderData));
const encryptedAmount = await arcium.encrypt(orderData.amount.toString());

// 2. Submit to blockchain
const [order] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("order"),
    orderBook.toBuffer(),
    Buffer.from(orderBook.orderCount.toString()),
  ],
  program.programId
);

const [escrow] = PublicKey.findProgramAddressSync(
  [Buffer.from("escrow"), order.toBuffer()],
  program.programId
);

const [escrowTokenAccount] = PublicKey.findProgramAddressSync(
  [Buffer.from("escrow_token"), order.toBuffer()],
  program.programId
);

await program.methods
  .submitEncryptedOrder(
    Array.from(cipherPayload),
    Array.from(encryptedAmount)
  )
  .accounts({
    orderBook,
    order,
    escrow,
    escrowTokenAccount,
    userTokenAccount: userUsdcAccount, // for buy order
    tokenMint: quoteMint,
    owner: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  })
  .rpc();
```

## Create Keeper Authorization

```typescript
const keeper = new PublicKey("YOUR_KEEPER_PUBKEY");

const [callbackAuth] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("callback_auth"),
    orderBook.toBuffer(),
    keeper.toBuffer(),
  ],
  program.programId
);

// Expires in 30 days
const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

await program.methods
  .createCallbackAuth(new BN(expiresAt))
  .accounts({
    orderBook,
    callbackAuth,
    authority: wallet.publicKey, // must be order book authority
    keeper,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Submit Match Results (Keeper)

```typescript
// Called by authorized keeper after matching orders in TEE
await program.methods
  .submitMatchResults({
    buyerPubkey: buyerOrderPubkey,
    sellerPubkey: sellerOrderPubkey,
    matchedAmount: new BN(1_500_000_000), // 1.5 SOL in lamports
    executionPrice: new BN(50_000_000), // 50 USDC (with decimals)
  })
  .accounts({
    callbackAuth,
    orderBook,
    buyerOrder,
    sellerOrder,
    buyerEscrow,
    sellerEscrow,
    buyerEscrowTokenAccount,
    sellerEscrowTokenAccount,
    buyerTokenAccount, // receives base tokens
    sellerTokenAccount, // receives quote tokens
    keeper: keeperWallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([keeperWallet])
  .rpc();
```

## Cancel an Order

```typescript
await program.methods
  .cancelOrder()
  .accounts({
    order,
    escrow,
    escrowTokenAccount,
    userTokenAccount,
    orderBook,
    owner: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();
```

## Testing

```bash
# Run tests
anchor test

# Run tests on devnet
anchor test --provider.cluster devnet
```

## Monitoring Events

```typescript
// Listen for TradeSettled events
program.addEventListener("TradeSettled", (event, slot) => {
  console.log("Trade settled:", {
    orderBook: event.orderBook.toString(),
    buyer: event.buyer.toString(),
    seller: event.seller.toString(),
    buyerOrderId: event.buyerOrderId.toString(),
    sellerOrderId: event.sellerOrderId.toString(),
    baseAmount: event.baseAmount.toString(),
    quoteAmount: event.quoteAmount.toString(),
    executionPrice: event.executionPrice.toString(),
    timestamp: new Date(event.timestamp.toNumber() * 1000),
  });
});
```

## Environment Setup

```bash
# Install dependencies
yarn add @coral-xyz/anchor @solana/web3.js @solana/spl-token

# Install Anchor CLI (if not already installed)
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli

# Install Solana CLI (if not already installed)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

## Key Concepts

### 1. Order Encryption
- Orders are encrypted client-side before submission
- Use Arcium SDK, custom TEE encryption, or other methods
- On-chain program never sees plaintext order details

### 2. Escrow Accounts
- Each order has a dedicated escrow account (PDA)
- Tokens are locked in escrow until order is filled or cancelled
- PDA controls escrow, ensuring safe settlement

### 3. Keeper Authorization
- Keepers must be authorized via `CallbackAuth` accounts
- Only authorized keepers can submit match results
- Authorization has expiration time for security

### 4. Settlement
- Keeper computes matches off-chain (in TEE)
- Keeper submits plaintext match results on-chain
- Program validates and executes atomic token swaps
- Both buyer and seller receive tokens in single transaction

## Directory Structure

```
apps/anchor_program/
├── Anchor.toml              # Anchor configuration
├── Cargo.toml                # Workspace configuration
├── programs/
│   └── shadow_swap/
│       ├── Cargo.toml        # Program dependencies
│       └── src/
│           └── lib.rs        # Program implementation
├── tests/                    # Test files
├── target/
│   ├── deploy/               # Compiled program
│   ├── idl/                  # Program IDL
│   └── types/                # TypeScript types
├── README.md                 # Architecture overview
├── MIGRATION_GUIDE.md        # Migration from Native MXE
└── QUICKSTART.md             # This file
```

## Troubleshooting

### Build Errors

**Stack size warning:**
```
Error: Stack offset of 5200 exceeded max offset of 4096
```
This is a known warning with the `SubmitMatchResults` context. The program still builds and functions. Consider refactoring to use `remaining_accounts` if needed.

**Arcium dependency errors:**
Ensure you're in the `anchor_program` directory, not `.shadow_swap_mxe_native_attempt`.

### Deployment Errors

**Insufficient SOL:**
```bash
solana airdrop 2
```

**Wrong cluster:**
```bash
solana config set --url devnet
anchor deploy --provider.cluster devnet
```

### Runtime Errors

**UnauthorizedCallback:**
- Ensure keeper is authorized via `create_callback_auth`
- Check that authorization hasn't expired

**InvalidOrderStatus:**
- Verify orders are in ACTIVE or PARTIAL status
- Check that orders haven't been cancelled or filled

## Next Steps

1. **Implement Keeper Bot:** See `../settlement_bot/` for keeper implementation
2. **Frontend Integration:** Update UI to use new instructions
3. **Add Tests:** Write comprehensive test suite
4. **Deploy to Mainnet:** After thorough testing on devnet

## Resources

- [Anchor Documentation](https://book.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [Arcium SDK](https://docs.arcium.com/)
- [Project README](./README.md)
- [Migration Guide](./MIGRATION_GUIDE.md)

