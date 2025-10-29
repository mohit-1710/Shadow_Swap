# ShadowSwap – Learn the Codebase

ShadowSwap is a privacy‑preserving orderbook DEX on Solana. Users submit encrypted orders to the chain, an off‑chain keeper bot decrypts and matches them, and a stateless Anchor program finalizes settlement via escrowed SPL token accounts.

This guide orients you to the repository, the intent behind each module, and how everything fits together.

## Big Picture

- Intent: Enable private orders and MEV‑resistant settlement without leaking price/size on‑chain.
- Architecture:
  - Frontend encrypts orders client‑side and submits to the program.
  - Anchor program stores encrypted orders, manages PDAs/escrows, and settles fills.
  - Settlement bot decrypts, matches, and calls settlement instructions (optionally through a protected gateway).
  - Shared types keep clients in sync on structures and constants.

## Repository Index

Top‑level workspaces and notable files:

- `apps/anchor_program` – Anchor smart contract and scripts
  - `apps/anchor_program/Anchor.toml` – provider and test harness config
  - `apps/anchor_program/Cargo.toml` – workspace crate settings
  - `apps/anchor_program/programs/shadow_swap/src/lib.rs` – on‑chain logic (instructions, accounts, seeds)
  - `apps/anchor_program/scripts/` – devnet setup, inspection, orderbook maintenance
- `apps/frontend` – Next.js 14 UI
  - `apps/frontend/pages/_app.tsx` – wallet and connection providers
  - `apps/frontend/pages/index.tsx` – main page with form + orderbook
  - `apps/frontend/components/OrderSubmissionForm.tsx` – encrypt + submit flow
  - `apps/frontend/components/OrderBookDisplay.tsx` – fetch and cancel flows
  - `apps/frontend/components/WalletConnectionProvider.tsx` – wallet adapters and network
  - `apps/frontend/lib/arcium.ts` – encryption (Arcium integration placeholder)
  - `apps/frontend/lib/program.ts` – PDA + program client helpers
  - `apps/frontend/lib/tokenUtils.ts` – SPL token helpers
- `apps/settlement_bot` – Keeper bot
  - `apps/settlement_bot/src/index.ts` – main loop (fetch → decrypt → match → settle)
  - `apps/settlement_bot/src/matcher.ts` – price‑time matching + validation
  - `apps/settlement_bot/src/arcium-client.ts` – Arcium MPC client (mock/real)
  - `apps/settlement_bot/src/sanctum-client.ts` – transaction submission (direct/MEV gateway)
  - `apps/settlement_bot/src/types.ts` – keeper configs and order types
- `packages/shared_types` – Shared TypeScript contracts
  - `packages/shared_types/src/index.ts` – enums, account shapes, PDA seed strings
- `scripts/create-token-accounts.sh` – convenience script for token testing
- `Project_Details/` – LLDs and planning PDFs
- Root configs
  - `package.json` – workspace scripts and anchors to sub‑apps
  - `env.example` – shared base env

## Workspace Commands (root `package.json`)

- Install deps: `yarn install`
- Shared types: `yarn build:shared`
- Anchor build/test/deploy: `yarn anchor:build` | `yarn anchor:test` | `yarn anchor:deploy`
- Frontend: `yarn dev:frontend` | `yarn build:frontend`
- Settlement bot: `yarn dev:bot` | `yarn build:bot`
- Run both (dev): `yarn dev:both`
- Utilities: `yarn clear:orderbook` | `yarn anchor:setup` | `yarn anchor:inspect` | `yarn view:orderbook`

## Architecture and Data Flow

Order lifecycle overview:

1. User fills form in the UI (`OrderSubmissionForm.tsx`).
2. UI validates and encrypts order client‑side (`lib/arcium.ts`).
3. UI derives PDAs and submits `submit_encrypted_order` to Anchor.
4. Program creates an `EncryptedOrder` + `Escrow` PDA, funds escrow via SPL transfer, and stores encrypted payload.
5. Keeper bot polls, fetches active orders, decrypts via Arcium MPC, and matches (`matcher.ts`).
6. Keeper submits `submit_match_results` with matched amounts; program settles via escrow token transfers and updates statuses.

