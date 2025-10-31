# ShadowSwap Production Deployment Checklist

## 📋 Overview

This guide covers the complete deployment flow for ShadowSwap:
1. Smart Contract (Already deployed ✅)
2. Settlement Bot
3. Frontend Application

---

## 🔐 Pre-Deployment: Wallet & Keypair Setup

### 1. Decide on Your Authority Wallet

**Critical Decision:** Choose ONE wallet to be the order book authority.

```bash
# Check your current wallet
solana address

# If you need to create a new wallet for production
solana-keygen new --outfile ~/.config/solana/production-authority.json

# Set as default
solana config set --keypair ~/.config/solana/production-authority.json
```

### 2. Fund Your Wallets

For **Devnet:**
```bash
solana airdrop 2
# Or use: https://faucet.solana.com
```

For **Mainnet:**
- Ensure sufficient SOL for:
  - Account rent (~0.02 SOL per account)
  - Transaction fees (~0.000005 SOL per transaction)
  - Bot operations (~0.5 SOL recommended)

---

## 📦 Part 1: Smart Contract Setup (One-Time)

### Current Status
✅ Program deployed: `CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA`

### Initialize Order Book & Authorization

**Run this ONCE with the AUTHORITY wallet:**

```bash
cd apps/anchor_program

# Make sure you're using the authority wallet
solana config get

# Initialize order book and create callback auth
node scripts/setup-simple.js
```

**What this creates:**
- ✅ Order Book PDA for SOL/USDC pair
- ✅ CallbackAuth PDA for keeper authorization
- ✅ Generates `.env` file with all addresses

**Expected Output:**
```
Order Book PDA: 63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ
Callback Auth PDA: 3B2ZXKVKNqfrGibkKDMyctwDsTEW2FWYBEKgZZzQLNk6
✅ Callback auth created!
```

### ⚠️ Current Issue

The existing order book was created by wallet `3TyDdbus...`, but you're using wallet `3QsnGf33...`.

**Fix Options:**

#### Option A: Use Original Authority Wallet (Recommended)
```bash
# If you have the original keypair
solana config set --keypair /path/to/original/keypair.json

# Then create the callback auth
cd apps/anchor_program
node scripts/setup-simple.js
```

#### Option B: Create Fresh Order Book with YOUR Wallet
```bash
# This creates a NEW order book for a different token pair
# Edit setup-simple.js to use different mints, or:

# Delete/rename existing order book in setup script
# Then run:
node scripts/setup-simple.js
```

---

## 🤖 Part 2: Settlement Bot Deployment

### 1. Configure Environment Variables

Create/update `apps/settlement_bot/.env`:

```bash
# Blockchain Configuration
RPC_URL=https://api.devnet.solana.com
WSS_URL=wss://api.devnet.solana.com
PROGRAM_ID=CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA
ORDER_BOOK_PUBKEY=63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ

# Keeper Wallet (SAME as the one authorized in callback_auth)
KEEPER_KEYPAIR_PATH=~/.config/solana/id.json

# Matching Configuration
MATCH_INTERVAL=10000  # milliseconds between matching cycles
MIN_MATCH_SIZE=1000000  # minimum order size to match (lamports)

# MPC Configuration (Arcium)
ARCIUM_MPC_URL=https://mpc.arcium.com
ARCIUM_API_KEY=your_arcium_api_key_here  # Get from Arcium dashboard

# Sanctum Integration (for LST conversions)
SANCTUM_GATEWAY_URL=https://gateway.sanctum.so
SANCTUM_API_KEY=your_sanctum_key_here  # Optional

# MEV Protection (Optional - for production)
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
JITO_TIP_ACCOUNT=your_jito_tip_account  # Optional

# Logging
LOG_LEVEL=info  # debug, info, warn, error
```

### 2. Install Dependencies

```bash
cd apps/settlement_bot
yarn install
```

### 3. Test Bot Locally

