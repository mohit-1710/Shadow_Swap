# 🚀 ShadowSwap Devnet Testing Guide

## ✅ What We Have Configured

### 1. **Anchor Program** ✅
- **Program ID:** `DcCs5AEhd6Sx5opAjhkpNUtNSQwQf7GV3UU7JsfxcvXu`
- **Deployed:** Devnet
- **Status:** ✅ Optimized (stack overflow fixed)
- **OrderBook:** `J5NkY5hUS1DoMYXtyMt4dY87RFkbS7MD4eTH7YeKY8dn`

### 2. **Sanctum Gateway** ✅
- **API Key:** `01K8AM24492KGK1WFTSXEBKVJ9` ✅ Configured
- **URL:** `https://gateway.sanctum.so`
- **Status:** Ready for MEV-protected submissions

### 3. **Direct RPC Mode** ✅
- **Fallback:** Direct submission (no MEV protection)
- **Status:** ✅ Working

---

## 🔐 Arcium Encryption - How It Works

### No API Keys Required! ✅

**Arcium uses cryptographic key exchange (x25519), not API keys!**

**How it works:**
1. Client generates x25519 keypair
2. Get MXE's public key from program
3. Create shared secret via key exchange
4. Use RescueCipher for encryption/decryption

**Current Status:**
- ✅ Arcium SDK installed (`@arcium-hq/client`)
- ✅ Mock encryption working (for testing)
- 🔜 Real encryption ready to implement

**Note:** For testing, we use **Mock Arcium + Real Sanctum**, which gives us:
- ✅ MEV protection (via Sanctum)
- ✅ Order matching
- ✅ On-chain settlement
- ⚠️  Encryption is mock (orders visible in logs)

---

## 🧪 Testing Options

### Option 1: Mock Arcium + Real Sanctum (Recommended for Initial Testing)

**What works:**
- ✅ Submit orders from frontend
- ✅ Bot matches orders
- ✅ MEV-protected submission via Sanctum
- ✅ On-chain settlement
- ✅ Order lifecycle (Active → Filled)

**What's mocked:**
- ⚠️  Encryption (uses simple serialization)
- ⚠️  Privacy (order details visible to bot)

**Configuration:**
```bash
# apps/settlement_bot/.env
USE_MOCK_ARCIUM=true
USE_MOCK_SANCTUM=false
SANCTUM_API_KEY=01K8AM24492KGK1WFTSXEBKVJ9
```

**Perfect for:**
- Testing the DEX mechanics
- Demo to stakeholders
- Debugging settlement logic
- Verifying Sanctum integration

---

### Option 2: Real Arcium + Real Sanctum (Full Production)

**Prerequisites:**
- Implement x25519 key exchange
- Frontend: Generate keypair, get MXE public key
- Bot: Use shared secret for decryption

**Implementation:**
```typescript
// Frontend (example)
import { x25519 } from '@noble/curves/ed25519';
import { RescueCipher } from '@arcium-hq/client';

const privateKey = x25519.utils.randomSecretKey();
const publicKey = x25519.getPublicKey(privateKey);
const mxePublicKey = await getMXEPublicKey(programId);
const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
const cipher = new RescueCipher(sharedSecret);
```

**What works:**
- ✅ Full privacy-preserving encryption
- ✅ MPC decryption via Arcium network
- ✅ MEV protection via Sanctum
- ✅ Production-ready

---

## 🎯 Step-by-Step Testing Flow

### Phase 1: Setup (5 minutes)

1. **Verify wallet has funds:**
```bash
solana balance
# Need: ~0.5 SOL for fees
```

2. **Get Test USDC:**
```bash
# Visit Solana faucet or use:
spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
# (Your USDC mint)
```

3. **Wrap some SOL:**
```bash
# For trading WSOL
spl-token wrap 0.1
```

---

### Phase 2: Start Services (1 minute)

1. **Terminal 1 - Start Keeper Bot:**
```bash
cd /home/mohit/dev/solana_hackathon/ShadowSwap_Project
yarn dev:bot
```

**Expected output:**
```
🚀 Using Direct RPC submission (no MEV protection)
OR
🔒 Using Sanctum Gateway (MEV protected)  # If Sanctum enabled

✅ Keeper bot started successfully
```

2. **Terminal 2 - Start Frontend:**
```bash
cd /home/mohit/dev/solana_hackathon/ShadowSwap_Project
yarn dev:frontend
```

3. **Open:** http://localhost:3000

---

### Phase 3: Test Order Submission (2 minutes)

1. **Connect Phantom Wallet**
2. **Submit a SELL order:**
   ```
   Side:   Sell WSOL
   Amount: 0.01 WSOL
   Price:  100 USDC per WSOL
   ```

