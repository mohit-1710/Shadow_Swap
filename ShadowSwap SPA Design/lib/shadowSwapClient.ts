/**
 * ShadowSwap Client - Unified interface for interacting with the ShadowSwap program
 */

import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { AnchorProvider, BN, Program, Idl } from '@coral-xyz/anchor';
import { 
  TOKEN_PROGRAM_ID, 
  createSyncNativeInstruction, 
  createCloseAccountInstruction,
  NATIVE_MINT,
  AccountLayout,
} from '@solana/spl-token';
import {
  deriveOrderPda,
  deriveEscrowPda,
  deriveEscrowTokenAccountPda,
  fetchOrderCount,
  getProgramAsync,
  ORDER_STATUS,
} from './program';
import {
  getOrCreateAssociatedTokenAccount,
  getTokenBalance,
  formatTokenAmount,
  parseTokenAmount,
} from './tokenUtils';
import { encryptOrderWithArcium, PlainOrder, validateOrder } from './arcium';

const BASE_DECIMALS = 9; // SOL/WSOL (lamports)
const QUOTE_DECIMALS = 6; // USDC (micro units)

export interface OrderParams {
  side: 'buy' | 'sell';
  amount: number; // in whole tokens (SOL or USDC)
  price: number; // in USDC per SOL
  expiresAt?: number; // Unix timestamp (seconds), 0 or undefined = never expires
}

export interface OrderData {
  publicKey: string;
  owner: string;
  orderId: string;
  status: number;
  createdAt: number;
}

export interface BalanceData {
  sol: number;
  usdc: number;
}

export interface OrderResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export class ShadowSwapClient {
  private connection: Connection;
  private provider: AnchorProvider;
  private program: Program<Idl> | null = null;
  private programId: PublicKey;
  private orderBook: PublicKey;
  private baseMint: PublicKey;
  private quoteMint: PublicKey;

  constructor(
    provider: AnchorProvider,
    programId: PublicKey,
    orderBook: PublicKey,
    baseMint: PublicKey,
    quoteMint: PublicKey
  ) {
    this.connection = provider.connection;
    this.provider = provider;
    this.programId = programId;
    this.orderBook = orderBook;
    this.baseMint = baseMint;
    this.quoteMint = quoteMint;
  }

  /**
   * Initialize the program instance
   */
  async initialize(): Promise<void> {
    if (!this.program) {
      this.program = await getProgramAsync(this.connection, this.provider.wallet);
    }
  }

  /**
   * Submit an order to the blockchain
   */
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

      // Get order count - pass program instance for proper deserialization
      const orderCount = await fetchOrderCount(this.connection, this.orderBook, this.program);

      console.log('Current order count:', orderCount.toString());

      // Derive PDAs
      const [orderPda] = deriveOrderPda(this.orderBook, orderCount, this.programId);
      console.log('Derived order PDA:', orderPda.toString());
      const [escrowPda] = deriveEscrowPda(orderPda, this.programId);
      const [escrowTokenPda] = deriveEscrowTokenAccountPda(orderPda, this.programId);

      // Determine which token we're depositing
      const tokenMint = side === 'buy' ? this.quoteMint : this.baseMint;

      // Create transaction
      const transaction = new Transaction();

