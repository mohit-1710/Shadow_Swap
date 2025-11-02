# Scripts

This folder holds operational helpers that are handy during local testing and devnet bring-up.

## Root-Level Utilities

| File | Command | What it does |
| --- | --- | --- |
| `create-token-accounts.sh` | `bash scripts/create-token-accounts.sh` | Creates (or reuses) SPL token accounts for SOL/USDC on devnet, wraps SOL if needed, and prints balances. Requires the Solana CLI and SPL token CLI. |

## Anchor Program Helpers

Additional scripts live under `apps/anchor_program/scripts/` and are exposed through Yarn commands:

| Yarn command | Underlying script | Purpose |
| --- | --- | --- |
| `yarn anchor:setup` | `apps/anchor_program/scripts/setup-simple.js` | Deploys (if needed) and seeds the default SOL/USDC order book, including callback authorities for the keeper. |
| `yarn view:orderbook` | `apps/anchor_program/scripts/view-orderbook.js` | Prints order book configuration and currently stored encrypted orders. |
| `yarn anchor:inspect` | `apps/anchor_program/scripts/inspect-state.ts` | Fetches arbitrary accounts via Anchor and pretty-prints them. |
| `yarn clear:orderbook` | `apps/anchor_program/scripts/clear-orderbook.js` | Removes state created by the setup script so you can start clean. |

## Usage Tips

- Run commands from the repository root so relative imports and `Anchor.toml` paths resolve correctly.
- Provide `ANCHOR_PROVIDER_URL` and `ANCHOR_WALLET` when scripts interact with Solana; they default to the values in `Anchor.toml`.
- Never commit generated `.env` files containing private keys or API secrets—treat the outputs as local helpers only.

Have another operational workflow? Drop the script here (or under the anchor-program scripts directory), add a Yarn command, and update this README so teammates can discover it quickly.