3. **Submit a BUY order (from same or different wallet):**
   ```
   Side:   Buy WSOL
   Amount: 0.01 WSOL
   Price:  150 USDC per WSOL
   ```

4. **Watch bot terminal** - should see:
   ```
   📥 Fetching active orders...
      ✅ Found 2 active orders
   
   🔐 Decrypting 2 orders...
      ✅ Successfully decrypted 2 orders
   
   📊 Matching 2 orders...
      📈 1 buy orders (highest bid: 150)
      📉 1 sell orders (lowest ask: 100)
      ✅ Match found!
   
   📤 Submitting 1 match for settlement...
      🚀 Submitting transaction to RPC...
      ⏳ Waiting for confirmation: <signature>
      ✅ Transaction confirmed: <signature>
   ```

5. **Verify on-chain:**
```bash
yarn view:orderbook
# Should show orders as "Filled"
```

---

### Phase 4: Verify Settlement

**Check explorer:**
```
https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet
```

**Check balances:**
```bash
spl-token accounts
# Verify token balances changed
```

---

## 🔧 Configuration Files Summary

### 1. Settlement Bot (`.env`)
```bash
# Location: apps/settlement_bot/.env
RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=DcCs5AEhd6Sx5opAjhkpNUtNSQwQf7GV3UU7JsfxcvXu
ORDER_BOOK_PUBKEY=J5NkY5hUS1DoMYXtyMt4dY87RFkbS7MD4eTH7YeKY8dn

# Sanctum (MEV Protection) ✅
SANCTUM_GATEWAY_URL=https://gateway.sanctum.so
SANCTUM_API_KEY=01K8AM24492KGK1WFTSXEBKVJ9
USE_MOCK_SANCTUM=false  # Use real Sanctum

# Arcium (Privacy) - Mock for now
# No API keys needed! Uses x25519 key exchange
USE_MOCK_ARCIUM=true

# Keeper Settings
KEEPER_KEYPAIR_PATH=~/.config/solana/id.json
MATCH_INTERVAL=10000
MAX_RETRIES=3
```

### 2. Frontend (`.env.local`)
```bash
# Location: apps/frontend/.env.local
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=DcCs5AEhd6Sx5opAjhkpNUtNSQwQf7GV3UU7JsfxcvXu
NEXT_PUBLIC_ORDER_BOOK_PUBKEY=J5NkY5hUS1DoMYXtyMt4dY87RFkbS7MD4eTH7YeKY8dn
NEXT_PUBLIC_BASE_MINT=So11111111111111111111111111111111111111112  # WSOL
NEXT_PUBLIC_QUOTE_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU  # Your USDC
```

---

## 📊 Useful Commands

### Monitor Orderbook:
```bash
yarn view:orderbook
```

### Check Keeper Balance:
```bash
solana balance
```

### Check Program Logs:
```bash
solana logs DcCs5AEhd6Sx5opAjhkpNUtNSQwQf7GV3UU7JsfxcvXu
```

### Cancel All Orders (if needed):
```bash
# Coming soon - manual cancel for now via frontend
```

---

## 🐛 Troubleshooting

### Bot shows "insufficient funds":
- Old orders have empty escrows
- **Solution:** Submit fresh orders from frontend

### Transactions fail:
- Check keeper wallet has SOL for fees
- Verify RPC is responding
- Check program logs

### Orders not matching:
- Ensure buy price >= sell price
- Check bot terminal for errors
- Verify orders are "Active" status

---

## 🎯 Next Steps for Production

1. **Implement Real Arcium Encryption**
   - x25519 key exchange (no API keys!)
   - Frontend: Generate keypair + get MXE public key
   - Bot: Use shared secret for decryption
   - SDK already installed: `@arcium-hq/client`

2. **Enable Real Arcium:**
   ```bash
   USE_MOCK_ARCIUM=false
   # Implement key exchange in code
   ```

3. **Performance tuning:**
   - Adjust `MATCH_INTERVAL` based on traffic
   - Monitor RPC rate limits
   - Optimize transaction fees

4. **Monitoring:**
   - Set up alerts for bot failures
   - Track match statistics
   - Monitor escrow balances

5. **Security audit:**
   - Review keeper key security
   - Test failure scenarios
   - Validate settlement logic

---

## ✅ Current Status

**Working:**
- ✅ Anchor program (optimized)
- ✅ Frontend order submission
- ✅ Keeper bot matching
- ✅ Sanctum MEV protection
- ✅ On-chain settlement
- ✅ Order lifecycle management

**Mock Mode:**
- ⚠️  Arcium encryption (works, but not secure)

**Ready for:**
- ✅ Devnet testing with real Sanctum
- ✅ Demo and presentation
- ⚠️  Production (needs real Arcium)

---

**You have a fully functional DEX!** 🎉

Just need Arcium credentials for production-grade privacy.