```bash
yarn dev
```

**Expected Output:**
```
✅ Keeper bot started successfully
🔐 Verifying keeper authorization...
✅ Keeper authorization verified  # <- MUST see this for production!
⏱️ Starting matching cycle #1...
```

### 4. Deploy Bot (Production)

**Option A: Using PM2 (Recommended)**

```bash
# Install PM2
npm install -g pm2

# Start bot
cd apps/settlement_bot
pm2 start "yarn dev" --name shadowswap-keeper

# View logs
pm2 logs shadowswap-keeper

# Auto-restart on system reboot
pm2 startup
pm2 save
```

**Option B: Using Docker**

```bash
# Create Dockerfile in apps/settlement_bot/
cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
CMD ["yarn", "dev"]
EOF

# Build and run
docker build -t shadowswap-bot .
docker run -d --name keeper \
  --env-file .env \
  -v ~/.config/solana:/root/.config/solana:ro \
  shadowswap-bot
```

**Option C: Systemd Service (Linux)**

```bash
sudo nano /etc/systemd/system/shadowswap-keeper.service
```

```ini
[Unit]
Description=ShadowSwap Keeper Bot
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/Shadow_Swap/apps/settlement_bot
Environment="NODE_ENV=production"
ExecStart=/usr/bin/yarn dev
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable shadowswap-keeper
sudo systemctl start shadowswap-keeper
sudo systemctl status shadowswap-keeper
```

### 5. Monitor Bot Health

```bash
# Check logs
pm2 logs shadowswap-keeper

# Check if bot is running
pm2 status

# Monitor resource usage
pm2 monit
```

---

## 🌐 Part 3: Frontend Deployment

### 1. Configure Environment Variables

Create `ShadowSwap SPA Design/.env.local`:

```bash
# Program Configuration
NEXT_PUBLIC_PROGRAM_ID=CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA
NEXT_PUBLIC_ORDER_BOOK_PUBKEY=63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ

# Network Configuration
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet  # or mainnet-beta

# Token Mints
NEXT_PUBLIC_SOL_MINT=So11111111111111111111111111111111111111112
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Optional: Custom RPC endpoints
NEXT_PUBLIC_CUSTOM_RPC=your_alchemy_or_helius_endpoint
```

### 2. Build Frontend

```bash
cd "ShadowSwap SPA Design"

# Install dependencies
pnpm install

# Build for production
pnpm build
```

### 3. Deploy Frontend

**Option A: Vercel (Recommended for Next.js)**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# Or via CLI:
vercel env add NEXT_PUBLIC_PROGRAM_ID production
# (repeat for all env vars)
```

**Option B: Netlify**

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
pnpm build
netlify deploy --prod --dir=.next
```

**Option C: Self-Hosted (VPS/Docker)**

```bash
# Using PM2
cd "ShadowSwap SPA Design"
pnpm build
pm2 start "pnpm start" --name shadowswap-frontend

# Or using Docker
cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
EOF

docker build -t shadowswap-frontend .
docker run -d -p 3000:3000 --name frontend shadowswap-frontend
```

**Option D: Nginx Reverse Proxy**

```nginx
# /etc/nginx/sites-available/shadowswap
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔍 Post-Deployment Verification

### 1. Verify Smart Contract Setup

```bash
cd apps/anchor_program
npx ts-node scripts/inspect-state.ts
```

**Check for:**
- ✅ Order Book exists
- ✅ Order Book authority matches your wallet
- ✅ CallbackAuth exists
- ✅ CallbackAuth is active and not expired

### 2. Verify Bot is Running

```bash
# Check bot logs
pm2 logs shadowswap-keeper --lines 50

