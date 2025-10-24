use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt");

#[program]
pub mod shadow_swap {
    use super::*;

    /// Initialize a new order book for a trading pair
    pub fn initialize_order_book(
        ctx: Context<InitializeOrderBook>,
        base_mint: Pubkey,
        quote_mint: Pubkey,
        fee_bps: u16,
        min_base_order_size: u64,
    ) -> Result<()> {
        require!(fee_bps <= 10000, ShadowSwapError::InvalidFeeConfiguration);
        
        let order_book = &mut ctx.accounts.order_book;
        let clock = Clock::get()?;

        order_book.authority = ctx.accounts.authority.key();
        order_book.base_mint = base_mint;
        order_book.quote_mint = quote_mint;
        order_book.order_count = 0;
        order_book.active_orders = 0;
        order_book.encrypted_volume_base = vec![];
        order_book.encrypted_volume_quote = vec![];
        order_book.created_at = clock.unix_timestamp;
        order_book.last_trade_at = 0;
        order_book.fee_bps = fee_bps;
        order_book.fee_collector = ctx.accounts.fee_collector.key();
        order_book.min_base_order_size = min_base_order_size;
        order_book.is_active = true;
        order_book.bump = ctx.bumps.order_book;

        msg!("Order book initialized: {} / {}", base_mint, quote_mint);
        Ok(())
    }

    /// Submit an encrypted order (stores encrypted payload on-chain)
    /// 
    /// This is the standard Anchor instruction that accepts encrypted order data
    /// from the client and stores it on-chain. The matching happens off-chain
    /// in the Hybrid architecture.
    pub fn submit_encrypted_order(
        ctx: Context<SubmitEncryptedOrder>,
        cipher_payload: Vec<u8>,
        encrypted_amount: Vec<u8>,
    ) -> Result<()> {
        require!(
            ctx.accounts.order_book.is_active,
            ShadowSwapError::OrderBookNotActive
        );
        require!(
            cipher_payload.len() <= MAX_CIPHER_PAYLOAD_SIZE,
            ShadowSwapError::InvalidCipherPayload
        );
        require!(
            encrypted_amount.len() <= MAX_ENCRYPTED_AMOUNT_SIZE,
            ShadowSwapError::InvalidCipherPayload
        );

        let order_book = &mut ctx.accounts.order_book;
        let order = &mut ctx.accounts.order;
        let escrow = &mut ctx.accounts.escrow;
        let clock = Clock::get()?;

        // Assign order ID
        let order_id = order_book.order_count;
        order_book.order_count = order_book
            .order_count
            .checked_add(1)
            .ok_or(ShadowSwapError::NumericalOverflow)?;
        order_book.active_orders = order_book
            .active_orders
            .checked_add(1)
            .ok_or(ShadowSwapError::NumericalOverflow)?;

        // Initialize order
        order.owner = ctx.accounts.owner.key();
        order.order_book = order_book.key();
        order.cipher_payload = cipher_payload;
        order.status = ORDER_STATUS_ACTIVE;
        order.encrypted_remaining = encrypted_amount.clone();
        order.escrow = escrow.key();
        order.created_at = clock.unix_timestamp;
        order.updated_at = clock.unix_timestamp;
        order.order_id = order_id;
        order.bump = ctx.bumps.order;

        // Initialize escrow
        escrow.order = order.key();
        escrow.owner = ctx.accounts.owner.key();
        escrow.order_book = order_book.key();
        escrow.token_account = ctx.accounts.escrow_token_account.key();
        escrow.token_mint = ctx.accounts.token_mint.key();
        escrow.encrypted_amount = encrypted_amount.clone();
        escrow.encrypted_remaining = encrypted_amount;
        escrow.created_at = clock.unix_timestamp;
        escrow.bump = ctx.bumps.escrow;

        // Transfer tokens to escrow
        // Note: In production, the amount should be validated against the encrypted_amount
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.escrow_token_account.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            ctx.accounts.user_token_account.amount,
        )?;

