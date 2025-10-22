use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Dk9p88PPmrApGwhpTZAYQkuZApVHEnquxxeng1sCndci");

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

    /// Place a new encrypted order
    pub fn place_order(
        ctx: Context<PlaceOrder>,
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

        // Transfer tokens to escrow (amount is encrypted, so we trust the client sent correct amount)
        // In production, you'd verify the encrypted amount matches the actual transfer
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.escrow_token_account.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            ctx.accounts.user_token_account.amount, // TODO: Parse from encrypted_amount in production
        )?;

        msg!("Order placed: ID {}", order_id);
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

    /// Match two orders (called by authorized keeper)
    pub fn match_orders(
        ctx: Context<MatchOrders>,
        encrypted_match_amount: Vec<u8>,
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

        let buy_order = &mut ctx.accounts.buy_order;
        let sell_order = &mut ctx.accounts.sell_order;

        // Verify orders are active
        require!(
            buy_order.status == ORDER_STATUS_ACTIVE || buy_order.status == ORDER_STATUS_PARTIAL,
            ShadowSwapError::InvalidOrderStatus
        );
        require!(
            sell_order.status == ORDER_STATUS_ACTIVE || sell_order.status == ORDER_STATUS_PARTIAL,
            ShadowSwapError::InvalidOrderStatus
        );

        // Update order statuses (simplified - in production, check if fully filled)
        buy_order.status = ORDER_STATUS_PARTIAL;
        buy_order.updated_at = clock.unix_timestamp;
        buy_order.encrypted_remaining = encrypted_match_amount.clone();

        sell_order.status = ORDER_STATUS_PARTIAL;
        sell_order.updated_at = clock.unix_timestamp;
        sell_order.encrypted_remaining = encrypted_match_amount;

        msg!("Orders matched: {} <-> {}", buy_order.order_id, sell_order.order_id);
        Ok(())
    }

    /// Create callback authorization for keeper
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
pub struct PlaceOrder<'info> {
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
pub struct MatchOrders<'info> {
    #[account(
        constraint = callback_auth.is_active @ ShadowSwapError::UnauthorizedCallback,
        constraint = callback_auth.authority == keeper.key() @ ShadowSwapError::UnauthorizedCallback,
        seeds = [CALLBACK_AUTH_SEED, order_book.key().as_ref(), keeper.key().as_ref()],
        bump = callback_auth.bump
    )]
    pub callback_auth: Account<'info, CallbackAuth>,
    
    pub order_book: Account<'info, OrderBook>,
    
    #[account(
        mut,
        constraint = buy_order.order_book == order_book.key() @ ShadowSwapError::InvalidOrderBook
    )]
    pub buy_order: Account<'info, EncryptedOrder>,
    
    #[account(
        mut,
        constraint = sell_order.order_book == order_book.key() @ ShadowSwapError::InvalidOrderBook
    )]
    pub sell_order: Account<'info, EncryptedOrder>,
    
    pub keeper: Signer<'info>,
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
