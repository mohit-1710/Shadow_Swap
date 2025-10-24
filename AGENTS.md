# Repository Guidelines

## Project Structure & Module Organization
ShadowSwap is a Yarn workspaces monorepo. On-chain logic lives in `apps/anchor_program/` (Anchor program plus scripts), the Next.js UI resides under `apps/frontend/`, the settlement bot operates from `apps/settlement_bot/`, shared TypeScript definitions sit in `packages/shared_types/`, automation helpers live in `scripts/`, and specs are collected in `Project_Details/`. Add assets beside the module they serve and route shared contracts through `packages/shared_types` to avoid duplication.

## Build, Test, and Development Commands
- `yarn install` – install workspace dependencies.
- `yarn build:shared` – emit shared type declarations consumed by all clients.
- `yarn anchor:build | yarn anchor:deploy` – compile/deploy the Anchor program from `apps/anchor_program`.
- `yarn anchor:test` (alias `yarn test`) – run the ts-mocha harness over `tests/**/*.ts`.
- `yarn dev:frontend`, `yarn dev:bot`, `yarn dev:both` – start local UI/bot loops.
- `yarn build:frontend | yarn build:bot | yarn build:all` – produce production artifacts.
- `yarn clear:orderbook`, `yarn anchor:setup`, `yarn anchor:inspect` – utility flows for resetting or inspecting state.

## Coding Style & Naming Conventions
Use TypeScript + React strict mode (see `apps/frontend/tsconfig.json`) and enforce lint via `yarn workspace @shadowswap/frontend lint`. Keep React components functional with PascalCase filenames under `apps/frontend/components/` and camelCase hooks/utilities. Anchor Rust modules should follow 4-space indentation, snake_case accounts/instructions, and run `cargo fmt` before committing. Shared types exported from `packages/shared_types/src` should be versioned and re-used, not re-declared inline.

## Testing Guidelines
End-to-end program coverage runs through `yarn anchor:test`, which executes ts-mocha suites defined in `apps/anchor_program/tests`. Name specs `<feature>.spec.ts` and keep fixtures in `tests/utils/`. Frontend changes should include Vitest/RTL component tests or clearly document manual steps; bot helpers need deterministic unit tests around the matching math. Target unhappy-path coverage for instructions (insufficient escrow, authority mismatch, replay attempts) and document gaps in `apps/anchor_program/TEST_SUMMARY.md`.

## Commit & Pull Request Guidelines
The history shows lightweight Conventional Commit prefixes (`feature:`, `fix:`); continue with scopes when helpful (`feature(frontend): add vault widget`). Keep commits focused and mention affected package paths. Pull requests must describe the change, include reproduction or validation snippets (commands run, screenshots for UI work), link tracking issues, and call out any Anchor IDL bumps or Solana account migrations reviewers must perform.

## Security & Configuration Tips
Never commit `.env`, `.keypair`, or generated IDLs; refer teammates to the secrets vault. Anchor/RPC credentials default to the devnet provider in `Anchor.toml`; override via `ANCHOR_PROVIDER_URL` and `ANCHOR_WALLET` when testing privately. When capturing logs, redact wallet addresses unless user-owned.