        msg!("Encrypted order submitted: ID {}", order_id);
        Ok(())
    }

    /// Cancel an existing order
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

    /// Create callback authorization for keeper
    /// 
    /// This allows the order book authority to authorize a keeper bot
    /// to submit match results and execute settlements.
    pub fn create_callback_auth(
        ctx: Context<CreateCallbackAuth>,
        expires_at: i64,
    ) -> Result<()> {
        let callback_auth = &mut ctx.accounts.callback_auth;
        let clock = Clock::get()?;

        require!(
            expires_at > clock.unix_timestamp,
            ShadowSwapError::CallbackAuthExpired
        );

        callback_auth.authority = ctx.accounts.keeper.key();
        callback_auth.order_book = ctx.accounts.order_book.key();
        callback_auth.nonce = 0;
        callback_auth.expires_at = expires_at;
        callback_auth.is_active = true;
        callback_auth.created_at = clock.unix_timestamp;
        callback_auth.bump = ctx.bumps.callback_auth;

        msg!("Callback auth created for keeper: {}", ctx.accounts.keeper.key());
        Ok(())
    }

    /// Submit match results and execute settlement
    /// 
    /// This instruction is called by the authorized keeper bot after matching orders
    /// off-chain. It performs the actual token transfers to settle the trade.
    /// 
    /// Flow:
    /// 1. Verify keeper authorization via callback_auth
    /// 2. Calculate transfer amounts based on matched_amount and execution_price
    /// 3. Transfer quote tokens (USDC) from buyer's escrow to seller
    /// 4. Transfer base tokens (WSOL) from seller's escrow to buyer
    /// 5. Update order statuses to "Executed"
    /// 6. Emit settlement event
    pub fn submit_match_results<'info>(
        ctx: Context<'_, '_, '_, 'info, SubmitMatchResults<'info>>,
        match_input: MatchResultInput,
    ) -> Result<()> {
        let callback_auth = &ctx.accounts.callback_auth;
        let clock = Clock::get()?;

        // Verify callback authorization
        require!(
            callback_auth.is_active,
            ShadowSwapError::UnauthorizedCallback
        );
        require!(
            callback_auth.expires_at > clock.unix_timestamp,
            ShadowSwapError::CallbackAuthExpired
        );
        require!(
            callback_auth.authority == ctx.accounts.keeper.key(),
            ShadowSwapError::UnauthorizedCallback
        );

        let buyer_order = &mut ctx.accounts.buyer_order;
        let seller_order = &mut ctx.accounts.seller_order;

        // Verify orders are active or partially filled
        require!(
            buyer_order.status == ORDER_STATUS_ACTIVE || buyer_order.status == ORDER_STATUS_PARTIAL,
            ShadowSwapError::InvalidOrderStatus
        );
        require!(
            seller_order.status == ORDER_STATUS_ACTIVE || seller_order.status == ORDER_STATUS_PARTIAL,
            ShadowSwapError::InvalidOrderStatus
        );

        // Parse remaining_accounts
        // Expected order: [buyer_escrow_token, seller_escrow_token, buyer_token, seller_token]
        require!(
            ctx.remaining_accounts.len() == 4,
            ShadowSwapError::InvalidTokenMint
        );
        
        let buyer_escrow_token_info = ctx.remaining_accounts[0].clone();
        let seller_escrow_token_info = ctx.remaining_accounts[1].clone();
        let buyer_token_info = ctx.remaining_accounts[2].clone();
        let seller_token_info = ctx.remaining_accounts[3].clone();

        // Verify token accounts match escrow expectations
        require!(
            buyer_escrow_token_info.key() == ctx.accounts.buyer_escrow.token_account,
            ShadowSwapError::InvalidEscrow
        );
        require!(
            seller_escrow_token_info.key() == ctx.accounts.seller_escrow.token_account,
            ShadowSwapError::InvalidEscrow
        );

        // Calculate transfer amounts
        // matched_amount is in base token (WSOL) smallest units (lamports)
        // execution_price is quote tokens (USDC) smallest units per base token
        // Convert by dividing by base decimals factor so quote_amount is in quote smallest units
        let quote_amount_u128 = (match_input.matched_amount as u128)
            .checked_mul(match_input.execution_price as u128)
            .ok_or(ShadowSwapError::NumericalOverflow)?
            .checked_div(BASE_DECIMALS_FACTOR)
            .ok_or(ShadowSwapError::NumericalOverflow)?;

        let quote_amount = u64::try_from(quote_amount_u128)
            .map_err(|_| ShadowSwapError::NumericalOverflow)?;

        msg!(
            "Settling match: buyer={}, seller={}, amount={}, price={}, quote_total={}",
            match_input.buyer_pubkey,
            match_input.seller_pubkey,
            match_input.matched_amount,
            match_input.execution_price,
            quote_amount
        );

        // Transfer quote tokens (USDC) from buyer's escrow to seller
        let buyer_order_key = buyer_order.key();
        let buyer_escrow_seeds = &[
            ESCROW_SEED,
            buyer_order_key.as_ref(),
            &[ctx.accounts.buyer_escrow.bump],
        ];
        let buyer_escrow_signer = &[&buyer_escrow_seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: buyer_escrow_token_info,
                    to: seller_token_info,
                    authority: ctx.accounts.buyer_escrow.to_account_info(),
                },
                buyer_escrow_signer,
            ),
            quote_amount,
        )?;

        // Transfer base tokens (WSOL) from seller's escrow to buyer
        let seller_order_key = seller_order.key();
        let seller_escrow_seeds = &[
            ESCROW_SEED,
            seller_order_key.as_ref(),
            &[ctx.accounts.seller_escrow.bump],
        ];
        let seller_escrow_signer = &[&seller_escrow_seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: seller_escrow_token_info,
                    to: buyer_token_info,
                    authority: ctx.accounts.seller_escrow.to_account_info(),
                },
                seller_escrow_signer,
            ),
            match_input.matched_amount,
        )?;

        // Update order statuses to Filled
        buyer_order.status = ORDER_STATUS_FILLED;
        buyer_order.updated_at = clock.unix_timestamp;

        seller_order.status = ORDER_STATUS_FILLED;
        seller_order.updated_at = clock.unix_timestamp;

        // Update order book
        let order_book = &mut ctx.accounts.order_book;
        order_book.active_orders = order_book
            .active_orders
            .checked_sub(2) // Both orders are now filled
            .ok_or(ShadowSwapError::NumericalOverflow)?;
        order_book.last_trade_at = clock.unix_timestamp;

        // Emit settlement event
        emit!(TradeSettled {
            order_book: order_book.key(),
            buyer: match_input.buyer_pubkey,
            seller: match_input.seller_pubkey,
            buyer_order_id: buyer_order.order_id,
            seller_order_id: seller_order.order_id,
            base_amount: match_input.matched_amount,
            quote_amount,
            execution_price: match_input.execution_price,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Trade settled: buyer_order={}, seller_order={}, base={}, quote={}",
            buyer_order.order_id,
            seller_order.order_id,
            match_input.matched_amount,
            quote_amount
        );

        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

/// EncryptedOrder - Stores individual encrypted order data
/// 
/// This account stores fully encrypted order information. The on-chain program
/// never sees plaintext order details (price, amount, side). All order data
/// is encrypted client-side and stored as a cipher payload.
#[account]
pub struct EncryptedOrder {
    /// Order owner's public key
    pub owner: Pubkey,
    
    /// Order book this order belongs to
    pub order_book: Pubkey,
    
    /// Encrypted order payload containing:
    /// - Order side (buy/sell) - encrypted
    /// - Price - encrypted
    /// - Amount - encrypted
    /// - Other order parameters - encrypted
    /// Maximum size: 512 bytes for encrypted data
    pub cipher_payload: Vec<u8>,
    
    /// Order status (1 = active, 2 = partially filled, 3 = filled, 4 = cancelled)
    /// This can be public as it doesn't reveal order details
    pub status: u8,
    
    /// Encrypted remaining amount (updates as order fills)
    pub encrypted_remaining: Vec<u8>,
    
    /// Escrow account holding the order's funds
    pub escrow: Pubkey,
    
    /// Order creation timestamp
    pub created_at: i64,
    
    /// Last update timestamp
    pub updated_at: i64,
    
    /// Order ID (sequential, assigned by order book)
    pub order_id: u64,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}

/// OrderBook - Manages the order book for a trading pair
/// 
/// For MVP, this handles SOL/USDC pair. The structure is designed to be
/// extensible for multi-token support in future phases.
#[account]
pub struct OrderBook {
    /// Authority that can manage the order book
    pub authority: Pubkey,
    
    /// Base token mint (SOL for MVP)
    pub base_mint: Pubkey,
    
    /// Quote token mint (USDC for MVP)
    pub quote_mint: Pubkey,
    
    /// Total number of orders created (used for sequential order IDs)
    pub order_count: u64,
    
    /// Number of active orders
    pub active_orders: u64,
    
    /// Total trading volume (base token) - encrypted
    pub encrypted_volume_base: Vec<u8>,
    
    /// Total trading volume (quote token) - encrypted
    pub encrypted_volume_quote: Vec<u8>,
    
    /// Order book creation timestamp
    pub created_at: i64,
    
    /// Last trade timestamp
    pub last_trade_at: i64,
    
    /// Fee basis points (e.g., 30 = 0.3%)
    pub fee_bps: u16,
    
    /// Fee collector account
    pub fee_collector: Pubkey,
    
    /// Minimum order size (base token, in lamports/smallest unit)
    pub min_base_order_size: u64,
    
    /// Whether the order book is active
    pub is_active: bool,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}

/// Escrow - Holds funds for an order until it's matched or cancelled
/// 
/// Each order has an associated escrow account that holds either:
/// - Base tokens (for sell orders)
/// - Quote tokens (for buy orders)
#[account]
pub struct Escrow {
    /// Order this escrow belongs to
    pub order: Pubkey,
    
    /// Order owner
    pub owner: Pubkey,
    
    /// Order book
    pub order_book: Pubkey,
    
    /// Token account holding escrowed funds
    /// This is a PDA-owned token account
    pub token_account: Pubkey,
    
    /// Mint of the escrowed token
    pub token_mint: Pubkey,
    
    /// Original encrypted amount deposited
    pub encrypted_amount: Vec<u8>,
    
    /// Encrypted remaining amount (decreases as order fills)
    pub encrypted_remaining: Vec<u8>,
    
    /// Escrow creation timestamp
    pub created_at: i64,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}

/// CallbackAuth - Authentication token for callback operations
/// 
/// This account is used to authorize callback operations from the keeper/matching
/// engine. It ensures only authorized entities can trigger order matching.
#[account]
pub struct CallbackAuth {
    /// Authority that can use this callback auth
    pub authority: Pubkey,
    
    /// Order book this callback auth is valid for
    pub order_book: Pubkey,
    
    /// Nonce to prevent replay attacks
    pub nonce: u64,
    
    /// Expiration timestamp
    pub expires_at: i64,
    
    /// Whether this callback auth is active
    pub is_active: bool,
    
    /// Creation timestamp
    pub created_at: i64,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}

// ============================================================================
// Match Result Structures
// ============================================================================

/// Match result input for settlement (plaintext from keeper)
/// 
/// This struct contains the decrypted match details that the keeper bot
/// submits to execute the trade settlement. The keeper has computed the
/// matching off-chain and decrypted the results.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MatchResultInput {
    /// Buyer's order account pubkey
    pub buyer_pubkey: Pubkey,
    
    /// Seller's order account pubkey
    pub seller_pubkey: Pubkey,
    
    /// Matched amount in base token units (e.g., lamports for WSOL)
    pub matched_amount: u64,
    
    /// Execution price: quote tokens per base token
    /// (adjusted for decimals, e.g., USDC micro-units per WSOL lamport)
    pub execution_price: u64,
}

