# 🚀 Deploy ShadowSwap - Simple Steps

**Program ID:** `CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA`  
**All files already updated!** ✅

---

## Step 1: Move Keypair

```bash
mkdir -p /Users/vansh/Coding/Shadow_Swap/apps/anchor_program/target/deploy

cp ~/target/deploy/shadow_swap-keypair.json \
   /Users/vansh/Coding/Shadow_Swap/apps/anchor_program/target/deploy/
```

---

## Step 2: Build & Deploy

```bash
cd /Users/vansh/Coding/Shadow_Swap/apps/anchor_program

# Make sure you're on devnet
solana config set --url https://api.devnet.solana.com

# Check you have enough SOL (need 2-5 SOL)
solana balance

# Clean and build
anchor clean
anchor build

# Deploy (this costs SOL!)
anchor deploy
```

**Expected output:**
```
Program Id: CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA
Deploy success
```

---

## Step 3: Initialize OrderBook

The `setup-simple.js` script will:
- ✅ Initialize SOL/USDC orderbook
- ✅ Create callback auth for settlement bot
- ✅ Generate `.env` file for settlement bot
- ✅ Print the OrderBook address

```bash
# Still in apps/anchor_program directory
node scripts/setup-simple.js
```

**Watch for this output:**
```
Order Book PDA: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  ← SAVE THIS!
```

**Copy that OrderBook address!**

---

## Step 4: Update Frontend Config

Once you have the OrderBook address from Step 3, tell me and I'll update:

1. `env.example`
2. `ShadowSwap SPA Design/.env.local`

---

## Step 5: Copy IDL to Frontend

```bash
cp target/idl/shadow_swap.json \
   "../../ShadowSwap SPA Design/lib/idl/shadow_swap.json"
```

---

## Step 6: Test!

```bash
cd "../../ShadowSwap SPA Design"
pnpm dev
```

Visit http://localhost:3000/trade and try submitting an order!

---

## 🆘 Troubleshooting

### "Insufficient funds"
```bash
solana airdrop 5
# OR visit: https://faucet.solana.com
```

### "Account already exists"
The orderbook is already initialized - skip to Step 4!

### "Program deployment failed"
Make sure:
- Keypair is in correct location
- You have enough SOL
- You're on devnet: `solana config get`

---

## ✅ Quick Checklist

- [ ] Keypair moved to `apps/anchor_program/target/deploy/`
- [ ] Built with `anchor build`
- [ ] Deployed with `anchor deploy`
- [ ] Ran `node scripts/setup-simple.js`
- [ ] Got OrderBook address
- [ ] Updated frontend config (give me the address!)
- [ ] Copied IDL to frontend
- [ ] Started frontend dev server

---

**Ready? Start with Step 1!**