Security and privacy intent:

- Orders remain opaque on‑chain (cipher payload and encrypted remaining amounts).
- Off‑chain keeper authorization uses a `CallbackAuth` PDA to gate settlement calls.
- Settlement moves funds only between PDAs and user accounts using signer seeds; fees are calculated via `fee_bps` and collected by `fee_collector`.

## Anchor Program (on‑chain)

Location: `apps/anchor_program/programs/shadow_swap/src/lib.rs`

Key instructions:

- `initialize_order_book(authority, base_mint, quote_mint, fee_bps, min_base_order_size)`
  - Creates `OrderBook` PDA and enables trading pair.
- `submit_encrypted_order(cipher_payload, encrypted_amount)`
  - Creates `EncryptedOrder` and `Escrow` PDAs; transfers user funds into escrow token account.
  - Validates sizes against `MAX_CIPHER_PAYLOAD_SIZE` and `MAX_ENCRYPTED_AMOUNT_SIZE`.
- `cancel_order()`
  - Owner‑only; returns escrow funds and marks order canceled.
- `create_callback_auth(keeper, expires_at)`
  - Issues a `CallbackAuth` PDA allowing the keeper to submit matches until expiry.
- `submit_match_results(match_input)`
  - Keeper‑only; transfers quote from buyer escrow to seller and base from seller escrow to buyer, marks both orders filled, and emits `TradeSettled`.

Core accounts (selected fields):

- `OrderBook` – authority, base/quote mints, counts, encrypted volume, `fee_bps`, `fee_collector`, `min_base_order_size`, `is_active`, `bump`.
- `EncryptedOrder` – owner, `order_book`, `cipher_payload`, `status`, `encrypted_remaining`, `escrow`, timestamps, `order_id`, `bump`.
- `Escrow` – `order`, owner, `order_book`, `token_account`, `token_mint`, encrypted amounts, timestamps, `bump`.
- `CallbackAuth` – keeper authority, `order_book`, `nonce`, `expires_at`, `is_active`, timestamps, `bump`.

Seeds and constants (shared in TS): `ORDER_BOOK_SEED`, `ORDER_SEED`, `ESCROW_SEED`, `CALLBACK_AUTH_SEED`, `MAX_CIPHER_PAYLOAD_SIZE` (512), `MAX_ENCRYPTED_AMOUNT_SIZE` (64).

Scripts:

- `scripts/setup-devnet.ts` and `scripts/setup-simple.js` – create order book, fee collector, and fixtures.
- `scripts/inspect-state.ts` – read PDAs and print state.
- `scripts/clear-*` – clear orders/orderbook for clean testing.

## Frontend (Next.js)

Location: `apps/frontend`

Highlights:

- Wallet and connection: `pages/_app.tsx` with `components/WalletConnectionProvider.tsx`.
- Home view: `pages/index.tsx` renders the order submission form and orderbook.
- Order submission: `components/OrderSubmissionForm.tsx`
  - Validates inputs, encrypts with `lib/arcium.ts`, derives PDAs (`lib/program.ts`).
  - Creates/funds associated token accounts as needed, wraps/unwraps WSOL where required.
  - Calls Anchor methods via `@coral-xyz/anchor` client using the program ID and IDL.
- Order list and cancellation: `components/OrderBookDisplay.tsx`
  - Fetches active orders from program accounts, shows balances, cancels orders with correct escrow mint routing.
- Encryption utilities: `lib/arcium.ts`
  - Placeholder for Arcium SDK (ephemeral keys, nonce, cipher generation). Produces a fixed‑size 512‑byte payload in dev.
- Program helpers: `lib/program.ts`
  - PDA derivations and typed client setup from IDL.
- Token utils: `lib/tokenUtils.ts`
  - ATA derivation/creation, balance helpers, amount formatting.

Config (env): `apps/frontend/env.example`

- `NEXT_PUBLIC_PROGRAM_ID`, `NEXT_PUBLIC_ORDER_BOOK_PUBKEY`
- `NEXT_PUBLIC_BASE_MINT`, `NEXT_PUBLIC_QUOTE_MINT`
- `NEXT_PUBLIC_RPC_URL`, optional refresh intervals, etc.

