# ShadowSwap Documentation Hub

Reference material lives in this folder. Use it to understand the product surface, the on-chain program, and the privacy guarantees before diving into the code.

## What's Inside

| File | Audience | Summary |
| --- | --- | --- |
| [`getting-started.md`](./getting-started.md) | Traders & QA | Step-by-step walkthrough for configuring wallets on Solana devnet, acquiring test assets, and placing the first encrypted order. |
| [`trading-guide.md`](./trading-guide.md) | Power users | Deep dive into order types, balance management, troubleshooting fills, and best practices for keeping orders private. |
| [`mev-protection.md`](./mev-protection.md) | Researchers | Analysis of MEV vectors on Solana and how ShadowSwap’s architecture mitigates them. Includes citations and data points. |
| [`privacy-security.md`](./privacy-security.md) | Security & compliance | Threat model, cryptographic primitives, operational playbooks, and FAQ gathered during internal reviews. |

Looking for implementation details? Each app has its own README (`apps/**/README.md`), and the root README links to high-level workflows.

## Suggested Reading Paths

- **New contributors** → skim `getting-started.md` to understand the user flow, then read the relevant app README (program, frontend, or keeper bot).
- **Security reviewers** → start with `privacy-security.md` to see the threat model, then consult `mev-protection.md` for economic context.
- **Support/QA** → keep `trading-guide.md` handy; it lists the usual failure modes and their fixes.

## Contributing to Docs

1. Edit the relevant Markdown file in this directory or add a new one.
2. Link it here with a succinct description so others can discover it.
3. Reference real program IDs, PDA seeds, or code snippets whenever possible—avoid generic placeholders.
4. If you add user-facing instructions, validate them against the latest scripts (`yarn anchor:setup`, `yarn view:orderbook`, etc.).

Remember to keep sensitive information (private keys, RPC secrets) out of documentation. Use environment placeholders and mention where teams can find secure values instead.
