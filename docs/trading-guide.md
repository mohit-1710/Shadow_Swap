---
title: Trading Guide
description: Master limit orders, market orders, and advanced ShadowSwap features
lastUpdated: 2025-01-30
---

# Trading Guide

## Order Types

### Limit Orders

**When to Use:**
- You want to specify exact execution price
- No urgency to fill immediately
- Willing to wait for a matching order
- Maximum privacy (order only matches with other encrypted orders)

**How to Place:**

**File**: `ShadowSwap SPA Design/components/trade-section.tsx` (lines 68-660)

#### Step-by-Step UI Flow

1. **Select "Limit" tab** in the trade form

```typescript
<div className="flex gap-2 bg-white/5 p-1 rounded-lg">
  <button
    onClick={() => setOrderType("limit")}
    className={`flex-1 py-2 rounded transition-all touch-manipulation ${
      orderType === "limit" ? "bg-purple-500 text-white font-medium glow-purple" : "text-white/60 hover:text-white active:text-white"
    }`}
  >
    Limit
  </button>
</div>
```

2. **Choose token pair** (e.g., SOL/USDC)

```typescript
const ALL_TOKENS = [
  "SOL", "USDC", "TRUMP", "USDT", "jlUSDC", "JLP", "cbBTC", "MET",
  "ETH", "PUMP", "JitoSOL", "PAYAI", "WBTC", "USELESS", "USD1",
  "JUP", "USDG", "mSOL", "syrupUSDC", "BTC"
]
```

**Note**: Currently only **SOL/USDC** pair is supported on Devnet. Other tokens will show a warning:

```typescript
{(fromToken !== "SOL" && fromToken !== "USDC") || (toToken !== "SOL" && toToken !== "USDC") ? (
  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
    <p className="text-xs text-orange-400 flex items-center gap-2">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>Currently only SOL/USDC trading pair is supported. Please select SOL and USDC.</span>
    </p>
  </div>
) : null}
```

3. **Enter amount** in "From" field

```typescript
<Input
  type="number"
  placeholder="0.00"
  value={fromAmount}
  onChange={(e) => setFromAmount(e.target.value)}
  className="flex-1"
/>
```

**Balance display**:
```typescript
<div className="text-xs text-white/40 mt-1">
  Balance: {isWalletConnected ? `${solBalance.toFixed(4)} SOL` : 'Connect wallet'}
</div>
```

4. **Enter price** in "Price" field

```typescript
{orderType === "limit" && (
  <div>
    <label className="block text-sm text-white/70 mb-2">Limit Price (USDC per SOL)</label>
    <Input 
      type="number" 
      placeholder="100.00" 
      value={limitPrice}
      onChange={(e) => setLimitPrice(e.target.value)}
      className="w-full" 
    />
  </div>
)}
```

5. **Review estimated total** in "To" field (auto-calculated)

**Auto-calculation logic** (from `trade-section.tsx` lines 110-147):

```typescript
useEffect(() => {
  if (!fromAmount || parseFloat(fromAmount) <= 0) {
    setToAmount("")
    return
  }

  const amount = parseFloat(fromAmount)
  let calculatedAmount = 0

  if (orderType === "market") {
    // Use current market price
    if (fromToken === "SOL") {
      // Selling SOL for USDC: amount * price
      calculatedAmount = amount * currentMarketPrice
    } else {
      // Buying SOL with USDC: amount / price
      calculatedAmount = amount / currentMarketPrice
    }
  } else {
    // Limit order - use limit price
    if (!limitPrice || parseFloat(limitPrice) <= 0) {
      setToAmount("")
      return
    }
    
    const price = parseFloat(limitPrice)
    if (fromToken === "SOL") {
      // Selling SOL for USDC: amount * price
      calculatedAmount = amount * price
    } else {
      // Buying SOL with USDC: amount / price
      calculatedAmount = amount / price
    }
  }

  setToAmount(calculatedAmount.toFixed(6))
}, [fromAmount, limitPrice, orderType, fromToken, currentMarketPrice])
```

**Info display**:
```typescript
<div className="text-xs text-purple-400/60 mt-1 flex items-center gap-1">
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  Auto-calculated based on your limit price
</div>
```

6. **(Optional) Enable "LP Fallback"** for guaranteed execution

```typescript
<div className="relative group">
  <button
    onClick={() => setAllowLiquidityPool(!allowLiquidityPool)}
    className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
      allowLiquidityPool
        ? 'bg-purple-500/20 border-purple-400/50 text-purple-400'
        : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
    }`}
  >
    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
      allowLiquidityPool ? 'border-purple-400' : 'border-white/40'
    }`}>
      {allowLiquidityPool && (
        <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
      )}
    </div>
    <span>LP Fallback</span>
  </button>

  {/* Tooltip */}
  <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
    <p className="text-xs text-white/80 leading-relaxed">
      Enable this to allow your order to execute through liquidity pools if no direct orderbook match is found. 
      <span className="text-purple-400 font-medium"> Note:</span> This may reduce privacy guarantees but ensures order execution.
    </p>
  </div>
</div>
```