## Settlement Bot (keeper)

Location: `apps/settlement_bot`

Responsibilities:

- Fetch active `EncryptedOrder` accounts for the configured order book.
- Decrypt payloads using Arcium MPC (`arcium-client.ts`; mock available for local).
- Match orders using price‑time priority (`matcher.ts`), validate amounts and overflow bounds.
- Submit settlements via `submit_match_results` using either direct RPC or Sanctum (`sanctum-client.ts`).
- Maintain and verify keeper authorization via `CallbackAuth` PDA.

Entry point: `src/index.ts`

- Initializes connection, loads IDL, derives PDAs, sets up Arcium/Sanctum clients.
- Main loop: fetch → decrypt → match → validate → submit → log stats.

Config (env): `apps/settlement_bot/.env.example`

- RPC and WebSocket URLs; order book and program IDs.
- Keeper keypair path; Arcium MPC URL/key; Sanctum gateway.
- Flags: `USE_DIRECT_RPC`, `USE_MOCK_ARCIUM`, `USE_MOCK_SANCTUM`.

## Shared Types

Location: `packages/shared_types/src/index.ts`

- Enums: `OrderStatus`, `OrderSide`.
- Account shapes: `EncryptedOrderData`, `OrderBookData`, `EscrowData`, `CallbackAuthData`.
- Match shape: `TradeMatch`.
- Constants: payload sizes and PDA seeds shared with clients.

Build once with `yarn build:shared` before building other workspaces to ensure type declarations exist.

## How To Run Everything Locally

1. Install and build shared contracts
   - `yarn install`
   - `yarn build:shared`
2. Deploy or set up the program and order book
   - Provide `ANCHOR_PROVIDER_URL` and `ANCHOR_WALLET`
   - `yarn anchor:setup` (deploy/build/init + default PDAs on devnet)
3. Run the frontend
   - Copy `apps/frontend/env.example` → `.env.local` and set program/order book/mints
   - `yarn dev:frontend`
4. Run the keeper bot
   - Copy `apps/settlement_bot/.env.example` → `.env`
   - `yarn dev:bot`

Notes:

- Never commit real keypairs or .env files; use the examples as templates.
- The frontend can submit orders without the keeper running; they’ll queue until matched.

## Testing

- Anchor program: `yarn anchor:test` (ts‑mocha under `apps/anchor_program/tests` when present).
- Frontend: lint plus manual flows; add Vitest/RTL tests for components when extending UI.
- Bot: add deterministic unit tests around matcher logic; mock Arcium/Sanctum for CI.

Target unhappy paths for on‑chain tests: insufficient escrow, authority mismatch, replay attempts, payload size bounds.

## Key Design Choices and Intent

- Privacy first: All sensitive order fields are encrypted client‑side; on‑chain state only hosts opaque bytes and minimal metadata.
- Stateless settlement: Program performs transfers using signer PDAs; no orderbook sorting or price logic on‑chain.
- Off‑chain matching: Facilitates richer matching policies and MEV‑resistant submission without bloating compute/bandwidth.
- Shared contracts: Types and constants exported once to prevent drift between UI and bot.

## Troubleshooting

- Program/IDL mismatch: Ensure the frontend IDL and `PROGRAM_ID` match deployed program; rebuild shared types and restart dev servers.
- Missing token accounts: UI and bot create ATAs when needed, but legacy orders may lack WSOL wrapping; re‑run setup or cancel old orders.
- `NumericalOverflow` on settlement: Indicates amount/price conversion overflow; verify decimals and matcher math.
- Keeper not authorized: Recreate `CallbackAuth` via `create_callback_auth` or rerun setup script with the keeper pubkey.

## Next Steps

- Replace placeholder encryption in `lib/arcium.ts` with real Arcium SDK calls.
- Expand tests in `apps/anchor_program/tests` and add RTL specs for critical UI components.
- Document precise IDL versioning and publish shared IDL artifacts alongside `@shadowswap/shared-types`.

---

For deeper specs and diagrams, see `Project_Details/` and each package’s local `README.md` files.