# Should see:
# ✅ Keeper authorization verified
# ⏱️ Starting matching cycle
```

### 3. Verify Frontend

Visit your deployed URL and check:
- ✅ Wallet connects (Phantom/Solflare)
- ✅ Order book loads
- ✅ No console errors
- ✅ Can view prices/charts

### 4. Test Complete Flow (Optional)

```bash
# 1. Connect wallet on frontend
# 2. Submit a test order
# 3. Check bot logs for matching activity
# 4. Verify order appears in order book
```

---

## 🚨 Critical Security Checks

### Before Going to Mainnet:

- [ ] **Wallet Security**
  - Use hardware wallet for authority
  - Never commit keypairs to git
  - Secure `.env` files with proper permissions (chmod 600)

- [ ] **RPC Endpoints**
  - Use dedicated RPC (Alchemy, Helius, QuickNode)
  - Don't rely on public endpoints for production
  - Set up rate limiting

- [ ] **Bot Security**
  - Run bot on secure VPS with firewall
  - Use SSH keys, disable password auth
  - Monitor for unauthorized access

- [ ] **Smart Contract**
  - Audit code before mainnet deployment
  - Test extensively on devnet
  - Consider multi-sig for authority wallet

- [ ] **Monitoring**
  - Set up alerting (PagerDuty, Discord webhook)
  - Monitor bot uptime
  - Track failed transactions

---

## 🐛 Troubleshooting Common Issues

### Issue: "Authorization check failed"

**Cause:** CallbackAuth doesn't exist or expired

**Fix:**
```bash
cd apps/anchor_program
node scripts/setup-simple.js  # Creates callback auth
```

### Issue: "Insufficient funds in escrow"

**Cause:** User didn't approve token transfer

**Fix:** Ensure frontend requests proper token approval before order submission

### Issue: Bot not matching orders

**Causes:**
1. No active orders
2. Orders don't overlap (no matching bid/ask)
3. Network issues

**Debug:**
```bash
pm2 logs shadowswap-keeper
# Look for "Found X active orders"
```

### Issue: Frontend shows "Network Error"

**Fix:**
- Check RPC endpoint is correct
- Verify network matches (devnet vs mainnet)
- Check browser console for CORS errors

---

## 📊 Monitoring & Maintenance

### Daily Checks

```bash
# Bot status
pm2 status shadowswap-keeper

# Recent bot logs
pm2 logs --lines 100

# Check order book state
cd apps/anchor_program && npx ts-node scripts/inspect-state.ts
```

### Weekly Maintenance

- Review bot error logs
- Check CallbackAuth expiration (renew if < 30 days)
- Verify order book health
- Monitor RPC usage/costs

### Monthly Tasks

- Update dependencies (`yarn upgrade`)
- Review security patches
- Audit transaction fees
- Backup important data

---

## 📞 Emergency Contacts & Resources

### If Bot Stops Working

1. Check bot logs: `pm2 logs shadowswap-keeper`
2. Restart: `pm2 restart shadowswap-keeper`
3. Verify authorization: `node scripts/inspect-state.ts`

### Useful Commands

```bash
# View all PM2 processes
pm2 list

# Stop bot temporarily
pm2 stop shadowswap-keeper

# Delete bot from PM2
pm2 delete shadowswap-keeper

# View live logs
pm2 logs shadowswap-keeper --raw
```

### Documentation Links

- Anchor Docs: https://www.anchor-lang.com/
- Solana Docs: https://docs.solana.com/
- Next.js Deployment: https://nextjs.org/docs/deployment

---

## ✅ Final Checklist

Before marking deployment complete:

- [ ] Smart contract deployed and initialized
- [ ] Order book created with correct authority
- [ ] CallbackAuth created and active
- [ ] Bot running with authorization verified
- [ ] Frontend deployed and accessible
- [ ] Can connect wallet on frontend
- [ ] Environment variables secured
- [ ] Monitoring/alerts configured
- [ ] Backups of keypairs secured offline
- [ ] Team has access to all credentials (securely)

---

**Last Updated:** October 31, 2025  
**Network:** Devnet (update for mainnet deployment)

