use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    /// Input structure for an encrypted order
    pub struct OrderInput {
        side: u8,        // 0 = Buy, 1 = Sell
        price: u64,      // Price in quote tokens per base token
        amount: u64,     // Amount in base token units
        timestamp: u64,  // Order timestamp for time priority
    }

    /// Output structure for a match result
    pub struct MatchOutput {
        matched_amount: u64,
        execution_price: u64,
    }

    /// Match two orders using price-time priority
    ///
    /// This function runs in MPC and operates on encrypted data.
    /// It checks if buyer's price >= seller's price and returns match details.
    #[instruction]
    pub fn match_two_orders(
        buy_order: Enc<Shared, OrderInput>,
        sell_order: Enc<Shared, OrderInput>,
    ) -> Enc<Shared, MatchOutput> {
        // Decrypt within MPC (data never leaves encrypted state to outside)
        let buy = buy_order.to_arcis();
        let sell = sell_order.to_arcis();

        // Check if match is possible (buy price >= sell price)
        let can_match = buy.price >= sell.price;

        // Calculate matched amount (minimum of both orders)
        let matched_amount = if can_match {
            if buy.amount < sell.amount {
                buy.amount
            } else {
                sell.amount
            }
        } else {
            0 // No match
        };

        // Determine execution price using time priority
        // Earlier order's price is used (maker's price)
        let execution_price = if buy.timestamp <= sell.timestamp {
            buy.price
        } else {
            sell.price
        };

        // Create output
        let result = MatchOutput {
            matched_amount,
            execution_price,
        };

        // Re-encrypt result for the same owner (shared secret)
        buy_order.owner.from_arcis(result)
    }

    /// Batch match orders from a list
    /// 
    /// This function demonstrates matching multiple orders in one MPC computation.
    /// It sorts buy/sell orders by price-time priority and finds matches.
    #[instruction]
    pub fn batch_match_orders(
        orders: Vec<Enc<Shared, OrderInput>>,
    ) -> Vec<Enc<Shared, MatchOutput>> {
        let mut decrypted_orders: Vec<OrderInput> = Vec::new();
        let mut owners: Vec<Shared> = Vec::new();

        // Decrypt all orders within MPC
        for order in orders.iter() {
            decrypted_orders.push(order.to_arcis());
            owners.push(order.owner.clone());
        }

        // Separate buy and sell orders
        let mut buy_orders: Vec<(usize, &OrderInput)> = Vec::new();
        let mut sell_orders: Vec<(usize, &OrderInput)> = Vec::new();

        for (idx, order) in decrypted_orders.iter().enumerate() {
            if order.side == 0 {
                buy_orders.push((idx, order));
            } else {
                sell_orders.push((idx, order));
            }
        }

        // Sort buy orders: highest price first, then oldest
        buy_orders.sort_by(|a, b| {
            if a.1.price != b.1.price {
                b.1.price.cmp(&a.1.price) // Descending price
            } else {
                a.1.timestamp.cmp(&b.1.timestamp) // Ascending timestamp
            }
        });

        // Sort sell orders: lowest price first, then oldest
        sell_orders.sort_by(|a, b| {
            if a.1.price != b.1.price {
                a.1.price.cmp(&b.1.price) // Ascending price
            } else {
                a.1.timestamp.cmp(&b.1.timestamp) // Ascending timestamp
            }
        });

        // Match orders
        let mut results: Vec<Enc<Shared, MatchOutput>> = Vec::new();
        let mut buy_idx = 0;
        let mut sell_idx = 0;

        while buy_idx < buy_orders.len() && sell_idx < sell_orders.len() {
            let (buy_pos, buy_order) = buy_orders[buy_idx];
            let (sell_pos, sell_order) = sell_orders[sell_idx];

            // Check if prices cross
            if buy_order.price >= sell_order.price {
                // Match found
                let matched_amount = if buy_order.amount < sell_order.amount {
                    buy_order.amount
                } else {
                    sell_order.amount
                };

                let execution_price = if buy_order.timestamp <= sell_order.timestamp {
                    buy_order.price
                } else {
                    sell_order.price
                };

                let result = MatchOutput {
                    matched_amount,
                    execution_price,
                };

                // Encrypt result for buyer's owner
                results.push(owners[buy_pos].from_arcis(result.clone()));
                // Encrypt result for seller's owner  
                results.push(owners[sell_pos].from_arcis(result));

                buy_idx += 1;
                sell_idx += 1;
            } else {
                // No more matches possible
                break;
            }
        }

        results
    }
}

