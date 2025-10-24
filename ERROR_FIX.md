# 🔧 Fix for "Account does not exist" Error

## Problem

You're seeing: `❌ Error: Account does not exist or has no data 2i5iJBtGhNocfCFggdj81jJUo2qHzfJPjx6xQmteF2nr`

This happens because **your wallet doesn't have token accounts** for the tokens used in the order book (SOL and USDC).

---

## ✅ Quick Fix (5 minutes)

### Step 1: Run the Setup Script

```bash
cd /home/mohit/dev/solana_hackathon/ShadowSwap_Project
./scripts/create-token-accounts.sh
```

This will:
- Check your SOL balance
- Airdrop SOL if needed
- Create USDC token account
- Create Wrapped SOL token account
- Wrap some SOL for testing

### Step 2: Refresh the Frontend

1. **Reload** the page in your browser (F5)
2. **Reconnect** your wallet
3. **Try submitting an order** again

---

## 🔍 What Was the Issue?

The frontend code tries to:
1. Fetch your token balances for SOL and USDC
2. Display them in the UI

But if you don't have token accounts for these mints, the RPC call fails with "Account does not exist".

The account address `2i5iJBtGhNocfCFggdj81jJUo2qHzfJPjx6xQmteF2nr` is likely:
- Your Associated Token Account (ATA) for USDC or SOL
- Derived deterministically from: wallet + mint + token program

---

## 📊 Verify It Worked

After running the script, check your token accounts:

```bash
spl-token accounts --url devnet
```

**Expected output:**
```
Token                                         Balance
-------------------------------------------------------
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  0
So11111111111111111111111111111111111111112  0.1
```

---

## 🧪 Alternative: Manual Fix

If the script doesn't work, run these commands manually:

```bash
# 1. Airdrop SOL
solana airdrop 2 --url devnet

# 2. Create USDC token account
spl-token create-account EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v --url devnet

# 3. Create Wrapped SOL account
spl-token create-account So11111111111111111111111111111111111111112 --url devnet

# 4. Wrap some SOL
spl-token wrap 0.5 --url devnet
```

---

## 🎨 Better Error Handling (Future Improvement)

We can improve the frontend to handle missing token accounts gracefully:

**Option 1:** Show "0" balance instead of crashing
**Option 2:** Add a "Create Token Accounts" button in the UI
**Option 3:** Automatically create accounts on first order submission

For now, the manual creation is the fastest fix!

---

## 🚨 Still Not Working?

### Check 1: Is the frontend using the right wallet?
```bash
# In browser console:
console.log(wallet.publicKey.toString())

# Compare with:
solana address
```

### Check 2: Is the RPC connection working?
```bash
# In browser console (F12):
console.log(connection.rpcEndpoint)
```

### Check 3: View detailed error
Open browser DevTools → Console tab → Look for the full error stack trace

---

## ✅ Success Checklist

After fixing:
- [ ] `spl-token accounts --url devnet` shows token accounts
- [ ] Frontend loads without errors
- [ ] Wallet balances display in the UI
- [ ] Can submit a test order

---

## 🎉 Ready to Test!

Once token accounts are created:

1. **Open** http://localhost:3000
2. **Connect** your Phantom wallet
3. **Submit** a test order:
   - Side: Buy
   - Amount: 0.01 SOL
   - Price: 100 USDC
4. **Watch** the keeper bot match it!

---

**Need help?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more details.

