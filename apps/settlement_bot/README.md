# ShadowSwap Keeper Bot

Off-chain keeper bot for the ShadowSwap Hybrid architecture. This bot fetches encrypted orders from the blockchain, decrypts them securely using Arcium MPC, matches orders using price-time priority, and submits settlement transactions via Sanctum for MEV protection.

## Architecture

### Hybrid Model Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Keeper Bot Workflow                     │
└─────────────────────────────────────────────────────────────┘

1. 📥 FETCH
   └─> Query blockchain for active EncryptedOrder accounts
   └─> Filter by order book and status (ACTIVE/PARTIAL)
   
2. 🔓 DECRYPT (Arcium MPC)
   └─> Send encrypted payloads to Arcium MPC network
   └─> Receive plaintext order data (side, price, amount)
   └─> No single party sees the plaintext
   
3. 🎯 MATCH
   └─> Separate buy and sell orders
   └─> Sort: Buys (↓ price, ↑ time), Sells (↑ price, ↑ time)
   └─> Match: buyPrice >= sellPrice
   └─> Execution price: maker's price (time priority)
   
4. 📤 SUBMIT (Sanctum Gateway)
   └─> Build submit_match_results transactions
   └─> Submit via Sanctum with 'private_only' strategy
   └─> 3x retry logic with exponential backoff
   └─> MEV protection through private mempool
```

## Installation

```bash
cd apps/settlement_bot
yarn install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required Environment Variables

#### Solana Connection
- `RPC_URL`: Solana RPC endpoint (e.g., `https://api.devnet.solana.com`)
- `WSS_URL`: WebSocket endpoint (optional)

#### Program Configuration
- `PROGRAM_ID`: ShadowSwap program ID (from anchor_program)
- `ORDER_BOOK_PUBKEY`: Order book public key to monitor

#### Keeper Credentials
- `KEEPER_KEYPAIR_PATH`: Path to keeper wallet keypair JSON

#### Arcium MPC
- `ARCIUM_MPC_URL`: Arcium MPC network endpoint
- `ARCIUM_CLIENT_ID`: Your Arcium client ID
- `ARCIUM_CLIENT_SECRET`: Your Arcium client secret

#### Sanctum Gateway
- `SANCTUM_GATEWAY_URL`: Sanctum gateway API endpoint
- `SANCTUM_API_KEY`: Your Sanctum API key

#### Bot Behavior
- `MATCH_INTERVAL`: Milliseconds between matching cycles (default: 10000)
- `MAX_RETRIES`: Maximum transaction retry attempts (default: 3)
- `RETRY_DELAY_MS`: Delay between retries in ms (default: 1000)

#### Testing/Development
- `USE_MOCK_ARCIUM`: Use mock Arcium client for testing (default: false)
- `USE_MOCK_SANCTUM`: Use mock Sanctum client for testing (default: false)
- `USE_DIRECT_RPC`: Submit matches directly via RPC (default: true; set to `false` to route via Sanctum)

## Usage

### Development Mode

```bash
yarn dev
```

### Production Mode

```bash
# Build
yarn build

# Start
yarn start
```

### Watch Mode (Auto-restart)

```bash
yarn watch
```

## Project Structure

```
src/
├── index.ts              # Main keeper bot implementation
├── types.ts              # TypeScript type definitions
├── arcium-client.ts      # Arcium MPC client for decryption
├── sanctum-client.ts     # Sanctum gateway client for submission
└── matcher.ts            # Order matching algorithm
```

### Key Components

#### 1. `ShadowSwapKeeper` (index.ts)

Main keeper bot class that orchestrates the entire workflow:

- **`fetchActiveOrders()`**: Queries blockchain for active encrypted orders
- **`decryptOrders()`**: Decrypts orders using Arcium MPC
- **`matchOrders()`**: Applies price-time priority matching
- **`submitMatches()`**: Submits settlement transactions via Sanctum
- **`verifyAuthorization()`**: Ensures keeper is authorized

#### 2. `ArciumClient` (arcium-client.ts)

Handles secure decryption via Arcium MPC:

```typescript
const client = new ArciumClient({
  mpcUrl: process.env.ARCIUM_MPC_URL,
  clientId: process.env.ARCIUM_CLIENT_ID,
  clientSecret: process.env.ARCIUM_CLIENT_SECRET,
});

await client.initialize();
const decrypted = await client.decryptOrder(ciphertext);
```

**Key Features:**
- Batch decryption for efficiency
- Automatic authentication
- Error handling and retry logic
- Decryption proof verification

#### 3. `SanctumClient` (sanctum-client.ts)

Submits transactions with MEV protection:

```typescript
const client = new SanctumClient({
  gatewayUrl: process.env.SANCTUM_GATEWAY_URL,
  apiKey: process.env.SANCTUM_API_KEY,
});

const result = await client.submitTransaction(tx, maxRetries);
```

**Key Features:**
- Private mempool routing
- 3x retry with exponential backoff
- Batch submission
- Transaction status tracking

#### 4. `matchOrders()` (matcher.ts)

Price-time priority matching algorithm:

```typescript
const matches = matchOrders(plainOrders);
```

**Algorithm:**
1. Separate buy and sell orders
2. Sort buys: descending price, ascending timestamp
3. Sort sells: ascending price, ascending timestamp
4. Match: `buyPrice >= sellPrice`
5. Execution price: maker's price (time priority)
6. Handle partial fills

**Additional Functions:**
- `validateMatch()`: Validates match before submission
- `calculateMatchStats()`: Computes volume and fees
- `prioritizeMatches()`: Orders matches by priority

## Matching Algorithm Details

