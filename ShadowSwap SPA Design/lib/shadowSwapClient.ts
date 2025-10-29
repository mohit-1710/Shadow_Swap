/**
 * ShadowSwap Client - Unified interface for interacting with the ShadowSwap program
 */

import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { AnchorProvider, BN, Program, Idl } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, createSyncNativeInstruction } from '@solana/spl-token';
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

      // Get order count
      const orderCount = await fetchOrderCount(this.connection, this.orderBook);

      // Derive PDAs
      const [orderPda] = deriveOrderPda(this.orderBook, orderCount, this.programId);
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
      const cipherPayloadBuffer = new Uint8Array(512);
      cipherPayloadBuffer.set(encryptedOrder.cipherPayload.slice(0, 512));

      const encryptedAmountBuffer = new Uint8Array(256);
      const amountBytes = new TextEncoder().encode(amountLamports.toString());
      encryptedAmountBuffer.set(amountBytes.slice(0, 256));

      // Build submit order instruction
      const submitOrderIx = await this.program.methods
        .submitEncryptedOrder(cipherPayloadBuffer, encryptedAmountBuffer)
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
      
      // Derive PDAs
      const [escrowPda] = deriveEscrowPda(orderAddress, this.programId);
      const [escrowTokenPda] = deriveEscrowTokenAccountPda(orderAddress, this.programId);

      // Determine token mint from order
      const tokenMint = orderAccount.side === 0 ? this.quoteMint : this.baseMint;

      // Get user token account
      const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        tokenMint,
        this.provider.publicKey,
        this.provider.publicKey
      );

      // Build cancel instruction
      const cancelIx = await this.program.methods
        .cancelOrder()
        .accounts({
          order: orderAddress,
          escrow: escrowPda,
          escrowTokenAccount: escrowTokenPda,
          userTokenAccount: userTokenAccount,
          owner: this.provider.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      const transaction = new Transaction().add(cancelIx);
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
}

