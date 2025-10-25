# Packages Directory

Reusable libraries shared across the apps live here. Every package is published via Yarn workspaces and can be imported with its `@shadowswap/...` alias.

## Available Packages

### `shared_types`
Holds canonical TypeScript interfaces for on-chain account layouts, encrypted payloads, and settlement data. Keeping these in sync prevents the frontend and keeper bot from drifting away from the Anchor IDL.

- Build: `yarn workspace @shadowswap/shared-types build`
- Entry point: `packages/shared_types/src/index.ts`
- Consumers: `apps/frontend`, `apps/settlement_bot`

When adding new structs to the Anchor program, update `shared_types`, run `yarn build:shared`, and commit the generated declarations so every app benefits immediately.