### Price-Time Priority

The keeper implements industry-standard price-time priority matching:

1. **Price Priority**: Orders with better prices match first
   - Buy: Higher price = higher priority
   - Sell: Lower price = higher priority

2. **Time Priority**: Among orders at same price, older orders match first
   - Both: Earlier timestamp = higher priority

3. **Execution Price**: The maker's price
   - If buy order was placed first → use buy price
   - If sell order was placed first → use sell price

### Example

```
Buy Orders (sorted):
  #1: 51.0 @ t=100
  #2: 50.5 @ t=150
  #3: 50.0 @ t=120

Sell Orders (sorted):
  #1: 49.0 @ t=110
  #2: 50.0 @ t=130
  #3: 51.0 @ t=140

Matches:
  Buy #1 (51.0) <-> Sell #1 (49.0) @ 49.0 (sell was maker, t=110 < t=100)
  Buy #2 (50.5) <-> Sell #2 (50.0) @ 50.0 (sell was maker, t=130 < t=150)
  Buy #3 (50.0) <-> Sell #3 (51.0) @ 50.0 (buy was maker, t=120 < t=140)
```

## Authorization

The keeper must be authorized by the order book authority before it can submit match results.

### Authorize Keeper

From the order book authority wallet:

```typescript
await program.methods
  .createCallbackAuth(expiresAt)
  .accounts({
    orderBook,
    callbackAuth,
    authority: authorityWallet.publicKey,
    keeper: keeperWallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

The keeper bot will verify authorization on startup.

## Monitoring

### Console Output

The keeper logs detailed information about each matching cycle:

```
🚀 ============================================
   ShadowSwap Keeper Bot - Hybrid Architecture
============================================

📍 Configuration:
   RPC URL:        https://api.devnet.solana.com
   Program ID:     5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt
   Order Book:     CXSiQhcozGCvowrC4QFGHQi1BJwWdfw2ZEjhDawMK3Rr
   Keeper Wallet:  DEF...456
   Match Interval: 10000ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️  [2025-10-24T12:00:00.000Z] Starting matching cycle #1...

📥 Fetching active orders...
   ✅ Found 5 active orders

🔐 Decrypting 5 orders via Arcium MPC...
   ✅ Successfully decrypted 5/5 orders

📊 Matching 5 orders...
   📈 2 buy orders (highest bid: 51.0)
   📉 3 sell orders (lowest ask: 49.0)
   ✅ Match found: Buy #1 @ 51.0 <-> Sell #1 @ 49.0 | Amount: 1.5 @ 49.0

🎯 Total matches found: 1

📈 Match Statistics:
   Matches:        1
   Base Volume:    1.5000
   Quote Volume:   73.5000
   Average Price:  49.0000
   Total Fees:     0.2205

📤 Submitting 1 matches for settlement...
   📤 Submitting transaction (attempt 1/3)...
   ✅ Transaction submitted: 5abc...def

📊 Settlement Results:
   ✅ Successful: 1
   ❌ Failed:     0

✅ Matching cycle completed in 2350ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Testing

### Mock Mode

For testing without real Arcium MPC or Sanctum gateway:

```bash
# .env
USE_MOCK_ARCIUM=true
USE_MOCK_SANCTUM=true
USE_DIRECT_RPC=true
```

This uses mock clients that simulate the real behavior without making external API calls.

### Integration Tests

```bash
yarn test
```

## Error Handling

The keeper bot includes comprehensive error handling:

- **Connection Errors**: Automatic reconnection with exponential backoff
- **Decryption Failures**: Individual order failures don't stop the cycle
- **Transaction Failures**: 3x retry with delay
- **Authorization Errors**: Graceful shutdown with clear error message

## Performance Considerations

### Optimization Tips

1. **Batch Processing**: Orders are decrypted in batches of 10 for efficiency
2. **Parallel Submission**: Can be configured to submit multiple transactions in parallel
3. **Match Prioritization**: High-volume matches submitted first
4. **Resource Management**: Configurable polling interval to balance responsiveness and cost

### Recommended Settings

For **devnet**:
```
MATCH_INTERVAL=10000    # 10 seconds
MAX_RETRIES=3
```

For **mainnet**:
```
MATCH_INTERVAL=5000     # 5 seconds (more responsive)
MAX_RETRIES=5           # More retries for reliability
```

## Security

### Private Key Management

- **Never commit** your keeper keypair or `.env` file
- Use environment variables or secret managers in production
- Rotate keys regularly
- Use separate wallets for development and production

### Arcium MPC Security

- Decryption happens in distributed MPC network
- No single party sees plaintext order data
- Keeper only receives decrypted results after MPC computation

### Sanctum MEV Protection

- Transactions submitted through private mempool
- Reduces risk of frontrunning and sandwich attacks
- `private_only` strategy ensures no public mempool exposure

## Troubleshooting

### Common Issues

**"Keeper is not authorized"**
- Run `create_callback_auth` from order book authority
- Ensure `KEEPER_KEYPAIR_PATH` matches authorized keeper

**"No active orders found"**
- Verify `ORDER_BOOK_PUBKEY` is correct
- Check that orders exist on-chain
- Ensure RPC endpoint is accessible

**"Arcium authentication failed"**
- Verify `ARCIUM_CLIENT_ID` and `ARCIUM_CLIENT_SECRET`
- Check Arcium MPC URL is correct
- Ensure you have active Arcium credits/subscription

**"Sanctum submission failed"**
- Verify `SANCTUM_API_KEY` is valid
- Check keeper wallet has sufficient SOL for fees
- Review rate limits

## Contributing

See main project README for contribution guidelines.

## License

MIT