**Warning when enabled**:
```typescript
{allowLiquidityPool && (
  <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-3">
    <p className="text-xs text-purple-400 flex items-center gap-2">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>Liquidity pool fallback enabled - order may execute with reduced privacy</span>
    </p>
  </div>
)}
```

7. **(Optional) Select order duration** (days dropdown)

```typescript
<div className="relative" ref={daysDropdownRef}>
  <button
    onClick={() => setShowDaysDropdown(!showDaysDropdown)}
    className="h-full flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-md text-white transition-colors whitespace-nowrap"
  >
    <span className="text-xs font-medium">
      {daysToKeepOpen === "0" ? "∞" : `${daysToKeepOpen}d`}
    </span>
    <ChevronDown className="w-3 h-3" />
  </button>

  {showDaysDropdown && (
    <div className="absolute bottom-full right-0 mb-2 w-40 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl z-[200]">
      <div className="py-0.5">
        {[
          { value: "1", label: "1 Day" },
          { value: "3", label: "3 Days" },
          { value: "7", label: "7 Days" },
          { value: "14", label: "14 Days" },
          { value: "30", label: "30 Days" },
          { value: "90", label: "90 Days" },
          { value: "0", label: "Until Cancelled" },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setDaysToKeepOpen(option.value)
              setShowDaysDropdown(false)
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/10 transition-colors text-left ${
              daysToKeepOpen === option.value ? "bg-purple-500/20" : ""
            }`}
          >
            <span className="text-white text-xs">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )}
</div>
```

**Note**: Order expiration is UI-only for now—backend implementation coming soon.

8. **Click "Place Limit Order"**

```typescript
<Button 
  variant="default" 
  size="lg" 
  className={orderType === "limit" ? "flex-1" : "w-full"}
  onClick={handleTrade}
  disabled={isSubmitting || !isWalletConnected}
>
  {isSubmitting 
    ? (
      <span className="flex items-center gap-2">
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Submitting...
      </span>
    )
    : !isWalletConnected 
    ? "Connect Wallet to Trade" 
    : orderType === "limit" 
    ? "Place Limit Order" 
    : "Execute Market Order"}
</Button>
```

9. **Confirm transaction** in your wallet

**Backend order submission** (`ShadowSwap SPA Design/lib/shadowSwapClient.ts` lines 95-221):

```typescript
async submitOrder(params: OrderParams): Promise<OrderResult> {
  try {
    await this.initialize();
    if (!this.program || !this.provider.publicKey) {
      return { success: false, error: 'Program not initialized or wallet not connected' };
    }

    const { side, amount, price } = params;

    // Convert to lamports/micro units
    const amountLamports = side === 'buy' 
      ? Math.floor(amount * Math.pow(10, QUOTE_DECIMALS)) // USDC amount for buy
      : Math.floor(amount * Math.pow(10, BASE_DECIMALS));  // SOL amount for sell
    
    const priceLamports = Math.floor(price * Math.pow(10, QUOTE_DECIMALS));

    // Create plain order
    const plainOrder: PlainOrder = {
      side: side === 'buy' ? 0 : 1,
      amount: amountLamports,
      price: priceLamports,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Validate order
    const validation = validateOrder(plainOrder);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Encrypt order
    const encryptedOrder = await encryptOrderWithArcium(plainOrder, this.orderBook);

    // Get order count
    const orderCount = await fetchOrderCount(this.connection, this.orderBook, this.program);

    // Derive PDAs
    const [orderPda] = deriveOrderPda(this.orderBook, orderCount, this.programId);
    const [escrowPda] = deriveEscrowPda(orderPda, this.programId);
    const [escrowTokenPda] = deriveEscrowTokenAccountPda(orderPda, this.programId);

    // Build transaction
    const transaction = new Transaction();

    // Get or create user token account
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      tokenMint,
      this.provider.publicKey,
      this.provider.publicKey,
      transaction
    );

    // If selling, wrap SOL first
    if (side === 'sell') {
      const wrapAmount = BigInt(amountLamports) + BigInt(2_039_280); // Add rent
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: this.provider.publicKey,
          toPubkey: userTokenAccount,
          lamports: Number(wrapAmount),
        })
      );
      transaction.add(createSyncNativeInstruction(userTokenAccount));
    }

    // Build submit order instruction
    const submitOrderIx = await this.program.methods
      .submitEncryptedOrder(paddedCipherPayload, encryptedAmountBuffer)
      .accounts({
        orderBook: this.orderBook,
        order: orderPda,
        escrow: escrowPda,
        escrowTokenAccount: escrowTokenPda,
        userTokenAccount: userTokenAccount,
        tokenMint: tokenMint,
        owner: this.provider.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    transaction.add(submitOrderIx);

    // Send transaction
    const signature = await this.provider.sendAndConfirm(transaction);

    return { success: true, signature };
  } catch (error: any) {
    console.error('Error submitting order:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to submit order' 
    };
  }
}
```

#### Example Trade

**Scenario**: Sell 10 SOL at 142.50 USDC per SOL

**Inputs**:
- From: 10.00 SOL
- To: 1425.00 USDC (auto-calculated)
- Price: 142.50 USDC/SOL
- Fee: 0.1% = 1.425 USDC (paid by taker when matched)
- Duration: 7 days

**Transaction breakdown**:
- **User pays**: 10 SOL (escrowed)
- **Network fee**: ~0.000005 SOL
- **Rent deposit**: ~0.002 SOL (refundable on cancel/fill)
- **Total cost**: 10.002005 SOL

**Expected behavior**:
- Order appears in Order History with "Active" status
- Keeper bot matches within 10-30 seconds if matching buy order exists
- If no match, order stays active until matched or cancelled
- If LP Fallback enabled and no match after timeout, routes through AMM

---

### Market Orders

**When to Use:**
- Need immediate execution
- Price is less important than speed
- Sufficient liquidity available
- Trading during volatile market conditions

**How to Place:**

1. **Select "Market" tab**
2. **Enter amount**
3. **Review estimated price** from current best bid/ask

**Current market price display** (`trade-section.tsx` lines 536-553):

```typescript
<div className="bg-white/5 p-3 rounded-lg text-sm">
  <div className="flex justify-between items-center text-white/60">
    <span>Current Market Price</span>
    {isPriceLoading ? (
      <span className="text-white/40 text-xs">Loading...</span>
    ) : (
      <span className="text-purple-400 font-medium">
        {fromToken === "SOL" && toToken === "USDC" 
          ? `1 SOL = $${currentMarketPrice.toFixed(2)} USDC`
          : fromToken === "USDC" && toToken === "SOL"
          ? `1 USDC = ${(1 / currentMarketPrice).toFixed(6)} SOL`
          : `1 ${fromToken} = ${toToken}`
        }
      </span>
    )}
  </div>
