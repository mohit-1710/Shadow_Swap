/**
 * Order Matching Engine
 * 
 * Implements price-time priority matching algorithm for ShadowSwap
 */

import { PlainOrder, MatchedPair } from './types';

/**
 * Match orders using price-time priority algorithm
 * 
 * Algorithm:
 * 1. Separate buy and sell orders
 * 2. Sort buys: descending price, ascending timestamp
 * 3. Sort sells: ascending price, ascending timestamp
 * 4. Match: buyPrice >= sellPrice
 * 5. Execution price: maker order price (time priority)
 * 6. Handle partial fills
 * 
 * @param orders - Array of decrypted plain orders
 * @returns Array of matched pairs ready for settlement
 */
export function matchOrders(orders: PlainOrder[]): MatchedPair[] {
  console.log(`\n📊 Matching ${orders.length} orders...`);

  // Separate buy and sell orders
  // Side can be: 0 (buy), 1 (sell), 'buy', or 'sell'
  const buyOrders = orders
    .filter(o => (o.side === 0 || o.side === 'buy') && o.remainingAmount > 0)
    .sort((a, b) => {
      // Sort by price descending, then timestamp ascending
      if (b.price !== a.price) {
        return b.price - a.price;
      }
      return a.createdAt - b.createdAt;
    });

  const sellOrders = orders
    .filter(o => (o.side === 1 || o.side === 'sell') && o.remainingAmount > 0)
    .sort((a, b) => {
      // Sort by price ascending, then timestamp ascending
      if (a.price !== b.price) {
        return a.price - b.price;
      }
      return a.createdAt - b.createdAt;
    });

  console.log(`   📈 ${buyOrders.length} buy orders (highest bid: ${buyOrders[0]?.price || 'N/A'})`);
  console.log(`   📉 ${sellOrders.length} sell orders (lowest ask: ${sellOrders[0]?.price || 'N/A'})`);

  const matches: MatchedPair[] = [];

  // Clone arrays to track remaining amounts
  const buyOrdersCopy = buyOrders.map(o => ({ ...o }));
  const sellOrdersCopy = sellOrders.map(o => ({ ...o }));

  // Match orders
  let buyIdx = 0;
  let sellIdx = 0;

  while (buyIdx < buyOrdersCopy.length && sellIdx < sellOrdersCopy.length) {
    const buyOrder = buyOrdersCopy[buyIdx];
    const sellOrder = sellOrdersCopy[sellIdx];

    // Check if orders can match (buy price >= sell price)
    if (buyOrder.price < sellOrder.price) {
      break; // No more matches possible
    }

    // Calculate matched amount
    const matchedAmount = Math.min(
      buyOrder.remainingAmount,
      sellOrder.remainingAmount
    );

    // Determine execution price (time priority: maker's price)
    // The order that was placed first (maker) gets their price
    const executionPrice = buyOrder.createdAt < sellOrder.createdAt
      ? buyOrder.price  // Buy order was first (maker)
      : sellOrder.price; // Sell order was first (maker)

    // Create match
    matches.push({
      buyOrder: { ...buyOrder },
      sellOrder: { ...sellOrder },
      matchedAmount,
      executionPrice,
    });

    console.log(
      `   ✅ Match found: Buy #${buyOrder.orderId} @ ${buyOrder.price} ` +
      `<-> Sell #${sellOrder.orderId} @ ${sellOrder.price} | ` +
      `Amount: ${matchedAmount} @ ${executionPrice}`
    );

    // Update remaining amounts
    buyOrder.remainingAmount -= matchedAmount;
    sellOrder.remainingAmount -= matchedAmount;

    // Move to next order if current is fully filled
    if (buyOrder.remainingAmount === 0) {
      buyIdx++;
    }
    if (sellOrder.remainingAmount === 0) {
      sellIdx++;
    }
  }

  console.log(`\n🎯 Total matches found: ${matches.length}`);
  return matches;
}

/**
 * Validate a matched pair before submission
 * 
 * @param match - The matched pair to validate
 * @returns Whether the match is valid
 */
export function validateMatch(match: MatchedPair): boolean {
  // Basic validation
  if (match.matchedAmount <= 0) {
    console.warn('⚠️  Invalid match: matched amount must be positive');
    return false;
  }

  if (match.executionPrice <= 0) {
    console.warn('⚠️  Invalid match: execution price must be positive');
    return false;
  }

  // Check order sides (handle both numeric and string formats)
  const isBuyOrder = match.buyOrder.side === 0 || match.buyOrder.side === 'buy';
  const isSellOrder = match.sellOrder.side === 1 || match.sellOrder.side === 'sell';
  
  if (!isBuyOrder || !isSellOrder) {
    console.warn('⚠️  Invalid match: incorrect order sides');
    console.warn(`   Buy order side: ${match.buyOrder.side}, Sell order side: ${match.sellOrder.side}`);
    return false;
  }

  if (match.buyOrder.orderBook.toString() !== match.sellOrder.orderBook.toString()) {
    console.warn('⚠️  Invalid match: orders from different order books');
    return false;
  }

  // Verify price crossing
  if (match.buyOrder.price < match.sellOrder.price) {
    console.warn('⚠️  Invalid match: buy price < sell price');
    return false;
  }

  return true;
}

/**
 * Calculate total volume and fees for a set of matches
 * 
 * @param matches - Array of matched pairs
 * @param feeBps - Fee in basis points (e.g., 30 = 0.3%)
 * @returns Volume and fee statistics
 */
export function calculateMatchStats(
  matches: MatchedPair[],
  feeBps: number = 30
) {
  const totalVolume = matches.reduce(
    (sum, m) => sum + m.matchedAmount * m.executionPrice,
    0
  );

  const totalFees = (totalVolume * feeBps) / 10000;

  const totalBaseVolume = matches.reduce(
    (sum, m) => sum + m.matchedAmount,
    0
  );

  return {
    matchCount: matches.length,
    totalVolume, // Quote token volume
    totalBaseVolume, // Base token volume
    totalFees,
    averagePrice: totalBaseVolume > 0 ? totalVolume / totalBaseVolume : 0,
  };
}

/**
 * Group matches by priority for submission
 * 
 * Higher priority matches should be submitted first.
 * Priority is based on:
 * 1. Larger volume (more fees)
 * 2. Older orders (fairness)
 * 
 * @param matches - Array of matched pairs
 * @returns Sorted array with highest priority first
 */
export function prioritizeMatches(matches: MatchedPair[]): MatchedPair[] {
  return [...matches].sort((a, b) => {
    // Priority 1: Volume (descending)
    const volumeA = a.matchedAmount * a.executionPrice;
    const volumeB = b.matchedAmount * b.executionPrice;
    
    if (volumeB !== volumeA) {
      return volumeB - volumeA;
    }

    // Priority 2: Age of oldest order (ascending)
    const oldestA = Math.min(a.buyOrder.createdAt, a.sellOrder.createdAt);
    const oldestB = Math.min(b.buyOrder.createdAt, b.sellOrder.createdAt);
    
    return oldestA - oldestB;
  });
}

