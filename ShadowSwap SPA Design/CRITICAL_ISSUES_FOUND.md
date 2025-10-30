# 🚨 CRITICAL ISSUES FOUND - Trade Not Working

**Date:** October 29, 2025  
**User Wallet:** EESP63TVePDpiNJU4gEVeHkPxmcQe4XKifUecNvMRe8r  
**User Balance:** 10 devnet SOL  
**Attempted Trade:** 1 SOL at 100 USDC  
**Result:** NOT WORKING

---

## 🔍 Root Causes Identified

### **ISSUE #1: Program Transfers ENTIRE Token Balance**

**Location:** `apps/anchor_program/programs/shadow_swap/src/lib.rs` (Line 115)

```rust
// Transfer tokens to escrow
token::transfer(
    CpiContext::new(...),
    ctx.accounts.user_token_account.amount,  // ← TRANSFERS ENTIRE BALANCE!
)?;
```

**The Problem:**
The smart contract transfers your **ENTIRE token account balance** to escrow, not just the amount you specify!

**Example:**
- You have: 10 wrapped SOL
- You want to sell: 1 SOL
- Program actually transfers: **ALL 10 SOL** to escrow!

**Why This is Critical:**
- You lose control of all your tokens until settlement
- If the order doesn't match, you must cancel to get them back
- This defeats the purpose of limit orders with specific amounts

**This is a BACKEND ISSUE** - The backend engineer needs to fix the Rust program.

---

### **ISSUE #2: Native SOL vs Wrapped SOL**

**The Problem:**
You have 10 **native SOL** in your wallet, but the program expects **wrapped SOL (WSOL)** as an SPL token.

**Current Setup:**
```
BASE_MINT = So11111111111111111111111111111111111111112  (Native SOL mint)
```

**What You Need:**
1. A wrapped SOL token account
2. Transfer SOL → WSOL before trading
3. The program treats WSOL like any other SPL token

**Current State:**
```
✅ Native SOL Balance: 10 SOL
❌ Wrapped SOL Token Account: Doesn't exist OR is empty
❌ USDC Token Account: Doesn't exist OR is empty
```

---

### **ISSUE #3: No Token Accounts Created**

**The Problem:**
You need SPL token accounts for both SOL and USDC before you can trade.

**What the Program Expects:**
1. User has a wrapped SOL (WSOL) token account
2. User has a USDC token account
3. Both accounts have the tokens you want to trade

**What Happens When Missing:**
```
Error: "Account not found" or "Invalid account data"
```

---

### **ISSUE #4: No USDC Devnet Tokens**

**The Problem:**
Even if you create token accounts, you don't have devnet USDC to trade.

**To get devnet USDC:**
- Contact backend engineer (they have mint authority)
- OR use a devnet USDC faucet (if available)
- You need USDC to place buy orders

---

## 🛠️ **How to Fix Each Issue**

### **Fix #1: Backend Engineer Must Fix Smart Contract**

**Current Code (WRONG):**
```rust
token::transfer(
    CpiContext::new(...),
    ctx.accounts.user_token_account.amount,  // Wrong!
)?;
```

**Should Be:**
```rust
// Extract actual amount from encrypted_amount or add it as a parameter
let transfer_amount = /* decode from encrypted_amount or pass as param */;

token::transfer(
    CpiContext::new(...),
    transfer_amount,  // Only transfer what user specified!
)?;
```

**Status:** ⚠️ **BACKEND ENGINEER MUST FIX THIS**

---

### **Fix #2: Wrap Your SOL**

**Option A: Manual Wrapping (Command Line)**
```bash
# Create a wrapped SOL account and transfer SOL to it
spl-token wrap 5 --keypair ~/.config/solana/id.json
```

**Option B: Frontend Auto-Wrapping**
```typescript
// Add this to shadowSwapClient.ts
async wrapSol(amount: number) {
  // Create wrapped SOL account
  // Transfer native SOL to it
  // Return wrapped token account address
}
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### **Fix #3: Create Token Accounts**

**What You Need:**
```bash
# 1. Create wrapped SOL account
spl-token create-account So11111111111111111111111111111111111111112

# 2. Wrap some SOL
spl-token wrap 5

# 3. Create USDC account
spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# 4. Get USDC from backend engineer
```

**Status:** ⚠️ **YOU CAN DO THIS NOW**

---

### **Fix #4: Get Devnet USDC**

**Contact Backend Engineer:**
```
Hey [Engineer Name],

Can you send me some devnet USDC to test trading?
My wallet: EESP63TVePDpiNJU4gEVeHkPxmcQe4XKifUecNvMRe8r
Amount needed: 1000 USDC (for testing)

