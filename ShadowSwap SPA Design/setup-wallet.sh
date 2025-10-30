#!/bin/bash

# ShadowSwap Wallet Setup Script
# This script helps you set up the required token accounts for trading

echo "🚀 ShadowSwap Wallet Setup"
echo "=========================================="
echo ""

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found!"
    echo "Install it with:"
    echo "sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

echo "✅ Solana CLI found: $(solana --version)"
echo ""

# Set to devnet
echo "📡 Setting network to devnet..."
solana config set --url https://api.devnet.solana.com

# Check balance
echo ""
echo "💰 Checking your SOL balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 1" | bc -l) )); then
    echo "⚠️  Low balance! Get more SOL from: https://faucet.solana.com"
    read -p "Press Enter after getting more SOL..."
fi

echo ""
echo "🔧 Step 1: Creating Wrapped SOL (WSOL) token account..."
echo "----------------------------------------"

WSOL_MINT="So11111111111111111111111111111111111111112"

# Create WSOL account if it doesn't exist
echo "Creating account for mint: $WSOL_MINT"
spl-token create-account $WSOL_MINT 2>/dev/null || echo "Account already exists or error creating"

echo ""
read -p "How much SOL do you want to wrap for trading? (e.g., 5): " WRAP_AMOUNT

if [ ! -z "$WRAP_AMOUNT" ]; then
    echo "Wrapping $WRAP_AMOUNT SOL..."
    spl-token wrap $WRAP_AMOUNT
    echo "✅ Wrapped $WRAP_AMOUNT SOL"
fi

echo ""
echo "🔧 Step 2: Creating USDC token account..."
echo "----------------------------------------"

USDC_MINT="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

echo "Creating account for mint: $USDC_MINT"
spl-token create-account $USDC_MINT 2>/dev/null || echo "Account already exists or error creating"

echo ""
echo "📊 Your Token Accounts:"
echo "----------------------------------------"
spl-token accounts

echo ""
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: You still need devnet USDC!"
echo ""
echo "Contact your backend engineer with this message:"
echo "----------------------------------------"
echo "Hey! Can you send me devnet USDC for testing?"
echo "My wallet: $(solana address)"
echo "Amount: 1000 USDC (for testing trades)"
echo "Mint: $USDC_MINT"
echo "----------------------------------------"
echo ""
echo "📝 Next Steps:"
echo "1. ✅ Token accounts created"
echo "2. ✅ SOL wrapped (if you chose to wrap)"
echo "3. ⏳ Wait for USDC from backend engineer"
echo "4. ⏳ Backend engineer needs to fix smart contract (see CRITICAL_ISSUES_FOUND.md)"
echo "5. 🎉 Then you can start trading!"
echo ""
echo "📄 For detailed info, see: CRITICAL_ISSUES_FOUND.md"

