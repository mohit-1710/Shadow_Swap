# 🚀 ShadowSwap Program Deployment Guide

**New Program ID:** `CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA`  
**Date:** October 29, 2025

---

## ✅ Files Already Updated with New Program ID

I've updated these files for you:

### **Smart Contract:**
- ✅ `apps/anchor_program/programs/shadow_swap/src/lib.rs` - declare_id!()
- ✅ `apps/anchor_program/Anchor.toml` - Program configuration

### **Scripts:**
- ✅ `apps/anchor_program/scripts/setup-simple.js`
- ✅ `apps/anchor_program/scripts/view-orderbook.js`
- ✅ `apps/settlement_bot/src/index.ts`

### **Frontend:**
- ✅ `ShadowSwap SPA Design/.env.local`
- ✅ `apps/frontend/env.example`
- ✅ `apps/frontend/pages/index.tsx`

### **Config:**
- ✅ `env.example`

---

## 📋 Step-by-Step Deployment

### **Step 1: Move the Keypair** (IMPORTANT!)

You created the keypair in `~/target/deploy/` but it needs to be in the anchor program folder:

```bash
# Create the target/deploy directory if it doesn't exist
mkdir -p /Users/vansh/Coding/Shadow_Swap/apps/anchor_program/target/deploy

# Move the keypair (you'll need to do this manually)
mv ~/target/deploy/shadow_swap-keypair.json \
   /Users/vansh/Coding/Shadow_Swap/apps/anchor_program/target/deploy/shadow_swap-keypair.json
```

### **Step 2: Set Up Solana Config**

```bash
# Switch to devnet
solana config set --url https://api.devnet.solana.com

# Verify you have SOL
solana balance

# If balance is low, get more:
# https://faucet.solana.com
```

### **Step 3: Build the Program**

```bash
cd /Users/vansh/Coding/Shadow_Swap/apps/anchor_program

# Clean build (removes old artifacts)
anchor clean

# Build with new program ID
anchor build

# This generates:
# - target/deploy/shadow_swap.so (the compiled program)
# - target/idl/shadow_swap.json (the IDL)
```

**Expected Output:**
```
Compiling shadow_swap v0.1.0
Finished release [optimized] target(s) in XX.XXs
```

### **Step 4: Deploy to Devnet**

```bash
# Deploy the program
anchor deploy

# This will:
# 1. Upload program to devnet
# 2. Use your wallet to pay for deployment
# 3. Confirm the program ID matches: CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA
```

**Expected Output:**
```
Deploying cluster: devnet
Upgrade authority: YOUR_WALLET_ADDRESS
Deploying program "shadow_swap"...
Program Id: CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA
Deploy success
```

### **Step 5: Verify Deployment**

```bash
# Check the program exists on devnet
solana program show CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA

# Should show:
# Program Id: CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA
# Owner: BPFLoaderUpgradeab1e11111111111111111111111
# ProgramData Address: ...
# Authority: YOUR_WALLET
# Last Deployed In Slot: ...
# Data Length: ... bytes
```

### **Step 6: Initialize the OrderBook**

Now you need to create the orderbook for SOL/USDC trading:

```bash
# Run the setup script
cd /Users/vansh/Coding/Shadow_Swap/apps/anchor_program
node scripts/setup-simple.js
```

**This will:**
1. Derive the OrderBook PDA address
2. Initialize the orderbook on-chain
3. Print the OrderBook address (SAVE THIS!)

**Expected Output:**
```
Initializing order book...
Order Book Address: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
✅ Order book initialized successfully!
Base Mint: So11111111111111111111111111111111111111112 (SOL)
Quote Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU (USDC)
```

**IMPORTANT:** Copy the OrderBook address - you'll need it in the next step!

### **Step 7: Update OrderBook Address in Config Files**

Once you have the OrderBook address from Step 6, update these files:

