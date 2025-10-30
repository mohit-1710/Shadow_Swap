---
title: Getting Started with ShadowSwap
description: Getting Started guide for ShadowSwap on Solana Devnet
lastUpdated: 2025-01-30
---

Welcome to ShadowSwap—a privacy-first orderbook DEX on Solana that keeps your trading intentions hidden until execution. This guide will walk you through everything you need to know to start trading safely and privately.

## What is ShadowSwap?
ShadowSwap is a decentralized exchange (DEX) built on Solana that solves the biggest problem in DeFi trading: MEV (Maximal Extractable Value).

### The Problem with Traditional DEXs

#### When you trade on most DEXs

- Your order details (price, amount, buy/sell) are visible to everyone before execution
- Bots can see your order and front-run you (buy before you to pump the price)
- Large orders get sandwiched (bots buy before and sell after, stealing your profits)
- You lose money to MEV attacks—over $370M-$500M extracted on Solana alone in 2024

### How ShadowSwap Fixes This

#### ShadowSwap protects you

- Encrypting Your Orders
  - When you place an order, all details (price, amount, buy/sell) are encrypted before hitting the blockchain. No one can see what you're trading.
- Private Matching
  - Your encrypted order is matched with other encrypted orders in a private environment (powered by Arcium MPC). Bots can't see your order, so they can't attack it.
- Smart Fallback
  - If no private match is found within your chosen timeout, ShadowSwap can automatically route your order to public liquidity (Jupiter/Sanctum) for execution. You control the timeout.
- Fair Execution
  - Matching uses price-time priority: earlier orders at better prices get filled first. No priority fees needed.

## How It Works

### What happens when you place an order on ShadowSwap

### Step 1: You Submit an Order
You: "I want to buy 5 SOL at 142 USDC"

       ↓

Frontend: Encrypts order details into a 512-byte cipher

       ↓

Blockchain: Only encrypted blob is stored (no one can read it)

What's encrypted:
- Order side (buy/sell)
- Price (142 USDC)
- Amount (5 SOL)

What's public:
- Your wallet address (needed for settlement)
- Order status ("Active", "Filled", "Cancelled")
- Timestamp (for fair ordering)

### Step 2: Private Matching
Keeper Bot: Fetches encrypted orders from blockchain

       ↓

Arcium MPC: Decrypts orders in a secure, private environment

       ↓

Matching Engine: Finds compatible buy/sell orders

       ↓

Result: "Order A (buy 5 SOL @ 142) matches Order B (sell 5 SOL @ 140)"

Key point: Decryption happens in a distributed system (Arcium MPC) where no single party sees all order details. This prevents the keeper bot from front-running you.

### Step 3: Settlement
Keeper Bot: Submits settlement transaction to blockchain

       ↓

Solana Program: Transfers tokens atomically

       ↓

Your Wallet: Receives 5 SOL, pays 710 USDC (142 USDC × 5 SOL)

Settlement details:
- Buyer's escrow → sends USDC to seller
- Seller's escrow → sends SOL to buyer
- Both transfers happen at the same time (atomic)
- 0.1% fee charged (0.71 USDC in this example)

### Step 4: Fallback (Optional)
If you enabled Fallback and no private match is found:

No match after 10 seconds (your chosen timeout)

       ↓

Jupiter API: Finds best public route (Raydium, Orca, etc.)

       ↓

Your Wallet: Signs fallback transaction

       ↓

Trade executes on public DEX

Privacy tradeoff:
- Private matching first (max privacy)
- Public fallback (if no match, reduced privacy but guaranteed execution)

---

