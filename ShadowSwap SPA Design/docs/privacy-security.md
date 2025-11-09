---
title: Privacy & Security
description: What stays private on ShadowSwap, how encryption works, threat model and mitigations, and how to trade safely
lastUpdated: 2025-01-30
---

# Privacy & Security

ShadowSwap is purpose‑built to remove MEV from trading. This page explains what stays private, how encryption and settlement work, our current trust assumptions, and how you can trade safely today.

- First trade walkthrough: ./getting-started.md
- MEV background and data: ./mev-protection.md
- Trading how‑to: ./trading-guide.md

## What’s private vs. public

ShadowSwap minimizes public information while keeping settlement verifiable.

| Aspect | Private | Public |
|---|---|---|
| Order side (buy/sell) | ✅ |  |
| Order price | ✅ |  |
| Order amount | ✅ |  |
| Cipher payload |  | ✅ 512‑byte blob |
| Wallet address (for settlement) |  | ✅ |
| Order status, timestamps |  | ✅ |
| Settlement transfers |  | ✅ On‑chain token transfers |

Key idea: order intent is always encrypted on‑chain; only the final settlement is public.

## Data flow (high level)

```
User → Frontend (encrypts 24‑byte order → 512‑byte cipher)
     → Solana (stores encrypted order + escrow)
     → Keeper (fetches ciphers; private matching)
     → Settlement (atomic token transfers on‑chain)
```

Current trust boundary: Orders are encrypted on‑chain; keeper decrypts off‑chain to match. See MPC roadmap below.

## Encryption and padding

- Serialize fields to 24 bytes: side (u32), amount (u64), price (u64), timestamp (u32)
- Encrypt client‑side using standard AEAD (conceptual equivalence to AES‑256‑GCM)
- Pad each payload to exactly 512 bytes to prevent size inference

Why 512 bytes?

- Makes small and large orders indistinguishable
- Leaves room for IV/tag and future metadata
- Fits safely within Solana transaction limits

Example (conceptual):

```typescript
const serialized = serializeOrder({ side, amount, price, timestamp })
const cipher = encrypt(serialized, key)
const fixed = padTo512Bytes(cipher)
submitOrder(fixed)
```

Result: on‑chain, every order looks like a uniform 512‑byte ciphertext.

## Matching and MPC roadmap

Today (Devnet):

- Keeper fetches encrypted orders
- Decrypts locally, runs price‑time matching, builds settlement
- Submits a single, atomic settlement transaction

Roadmap (Mainnet+ as MPC primitives mature):

- Orders remain encrypted end‑to‑end
- Matching runs inside Arcium MPC; keeper never sees plaintext
- Verifiable results: cryptographic proofs attest correct matching

Benefits: zero‑trust matching, preserved privacy even from operators, strong auditability.

## Settlement and fund safety

Settlement uses Program Derived Addresses (PDAs) to hold funds until a match is finalized.

- Escrow PDAs have no private key; only the program can sign
- Atomic settlement: USDC flows to seller, WSOL/SOL flows to buyer in one transaction
- If any leg fails, the transaction reverts
- On cancel, escrow returns funds and rent (~0.002 SOL)

WSOL handling

- If selling SOL, the client wraps SOL to WSOL (SPL) and syncs the native balance
- On settlement/cancel, WSOL unwraps back to native SOL automatically

## Threat model

What we defend against by design:

- Mempool snooping and traditional front‑running → orders are encrypted
- Sandwich attacks during order submission → no public order details exist
- Validator reordering for profit → matching occurs off‑chain prior to settlement

Risks we mitigate operationally (today):

- Keeper visibility of plaintext during matching
  - Mitigations: open‑source code, permissioned access via CallbackAuth, public logs, multi‑keeper redundancy
  - Roadmap: Arcium MPC to remove plaintext exposure altogether

- Timing analysis (when orders arrive, settlement cadence)
  - Fixed‑size ciphers; settlement batching; randomized bot polling

- Replay/cancel race conditions
  - Status checks on‑chain; idempotent transitions; PDA signer seeds

- UI tampering / phishing
  - Clear program IDs; wallet prompts show accounts/PDAs; link hygiene below

Out‑of‑scope risks to consider:

- Compromised user device or wallet
- Malicious browser extensions injecting code
- Untrusted RPC endpoints that observe metadata (not payload contents)

## User safety checklist

- Verify the program ID in wallet prompts: `CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA`
- Confirm destination accounts look like PDAs for order/escrow (derived, not EOAs)
- Keep Fallback off for maximum privacy (Devnet); enable on Mainnet only if execution speed is critical
- Use strong OS/browser hygiene; keep Phantom/Solflare up to date
- Disable unknown extensions when trading; avoid copy‑pasted scripts in DevTools

## RPC and configuration

- Default to reputable RPC endpoints; avoid sharing wallet secrets anywhere
- Consider dedicated RPC for trading to reduce noisy retries/timeouts
- If you self‑host RPC, run over HTTPS with strict TLS; avoid logging PII

Environment variables (local testing)

```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json
```

## Audits and verification

- Program logic: open‑source Anchor code (`apps/anchor_program/programs/shadow_swap/src/lib.rs`)
- Settlement events: emitted on every fill; inspect via Solana Explorer
- Keeper: open‑source TypeScript; deterministic matching given the same inputs
- Planned security audit before Mainnet; we will publish findings and remediation timelines

Verifying encryption on your order

```bash
solana account <ORDER_PUBKEY> --url devnet
# Confirm: 512‑byte cipher payload, no plaintext fields
```

## Privacy FAQs

Is my order visible to validators?

- No. Only a 512‑byte ciphertext is stored on‑chain. No side/price/amount are recoverable from the chain.

Can validators extract MEV on settlement?

- The settlement reveals only matched_amount and execution_price when already finalized. Atomicity prevents front‑running the outcome.

Does Fallback break privacy?

- Partially. The fallback leg executes on public DEX liquidity; that leg is public like any AMM swap. Use only when you prioritize execution speed over privacy.

What happens if MPC is down?

- Today: matching is off‑chain in the keeper. Future: matching via MPC; if MPC is unavailable, orders remain safe on‑chain and can be cancelled.

Can I cancel anytime?

- Yes, for Active/Partial orders. Cancellation returns escrow and rent; filled/cancelled orders are immutable.

## Compliance and data handling

- ShadowSwap does not store user PII on its chain logic; wallet addresses are pseudonymous
- Logs exclude wallet seeds/keys; operators must scrub sensitive fields in infrastructure logs
- Respect regional restrictions and local regulations when routing to public liquidity (Mainnet)

## Incident response

If you suspect an issue:

1. Stop trading and collect evidence: tx signatures, timestamps, UI screenshots
2. Check network status and Explorer for confirmations
3. Contact support with details (see below)

Recovery basics:

- Cancelling an order returns escrowed tokens and rent after finalization
- If settlement failed, Keeper will retry or mark the pair as invalid; funds remain in escrow until a valid transition

## Next steps and resources

- Getting Started: ./getting-started.md
- MEV Protection: ./mev-protection.md
- Trading Guide: ./trading-guide.md

External references

- Solana Explorer (Devnet): https://explorer.solana.com/?cluster=devnet
- Solana Security Best Practices: https://docs.solana.com/security
- Anchor Framework: https://www.anchor-lang.com

Community & support

- Discord: Join for support and updates (replace with actual link)
- Twitter: @ShadowSwapDEX (replace with actual handle)
- Email: support@shadowswap.com (replace with actual)

