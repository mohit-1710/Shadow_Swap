---
title: Trading Guide
description: Master limit and market orders, Fallback, order management, and best practices on ShadowSwap
lastUpdated: 2025-01-30
---

# Trading Guide

This guide teaches you how to trade confidently and privately on ShadowSwap. You’ll learn order types, how to place and manage orders, when to use Fallback, and how to avoid common pitfalls. For a first-time walkthrough, start with Getting Started.

- Getting set up: ./getting-started.md
- Why this is private: ./mev-protection.md
- Cryptography details: ./privacy-security.md

## Order Types

### Limit orders

Use limit orders when you want exact prices and can wait for a match.

- Control execution price precisely
- Highest privacy (private matching first)
- Can partially fill and remain Active until fully filled or cancelled

Example

```
Sell 0.25 SOL at 140 USDC → receive 35.00 USDC when matched
```

### Market orders

Use market orders when time matters more than price.

- Fills against the best available price
- Suitable for small or urgent trades
- May execute at a slightly different price than shown if liquidity shifts

Tip: On Devnet, liquidity is thin. Prefer limit orders unless you’re testing execution flow.

## Prices, amounts, and decimals

- SOL uses 9 decimals; 1 SOL = 1,000,000,000 lamports
- USDC uses 6 decimals; 1 USDC = 1,000,000 micro-units

Examples

```
UI amount 0.1 SOL → 100,000,000 lamports
UI price 142 USDC  → 142,000,000 micro-units per SOL
```

## Place a limit order

The steps are the same for buying or selling; only the “From/To” tokens differ.

1. Select Limit
2. Choose pair SOL/USDC (Devnet supports only SOL/USDC)
3. Enter Amount in From
4. Enter Price in USDC per SOL
5. (Optional) Enable Fallback and set timeout
6. Place Limit Order and approve in wallet

What happens next

- Your encrypted order is stored on-chain
- Keeper checks for a private match every few seconds
- If matched, settlement transfers tokens atomically
- If Fallback is enabled and no match appears before timeout, the app creates a public DEX route (Mainnet only)

Worked example

```
Sell 0.25 SOL at 140 USDC
Expected receive = 0.25 × 140 = 35.00 USDC
Trading fee (0.1%) ≈ 0.035 USDC
Net ≈ 34.965 USDC
```

## Place a market order

1. Select Market
2. Enter Amount
3. Review the estimated price shown in the form
4. Execute Market Order and approve in wallet

Notes

- Execution uses the best available price at the time of match
- On thin orderbooks, actual fill may differ slightly from the estimate

## Using Fallback (optional)

Fallback routes your order to public liquidity if no private match is found within your timeout window.

- Privacy trade-off: public routing reveals the trade on-chain
- Useful for urgent execution on Mainnet
- Not available on Devnet routing paths

How to use

1. Toggle Fallback on
2. Choose timeout (e.g., 10 seconds)
3. Review the privacy notice and confirm

Recommendation

- Keep Fallback off for maximum privacy on Devnet
- On Mainnet, enable Fallback for time-sensitive execution when privacy tolerance allows

## Order management

### Statuses

- Active: Waiting for match
- Partial: Partially filled, remaining stays Active
- Matched Pending: Found a match, settlement in progress
- Filled: Fully executed, immutable
- Cancelled: User cancelled

### View and cancel orders

1. Open the Order History table
2. Review ID, pair, status, time, and actions
3. Click Cancel for Active or Partial orders

When you cancel

- Funds return from escrow to your wallet
- Rent (~0.002 SOL) is refunded on account close

## Fees and costs

- Protocol fee: 0.1% per executed trade
- Network fee: ~0.000005 SOL per signature (varies)
- Temporary rent: ~0.002 SOL for token accounts (refunded on close)

Example fee math

```
Buy 5 SOL at 142 USDC → 710 USDC
Protocol fee 0.1% = 0.71 USDC
Total paid ≈ 710.71 USDC (+ small network fees)
```

## Examples

Example 1 — Buy SOL with USDC (limit)

```
Goal: Buy 2 SOL at 140 USDC
Place: From USDC 280 → To SOL 2.0 at 140
Fee: ≈ 0.28 USDC
Result: Receive 2 SOL when matched
```

Example 2 — Sell SOL for USDC (limit)

```
Goal: Sell 0.6 SOL at 150 USDC
Place: From SOL 0.6 → To USDC 90.0 at 150
Fee: ≈ 0.09 USDC
Result: Receive ≈ 89.91 USDC net after fee
```

Example 3 — Market buy (fast execution)

```
Goal: Buy 0.5 SOL immediately
Place: From USDC (auto-quote shown)
Note: Final price tracks best available
```

## Tips for better fills

- Price-time priority: earlier orders at better prices get filled first
- Improve price slightly to move ahead in the queue
- Use limit orders for larger trades to avoid market impact
- Consider partial fills—leave the rest to work

## Troubleshooting

Order didn’t fill

- Your price is away from current market
- Liquidity is thin on Devnet — wait or adjust
- Consider enabling Fallback on Mainnet

Insufficient balance

- Ensure you have enough SOL or USDC plus rent and network fees
- See ./getting-started.md for faucets and setup

Wrong network

- Set wallet to Devnet for testing
- Refresh after switching networks

Fallback didn’t execute on Devnet

- Public routing isn’t available on Devnet
- Test Fallback on Mainnet when live

Market order filled worse than estimate

- Price moved before match
- Prefer limit orders for precise control

## Keyboard and safety

- Always review the wallet prompt: program ID and accounts
- Never approve unknown transactions
- Keep the app open until you see confirmation

## Learn more

- Getting Started: ./getting-started.md
- MEV Protection: ./mev-protection.md
- Privacy & Security: ./privacy-security.md