## Visual Flow Diagram
```
┌─────────────────────────────────────────────────────────────┐
│  YOUR ORDER: Buy 5 SOL at 142 USDC                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  FRONTEND ENCRYPTION            │
         │  (512-byte cipher)              │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  SOLANA BLOCKCHAIN              │
         │  (Encrypted order stored)       │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  KEEPER BOT                     │
         │  (Fetches encrypted orders)     │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  ARCIUM MPC                     │
         │  (Private decryption)           │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  MATCHING ENGINE                │
         │  (Finds compatible orders)      │
         └────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
   ┌─────────────────┐       ┌─────────────────┐
   │  MATCH FOUND     │       │  NO MATCH        │
   └─────────────────┘       └─────────────────┘
            │                           │
            ▼                           ▼
   ┌─────────────────┐       ┌─────────────────┐
   │  SETTLEMENT      │       │  FALLBACK?       │
   │  (Atomic swap)   │       │  (If enabled)    │
   └─────────────────┘       └─────────────────┘
            │                           │
            ▼                           ▼
   ┌─────────────────┐       ┌─────────────────┐
   │  YOU RECEIVE     │       │  JUPITER ROUTE   │
   │  5 SOL           │       │  (Public DEX)    │
   └─────────────────┘       └─────────────────┘
```

---

# Devnet Setup Guide
Devnet is Solana's test network. You'll use fake SOL and USDC to test ShadowSwap before using real money on Mainnet.

## Prerequisites

- Wallet: Phantom or Solflare browser extension
- Network: Set wallet to Devnet (not Mainnet)

## Step 1: Install a Wallet

### Option A: Phantom (Recommended)

- Visit https://phantom.app
- Click "Download" → Choose your browser
- Install extension and create a new wallet
- Save your seed phrase (12 or 24 words) somewhere safe
- Never share your seed phrase with anyone

### Option B: Solflare

- Visit https://solflare.com
- Click "Get Started" → Choose browser extension
- Follow setup wizard to create wallet
- Save your seed phrase securely

## Step 2: Switch to Devnet

In Phantom:

- Click wallet extension icon (top-right browser)
- Click gear icon (Settings)
- Scroll to "Developer Settings"
- Enable "Testnet Mode"
- Select "Devnet" from network dropdown

In Solflare:

- Open wallet
- Click network dropdown (top-right, says "Mainnet")
- Select "Devnet"

Verify: Your wallet should now show "Devnet" in the network selector.

## Step 3: Get Devnet SOL
You need SOL to pay for transaction fees (~0.000005 SOL per transaction).

### Method 1: Web Faucet (Easiest)

- Visit https://faucet.solana.com
- Paste your wallet address (copy from Phantom/Solflare)
- Complete CAPTCHA
- Click "Request Airdrop"
- Wait 30-60 seconds for confirmation



### Method 2: Solana CLI

```bash
# Install Solana CLI (if not installed)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Request airdrop (replace with your address)
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url https://api.devnet.solana.com

# Example:
# solana airdrop 2 7xKxY3... --url https://api.devnet.solana.com
```

### Method 3: Discord

- Join Solana Discord: https://discord.gg/solana
- Go to #devnet-faucet channel
- Type: /airdrop <YOUR_WALLET_ADDRESS>

Rate limits: If faucet says "too many requests", wait 24 hours or try from a different IP address.

## Step 4: Get Devnet USDC
USDC is the quote token for SOL/USDC trading pairs.

Devnet USDC Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

### Method 1: SPL Token CLI

```bash
# Install SPL Token CLI
cargo install spl-token-cli

# Create USDC token account
spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU --url devnet

# Mint USDC to yourself (if faucet is available)
spl-token mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU 1000 --url devnet

# Check balance
spl-token balance 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU --url devnet
```

### Method 2: Discord

1. Join Solana Discord
2. Go to `#devnet-support` channel
3. Ask: "Can someone send me devnet USDC? My address: `<YOUR_ADDRESS>`"
4. Community members or admins may help

Note: Devnet USDC availability varies. You may need to ask in Discord for help.

---

## Step 5: Connect to ShadowSwap

1. Visit the ShadowSwap Devnet app (URL provided by team)
2. Click "Connect Wallet" (top-right corner)
3. Select your wallet (Phantom or Solflare)
4. Approve connection in wallet popup
5. Verify: Your wallet address should appear in top-right

Expected balances:

- SOL: ~2.00 SOL (minus small fees)
- USDC: ~1000 USDC (if airdrop succeeded)

Troubleshooting:

- If balance shows $0, refresh the page
- If connection fails, check wallet network is Devnet
- Open browser console (F12 → Console) for error messages

---

# Placing Your First Order

Now let's place a simple limit order to sell 0.1 SOL.