      // Get or create user token account
      const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        tokenMint,
        this.provider.publicKey,
        this.provider.publicKey,
        transaction
      );

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

      // Prepare cipher payload and encrypted amount buffers
      // Convert Uint8Array to Buffer for Anchor compatibility
      const cipherPayloadBuffer = Buffer.from(encryptedOrder.cipherPayload);
      
      // Ensure it's exactly 512 bytes (pad if needed)
      const paddedCipherPayload = Buffer.alloc(512);
      cipherPayloadBuffer.copy(paddedCipherPayload, 0, 0, Math.min(cipherPayloadBuffer.length, 512));

      // Create encrypted amount buffer (64 bytes to match MAX_ENCRYPTED_AMOUNT_SIZE)
      const encryptedAmountBuffer = Buffer.alloc(64);
      const amountBytes = Buffer.from(amountLamports.toString(), 'utf-8');
      amountBytes.copy(encryptedAmountBuffer, 0, 0, Math.min(amountBytes.length, 64));

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
      
      // If transaction already processed, treat as success
      if (error.message?.includes('already been processed') || error.message?.includes('AlreadyProcessed')) {
        console.log('Transaction already processed - order was successfully submitted');
        return { 
          success: true, 
          signature: 'already-processed' 
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to submit order' 
      };
    }
  }

  /**
   * Fetch user's orders
   */
  async fetchUserOrders(): Promise<OrderData[]> {
    try {
      await this.initialize();
      if (!this.program || !this.provider.publicKey) {
        return [];
      }

      // Fetch orders by owner
      const orders = await (this.program.account as any).encryptedOrder.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: this.provider.publicKey.toBase58(),
          },
        },
      ]);

      return orders.map((order: any) => ({
        publicKey: order.publicKey.toString(),
        owner: order.account.owner.toString(),
        orderId: order.account.orderId.toString(),
        status: order.account.status,
        createdAt: order.account.createdAt.toNumber(),
      }));
    } catch (error) {
      console.error('Error fetching user orders:', error);
      return [];
    }
  }

  /**
   * Get user balances
   */
  async getBalances(): Promise<BalanceData> {
    try {
      if (!this.provider.publicKey) {
        return { sol: 0, usdc: 0 };
      }

      // Get SOL balance
      const solBalance = await this.connection.getBalance(this.provider.publicKey);
      const sol = solBalance / Math.pow(10, BASE_DECIMALS);

      // Get WSOL balance
      const wsolAta = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.baseMint,
        this.provider.publicKey,
        this.provider.publicKey
      );
      const wsolBalance = await getTokenBalance(this.connection, wsolAta);
      const wsol = Number(wsolBalance) / Math.pow(10, BASE_DECIMALS);

      // Get USDC balance
      const usdcAta = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.quoteMint,
        this.provider.publicKey,
        this.provider.publicKey
      );
      const usdcBalance = await getTokenBalance(this.connection, usdcAta);
      const usdc = Number(usdcBalance) / Math.pow(10, QUOTE_DECIMALS);

      return { 
        sol: sol + wsol, // Combine native SOL + wrapped SOL
        usdc 
      };
    } catch (error) {
      console.error('Error fetching balances:', error);
      return { sol: 0, usdc: 0 };
    }
  }

  /**
   * Cancel an order
   */
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
      if (!escrowTokenAccountInfo) {
        return { success: false, error: 'Escrow token account not found' };
      }

      // Parse the token account to get the mint
      const escrowTokenData = AccountLayout.decode(escrowTokenAccountInfo.data);
      const tokenMint = new PublicKey(escrowTokenData.mint);

      console.log('Cancelling order:', {
        orderAddress: orderAddress.toString(),
        orderBook: this.orderBook.toString(),
        escrow: escrowPda.toString(),
        escrowTokenAccount: escrowTokenPda.toString(),
        tokenMint: tokenMint.toString(),
        orderSide: orderAccount.side,
        owner: this.provider.publicKey.toString(),
      });

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

      console.log('User token account:', userTokenAccount.toString());

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

      console.log('Order cancelled successfully:', signature);

      return { success: true, signature };
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      
      // Check for specific error codes
      if (error.message?.includes('InvalidOrderStatus')) {
        return { 
          success: false, 
          error: 'Order status changed - it may have been filled or already cancelled. Please refresh to see the latest status.' 
        };
      }
      
      // If transaction already processed, treat as success
      if (error.message?.includes('already been processed') || error.message?.includes('AlreadyProcessed')) {
        console.log('Transaction already processed - order was successfully cancelled');
        return { 
          success: true, 
          signature: 'already-processed' 
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to cancel order' 
      };
    }
  }

  /**
   * Get human-readable order status text
   */
  private getOrderStatusText(status: number): string {
    switch (status) {
      case ORDER_STATUS.ACTIVE:
        return "Active"
      case ORDER_STATUS.PARTIAL:
        return "Partially Filled"
      case ORDER_STATUS.FILLED:
      case ORDER_STATUS.EXECUTED:
        return "Filled"
      case ORDER_STATUS.CANCELLED:
        return "Cancelled"
      case ORDER_STATUS.MATCHED_PENDING:
        return "Matching"
      default:
        return "Unknown"
    }
  }
}