// ============================================================================
// Events
// ============================================================================

/// Event emitted when a trade is settled
#[event]
pub struct TradeSettled {
    pub order_book: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub buyer_order_id: u64,
    pub seller_order_id: u64,
    pub base_amount: u64,
    pub quote_amount: u64,
    pub execution_price: u64,
    pub timestamp: i64,
}

// ============================================================================
// Error Codes
// ============================================================================

#[error_code]
pub enum ShadowSwapError {
    #[msg("Order book is not active")]
    OrderBookNotActive,
    
    #[msg("Invalid order status")]
    InvalidOrderStatus,
    
    #[msg("Order amount too small")]
    OrderTooSmall,
    
    #[msg("Invalid cipher payload")]
    InvalidCipherPayload,
    
    #[msg("Unauthorized callback")]
    UnauthorizedCallback,
    
    #[msg("Callback auth expired")]
    CallbackAuthExpired,
    
    #[msg("Invalid escrow account")]
    InvalidEscrow,
    
    #[msg("Insufficient funds in escrow")]
    InsufficientEscrowFunds,
    
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    
    #[msg("Order not found")]
    OrderNotFound,
    
    #[msg("Order already filled")]
    OrderAlreadyFilled,
    
    #[msg("Order already cancelled")]
    OrderAlreadyCancelled,
    
