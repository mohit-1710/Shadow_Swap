#!/bin/bash

# ShadowSwap Frontend - Vercel CLI Deployment Script
# Run this from the ShadowSwap SPA Design/ directory

set -e

echo "🚀 ShadowSwap Frontend - Vercel Deployment"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "next.config.mjs" ]; then
  echo "❌ Error: Please run this script from the 'ShadowSwap SPA Design' directory"
  exit 1
fi

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "❌ Error: Vercel CLI is not installed"
  echo "Install it with: npm i -g vercel"
  exit 1
fi

echo "✅ Vercel CLI found: $(vercel --version)"
echo ""

# Check if project is linked
if vercel project ls &> /dev/null; then
  echo "✅ Project is linked to Vercel"
else
  echo "📎 Linking project to Vercel..."
  echo "   (You'll be prompted to authenticate and configure)"
  vercel link --yes || {
    echo "⚠️  Link command requires interaction. Please run manually:"
    echo "   vercel link"
    exit 1
  }
fi

echo ""
echo "📝 Setting environment variables..."
echo ""

# Set environment variables for production
echo "Setting NEXT_PUBLIC_PROGRAM_ID..."
echo "ESHkd14KmUUJthjVqKoh7JP1oVVMFJCqPPkpsrJrT5Kt" | vercel env add NEXT_PUBLIC_PROGRAM_ID production

echo "Setting NEXT_PUBLIC_ORDER_BOOK..."
echo "DneZLDgRwDoa7XViSEaAb9BGMj2R8frinJ3ydwAucyfz" | vercel env add NEXT_PUBLIC_ORDER_BOOK production

echo "Setting NEXT_PUBLIC_RPC_URL..."
echo "https://api.devnet.solana.com" | vercel env add NEXT_PUBLIC_RPC_URL production

echo "Setting NEXT_PUBLIC_BASE_MINT..."
echo "So11111111111111111111111111111111111111112" | vercel env add NEXT_PUBLIC_BASE_MINT production

echo "Setting NEXT_PUBLIC_QUOTE_MINT..."
echo "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" | vercel env add NEXT_PUBLIC_QUOTE_MINT production

echo ""
echo "✅ Environment variables set"
echo ""
echo "🌐 Verifying environment variables..."
vercel env ls

echo ""
echo "🚀 Deploying to production..."
echo ""

# Deploy to production
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Visit the deployment URL shown above"
echo "2. Check browser console for any errors"
echo "3. Verify environment variables are loaded:"
echo "   Open console and run: console.log(process.env.NEXT_PUBLIC_PROGRAM_ID)"



