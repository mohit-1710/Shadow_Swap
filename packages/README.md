# Packages

All shared libraries are published as Yarn workspaces under the `@shadowswap/*` namespace. Keeping reusable logic here prevents the frontend, settlement bot, and future services from copy/pasting critical types or utilities.

## Available Packages

| Package | Location | Summary | Build command | Consumers |
| --- | --- | --- | --- | --- |
| `@shadowswap/shared-types` | `packages/shared_types` | Canonical TypeScript definitions that mirror the Anchor IDL (accounts, instructions, enums, helpers). | `yarn workspace @shadowswap/shared-types build` | `apps/frontend`, `apps/settlement_bot`, scripts |

## Workflow

1. Update the Anchor program (`apps/anchor_program`) and regenerate the IDL.
2. Reflect any account or instruction changes inside the relevant package (`src/`).
3. Run `yarn build:shared` from the repository root to emit fresh `dist/` artifacts.
4. Commit both source edits and the generated declaration files so downstream apps stay type-safe.

## Adding a New Package

1. `mkdir packages/<name>` and create a `package.json` with `"name": "@shadowswap/<name>"`.
2. Add build/test scripts (TypeScript, Jest, etc.) and configure `tsconfig.json`.
3. Export everything from `src/index.ts` and document the package in this README.
4. Reference the new package from apps via `import { ... } from '@shadowswap/<name>'`.

Keep packages small and focused. If a package starts depending on Solana RPC credentials or runtime secrets, consider moving that logic into an app instead.