    #[msg("Invalid order book")]
    InvalidOrderBook,
    
    #[msg("Invalid fee configuration")]
    InvalidFeeConfiguration,
    
    #[msg("Numerical overflow")]
    NumericalOverflow,
    
    #[msg("Order is not active")]
    OrderNotActive,
}

// ============================================================================
// Constants
// ============================================================================

/// Maximum size for encrypted order payload (512 bytes)
pub const MAX_CIPHER_PAYLOAD_SIZE: usize = 512;

/// Maximum size for encrypted amount fields (64 bytes)
pub const MAX_ENCRYPTED_AMOUNT_SIZE: usize = 64;

/// Maximum size for encrypted volume fields (64 bytes)
pub const MAX_ENCRYPTED_VOLUME_SIZE: usize = 64;

/// Order status: Active
pub const ORDER_STATUS_ACTIVE: u8 = 1;

/// Order status: Partially filled
pub const ORDER_STATUS_PARTIAL: u8 = 2;

/// Order status: Fully filled
pub const ORDER_STATUS_FILLED: u8 = 3;

/// Order status: Cancelled
pub const ORDER_STATUS_CANCELLED: u8 = 4;

/// Order status: Matched, pending execution
pub const ORDER_STATUS_MATCHED_PENDING: u8 = 5;

