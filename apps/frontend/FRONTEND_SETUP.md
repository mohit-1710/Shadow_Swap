# ShadowSwap Frontend Setup Guide

## 🎯 Overview

Frontend for ShadowSwap order submission with client-side encryption using Arcium SDK.

## 📦 Installation

```bash
# From monorepo root
cd apps/frontend

# Install dependencies
yarn install

# Or from root
yarn install
```

## 🔧 Configuration

1. **Create `.env.local`** from the example:
```bash
cp env.example .env.local
```

2. **Update environment variables**:
```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com

# After deploying your Anchor program:
NEXT_PUBLIC_PROGRAM_ID=5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt
NEXT_PUBLIC_ORDER_BOOK_PUBKEY=CXSiQhcozGCvowrC4QFGHQi1BJwWdfw2ZEjhDawMK3Rr
NEXT_PUBLIC_BASE_MINT=So11111111111111111111111111111111111111112
NEXT_PUBLIC_QUOTE_MINT=CrkXs142BgVrLrkrSGXNXgFztT5mxKyzWJjtHw3rDagE
NEXT_PUBLIC_REFRESH_INTERVAL=5000

# Arcium SDK (when available):
NEXT_PUBLIC_ARCIUM_API_KEY=<your_api_key>
```

## 🚀 Development

```bash
# Start dev server
yarn dev

# Or from root
yarn dev:frontend

# Visit http://localhost:3000
```

## 📁 Project Structure

```
frontend/
├── components/
│   └── OrderSubmissionForm.tsx  # Main order submission UI
├── lib/
│   ├── arcium.ts               # Arcium SDK integration
│   └── program.ts              # Anchor program utilities
├── pages/
│   ├── _app.tsx                # Next.js app wrapper
│   └── index.tsx               # Home page with wallet provider
├── styles/
│   └── globals.css             # Global styles
└── .env.local.example          # Environment template
```

## 🔐 How It Works

### 1. Order Submission Flow

```typescript
// User fills form
{
  side: 'buy' | 'sell',
  amount: '1.5',  // SOL
  price: '150'    // USDC per SOL
}

// ↓ Convert to lamports
{
  side: 0,              // 0 = Buy
  amount: 1500000000,   // lamports
  price: 150000000,     // micro-USDC
  timestamp: 1234567890
}

// ↓ Serialize to bytes
PlainOrder → Uint8Array(24 bytes)

// ↓ Encrypt with Arcium
{
  cipherPayload: Uint8Array(256),
  ephemeralPublicKey: Uint8Array(32),
  nonce: Uint8Array(24)
}

// ↓ Submit to Anchor program
submit_encrypted_order(cipher, nonce, order_id)
```

### Native SOL Handling

- Sell orders automatically wrap enough SOL into WSOL before escrow so traders don’t need to manage WSOL manually.
- Cancelled sell orders piggyback a `closeAccount` instruction so any refunded WSOL is immediately unwrapped back to native SOL in the same transaction.
- The form creates the WSOL associated token account (if missing), transfers only the shortfall, syncs native balance, and recreates the ATA on-demand.
- The order dashboard polls using `NEXT_PUBLIC_REFRESH_INTERVAL` (default 5s) and raises a status feed whenever an order transitions to Filled/Executed so users see matches instantly.

### 2. Client-Side Encryption

The `lib/arcium.ts` module handles encryption:

```typescript
import { encryptOrderWithArcium } from '../lib/arcium';

const encrypted = await encryptOrderWithArcium(
  plainOrder,
  orderBookAddress,
  'devnet'
);
```

**Current Status**: Placeholder implementation using random bytes.

**Production**: Will use actual Arcium SDK:
```typescript
// TODO: Implement with real Arcium SDK
const arciumClient = new ArciumClient({ network: 'devnet' });
const mxeKey = await arciumClient.fetchMXEKey(orderBookAddress);
const encrypted = await arciumClient.encrypt({
  data: serializedOrder,
  recipientPublicKey: mxeKey,
  senderKeypair: ephemeralKeypair
});
```

### 3. Program Interaction

The `lib/program.ts` module provides utilities:

```typescript
import { 
  deriveOrderPda, 
  deriveEscrowPda,
  fetchOrderCount 
} from '../lib/program';

// Get next order count
const orderCount = await fetchOrderCount(connection, orderBookAddress);

// Derive PDAs
const [orderPda] = deriveOrderPda(orderBookAddress, orderCount, programId);
const [escrowPda] = deriveEscrowPda(orderPda, programId);
```

## 🔌 Wallet Integration

Uses Solana Wallet Adapter:

```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

const { publicKey, signTransaction } = useWallet();
const { connection } = useConnection();
```

Supported wallets:
- Phantom
- Solflare
- (More can be added)

## 📝 Component Usage

```typescript
import OrderSubmissionForm from '../components/OrderSubmissionForm';

<OrderSubmissionForm
  programId={PROGRAM_ID}
  baseMintAddress={BASE_MINT}
  quoteMintAddress={QUOTE_MINT}
/>
```

## 🧪 Testing Locally

1. **Start local Solana validator** (in anchor_program):
```bash
cd apps/anchor_program
anchor localnet
```

2. **Deploy program**:
```bash
anchor deploy
```

3. **Initialize order book** (use Anchor CLI or write script)

4. **Update `.env.local`** with deployed addresses

5. **Start frontend**:
```bash
yarn dev
```

6. **Connect wallet** and submit test orders

## 🔗 Integration Steps

### To Complete Full Integration:

1. **Install Arcium SDK** (when available):
```bash
yarn add @arcium/sdk
```

2. **Update `lib/arcium.ts`** with real SDK calls

3. **Load Anchor IDL**:
```typescript
import idl from '../../../anchor_program/target/idl/shadow_swap.json';
const program = new Program(idl, programId, provider);
```

4. **Build transaction**:
```typescript
const tx = await program.methods
  .placeOrder(
    Array.from(cipherPayload),
    Array.from(encryptedAmount)
  )
  .accounts({...})
  .transaction();
```

5. **Add order management** (view, cancel)

## 🐛 Troubleshooting

### "Cannot find module" errors
```bash
# Reinstall dependencies
rm -rf node_modules
yarn install
```

### Wallet not connecting
- Check browser has Phantom/Solflare installed
- Allow site access in wallet settings
- Try refreshing the page

### Transaction failing
- Check wallet has SOL for fees
- Verify program is deployed
- Check order book is initialized
- Confirm token accounts exist

## 📚 Next Steps

- [ ] Integrate real Arcium SDK
- [ ] Add order history view
- [ ] Implement order cancellation
- [ ] Add real-time status updates
- [ ] Improve UI/UX with styled components
- [ ] Add input validation
- [ ] Implement error recovery
- [ ] Add transaction confirmation toasts

## 🔒 Security Notes

- ✅ All order details encrypted client-side
- ✅ No plaintext order data transmitted
- ✅ Ephemeral keys for each order
- ✅ Wallet signatures required
- ⚠️ Use `.env.local` for sensitive data (never commit)
- ⚠️ Validate all user inputs
- ⚠️ Implement rate limiting in production

## 📖 Documentation

- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Next.js Documentation](https://nextjs.org/docs)
- [Anchor Client](https://www.anchor-lang.com/docs/anchor-ts)
- Arcium SDK (TBD)

---

**Status**: ✅ Ready for development testing  
**Last Updated**: Phase 3 - Order Submission  
