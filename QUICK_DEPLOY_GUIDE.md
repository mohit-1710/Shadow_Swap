# ShadowSwap Quick Deploy Guide

## ⚡ TL;DR - What You Need to Know

### The Authorization Error Explained

```
Account does not exist: 3B2ZXKVKNqfrGibkKDMyctwDsTEW2FWYBEKgZZzQLNk6
```

This is a **CallbackAuth PDA** that authorizes your keeper bot to settle trades.

**Why it's missing:**
- Order book authority: `3TyDdbusxYtvWou6soZ3YaUA2XbSV5AcX1u321ZuQ9pL` 
- Your current wallet: `3QsnGf33PAhSpXGSpZzRnPHvNAwHDUQ7jdPu71Le5jue`
- ❌ **Mismatch!** Only the authority can create this account.

---

## 🚀 3-Step Deployment (After Smart Contract is Deployed)

### Step 1: Fix Authorization (Choose One)

**Option A: Use Authority Wallet**
```bash
# Switch to the wallet that created the order book
solana config set --keypair /path/to/authority/keypair.json

# Create the callback auth
cd apps/anchor_program
node scripts/setup-simple.js
```

**Option B: Fresh Start with YOUR Wallet**
```bash
# This will check if you're the authority, or guide you to create new setup
cd apps/anchor_program
node scripts/setup-simple.js
```

### Step 2: Deploy Settlement Bot

```bash
cd apps/settlement_bot

# 1. Update .env with correct values
cp .env.example .env
nano .env  # Set RPC_URL, PROGRAM_ID, ORDER_BOOK_PUBKEY, KEEPER_KEYPAIR_PATH

# 2. Install and start
yarn install
pm2 start "yarn dev" --name shadowswap-keeper

# 3. Verify it's working
pm2 logs shadowswap-keeper

# Should see:
# ✅ Keeper authorization verified  <- IMPORTANT!
# ✅ Keeper bot started successfully
```

### Step 3: Deploy Frontend

```bash
cd "ShadowSwap SPA Design"

# 1. Update environment
cat > .env.local << EOF
NEXT_PUBLIC_PROGRAM_ID=CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA
NEXT_PUBLIC_ORDER_BOOK_PUBKEY=63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
EOF

# 2. Build and deploy
pnpm install
pnpm build

# 3a. Deploy to Vercel
vercel --prod

# OR 3b. Self-host
pm2 start "pnpm start" --name shadowswap-frontend
```

---

## 🎯 Critical Things to Keep in Mind

### 1. Wallet Management ⚠️

```
┌─────────────────────────────────────────────────────────┐
│  SAME WALLET MUST BE USED FOR:                          │
│                                                          │
│  ✅ Creating the order book (authority)                 │
│  ✅ Creating callback_auth                              │
│  ✅ Running the keeper bot (KEEPER_KEYPAIR_PATH)        │
│                                                          │
│  If wallets don't match = Authorization Error!          │
└─────────────────────────────────────────────────────────┘
```

### 2. Setup Order Matters 📋

```
1. Deploy Smart Contract         ✅ (Already done)
2. Initialize Order Book         ⚠️ (Done, but by different wallet)
3. Create CallbackAuth          ❌ (Missing - causes your error)
4. Deploy Bot                   ⚠️ (Running in test mode)
5. Deploy Frontend              ✅ (Working)
```

### 3. Environment Variables Must Match 🔗

All three components must use the **same** values:

| Variable | Value | Used By |
|----------|-------|---------|
| PROGRAM_ID | `CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA` | All |
| ORDER_BOOK_PUBKEY | `63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ` | Bot & Frontend |
| RPC_URL | `https://api.devnet.solana.com` | All |
| Network | `devnet` | All |

### 4. The IDL File 📄

The IDL must be accessible to the frontend. You need:

```
✅ apps/anchor_program/target/idl/shadow_swap.json  (source)
✅ ShadowSwap SPA Design/lib/idl/shadow_swap.json   (copy for frontend)
```

**After any program changes:**
```bash
# Rebuild program
cd apps/anchor_program
anchor build

# Copy updated IDL
cp target/idl/shadow_swap.json "../ShadowSwap SPA Design/lib/idl/"
```

