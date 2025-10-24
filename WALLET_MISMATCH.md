# Wallet Mismatch Issue - SOLVED

## The Problem

You have TWO different wallets:
1. **CLI Wallet** - Has Wrapped SOL ✅
2. **Phantom Wallet (Browser)** - Doesn't have Wrapped SOL ❌

The frontend uses **Phantom**, but you wrapped SOL in **CLI**!

---

## Solution: Wrap SOL in Phantom's Wallet

### Method 1: Export Phantom, Use in CLI

**Step 1: Export Phantom Keypair**
1. Open Phantom
2. Settings → Show Private Key (or Export Private Key)
3. Save it somewhere safe

**Step 2: Import to Solana CLI**
```bash
# Create new keypair file from Phantom
solana-keygen recover 'prompt://?key=0/0' --outfile ~/phantom-wallet.json

# Set as default
solana config set --keypair ~/phantom-wallet.json

# Verify it matches Phantom
solana address
```

**Step 3: Wrap SOL**
```bash
spl-token wrap 0.5 --url devnet
```

---

### Method 2: Use CLI Wallet in Phantom

**Step 1: Export CLI Keypair**
```bash
cat ~/.config/solana/id.json
```

**Step 2: Import to Phantom**
1. Open Phantom
2. Add/Import Wallet
3. Paste the JSON array
4. Done!

**Step 3: Reconnect in Browser**
- Disconnect current wallet
- Connect the imported CLI wallet
- Should work now!

---

### Method 3: Quick Check First

**In Browser Console (F12):**
```javascript
// Check connected wallet
wallet?.publicKey?.toString()
```

**In Terminal:**
```bash
# Check CLI wallet
solana address
```

**If they're DIFFERENT:**
- That's your problem!
- Choose Method 1 or 2 above

**If they're the SAME:**
- Something else is wrong
- Check network (devnet vs mainnet)

---

## Why This Happens

Solana Associated Token Accounts are derived from:
```
ATA Address = derive(owner_wallet + token_mint + programs)
```

So:
- CLI wallet → Different ATA address
- Phantom wallet → Different ATA address

You wrapped SOL in CLI wallet, but Phantom has different address!

---

## Recommended Approach

**Use Phantom for everything:**
1. Export Phantom keypair
2. Import to CLI
3. Use that wallet for all operations
4. Keeps everything in sync!

---

## After Fix

Once wallets match:
1. Refresh browser
2. Reconnect wallet
3. Submit order
4. Should work! ✅