```bash
# Replace TBD_AFTER_DEPLOYMENT with the actual OrderBook address

# File 1: env.example
SHADOWSWAP_ORDER_BOOK=YOUR_NEW_ORDERBOOK_ADDRESS

# File 2: ShadowSwap SPA Design/.env.local
NEXT_PUBLIC_ORDER_BOOK=YOUR_NEW_ORDERBOOK_ADDRESS
```

I'll do this for you once you give me the OrderBook address!

### **Step 8: Copy New IDL to Frontend**

```bash
# Copy the newly generated IDL to your SPA frontend
cp /Users/vansh/Coding/Shadow_Swap/apps/anchor_program/target/idl/shadow_swap.json \
   "/Users/vansh/Coding/Shadow_Swap/ShadowSwap SPA Design/lib/idl/shadow_swap.json"
```

### **Step 9: Restart Frontend**

```bash
cd "/Users/vansh/Coding/Shadow_Swap/ShadowSwap SPA Design"

# Kill the dev server if running (Ctrl+C)

# Restart with new config
pnpm dev
```

---

## 🧪 Testing the Deployment

### **Test 1: Verify Program**
```bash
solana program show CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA
```
✅ Should show program details

### **Test 2: Verify OrderBook**
```bash
cd /Users/vansh/Coding/Shadow_Swap/apps/anchor_program
node scripts/view-orderbook.js
```
✅ Should show orderbook state (0 orders initially)

### **Test 3: Test Order Submission**
1. Open http://localhost:3000/trade
2. Connect wallet
3. Try submitting a test order
4. Should succeed with new program!

---

## ⚠️ Troubleshooting

### **Error: "Insufficient funds"**
```bash
# Get more devnet SOL
solana airdrop 5

# Or visit: https://faucet.solana.com
```

### **Error: "Account not found"**
- OrderBook not initialized
- Run: `node scripts/setup-simple.js`

### **Error: "Invalid program id"**
- Keypair mismatch
- Verify: `solana address -k target/deploy/shadow_swap-keypair.json`
- Should show: `CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA`

### **Error: "Program upgrade authority mismatch"**
```bash
# Check who owns the program
solana program show CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA

# Make sure the "Authority" matches your wallet
```

---

## 📊 Deployment Checklist

- [ ] **Step 1:** Move keypair to correct location
- [ ] **Step 2:** Set Solana to devnet
- [ ] **Step 3:** Build program (`anchor build`)
- [ ] **Step 4:** Deploy program (`anchor deploy`)
- [ ] **Step 5:** Verify deployment
- [ ] **Step 6:** Initialize orderbook (`node scripts/setup-simple.js`)
- [ ] **Step 7:** Update OrderBook address in config files
- [ ] **Step 8:** Copy new IDL to frontend
- [ ] **Step 9:** Restart frontend dev server
- [ ] **Step 10:** Test order submission

---

## 🎯 Next Steps After Deployment

1. **Update this README** - Paste the OrderBook address when you get it
2. **Get devnet USDC** - Ask backend engineer or use faucet
3. **Test trading** - Submit test orders
4. **Deploy settlement bot** - For order matching
5. **Test end-to-end** - Full trading flow

---

## 📝 Important Addresses

**Program ID:** `CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA`  
**OrderBook PDA:** `TBD_AFTER_STEP_6` (Will be shown when you run setup-simple.js)  
**Base Mint (SOL):** `So11111111111111111111111111111111111111112`  
**Quote Mint (USDC):** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`  

---

## 🚨 Before You Deploy - Save This!

**Seed Phrase (from your keypair generation):**
```
split inherit file hover nose fitness elevator long exist extend adult imitate
```

**⚠️ NEVER SHARE THIS IN PRODUCTION!** This is for devnet testing only.

Store it safely - you'll need it if you ever need to recover the program keypair.

---

**Ready to deploy? Follow the steps above and let me know when you get the OrderBook address!**

