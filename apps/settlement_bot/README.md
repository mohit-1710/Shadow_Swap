# Settlement Bot (Keeper)

The settlement bot is a long-running TypeScript service that keeps ShadowSwap honest. It listens for encrypted orders stored by the Anchor program, decrypts them via an MPC client, matches compatible buys and sells, and submits `submit_match_results` transactions back to Solana.

## Responsibilities

1. **Discover** active `EncryptedOrder` accounts for the configured order book PDA.
2. **Decrypt & validate** payloads (owner, side, price, remaining size) using the configured Arcium client.
3. **Match** orders with a price–time priority engine that skips self-matches and dust amounts.
4. **Settle** matches by:
   - Ensuring associated token accounts exist for both parties.
   - Verifying escrow balances against the order metadata.
   - Building Anchor instructions and submitting them through Sanctum or direct RPC.
   - Retrying idempotently when transactions land in a different block.

```text
Encrypted orders → decrypt → match → build transaction → submit → confirm
```

## Project Structure

| File/Folder | Purpose |
| --- | --- |
| `src/index.ts` | Main loop: discovery, batching, settlement, metrics. |
| `src/matcher.ts` | Price–time priority implementation and settlement math. |
| `src/arcium-client.ts` | Interfaces for real and mock MPC decryption backends. |
| `src/sanctum-client.ts` | Transaction submitters (Sanctum relay vs direct RPC). |
| `src/types.ts` | Local TypeScript helpers layered on top of `@shadowswap/shared-types`. |

## Setup

```bash
cd apps/settlement_bot
cp .env.example .env            # populate RPC URLs, PDA addresses, keeper keypair
yarn install                    # if you are running it standalone
yarn dev                        # ts-node with file watching
```

> The root workspace script `yarn dev:bot` runs the same command from the monorepo.

### Environment Variables

| Variable | Description |
| --- | --- |
| `PROGRAM_ID` | ShadowSwap Anchor program (defaults to `5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt`). |
| `ORDER_BOOK_PUBKEY` | PDA for the order book this keeper should service. |
| `RPC_URL` / `WSS_URL` | HTTPS + WebSocket endpoints for Solana (devnet by default). |
| `KEEPER_KEYPAIR_PATH` | Path to the JSON keypair that signs settlement transactions. |
| `ARCIUM_MPC_URL` / `ARCIUM_CLIENT_ID` / `ARCIUM_CLIENT_SECRET` | Connection info for the MPC provider (defaults to demo credentials). |
| `SANCTUM_GATEWAY_URL` / `SANCTUM_API_KEY` | Optional relay configuration for private submission. |
| `USE_DIRECT_RPC` | `true` to bypass Sanctum and submit directly to `RPC_URL`. |
| `USE_MOCK_ARCIUM` | `true` swaps in deterministic mock decrypts for development. |
| `USE_MOCK_SANCTUM` | Leave `false` unless writing integration tests. |
| `MATCH_INTERVAL` | Milliseconds between matching cycles (default `10000`). |
| `MAX_RETRIES` / `RETRY_DELAY_MS` | Configure retry strategy for failed submissions. |
| `LOG_LEVEL` | `info`, `debug`, or `error`. |

## Commands

| Command | Description |
| --- | --- |
| `yarn dev` | Runs the keeper via `ts-node` with watch mode. |
| `yarn build` | Emits JavaScript into `dist/` for production deployments. |
| `yarn start` | Executes the compiled build (`node dist/index.js`). |
| `yarn test` | Jest suite for the matcher and helpers. |
| `yarn lint` | ESLint over `src/**/*.ts`. |

## Operational Tips

- Ensure `yarn anchor:setup` has been executed so the order book PDA, callback auth PDAs, and keeper authority exist.
- Monitor logs for warnings such as `Buyer escrow underfunded` or `NumericalOverflow`; both typically point to stale or malformed orders that should be cancelled.
- If you rotate the keeper keypair, rerun the setup script or create the callback authority PDA manually.

## Extending the Bot

- Swap in a real Arcium SDK by implementing the same interface exported from `arcium-client.ts`.
- Add monitoring/metrics by emitting Prometheus or Datadog gauges from the main loop.
- Support alternative matching strategies by extending `matcher.ts` and toggling them via configuration.
