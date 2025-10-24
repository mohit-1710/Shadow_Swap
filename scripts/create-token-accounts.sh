#!/bin/bash

# Script to create token accounts for testing ShadowSwap on Devnet

echo "🚀 ShadowSwap - Token Account Setup"
echo "===================================="
echo ""

# Check if wallet is configured
if ! solana address --url devnet > /dev/null 2>&1; then
    echo "❌ Error: No Solana wallet configured"
    echo "Run: solana-keygen new"
    exit 1
fi

WALLET=$(solana address)
echo "📍 Wallet: $WALLET"
echo ""

# Check SOL balance
BALANCE=$(solana balance --url devnet | awk '{print $1}')
echo "💰 Current SOL Balance: $BALANCE"

if (( $(echo "$BALANCE < 1" | bc -l) )); then
    echo "⚠️  Low balance, requesting airdrop..."
    solana airdrop 2 --url devnet
    echo "✅ Airdrop complete"
fi

echo ""
echo "Creating token accounts..."
echo ""

# Devnet USDC mint
USDC_MINT="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

# Check if USDC account exists
echo "📦 Checking USDC token account..."
if spl-token account-info $USDC_MINT --url devnet > /dev/null 2>&1; then
    echo "✅ USDC token account already exists"
else
    echo "Creating USDC token account..."
    spl-token create-account $USDC_MINT --url devnet
    echo "✅ USDC token account created"
fi

# Check if Wrapped SOL account exists
SOL_MINT="So11111111111111111111111111111111111111112"
echo "📦 Checking Wrapped SOL token account..."
if spl-token account-info $SOL_MINT --url devnet > /dev/null 2>&1; then
    echo "✅ Wrapped SOL token account already exists"
else
    echo "Creating Wrapped SOL token account..."
    spl-token create-account $SOL_MINT --url devnet
    echo "✅ Wrapped SOL token account created"
    
    # Wrap some SOL for testing
    echo "Wrapping 0.1 SOL for testing..."
    spl-token wrap 0.1 --url devnet
fi

echo ""
echo "✅ Token accounts setup complete!"
echo ""
echo "📋 Your token accounts:"
spl-token accounts --url devnet
echo ""
echo "🎉 You're ready to test ShadowSwap!"
echo "   Open http://localhost:3000 and connect your wallet"

