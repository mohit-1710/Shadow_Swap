# ShadowSwap Troubleshooting Guide

## Error: "Account does not exist or has no data"

This error typically occurs when:
1. Wallet doesn't have a token account for USDC
2. Incorrect token mint address in configuration
3. PDA derivation mismatch

---

## Quick Fix: Create Token Accounts

### Option 1: Use Devnet USDC Mint (Recommended)

The correct Devnet USDC mint is: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

**Update your `.env.local`:**
```bash
NEXT_PUBLIC_QUOTE_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### Option 2: Create Your Own Test Token

```bash
# Install SPL Token CLI (if not installed)
cargo install spl-token-cli

# Create a new mint
spl-token create-token --decimals 6 --url devnet

# Output will be something like:
# Creating token 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Create token account for your wallet
spl-token create-account <TOKEN_MINT> --url devnet

# Mint some tokens to yourself
spl-token mint <TOKEN_MINT> 10000 --url devnet
```

### Option 3: Simplify to SOL/SOL Trading (Testing)

For quick testing, use SOL for both base and quote:

**Update `.env.local`:**
```bash
NEXT_PUBLIC_BASE_MINT=So11111111111111111111111111111111111111112
NEXT_PUBLIC_QUOTE_MINT=So11111111111111111111111111111111111111112
```

**Note:** This creates a SOL/SOL pair which doesn't make economic sense but is useful for testing!

---

## Step-by-Step Resolution

### 1. Check Your Wallet
```bash
# Check your wallet address
solana address

# Check SOL balance
solana balance --url devnet

# If low, airdrop some SOL
solana airdrop 2 --url devnet
```

### 2. Check Token Accounts
```bash
# List all token accounts for your wallet
spl-token accounts --url devnet

# If you don't see USDC, create it
spl-token create-account EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v --url devnet
```

### 3. Get Test USDC
Since devnet USDC faucets are unreliable, create your own:

```bash
# Create a test USDC mint
spl-token create-token --decimals 6 --url devnet
# Save the output mint address

# Create account
spl-token create-account <YOUR_MINT> --url devnet

# Mint tokens to yourself
spl-token mint <YOUR_MINT> 1000000 --url devnet
```

### 4. Update Frontend Configuration

**Edit `apps/frontend/.env.local`:**
```bash
NEXT_PUBLIC_QUOTE_MINT=<YOUR_TOKEN_MINT>
```

### 5. Restart Frontend
```bash
# Stop the frontend (Ctrl+C)
cd apps/frontend
yarn dev
```

---

## Alternative: Use Mock Token Accounts

If you just want to test the UI without real token transfers, we can modify the code to handle missing token accounts gracefully:

### Update `OrderSubmissionForm.tsx`

Change the balance fetching to handle errors:

```typescript
// Around line 65-90
const fetchBalances = async () => {
  try {
    // Wrap in try-catch to handle missing accounts
    try {
      const baseAta = await getOrCreateAssociatedTokenAccount(
        connection,
        baseMintAddress,
        wallet.publicKey!,
        wallet.publicKey!
      );
      const baseBalanceBigInt = await getTokenBalance(connection, baseAta);
      setBaseBalance(formatTokenAmount(baseBalanceBigInt, 9));
    } catch (err) {
      console.warn('Could not fetch base balance:', err);
      setBaseBalance('0');
    }

    try {
      const quoteAta = await getOrCreateAssociatedTokenAccount(
        connection,
        quoteMintAddress,
        wallet.publicKey!,
        wallet.publicKey!
      );
      const quoteBalanceBigInt = await getTokenBalance(connection, quoteAta);
      setQuoteBalance(formatTokenAmount(quoteBalanceBigInt, 6));
    } catch (err) {
      console.warn('Could not fetch quote balance:', err);
      setQuoteBalance('0');
    }
  } catch (error) {
    console.error('Error fetching balances:', error);
  }
};
```

---

## Debugging Commands

### Check Account
```bash
# Check if an account exists
solana account <ACCOUNT_ADDRESS> --url devnet
```

### Check Order Book
```bash
yarn anchor:inspect
```

### View Program Logs
```bash
solana logs DcCs5AEhd6Sx5opAjhkpNUtNSQwQf7GV3UU7JsfxcvXu --url devnet
```

### Check Browser Console
Open browser DevTools (F12) → Console tab to see detailed error messages

---

## Common Issues

### Issue 1: "Account does not exist" - Balance Fetching
**Cause:** Wallet doesn't have token account  
**Solution:** Create token account or add error handling

### Issue 2: "Account does not exist" - Order Submission
**Cause:** Incorrect PDA derivation or missing token account  
**Solution:** Verify PDA seeds match program, ensure token accounts exist

### Issue 3: Transaction Fails with "insufficient funds"
**Cause:** Not enough SOL for rent or gas  
**Solution:** `solana airdrop 2 --url devnet`

### Issue 4: Keeper Bot Not Matching
**Cause:** Mock mode is enabled  
**Solution:** This is expected! Mock mode doesn't execute real settlements

---

## Quick Test Setup Script

Save this as `scripts/setup-test-tokens.sh`:

```bash
#!/bin/bash

echo "🚀 Setting up test tokens..."

# Airdrop SOL
echo "📥 Airdropping SOL..."
solana airdrop 2 --url devnet

# Create test USDC
echo "🪙 Creating test USDC mint..."
TEST_USDC=$(spl-token create-token --decimals 6 --url devnet | grep "Creating token" | awk '{print $3}')
echo "Created: $TEST_USDC"

# Create token account
echo "📦 Creating token account..."
spl-token create-account $TEST_USDC --url devnet

# Mint tokens
echo "💰 Minting 1,000,000 test USDC..."
spl-token mint $TEST_USDC 1000000 --url devnet

echo "✅ Done!"
echo ""
echo "Add this to apps/frontend/.env.local:"
echo "NEXT_PUBLIC_QUOTE_MINT=$TEST_USDC"
```

**Run it:**
```bash
chmod +x scripts/setup-test-tokens.sh
./scripts/setup-test-tokens.sh
```

---

## Need More Help?

1. Check browser console for detailed errors
2. Check keeper bot logs
3. Run `yarn anchor:inspect` to see on-chain state
4. View program logs: `solana logs <PROGRAM_ID> --url devnet`

---

## Contact

If issues persist, provide:
- Error message (full stack trace from browser console)
- Account address that's failing
- Output of `yarn anchor:inspect`
- Wallet address

