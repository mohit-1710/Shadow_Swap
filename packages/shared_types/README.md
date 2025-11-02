# @shadowswap/shared-types

Canonical TypeScript definitions shared by every ShadowSwap client. Keeping this package in lockstep with the Anchor program eliminates serialization drift between the on-chain accounts and the off-chain code that reads them.

## Folder Structure

```
packages/shared_types/
├── src/
│   ├── accounts/        # Account layouts mirrored from the IDL
│   ├── enums.ts         # Instruction & status enums
│   ├── instructions/    # Helpers for building Anchor IX data
│   └── index.ts         # Public exports
├── dist/                # Emitted JS + type declarations (gitignored)
├── package.json
└── tsconfig.json
```

## Usage

```ts
import {
  EncryptedOrderAccount,
  OrderStatus,
  buildSubmitMatchResultsIx,
} from '@shadowswap/shared-types';
```

## Updating Types

1. Modify the Anchor program (`apps/anchor_program/programs/shadow_swap/src/lib.rs`).
2. Run `anchor build` to emit the latest IDL.
3. Mirror the IDL changes inside `src/` (accounts, enums, instruction helpers).
4. Rebuild the package:
   ```bash
   yarn workspace @shadowswap/shared-types build
   ```
5. Commit both the source edits and the updated generated artifacts in `dist/`.

## Guidelines

- Avoid importing runtime dependencies with heavy transitive trees—this package should stay light so it can be pulled into browsers as well as Node.js.
- Add documentation comments for new fields to clarify unit conventions (lamports vs tokens, fixed-point precision, etc.).
- When introducing breaking changes, update the root README and the settlement bot README so downstream consumers know how to migrate.
