# Apps

Everything that runs in production for ShadowSwap lives under `apps/`. Each subdirectory has its own README with deeper instructions; the table below helps you choose the right entry point.

| Folder | Stack | Purpose | Dev command |
| --- | --- | --- | --- |
| `anchor_program` | Anchor (Rust) | On-chain logic that stores encrypted orders, escrow PDAs, and settlement instructions. | `yarn anchor:build` / `yarn anchor:test` |
| `frontend` | Next.js (TypeScript) | Browser client for placing encrypted orders, monitoring balances, and viewing markets. | `yarn dev:frontend` |
| `settlement_bot` | Node.js (TypeScript) | Keeper daemon that decrypts, matches, and submits fills back to the program. | `yarn dev:bot` |

## Getting Around

- Start with the root README to set up shared dependencies and environment files.
- Each app README documents its required environment variables, build scripts, and troubleshooting tips.
- When you change the Anchor program, remember to propagate account layout updates to the frontend and settlement bot via `packages/shared_types`.

Need the automation scripts that glue these apps together? Check `scripts/README.md` in the repository root.
