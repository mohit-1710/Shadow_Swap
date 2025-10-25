# Apps Directory

This workspace bundles every executable part of ShadowSwap:

| Folder | Description | Key Commands |
| --- | --- | --- |
| `anchor_program` | Anchor-based Solana program that owns the order book, escrow PDAs, and settlement logic. | `yarn anchor:build`, `yarn anchor:test`, `anchor deploy` |
| `frontend` | Next.js 14 UI for wallet connection, encryption, WSOL/USDC handling, and order management. | `yarn dev`, `yarn build`, `yarn lint` |
| `settlement_bot` | TypeScript keeper bot that decrypts orders (via Arcium), matches them, and submits `submit_match_results` transactions. | `yarn dev`, `yarn build` |

See each subfolder’s README for a deep dive into its architecture, required environment variables, and troubleshooting tips.
