# Shared Types

Canonical TypeScript definitions for data structures that appear in multiple apps (frontend, keeper bot, future services).

## Contents

- Account interfaces mirroring the Anchor IDL (order book, encrypted order, escrow).
- Helper enums for order statuses and instruction discriminators.
- Utility functions to deserialize Anchor accounts (if needed).

## Usage

```ts
import { OrderStatus, EncryptedOrderAccount } from '@shadowswap/shared-types';
```

Whenever you change the on-chain layout (`apps/anchor_program/programs/shadow_swap/src/lib.rs`), update the definitions here and run:

```bash
yarn workspace @shadowswap/shared-types build
```

This keeps the frontend and keeper bot type-safe without copy/pasting structs.