### 5. Bot Must Be Authorized ✅

Your bot logs **MUST** show:
```
✅ Keeper authorization verified  ← Must see this!
✅ Keeper bot started successfully
```

If you see:
```
⚠️ TESTING MODE: Continuing without authorization
```

Then settlements **will fail**. Fix authorization first!

---

## 🔍 Quick Verification Commands

```bash
# 1. Check who's the order book authority
cd apps/anchor_program
node -e "
const anchor = require('@coral-xyz/anchor');
const fs = require('fs');
(async () => {
  const provider = anchor.AnchorProvider.env();
  const idl = JSON.parse(fs.readFileSync('target/idl/shadow_swap.json'));
  const program = new anchor.Program(idl, provider);
  const ob = await program.account.orderBook.fetch('63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ');
  console.log('Authority:', ob.authority.toString());
  console.log('Your Wallet:', provider.wallet.publicKey.toString());
})();
"

# 2. Check if callback auth exists
solana account 3B2ZXKVKNqfrGibkKDMyctwDsTEW2FWYBEKgZZzQLNk6

# 3. Check bot status
pm2 status shadowswap-keeper

# 4. View bot logs
pm2 logs shadowswap-keeper --lines 20

# 5. Test frontend IDL endpoint
curl http://localhost:3000/api/idl/shadow_swap | jq '.address'
```

---

## 🐛 Common Deployment Issues

### Issue 1: Bot Authorization Fails
```
❌ Authorization check failed: Account does not exist
```
**Solution:** Run setup script with authority wallet:
```bash
cd apps/anchor_program
node scripts/setup-simple.js
```

---

### Issue 2: Frontend Can't Load IDL
```
Module not found: '@/lib/idl/shadow_swap.json'
```
**Solution:** Copy IDL file:
```bash
cp apps/anchor_program/target/idl/shadow_swap.json \
   "ShadowSwap SPA Design/lib/idl/shadow_swap.json"
```

---

### Issue 3: Wrong Network
```
Error: Transaction simulation failed
```
**Solution:** Ensure all components use same network:
```bash
# Check Solana config
solana config get

# Update if needed
solana config set --url https://api.devnet.solana.com
```

---

### Issue 4: Insufficient Funds
```
Error: Transaction failed (0x1)
```
**Solution:** Fund your wallets:
```bash
# Devnet
solana airdrop 2

# Mainnet - send real SOL
```

---

## 📊 Production Deployment Checklist

Before going live, ensure:

- [ ] Authority wallet identified and secured
- [ ] CallbackAuth created and verified active
- [ ] Bot shows "✅ Keeper authorization verified"
- [ ] Frontend connects to wallet successfully
- [ ] Test order submission works end-to-end
- [ ] All `.env` files secured (chmod 600)
- [ ] Monitoring/alerts configured
- [ ] Backup of all keypairs stored offline
- [ ] RPC endpoints upgraded from public to dedicated
- [ ] Smart contract audited (for mainnet)

---

## 🆘 Need Help?

### Check Logs
```bash
# Bot logs
pm2 logs shadowswap-keeper

# Frontend logs (if using PM2)
pm2 logs shadowswap-frontend

# System logs
journalctl -u shadowswap-keeper -f
```

### Inspect On-Chain State
```bash
cd apps/anchor_program
npx ts-node scripts/inspect-state.ts
```

### Restart Everything
```bash
# Stop all
pm2 stop all

# Start in order
pm2 start shadowswap-keeper
pm2 start shadowswap-frontend

# Check status
pm2 status
```

---

## 📚 More Resources

- **Full Deployment Guide:** See `DEPLOYMENT_CHECKLIST.md`
- **Fix Summary:** See `FIX_SUMMARY.md`
- **Anchor Program:** `apps/anchor_program/README.md`
- **Bot README:** `apps/settlement_bot/README.md`

---

**Key Takeaway:** The authorization error means your keeper bot needs a CallbackAuth account created by the order book authority. Fix this first, then everything else will work! 🚀

