# Scripts

Utility scripts that interact with the Anchor program and devnet PDAs live here. They are plain Node/TypeScript files invoked through package scripts.

| Script | Usage | Notes |
| --- | --- | --- |
| `setup-simple.js` | `ANCHOR_PROVIDER_URL=... ANCHOR_WALLET=... yarn anchor:setup` | Deploys the program (if needed), initializes the SOL/USDC order book, creates callback auth PDAs, and writes the keeper `.env`. |
| `view-orderbook.js` | `yarn view:orderbook` | Prints base/quote mints, fee configuration, and every order associated with the configured order book PDA. |
| `inspect-state.ts` | `yarn anchor:inspect` | TypeScript helper for inspecting arbitrary accounts via Anchor. |

Feel free to add more automation (e.g., stress testers, faucet helpers) but keep the table above current so contributors know what’s available.
