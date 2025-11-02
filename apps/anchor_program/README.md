# Anchor Program

The Anchor program powers ShadowSwap’s on-chain execution. It stores encrypted orders, manages escrow PDAs, authorises keeper callbacks, and settles trades without revealing clear-text order flow.

## Repository Layout

```
apps/anchor_program/
├── Anchor.toml                 # Workspace configuration + default program ID
├── programs/
│   └── shadow_swap/
│       ├── Cargo.toml
│       └── src/lib.rs          # Accounts, instructions, error codes
├── scripts/                    # Setup / inspection helpers (ts-node / node)
└── target/                     # Generated binaries + IDLs (gitignored)
```

## Development Commands

| Command | Description |
| --- | --- |
| `anchor build` / `yarn anchor:build` | Compile the program for the current target cluster. |
| `anchor test` / `yarn anchor:test` | Run ts-mocha suites against a local validator. |
| `anchor deploy` / `yarn anchor:deploy` | Deploy or upgrade using settings in `Anchor.toml`. |
| `yarn anchor:setup` | Deploy (if needed) and initialise the default SOL/USDC order book + keeper callback authority. |
| `yarn anchor:inspect` | Fetch and print arbitrary accounts using TypeScript helpers. |
| `yarn clear:orderbook` | Remove orders and PDAs created by the setup script. |

## Core PDAs

| PDA | Seeds | Purpose |
| --- | --- | --- |
| `order_book` | `["order_book", base_mint, quote_mint]` | Stores market configuration, fee basis points, order counters. |
| `order` | `["order", order_book, order_id]` | Holds encrypted payload, status, and escrow bump seeds. |
| `escrow` | `["escrow", order_pubkey]` | Owns the SPL token account that locks the maker’s funds. |
| `callback_auth` | `["callback_auth", order_book, keeper_pubkey]` | Grants a keeper permission to call `submit_match_results`. |

Refer to `src/lib.rs` for additional helper PDAs or seeds introduced during upgrades.

## Environment Variables

Scripts in this folder respect the following variables:

| Variable | Description |
| --- | --- |
| `ANCHOR_PROVIDER_URL` | RPC endpoint (`https://api.devnet.solana.com` by default). |
| `ANCHOR_WALLET` | Path to the deployer/upgrade authority keypair (`~/.config/solana/id.json`). |
| `SHADOWSWAP_PROGRAM_ID` | Program ID to build/deploy; overrides the value in `Anchor.toml` when set. |

## Making Changes Safely

1. Update accounts/instructions inside `programs/shadow_swap/src/lib.rs`.
2. Rebuild the program (`anchor build`) to regenerate the IDL under `target/idl/shadow_swap.json`.
3. Mirror layout changes in `packages/shared_types` and run `yarn build:shared`.
4. Adjust the settlement bot or frontend logic if new instructions/PDA schemas are introduced.
5. Document migrations or manual steps in the root README and `apps/anchor_program/TEST_SUMMARY.md`.

Treat PDA seeds as part of the public API. When breaking changes are unavoidable, add upgrade routines or keep the old seeds alive until all off-chain services are updated.