Thanks!
```

**Status:** ⚠️ **NEED BACKEND ENGINEER**

---

## 📋 **Step-by-Step Fix Guide**

### **What You Can Do Now (Without Backend Engineer)**

1. **Install Solana CLI** (if not already installed):
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

2. **Set your keypair:**
   ```bash
   solana config set --keypair /path/to/your/keypair.json
   solana config set --url https://api.devnet.solana.com
   ```

3. **Check your native SOL balance:**
   ```bash
   solana balance
   # Should show: 10 SOL
   ```

4. **Create wrapped SOL token account:**
   ```bash
   spl-token create-account So11111111111111111111111111111111111111112
   ```

5. **Wrap 5 SOL for trading:**
   ```bash
   spl-token wrap 5
   ```

6. **Verify wrapped SOL balance:**
   ```bash
   spl-token balance So11111111111111111111111111111111111111112
   # Should show: 5 SOL
   ```

7. **Create USDC token account:**
   ```bash
   spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
   ```

8. **NOW contact backend engineer for USDC**

### **What Backend Engineer Must Do**

1. **Fix the smart contract** (Issue #1)
   - Modify `submit_encrypted_order` to transfer only specified amount
   - Redeploy the program
   - Update the program ID

2. **Send you devnet USDC** (Issue #4)
   - Mint 1000 USDC to your wallet
   - Or give you mint authority

3. **Verify settlement bot is running**
   - Orders won't match without the bot

---

## 🧪 **Testing After Fixes**

Once everything is set up:

1. **Verify your token accounts:**
   ```bash
   spl-token accounts
   # Should show both WSOL and USDC accounts with balances
   ```

2. **Try a small test order:**
   - Amount: 0.1 SOL
   - Price: 100 USDC
   - Type: Limit order

3. **Check the transaction:**
   - Should see transaction signature
   - Check on Solana Explorer (devnet)
   - Verify escrow only took 0.1 SOL, not all of it

4. **Cancel the order (if needed):**
   - To get your tokens back from escrow

---

## 📝 **Summary of Issues**

| Issue | Severity | Can You Fix? | Status |
|-------|----------|--------------|--------|
| #1: Program transfers entire balance | 🔴 **CRITICAL** | ❌ No (backend) | Need engineer |
| #2: Need wrapped SOL | 🟡 **HIGH** | ✅ Yes | Run commands above |
| #3: No token accounts | 🟡 **HIGH** | ✅ Yes | Run commands above |
| #4: No devnet USDC | 🟡 **HIGH** | ❌ No (backend) | Need engineer |

---

## 🎯 **What to Tell Backend Engineer**

**Short Version:**
> "The smart contract transfers the entire token account balance to escrow instead of just the specified amount. Line 115 in lib.rs uses `ctx.accounts.user_token_account.amount` instead of the amount parameter. This needs to be fixed before we can properly test trading."

**Long Version:**
> "I found a critical bug in the `submit_encrypted_order` function. At line 115, the token::transfer call uses `ctx.accounts.user_token_account.amount`, which transfers the user's ENTIRE token balance to escrow. For example, if I have 10 SOL and want to sell 1 SOL, it transfers all 10 SOL. The function needs to either:
> 1. Accept the transfer amount as a parameter, OR
> 2. Decrypt the encrypted_amount to get the actual amount to transfer
> 
> Currently, this makes limit orders unusable because users lose control of all their tokens until settlement or cancellation."

---

## 💡 **Recommended UI Improvements**

Add warnings to the trade form:

```tsx
{/* WARNING: Show this until backend fix is deployed */}
<Alert variant="warning">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Known Issue</AlertTitle>
  <AlertDescription>
    Currently, the smart contract will escrow your ENTIRE token balance, 
    not just the amount you specify. Only trade if you're comfortable 
    locking up all your tokens until the order settles or is cancelled.
  </AlertDescription>
</Alert>
```

---

## 🔗 **Useful Commands Reference**

```bash
# Check balances
solana balance                    # Native SOL
spl-token accounts                # All token accounts
spl-token balance <MINT>          # Specific token

# Wrap/Unwrap SOL
spl-token wrap <AMOUNT>           # Convert SOL → WSOL
spl-token unwrap <ACCOUNT>        # Convert WSOL → SOL

# Create token accounts
spl-token create-account <MINT>   # Create new token account

# View transactions
solana confirm <SIGNATURE> -v     # Detailed transaction info
```

---

## 🎯 **Next Steps**

1. ✅ **YOU:** Run the SOL wrapping commands above
2. ✅ **YOU:** Create token accounts
3. ⏳ **WAIT:** Backend engineer to send USDC
4. ⏳ **WAIT:** Backend engineer to fix smart contract
5. ✅ **THEN:** Test trading functionality

---

**Current Status:** ⚠️ **BLOCKED** - Need backend engineer to fix Issues #1 and #4

**Your Part:** ✅ **CAN START** - Create token accounts and wrap SOL (Issues #2 and #3)

**Estimated Fix Time:** 
- Your part: 10 minutes
- Backend part: 1-2 hours (smart contract fix + redeploy)