/// Seeds for PDA derivation
pub const ORDER_BOOK_SEED: &[u8] = b"order_book";
pub const ORDER_SEED: &[u8] = b"order";
pub const ESCROW_SEED: &[u8] = b"escrow";
pub const CALLBACK_AUTH_SEED: &[u8] = b"callback_auth";

// ============================================================================
// Instruction Contexts
// ============================================================================

#[derive(Accounts)]
pub struct InitializeOrderBook<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<OrderBook>() + 200, // Extra space for Vec fields
        seeds = [ORDER_BOOK_SEED, base_mint.key().as_ref(), quote_mint.key().as_ref()],
        bump
    )]
    pub order_book: Account<'info, OrderBook>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Fee collector can be any account
    pub fee_collector: UncheckedAccount<'info>,
    
    /// CHECK: Base mint reference for PDA seeds
    pub base_mint: UncheckedAccount<'info>,
    
    /// CHECK: Quote mint reference for PDA seeds
    pub quote_mint: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitEncryptedOrder<'info> {
    #[account(
        mut,
        constraint = order_book.is_active @ ShadowSwapError::OrderBookNotActive
    )]
    pub order_book: Account<'info, OrderBook>,
    
    #[account(
        init,
        payer = owner,
        space = 8 + std::mem::size_of::<EncryptedOrder>() + MAX_CIPHER_PAYLOAD_SIZE + MAX_ENCRYPTED_AMOUNT_SIZE + 100,
        seeds = [ORDER_SEED, order_book.key().as_ref(), order_book.order_count.to_le_bytes().as_ref()],
        bump
    )]
    pub order: Account<'info, EncryptedOrder>,
    
    #[account(
        init,
        payer = owner,
        space = 8 + std::mem::size_of::<Escrow>() + MAX_ENCRYPTED_AMOUNT_SIZE * 2 + 100,
        seeds = [ESCROW_SEED, order.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    
    #[account(
        init,
        payer = owner,
        token::mint = token_mint,
        token::authority = escrow,
        seeds = [b"escrow_token", order.key().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_mint: Account<'info, anchor_spl::token::Mint>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    #[account(
        mut,
        has_one = owner @ ShadowSwapError::UnauthorizedCallback,
        constraint = order.status == ORDER_STATUS_ACTIVE || order.status == ORDER_STATUS_PARTIAL @ ShadowSwapError::InvalidOrderStatus
    )]
    pub order: Account<'info, EncryptedOrder>,
    
    #[account(
        mut,
        seeds = [ESCROW_SEED, order.key().as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,
    
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub order_book: Account<'info, OrderBook>,
    
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CreateCallbackAuth<'info> {
    #[account(
        constraint = order_book.authority == authority.key() @ ShadowSwapError::UnauthorizedCallback
    )]
    pub order_book: Account<'info, OrderBook>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<CallbackAuth>(),
        seeds = [CALLBACK_AUTH_SEED, order_book.key().as_ref(), keeper.key().as_ref()],
        bump
    )]
    pub callback_auth: Account<'info, CallbackAuth>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Keeper account to be authorized
    pub keeper: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitMatchResults<'info> {
    /// Callback authorization - verifies keeper is authorized
    #[account(
        constraint = callback_auth.is_active @ ShadowSwapError::UnauthorizedCallback,
        constraint = callback_auth.authority == keeper.key() @ ShadowSwapError::UnauthorizedCallback,
        constraint = callback_auth.order_book == order_book.key() @ ShadowSwapError::InvalidOrderBook,
        seeds = [CALLBACK_AUTH_SEED, order_book.key().as_ref(), keeper.key().as_ref()],
        bump = callback_auth.bump
    )]
    pub callback_auth: Account<'info, CallbackAuth>,
    
    /// Order book
    #[account(mut)]
    pub order_book: Account<'info, OrderBook>,
    
    /// Buyer's order account
    #[account(
        mut,
        constraint = buyer_order.order_book == order_book.key() @ ShadowSwapError::InvalidOrderBook
    )]
    pub buyer_order: Account<'info, EncryptedOrder>,
    
    /// Seller's order account
    #[account(
        mut,
        constraint = seller_order.order_book == order_book.key() @ ShadowSwapError::InvalidOrderBook
    )]
    pub seller_order: Account<'info, EncryptedOrder>,
    
    /// Buyer's escrow account (holds quote tokens - USDC)
    #[account(
        mut,
        seeds = [ESCROW_SEED, buyer_order.key().as_ref()],
        bump = buyer_escrow.bump,
        constraint = buyer_escrow.order == buyer_order.key() @ ShadowSwapError::InvalidEscrow
    )]
    pub buyer_escrow: Account<'info, Escrow>,
    
    /// Seller's escrow account (holds base tokens - WSOL)
    #[account(
        mut,
        seeds = [ESCROW_SEED, seller_order.key().as_ref()],
        bump = seller_escrow.bump,
        constraint = seller_escrow.order == seller_order.key() @ ShadowSwapError::InvalidEscrow
    )]
    pub seller_escrow: Account<'info, Escrow>,
    
    /// Keeper account (authorized via callback_auth)
    pub keeper: Signer<'info>,
    
    /// Token program for CPI calls
    pub token_program: Program<'info, Token>,
}
// Constants
const BASE_DECIMALS_FACTOR: u128 = 1_000_000_000; // Lamports per SOL (assumes 9 decimal base mint)