</div>
```

**Price source** (`ShadowSwap SPA Design/hooks/useCurrentPrice.ts`):

```typescript
export function useCurrentPrice() {
  const [price, setPrice] = useState(142.50) // Default fallback
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchPrice = async () => {
      setIsLoading(true)
      try {
        // Fetch real SOL price from Pyth or Jupiter API
        const response = await fetch('https://price.jup.ag/v4/price?ids=SOL')
        const data = await response.json()
        setPrice(data.data.SOL.price)
      } catch (error) {
        console.error('Error fetching price:', error)
        // Keep fallback price
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrice()
    const interval = setInterval(fetchPrice, 10000) // Update every 10s
    return () => clearInterval(interval)
  }, [])

  return { price, isLoading }
}
```

4. **Click "Execute Market Order"**
5. **Confirm in wallet**

**Warning**: Market orders execute at best available price, which may differ from displayed estimate if liquidity shifts between submission and execution.

**Market order logic** (`trade-section.tsx` lines 228-235):

```typescript
if (orderType === "market") {
  price = 100 // Default market price - will be matched by bot
  toast.info("Market orders use best available price", { dismissible: true })
} else {
  price = parseFloat(limitPrice)
}
```

**Note**: Market orders use a placeholder price (100) and are matched by the keeper bot at the best available execution price from the orderbook.

---

## Token Selection

### Available Pairs

**File**: `ShadowSwap SPA Design/components/trade-section.tsx` (lines 14-19)

```typescript
const ALL_TOKENS = [
  "SOL", "USDC", "TRUMP", "USDT", "jlUSDC", "JLP", "cbBTC", "MET",
  "ETH", "PUMP", "JitoSOL", "PAYAI", "WBTC", "USELESS", "USD1",
  "JUP", "USDG", "mSOL", "syrupUSDC", "BTC"
]
```

**Current support**: Only **SOL/USDC** is active on Devnet.

**Future pairs** (roadmap):
- SOL/USDT
- ETH/USDC
- BTC/USDC
- JitoSOL/SOL
- JUP/USDC

### Token Icon System

**File**: `ShadowSwap SPA Design/components/trade-section.tsx` (lines 22-66)

```typescript
const TokenIcon = ({ token }: { token: string }) => {
  // Map token symbols to their actual icon filenames
  const iconMap: { [key: string]: string } = {
    'SOL': 'SOL-logo.png',
    'USDC': 'USDC-logo.png',
    'USDT': 'USDT-logo.png',
    'ETH': 'ETH-logo.png',
    'TRUMP': 'TRUMP-logo.jpg',
    'BTC': 'WBTC-logo.png',
    'WBTC': 'WBTC-logo.png',
    'cbBTC': 'cbBTC-logo.png',
    'JLP': 'JLP-logo.png',
    'MET': 'MET-logo.png',
    'JitoSOL': 'JitoSOL-logo.png',
    'PAYAI': 'PAYAI-logo.webp',
    'PUMP': 'PUMP-logo.png',
    'JUP': 'JUP-logo.png',
    'mSOL': 'mSOL-logo.png',
    'USDG': 'USDG-logo.png',
    'USD1': 'USD1-logo.png',
    'USELESS': 'USELESS-logo.png',
    'jlUSDC': 'jiUSDC.logo.png',
    'syrupUSDC': 'syrupUSDC-logo.png',
    'CASH': 'CASH-logo.png',
  }

  const iconFile = iconMap[token] || `${token}-logo.png`

  return (
    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center overflow-hidden relative">
      <img
        src={`/icons/${iconFile}`}
        alt={token}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          if (target.parentElement) {
            target.parentElement.innerHTML = `<span class="text-xs font-bold text-purple-400">${token.charAt(0)}</span>`
          }
        }}
      />
    </div>
  )
}
```

**Icons stored in**: `ShadowSwap SPA Design/public/icons/`

**Fallback**: If icon not found, displays first letter of symbol (e.g., "S" for SOL).

---

## LP Fallback Feature

### What is LP Fallback?

**LP Fallback** (Liquidity Pool Fallback) is an optional feature that allows your order to execute through public AMMs (like Raydium or Orca) if no matching order exists in the ShadowSwap orderbook.

### How It Works

#### Fallback Disabled (Default)
- Order **only matches** with other encrypted orders in the ShadowSwap orderbook
- **Maximum privacy**: No order details ever hit public mempool
- **Zero MEV exposure**: Impossible to front-run or sandwich
- **May not fill**: If no matching order exists, order stays active indefinitely

#### Fallback Enabled
- **Primary attempt**: Try to match with ShadowSwap orderbook first
- **Fallback**: If no match after timeout (30-60 seconds), route through public AMM
- **Guaranteed execution**: As long as AMM has sufficient liquidity
- **Reduced privacy**: AMM transaction is public (order details visible)
- **Potential MEV**: AMM leg may be front-run by bots

### Use Case Examples

**Scenario 1: Small trade, non-urgent**
- Trade: Buy 0.5 SOL at 142 USDC
- **Recommendation**: **Disable** LP Fallback
- **Reason**: Small amount, can wait for orderbook match, prioritize privacy

**Scenario 2: Large trade, time-sensitive**
- Trade: Buy 100 SOL at market price during volatile spike
- **Recommendation**: **Enable** LP Fallback
- **Reason**: Execution certainty more important than privacy

**Scenario 3: Arbitrage opportunity**
- Trade: Buy 50 SOL at 140 USDC (below market 142 USDC)
- **Recommendation**: **Disable** LP Fallback
- **Reason**: Orderbook match gives better price; AMM would execute at 142 USDC

### Privacy vs. Execution Tradeoff

| Feature | LP Fallback Disabled | LP Fallback Enabled |
|---------|---------------------|---------------------|
| **Privacy** | Maximum (encrypted only) | Reduced (AMM leg visible) |
| **MEV Exposure** | Zero | Possible on AMM leg |
| **Fill Guarantee** | No guarantee | High (if AMM liquidity exists) |
| **Execution Speed** | 10-30s (if match exists) | Immediate (AMM fallback) |
| **Price** | Exact limit price | Market price (AMM) |
| **Best For** | Patient traders | Urgent trades |

---

## Order Management

### Viewing Your Orders

**File**: `ShadowSwap SPA Design/components/order-history.tsx`

Orders are displayed in the **Order History** table below the trade form:

```typescript
<table className="w-full text-xs sm:text-sm min-w-[600px]">
  <thead>
    <tr className="border-b border-white/10">
      <th className="text-left py-3 px-4 text-white/60 font-medium">Order ID</th>
      <th className="text-left py-3 px-4 text-white/60 font-medium">Pair</th>
      <th className="text-center py-3 px-4 text-white/60 font-medium">Status</th>
      <th className="text-right py-3 px-4 text-white/60 font-medium">Created At</th>
      <th className="text-center py-3 px-4 text-white/60 font-medium">Actions</th>
    </tr>
  </thead>
  <tbody>
    {orders.map((order) => (
      <tr 
        key={order.publicKey}
        className="border-b border-white/5 hover:bg-white/5 transition-colors"
      >
        <td className="py-3 px-4 text-white font-mono text-xs">
          {order.orderId.slice(0, 8)}...
        </td>
        <td className="py-3 px-4 text-white">SOL/USDC</td>
        <td className="py-3 px-4 text-center">
          <Pill variant={getStatusVariant(order.status)}>
            {getStatusText(order.status)}
          </Pill>
        </td>
        <td className="py-3 px-4 text-right text-white/50 text-xs">
          {formatDate(order.createdAt)}
        </td>
        <td className="py-3 px-4 text-center">
          {/* Cancel button if Active/Partial */}
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

**Columns**:
- **Order ID**: First 8 characters of order account pubkey
- **Pair**: Trading pair (e.g., SOL/USDC)
- **Status**: Current order state (Active, Partial, Filled, Cancelled, Matching)
- **Created At**: Timestamp (formatted as "Jan 15, 2025, 10:30 AM")
- **Actions**: Cancel button (only for Active/Partial orders)

**Status colors**:

```typescript
const getStatusVariant = (status: number): "success" | "warning" | "error" => {
  switch (status) {
    case ORDER_STATUS.FILLED:
    case ORDER_STATUS.EXECUTED:
      return "success" // Green
    case ORDER_STATUS.ACTIVE:
    case ORDER_STATUS.PARTIAL:
    case ORDER_STATUS.MATCHED_PENDING:
      return "warning" // Purple/Yellow
    case ORDER_STATUS.CANCELLED:
      return "error" // Red
    default:
      return "warning"
  }
}
```

**Auto-refresh**: Order history refreshes every **5 seconds** (configurable):

```typescript
const { orders, isLoading, error, refresh } = useOrderBook(5000) // 5s refresh
```

### Cancelling Orders

**Only Active or Partial orders can be cancelled.** Once an order is Filled or Cancelled, it is immutable.

#### UI Flow

**Step 1**: Locate order with "Active" or "Partial" status

**Step 2**: Click "Cancel" button

```typescript
{order.status === ORDER_STATUS.ACTIVE || order.status === ORDER_STATUS.PARTIAL ? (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => handleCancelOrder(order.publicKey)}
    disabled={cancellingOrderId !== null}
    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
    title="Cancel this order"
  >
    {cancellingOrderId === order.publicKey ? (
      <>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Cancelling...
      </>
    ) : (
      'Cancel'
    )}
  </Button>
) : (
  <span className="text-white/30 text-xs">-</span>
)}
```

**Step 3**: Confirm cancellation in wallet

**Step 4**: Funds return from Escrow to your wallet

#### Backend Cancel Logic

**File**: `ShadowSwap SPA Design/lib/shadowSwapClient.ts` (lines 302-417)

```typescript
async cancelOrder(orderAddress: PublicKey): Promise<OrderResult> {
  try {
    await this.initialize();
    if (!this.program || !this.provider.publicKey) {
      return { success: false, error: 'Program not initialized or wallet not connected' };
    }

    // Fetch order account
    const orderAccount = await (this.program.account as any).encryptedOrder.fetch(orderAddress);
    
    // Check if order can be cancelled (must be ACTIVE or PARTIAL)
    const canCancel = orderAccount.status === ORDER_STATUS.ACTIVE || orderAccount.status === ORDER_STATUS.PARTIAL;
    
    if (!canCancel) {
      const statusText = this.getOrderStatusText(orderAccount.status);
      return { 
        success: false, 
        error: `Cannot cancel order - current status: ${statusText}. The order may have already been filled or cancelled.` 
      };
    }
    
    // Derive PDAs
    const [escrowPda] = deriveEscrowPda(orderAddress, this.programId);
    const [escrowTokenPda] = deriveEscrowTokenAccountPda(orderAddress, this.programId);

    // Fetch the escrow token account to check what mint it holds
    const escrowTokenAccountInfo = await this.connection.getAccountInfo(escrowTokenPda);
    const escrowTokenData = AccountLayout.decode(escrowTokenAccountInfo.data);
    const tokenMint = new PublicKey(escrowTokenData.mint);

    // Create transaction
    const transaction = new Transaction();

    // Get or create user token account for refund
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      tokenMint,
      this.provider.publicKey,
      this.provider.publicKey,
      transaction
    );

    // Build cancel instruction
    const cancelIx = await this.program.methods
      .cancelOrder()
      .accounts({
        order: orderAddress,
        escrow: escrowPda,
        escrowTokenAccount: escrowTokenPda,
        userTokenAccount: userTokenAccount,
        orderBook: this.orderBook,
        owner: this.provider.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    transaction.add(cancelIx);

    // If refunding wSOL, add instruction to close the wSOL account and recover rent
    if (tokenMint.equals(NATIVE_MINT)) {
      const closeWsolIx = createCloseAccountInstruction(
        userTokenAccount,
        this.provider.publicKey,
        this.provider.publicKey
      );
      transaction.add(closeWsolIx);
    }

    const signature = await this.provider.sendAndConfirm(transaction);

    return { success: true, signature };
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to cancel order' 
    };
  }
}
```

**Key points**:
- Verifies order status **on-chain** before attempting cancel
- Returns funds to user's associated token account
- If WSOL, automatically unwraps (closes wSOL account)
- Rent (~0.002 SOL) is **refunded** to user

**On-chain cancel instruction** (`apps/anchor_program/programs/shadow_swap/src/lib.rs` lines 123-175):

```rust
pub fn cancel_order(ctx: Context<CancelOrder>) -> Result<()> {
    let order = &mut ctx.accounts.order;
    let escrow = &ctx.accounts.escrow;
    let clock = Clock::get()?;

    // Verify order ownership
    require!(
        order.owner == ctx.accounts.owner.key(),
        ShadowSwapError::UnauthorizedCallback
    );

    // Verify order can be cancelled
    require!(
        order.status == ORDER_STATUS_ACTIVE || order.status == ORDER_STATUS_PARTIAL,
        ShadowSwapError::InvalidOrderStatus
    );

    // Update order status
    order.status = ORDER_STATUS_CANCELLED;
    order.updated_at = clock.unix_timestamp;

    // Update order book
    let order_book = &mut ctx.accounts.order_book;
    order_book.active_orders = order_book
        .active_orders
        .checked_sub(1)
        .ok_or(ShadowSwapError::NumericalOverflow)?;

    // Return funds from escrow
    let order_key = order.key();
    let seeds = &[
        ESCROW_SEED,
        order_key.as_ref(),
        &[escrow.bump],
    ];
    let signer = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.escrow.to_account_info(),
            },
            signer,
        ),
        ctx.accounts.escrow_token_account.amount,
    )?;

    msg!("Order cancelled: ID {}", order.order_id);
    Ok(())
}
```

---

## Understanding Fees

### Fee Structure

**Trading Fee**: **0.1%** (10 basis points)

**Paid by**: Order **taker** (matched order)

**Collected by**: Protocol fee collector account

**No hidden costs**: Zero MEV tax, zero priority fees required

**Fee collector address**: Configured in `OrderBook` account (`fee_collector` field)

### Fee Calculation

**Implementation**: `apps/anchor_program/programs/shadow_swap/src/lib.rs` (lines 32, 464)

```rust
pub struct OrderBook {
    // ...
    pub fee_bps: u16, // Fee basis points (e.g., 10 = 0.1%)
    pub fee_collector: Pubkey,
    // ...
}
```

**Example** (from Getting Started docs):

```
Trade: Buy 5 SOL at 142.00 USDC/SOL
Base Amount: 5 SOL
Quote Amount: 710.00 USDC
Fee (0.1%): 0.71 USDC
Total Cost: 710.71 USDC
```

**Fee deduction happens during settlement**:

```rust
// In submit_match_results instruction
let fee_amount = (quote_amount * fee_bps as u64) / 10000;
let net_amount = quote_amount - fee_amount;

// Transfer net amount to seller
token::transfer(..., net_amount)?;

// Transfer fee to fee collector
token::transfer(..., fee_amount)?;
```

**Note**: Current implementation transfers full `quote_amount` to seller. Fee collection is handled separately (or may be implemented in future versions).

### Network Fees (Solana)

**Transaction fee**: ~0.000005 SOL per signature

**Rent exemption**: ~0.002 SOL per account (refundable on close)

**Example breakdown**:
- Place order: 3 signatures (user, order creation, escrow creation) = ~0.000015 SOL
- Rent for Order account: ~0.002 SOL
- Rent for Escrow account: ~0.002 SOL
- Rent for Escrow Token account: ~0.002 SOL
- **Total**: ~0.006015 SOL (~$1.20 at $200/SOL)

**Rent refund**: When order is filled or cancelled, rent is returned to your wallet.

---

## Wallet Balance Management

### Checking Balances

**File**: `ShadowSwap SPA Design/components/trade-section.tsx` (lines 103-157)

Balances are displayed below each token selector:

```typescript
// Load balances when wallet connects
useEffect(() => {
  if (isWalletConnected) {
    loadBalances()
  }
}, [isWalletConnected])

const loadBalances = async () => {
  try {
    const balances = await getBalances()
    setSolBalance(balances.sol)
    setUsdcBalance(balances.usdc)
  } catch (err) {
    console.error("Error loading balances:", err)
  }
}
```

**Display**:
```typescript
<div className="text-xs text-white/40 mt-1">
  Balance: {isWalletConnected ? `${solBalance.toFixed(4)} SOL` : 'Connect wallet'}
</div>

<div className="text-xs text-white/40 mt-1">
  Balance: {isWalletConnected ? `${usdcBalance.toFixed(2)} USDC` : 'Connect wallet'}
</div>
```

**Auto-update**: Balances refresh after every transaction (order submission or cancellation).

### Wrapped SOL (WSOL)

**Important**: Solana programs use **Wrapped SOL**, not native SOL.

#### What is Wrapped SOL?
- **Wrapped SOL (WSOL)** = SOL in SPL token format
- Mint address: `So11111111111111111111111111111111111111112`
- Required because SPL Token Program treats all tokens uniformly

#### Automatic Wrapping

**File**: `ShadowSwap SPA Design/lib/shadowSwapClient.ts` (lines 154-165)

```typescript
// If selling, we need to wrap SOL first
if (side === 'sell') {
  // Add wrap SOL instruction
  const wrapAmount = BigInt(amountLamports) + BigInt(2_039_280); // Add rent for token account
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: this.provider.publicKey,
      toPubkey: userTokenAccount,
      lamports: Number(wrapAmount),
    })
  );
  transaction.add(createSyncNativeInstruction(userTokenAccount));
}
```

**Steps**:
1. Transfer SOL to your wSOL associated token account
2. Call `syncNative()` to recognize the balance as wSOL
3. Program treats wSOL like any other SPL token

**No manual action required**—frontend handles wrapping automatically!

#### Unwrapping (Cancel or Fill)

When you cancel a sell order or it gets filled, wSOL is **automatically unwrapped**:

```typescript
// If refunding wSOL, add instruction to close the wSOL account and recover rent
if (tokenMint.equals(NATIVE_MINT)) {
  const closeWsolIx = createCloseAccountInstruction(
    userTokenAccount,
    this.provider.publicKey,
    this.provider.publicKey
  );
  transaction.add(closeWsolIx);
}
```

**Result**: Native SOL returned to your wallet (not wSOL balance).

---

## Troubleshooting

### Order Not Filling

**Possible Causes**:

1. **No matching order at your price**
   - Your buy price is below the lowest sell order
   - Your sell price is above the highest buy order

2. **Insufficient liquidity**
   - No other traders have placed matching orders
   - Devnet has low activity compared to mainnet

3. **LP Fallback disabled**
   - Order only matches with orderbook
   - No fallback to AMM if no match found

**Solutions**:

- **Enable LP Fallback** for guaranteed execution
- **Adjust price closer to market**: Check current market price in the info box
- **Wait for matching order**: Limit orders can take minutes/hours to fill
- **Use market order**: If you need immediate execution
- **Check order history**: Verify order is "Active" (not "Cancelled" or "Filled")

### Transaction Failing

**Common Issues**:

#### 1. Insufficient Balance

**Error message**: "Insufficient funds" or "Account does not have enough balance"

**Solutions**:
- Check wallet balance in UI
- Ensure you have enough tokens + SOL for fees
- Request devnet SOL/USDC (see Getting Started guide)
- Account for rent: ~0.006 SOL per order

#### 2. Slippage Exceeded

**Error message**: "Slippage tolerance exceeded"

**Solutions**:
- Market moved during transaction confirmation
- Retry with updated price
- Use limit order instead of market order
- Increase slippage tolerance (if configurable)

#### 3. Order Book Not Active

**Error message**: "Order book is not active" (error code 6000)

**Solutions**:
- Verify order book address: `63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ`
- Check if program is deployed: `solana account CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA --url devnet`
- Contact support if persistent

#### 4. Program Error: "InvalidOrderStatus"

**Error message**: "Order status changed" or error code 6001

**Cause**: Order was matched/cancelled between when you fetched it and when you tried to cancel.

**Solution**:
- Refresh page to see latest order status
- Order may have been filled—check Order History

### Wallet Connection Issues

**File**: `ShadowSwap SPA Design/contexts/WalletContext.tsx`

**Issue 1**: "Wallet not connecting"

**Solutions**:
1. Ensure Phantom/Solflare installed
2. Set wallet network to **Devnet** (not Mainnet)
3. Refresh page and retry connection
4. Clear browser cache: `Cmd/Ctrl + Shift + R`
5. Try incognito/private window
6. Check browser console for errors: `F12` → Console tab

**Issue 2**: "Transaction approval not showing"

**Solutions**:
1. Check if wallet popup is blocked by browser
2. Click wallet extension icon manually
3. Ensure wallet is unlocked
4. Try disconnecting and reconnecting wallet

**Issue 3**: "Wrong network"

**Solutions**:
1. Open wallet settings
2. Change network to "Devnet"
3. Refresh ShadowSwap page
4. Reconnect wallet

---

## Best Practices

### For Privacy-Focused Trading

1. **Disable LP Fallback** unless urgent
   - Keeps orders in encrypted orderbook only
   - Zero MEV exposure

2. **Use limit orders** (more privacy than market orders)
   - Market orders may route through public AMMs
   - Limit orders only match with other ShadowSwap users

3. **Split large orders** into smaller batches
   - Harder to correlate on-chain activity
   - Reduces timing analysis vectors

4. **Randomize timing** (avoid predictable patterns)
   - Don't place orders at exact intervals (e.g., every hour)
   - Vary order sizes and prices

### For Cost-Efficient Trading

1. **Batch multiple trades** (amortize transaction fees)
   - Multiple orders in same session share setup costs
   - Rent deposits refunded on cancel/fill

2. **Use limit orders** (avoid market order slippage)
   - Set price slightly below/above market for quick fill
   - Example: Market at 142 USDC → Limit at 141.50 USDC (buy)

3. **Monitor fee tier** (some pairs may have different fees)
   - Current: 0.1% (10 bps) for SOL/USDC
   - Future pairs may have dynamic fees based on liquidity

### For Reliable Execution

1. **Enable LP Fallback** for time-sensitive trades
   - Guarantees fill if AMM has liquidity
   - Accept slight privacy tradeoff

2. **Check liquidity** before placing large orders
   - View orderbook depth (if available in UI)
   - Start with small test order

3. **Set reasonable prices** close to market rate
   - Too aggressive = never fills
   - Example: Market at 142 USDC → Limit at 141-143 USDC range

4. **Monitor order status** in history table
   - Check for "Matching" status (means keeper processing)
   - Refresh to see latest state

---

## Advanced Features

### Reading On-Chain Data

**File**: `ShadowSwap SPA Design/lib/program.ts`

#### Example: Finding Your Orders On-Chain

```bash
# Get your wallet address
solana address

# Fetch all orders (requires Anchor CLI)
anchor account encrypted_order <ORDER_PUBKEY> --provider.cluster devnet

# Example output:
{
  "owner": "YourWalletPubkey...",
  "orderBook": "63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ",
  "cipherPayload": [123, 45, 67, ...], // 512 bytes encrypted data
  "status": 1, // ACTIVE
  "encryptedRemaining": [89, 10, ...],
  "escrow": "EscrowPDAAddress...",
  "createdAt": 1706745600,
  "updatedAt": 1706745600,
  "orderId": 42,
  "bump": 255
}
```

#### Derive Order PDA Manually

**TypeScript**:
```typescript
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { deriveOrderPda } from './program';

const programId = new PublicKey('CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA');
const orderBook = new PublicKey('63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ');
const orderCount = new BN(42); // Example: 42nd order

const [orderPda, bump] = deriveOrderPda(orderBook, orderCount, programId);
console.log('Order PDA:', orderPda.toBase58());
console.log('Bump:', bump);
```

**Bash** (using `solana-keygen`):
```bash
# Not directly supported—use TypeScript/Anchor
```

### Escrow Account Management

**File**: `apps/anchor_program/programs/shadow_swap/src/lib.rs` (lines 479-513)

#### Escrow Structure

```rust
#[account]
pub struct Escrow {
    pub order: Pubkey,            // Order this escrow belongs to
    pub owner: Pubkey,            // Order owner
    pub order_book: Pubkey,       // Order book
    pub token_account: Pubkey,    // Token account holding escrowed funds
    pub token_mint: Pubkey,       // Mint of the escrowed token
    pub encrypted_amount: Vec<u8>,
    pub encrypted_remaining: Vec<u8>,
    pub created_at: i64,
    pub bump: u8,
}
```

#### Check Escrow Balance

**TypeScript**:
```typescript
import { getTokenBalance } from './tokenUtils';

const escrowTokenAccount = new PublicKey('EscrowTokenAccountAddress...');
const balance = await getTokenBalance(connection, escrowTokenAccount);
console.log('Escrow balance:', balance, 'lamports');
```

**Bash**:
```bash
# Get escrow token account balance
spl-token balance <ESCROW_TOKEN_ACCOUNT_PUBKEY> --url devnet

# Example output:
# 5.0 (if 5 SOL escrowed)
```

#### Auto-Close on Cancel

When you cancel an order, the escrow account is **automatically closed** and rent is refunded:

```rust
// Escrow PDA has authority to transfer
let seeds = &[ESCROW_SEED, order_key.as_ref(), &[escrow.bump]];
let signer = &[&seeds[..]];

token::transfer(
    CpiContext::new_with_signer(..., signer),
    ctx.accounts.escrow_token_account.amount, // Full balance
)?;
```

**Rent refund**: ~0.002 SOL returned to your wallet.

---

## Devnet Trading Tips

### Getting Test Tokens

See **[Getting Started](./getting-started.md)** guide for detailed instructions.

**Quick reference**:
- **SOL**: [https://faucet.solana.com](https://faucet.solana.com)
- **USDC**: Request in Solana Discord (#devnet-support)

### Simulating Real Conditions

#### Strategy 1: Create Buy + Sell Orders Manually

1. Connect Wallet A → Place buy order (e.g., 1 SOL at 140 USDC)
2. Connect Wallet B → Place sell order (e.g., 1 SOL at 140 USDC)
3. Wait for keeper bot to match (~10-30 seconds)
4. Verify settlement in Order History

#### Strategy 2: Use Market Orders

1. Place limit order in orderbook (e.g., sell 5 SOL at 142 USDC)
2. Place market buy order (e.g., buy 5 SOL)
3. Market order should match with your limit order instantly

#### Strategy 3: Test LP Fallback

1. Place limit order with **LP Fallback enabled**
2. Set price far from market (e.g., buy at 100 USDC when market is 142 USDC)
3. Wait 30-60 seconds—order should route through AMM if no match

### Debugging Orders

**Check order exists on-chain**:
```bash
# Replace <ORDER_PUBKEY> with your order address from Order History
solana account <ORDER_PUBKEY> --url devnet
```

**Check escrow balance**:
```bash
# Get escrow PDA first (use TypeScript helper)
# Then check balance
spl-token accounts --owner <ESCROW_PDA> --url devnet
```

**View transaction logs**:
```bash
# Get transaction signature from Order History or toast notification
solana confirm <SIGNATURE> -v --url devnet

# Example output shows instruction logs, transfers, and events
```

**Explorer**:
- Visit: [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)
- Paste your wallet address or transaction signature
- View order accounts, escrows, and settlements

---

## Next Steps

- **[MEV Protection](./mev-protection.md)**: Understand how encryption eliminates front-running
- **[Privacy & Security](./privacy-security.md)**: Deep dive into cryptographic guarantees
- **[Getting Started](./getting-started.md)**: Set up wallet and get devnet tokens

## Additional Resources

### Code References
- **Trade Form**: `ShadowSwap SPA Design/components/trade-section.tsx`
- **Order History**: `ShadowSwap SPA Design/components/order-history.tsx`
- **Client Library**: `ShadowSwap SPA Design/lib/shadowSwapClient.ts`
- **Token Utils**: `ShadowSwap SPA Design/lib/tokenUtils.ts`

### Developer Tools
- **Solana Explorer (Devnet)**: [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)
- **SPL Token CLI Docs**: [https://spl.solana.com/token](https://spl.solana.com/token)
- **Anchor Docs**: [https://www.anchor-lang.com](https://www.anchor-lang.com)

