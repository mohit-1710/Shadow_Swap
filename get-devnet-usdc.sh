#!/bin/bash

# Get devnet USDC for testing ShadowSwap
# Run: bash get-devnet-usdc.sh

WALLET="EESP63TVePDpiNJU4gEVeHkPxmcQe4XKifUecNvMRe8r"
USDC_MINT="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

echo "🔧 Setting up devnet USDC for wallet: $WALLET"
echo ""

# Create USDC token account
echo "📦 Creating USDC token account..."
spl-token create-account $USDC_MINT --owner $WALLET --url devnet

echo ""
echo "✅ USDC account created!"
echo ""
echo "📨 Now ask your backend engineer to send USDC to:"
echo "   Wallet: $WALLET"
echo "   Mint: $USDC_MINT"
echo ""