## Step 1: Navigate to Trade Page

1. On ShadowSwap homepage, click "Trade" (top navigation)
2. You'll see the trade form with two sections:
   - "From" (what you're selling)
   - "To" (what you're buying)

## Step 2: Select Trading Pair

1. Click "From" token dropdown → Select SOL
2. Click "To" token dropdown → Select USDC

Result: Trade form shows "SOL/USDC" pair

Note: Only SOL/USDC is supported on Devnet currently.

## Step 3: Choose Order Type

1. Click "Limit" tab (default)
   - Limit order: You specify the exact price
   - Market order: Executes at best available price

## Step 4: Enter Order Details

1. Amount: Type `0.1` in the "From" field (selling 0.1 SOL)
2. Price: Type `142` in the "Limit Price" field (142 USDC per SOL)
3. Expected output: The "To" field auto-calculates: `14.2 USDC` (0.1 SOL × 142 USDC)

Balance check:

- Below "From" field, verify: `Balance: 2.0000 SOL`
- If balance is too low, get more devnet SOL

## Step 5: Configure Fallback (Optional)

What is Fallback?

- If no private match is found, route your order to public DEXs (Jupiter/Raydium)
- Privacy tradeoff: Public routing exposes order details

To enable:

1. Click "Fallback" toggle (turns purple when enabled)
2. Select timeout: 10 seconds (how long to wait for private match)
3. Read warning: "Fallback enabled — order may execute with reduced privacy"

Recommendation: Keep fallback disabled for maximum privacy on Devnet (Jupiter routing is not supported on Devnet).

## Step 6: Submit Order

1. Click "Place Limit Order" button
2. Wallet popup appears:
   - Program ID: `CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA`
   - Order Book: `63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ`
   - Escrow: (auto-generated PDA)
   - Token transfer: ~0.102 SOL (0.1 SOL + ~0.002 SOL rent)
   - Fee: ~0.000015 SOL
3. Click "Approve" in wallet

Wait for confirmation:

- Toast notification: "Submitting order to blockchain..."
- Success: "Order submitted successfully! Signature: 5xJ..."
- Order appears in Order History below the trade form with "Active" status

## Step 7: Check Order Status

1. Scroll down to "Order History" table
2. Your order appears with:
   - Order ID: (first 8 characters)
   - Pair: SOL/USDC
   - Status: Active (purple badge)
   - Created At: (timestamp)
   - Actions: "Cancel" button

Next steps:

- Wait for match: Keeper bot checks for matching orders every 10–30 seconds
- If matched: Status changes to "Filled" and tokens transfer
- If no match: Order stays "Active" until you cancel or a match appears

---

# Understanding Key Concepts

## Accounts and Ownership

On Solana, everything is an account:

- Your wallet: Holds SOL
- Token accounts: Hold SPL tokens (like USDC)
- Program accounts: Store order data

Example:

```
Your Wallet: 7xKxY3...  (holds 2.0 SOL)
    │
    ├─ USDC Token Account: 9mLqW5...  (holds 1000 USDC)
    │
    └─ Order Account: 5nPzT2...  (holds encrypted order)
            │
            └─ Escrow: 3kRfQ1...  (holds 0.1 SOL until order fills)
```

## Program Derived Addresses (PDAs)

PDAs are special accounts with no private key. Only the Solana program can control them.

Why PDAs?

- Your order needs to hold funds safely
- You shouldn't be able to withdraw funds before the order settles
- PDAs solve this: funds locked in escrow, only program can release them

PDA Seeds:

```
Order PDA = derive(
  "order",
  order_book_address,
  order_count
)

Escrow PDA = derive(
  "escrow",
  order_address
)
```

Example:

```
Order #42 for SOL/USDC orderbook:
  Order PDA: 8vQXz2...  (derived from "order" + orderbook + "42")
  Escrow PDA: 5mNpT1...  (derived from "escrow" + order PDA)
```

Key insight: PDAs are deterministic. Anyone can calculate the same address using the same seeds. But only the program can sign transactions for them.

## Token Decimals

Solana tokens use fixed-point arithmetic. There are no "floating point" numbers on-chain.

Decimal Places:

- SOL: 9 decimals → 1 SOL = 1,000,000,000 lamports
- USDC: 6 decimals → 1 USDC = 1,000,000 micro-units

Example:

```
User enters: "0.1 SOL"
Frontend converts: 0.1 × 10^9 = 100,000,000 lamports
Blockchain stores: 100000000 (u64 integer)

User enters: "142 USDC"
Frontend converts: 142 × 10^6 = 142,000,000 micro-units
Blockchain stores: 142000000 (u64 integer)
```

Price Representation:

```
Price on UI: "142 USDC per SOL"
Price on-chain: 142,000,000 micro-units ÷ 1,000,000,000 lamports
              = 0.142 (as a ratio of smallest units)
```

Why this matters:

- All math is done in integers (no rounding errors)
- Frontend must convert back: `100,000,000 lamports ÷ 10^9 = 0.1 SOL`
- Precision: up to 9 decimal places for SOL, 6 for USDC

## Wrapped SOL (WSOL)

Problem: Solana programs treat all tokens uniformly (SPL Token standard). But native SOL isn't an SPL token.

Solution: Wrap SOL into WSOL (Wrapped SOL), which is an SPL token.

Wrapped SOL Mint: `So11111111111111111111111111111111111111112`

How it works:

1. You sell 0.1 SOL in an order
2. Frontend wraps your SOL:
   - Transfers 0.1 SOL to your WSOL token account
   - Calls `syncNative()` to recognize it as WSOL
3. Program treats WSOL like any SPL token
4. When order fills or cancels, WSOL is unwrapped back to native SOL

You don't see this:

- Wrapping/unwrapping happens automatically
- Your wallet balance shows native SOL before and after

## Order States

Orders follow a lifecycle:

```
ACTIVE (1)
  ↓
  ├─ MATCHED_PENDING (5) → FILLED (3)   [successful match]
  │
  ├─ PARTIAL (2) → FILLED (3)           [multiple fills]
  │
  └─ CANCELLED (4)                       [user cancels]
```

Status codes:

- 1 = Active: Order is in orderbook, waiting for match
- 2 = Partial: Order partially filled (e.g., 0.05 of 0.1 SOL sold)
- 3 = Filled: Order fully executed
- 4 = Cancelled: User cancelled before fill
- 5 = Matched Pending: Keeper bot found a match, settlement in progress

UI colors:

- Green: Filled
- Yellow: Active, Partial, Matching
- Red: Cancelled

---

# Common Issues & Solutions

## Issue 1: "Order book is not active"

Error message:

```
Transaction failed: Order book is not active (error code 6000)
```

Cause: The orderbook for your trading pair doesn't exist or is paused.

Solution:

1. Verify you selected SOL/USDC (only supported pair on Devnet)
2. Check program is deployed:

```bash
solana account CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA --url devnet
```

3. If problem persists, contact support (orderbook may be down)

## Issue 2: "Insufficient balance"

Error message:

```
Transaction failed: Insufficient funds
```

Cause: You don't have enough SOL or USDC to place the order.

Solution:

1. Check wallet balances in ShadowSwap UI
2. Calculate total needed:
   - Order amount: 0.1 SOL
   - Rent (refundable): ~0.002 SOL
   - Network fee: ~0.000015 SOL
   - Total: ~0.102 SOL
3. Get more devnet SOL if needed (see Step 3 above)

For USDC:

- Check USDC balance: must be ≥ order amount
- Get more devnet USDC (see Step 4 above)

## Issue 3: "Wallet not connecting"

Cause: Wallet extension not detected or network mismatch.

Solution:

If no wallet detected:

1. Install Phantom or Solflare (see Step 1)
2. Refresh ShadowSwap page
3. Check extension is enabled in browser settings

If wallet connects but shows $0:

1. Verify wallet network is Devnet (not Mainnet)
2. Refresh page: `Cmd/Ctrl + Shift + R`
3. Disconnect and reconnect wallet

If transaction approval not showing:

1. Check browser didn't block wallet popup
2. Click wallet extension icon manually
3. Ensure wallet is unlocked

## Issue 4: "Transaction failed: Program error"

Error message:

```
Transaction failed: InvalidOrderStatus (error code 6001)
```

Cause: Order status changed between when you fetched it and tried to cancel it.

Solution:

1. Refresh page to see latest order status
2. Order may have already filled or been cancelled
3. Check Order History for current status

For other program errors:

1. Copy full error message
2. Check browser console: `F12` → Console tab
3. Report to Discord with:
   - Error message
   - Transaction signature
   - Order ID

## Issue 5: "Order not filling"

Cause: No matching order exists at your price, or orderbook is thin.

Why this happens:

- Your buy price is too low (below lowest sell order)
- Your sell price is too high (above highest buy order)
- Devnet has low liquidity (few traders)

Solution:

Option 1: Wait

- Limit orders can take minutes/hours to fill
- Check back later or leave order active

Option 2: Adjust price

1. Cancel current order (click "Cancel" in Order History)
2. Check current market price (displayed in trade form)
3. Place new order closer to market price:
   - Buying: Increase your bid slightly
   - Selling: Decrease your ask slightly

Option 3: Enable Fallback (Mainnet only)

1. Toggle "Fallback" on
2. Set timeout (e.g., 10 seconds)
3. If no private match, order routes to Jupiter
4. Note: Doesn't work on Devnet

Option 4: Use market order

- Click "Market" tab
- Enter amount
- Executes at best available price immediately

## Issue 6: "Wrong network" warning

Error:

```
Wallet is on Mainnet, but app expects Devnet
```

Cause: Wallet network doesn't match ShadowSwap network.

Solution:

- Open wallet extension
- Click network dropdown (says "Mainnet")
- Select "Devnet"
- Refresh ShadowSwap page
- Reconnect wallet

To verify:

- Wallet shows "Devnet" in network selector
- ShadowSwap shows your Devnet balance (not $0)

## Issue 7: "Order cancelled but funds not returned"

Expected: Rent (~0.002 SOL) is refunded when order cancels.

If funds missing:

- Wait 30 seconds for blockchain confirmation
- Check wallet transaction history
- Verify cancellation transaction succeeded:

  - Copy transaction signature from toast notification
  - Visit Solana Explorer (Devnet)
  - Paste signature and check status

If transaction failed:

- Error message will show in explorer
- Try cancelling again
- Report to support if persistent

## Issue 8: Browser console errors

If trade form doesn't load or buttons don't work:

- Open browser console: F12 or Cmd/Option + J (Mac)
- Click "Console" tab
- Look for errors (red text)

Common errors:

- "RPC endpoint not responding"
  - Solution: Check internet connection; Solana Devnet may be down (check status.solana.com)
- "Wallet not found"
  - Solution: Install wallet extension and refresh page
- "Failed to fetch"
  - Solution: Disable browser extensions that block network requests; try incognito mode

Copy error details:

- Right-click error → Copy message
- Share with support team for help

---

# What's Next?

You've successfully placed your first order on ShadowSwap Devnet! Here's what to explore:

Learn More About Privacy

- [MEV Protection](./mev-protection.md): Understand how ShadowSwap eliminates front-running and sandwich attacks
- [Privacy & Security](./privacy-security.md): Deep dive into encryption, Arcium MPC, and cryptographic guarantees

Master Advanced Trading

- [Trading Guide](./trading-guide.md): Learn about limit orders, market orders, fallback, and order management

Ready for Mainnet?

- Switch to Mainnet: Trade with real SOL and USDC
- Deeper liquidity: Access Jupiter and Sanctum routing for best prices
- Real privacy benefits: Protect your trades from MEV attacks

## Additional Resources

Devnet Tools

- Solana Explorer: https://explorer.solana.com/?cluster=devnet
- SOL Faucet: https://faucet.solana.com
- Solana CLI Docs: https://docs.solana.com/cli

ShadowSwap Links

- Discord: Join for support and updates (replace with actual link)
- Twitter: @ShadowSwapDEX (replace with actual handle)
- GitHub: https://github.com/yourorg/shadowswap

Need Help?

- Discord: Ask in #support channel
- Email: support@shadowswap.com (replace with actual)
- Documentation: You're reading it! Explore other pages for specific topics
