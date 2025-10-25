# Anchor Program

Smart contract for ShadowSwap. It manages encrypted order books, escrow PDAs, and settlement instructions.

## Structure

```
apps/anchor_program/
├── Anchor.toml          # Workspace + deployment config
├── programs/
│   └── shadow_swap/
│       ├── Cargo.toml
│       └── src/lib.rs  # Instructions + account structs
├── scripts/             # Deployment & inspection helpers
└── target/              # Generated artifacts (IDL, binaries)
```

## Key PDAs

| PDA | Seeds | Purpose |
| --- | --- | --- |
| `order_book` | `['order_book', baseMint, quoteMint]` | Stores trading pair config & counters |
| `order` | `['order', orderBook, orderCount]` | Stores encrypted payload + status |
| `escrow` | `['escrow', order]` | Owns the token account holding funds for an order |
| `callback_auth` | `['callback_auth', orderBook, keeper]` | Authorizes a keeper bot to submit match results |

## Commands

```bash
# Compile the program
anchor build

# Run test suite (local validator)
anchor test

# Deploy to devnet (respects Anchor.toml)
SKIP_TESTS=1 anchor deploy

# Initialize the default SOL/USDC order book + keeper auth
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
yarn anchor:setup
```

## Environment

The following environment variables are read by the scripts:

| Variable | Description |
| --- | --- |
| `ANCHOR_PROVIDER_URL` | RPC endpoint (e.g., `https://api.devnet.solana.com`) |
| `ANCHOR_WALLET` | Path to the deployer keypair (default `~/.config/solana/id.json`) |
| `SHADOWSWAP_PROGRAM_ID` | Program to upgrade/deploy (defaults to `5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt`) |

## Adding New Instructions

1. Define account structs + instruction handlers in `src/lib.rs`.
2. Re-run `anchor build` to regenerate `target/idl/shadow_swap.json`.
3. Update `packages/shared_types` so the frontend/bot stay aligned.
4. Extend settlement bot logic if the keeper flow changes.

Keep migrations backwards compatible and document any PDA changes inside the root README.
