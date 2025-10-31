/**
 * ShadowSwap Client - Unified interface for interacting with the ShadowSwap program
 */

import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY, SendTransactionError } from '@solana/web3.js';
import { getSharedConnection, getLatestBlockhashRL, getAccountInfoRL, getMultipleAccountsInfoRL } from './rpc'
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
  tokenAccountExists,
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
  // Prevent duplicate sends in dev (Strict Mode double-invoke/Fast Refresh)
  private _isSubmittingTx = false;

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

  /** Expose connection for lightweight cluster stats */
  getConnection(): Connection {
    return this.connection
  }

  /** Fetch count of OrderBook accounts */
  async fetchOrderBooksCount(): Promise<number> {
    try {
      await this.initialize();
      if (!this.program) return 0;
      const obs = await (this.program.account as any).orderBook.all();
      return obs.length;
    } catch (e) {
      console.error('Error fetching order books:', e);
      return 0;
    }
  }

  /** Fetch count of Escrow accounts */
  async fetchEscrowsCount(): Promise<number> {
    try {
      await this.initialize();
      if (!this.program) return 0;
      const esc = await (this.program.account as any).escrow.all();
      return esc.length;
    } catch (e) {
      console.error('Error fetching escrows:', e);
      return 0;
    }
  }

  /** Compute TVL across all escrow token accounts (base + quote). */
  async fetchEscrowTvl(): Promise<{ baseSol: number; quoteUsdc: number; totalUsdApprox?: number }> {
    try {
      await this.initialize();
      if (!this.program) return { baseSol: 0, quoteUsdc: 0 };
      const escrows = await (this.program.account as any).escrow.all();
      const tokenAccounts: PublicKey[] = escrows.map((e: any) => e.account.tokenAccount);
      const infos = await getMultipleAccountsInfoRL(tokenAccounts, this.connection);
      let baseLamports = 0n;
      let quoteMicros = 0n;
      for (let i = 0; i < escrows.length; i++) {
        const e = escrows[i];
        const info = infos[i];
        if (!info) continue;
        try {
          const data = AccountLayout.decode(info.data);
          const amount = BigInt(data.amount.toString());
          const mint = e.account.tokenMint as PublicKey;
          if (mint.equals(this.baseMint)) baseLamports += amount;
          else if (mint.equals(this.quoteMint)) quoteMicros += amount;
        } catch (_) {
          // skip
        }
      }
      const baseSol = Number(baseLamports) / 1e9;
      const quoteUsdc = Number(quoteMicros) / 1e6;
      return { baseSol, quoteUsdc };
    } catch (e) {
      console.error('Error computing TVL:', e);
      return { baseSol: 0, quoteUsdc: 0 };
    }
  }

  // Convenience factory for pages that have a wallet adapter and want defaults from env
  static fromWallet(wallet: any): ShadowSwapClient {
    const connection = getSharedConnection();

    const walletAdapter = {
      publicKey: wallet?.publicKey,
      signTransaction: wallet?.signTransaction,
      signAllTransactions: wallet?.signAllTransactions,
    } as any;

    const provider = new AnchorProvider(connection, walletAdapter, { preflightCommitment: 'confirmed' });

    const programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
    const orderBook = new PublicKey(process.env.NEXT_PUBLIC_ORDER_BOOK!);
    const baseMint = new PublicKey(process.env.NEXT_PUBLIC_BASE_MINT || 'So11111111111111111111111111111111111111112');
    const quoteMint = new PublicKey(process.env.NEXT_PUBLIC_QUOTE_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

    return new ShadowSwapClient(provider, programId, orderBook, baseMint, quoteMint);
  }

  /**
   * Get user's WSOL balance (in SOL units)
   */
  async getWsolBalance(): Promise<number> {
    try {
      if (!this.provider.publicKey) return 0;
      const wsolAta = await getOrCreateAssociatedTokenAccount(
        this.connection,
        NATIVE_MINT,
        this.provider.publicKey,
        this.provider.publicKey
      );
      const exists = await tokenAccountExists(this.connection, wsolAta);
      if (!exists) return 0;
      const bal = await getTokenBalance(this.connection, wsolAta);
      return Number(bal) / Math.pow(10, BASE_DECIMALS);
    } catch {
      return 0;
    }
  }

  /**
   * Close WSOL ATA to unwrap into native SOL
   */
  async unwrapWsol(): Promise<OrderResult> {
    try {
      if (!this.provider.publicKey) {
        return { success: false, error: 'Wallet not connected' };
      }
      const owner = this.provider.publicKey;
      const wsolAta = await getOrCreateAssociatedTokenAccount(
        this.connection,
        NATIVE_MINT,
        owner,
        owner
      );
      const exists = await tokenAccountExists(this.connection, wsolAta);
      if (!exists) {
        return { success: false, error: 'No WSOL account to close' };
      }

      // Build close instruction
      const tx = new Transaction();
      tx.add(createCloseAccountInstruction(wsolAta, owner, owner));
      tx.recentBlockhash = (await getLatestBlockhashRL(this.connection)).blockhash;
      tx.feePayer = owner;

      const signed = await this.provider.wallet.signTransaction(tx);
      const sig = await this.connection.sendRawTransaction(signed.serialize(), { maxRetries: 3 });
      await this.connection.confirmTransaction(sig, 'confirmed');
      return { success: true, signature: sig };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to unwrap WSOL' };
    }
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
      if (this._isSubmittingTx) {
        console.log('⏳ submitOrder ignored: previous submission in-flight');
        return { success: false, error: 'Submission in progress' };
      }
      this._isSubmittingTx = true;
      await this.initialize();
      if (!this.program || !this.provider.publicKey) {
        return { success: false, error: 'Program not initialized or wallet not connected' };
      }

      const { side, amount, price } = params;

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📝 SUBMIT ORDER - Input Parameters:');
      console.log('   Side:', side);
      console.log('   Amount (UI):', amount);
      console.log('   Price (UI):', price);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Standardize: plain order "amount" is ALWAYS base (SOL) in lamports
      const baseLamports = Math.floor(amount * Math.pow(10, BASE_DECIMALS));
      
      const priceLamports = Math.floor(price * Math.pow(10, QUOTE_DECIMALS));
      // Amount to escrow (posted_amount) depends on side
      const postedAmount: number = side === 'buy'
        ? Math.floor((amount * price) * Math.pow(10, QUOTE_DECIMALS)) // quote amount
        : baseLamports; // base amount

      console.log('💰 Converted Amounts:');
      console.log('   Base amount (lamports):', baseLamports, `(${baseLamports / 1e9} SOL)`);
      console.log('   Price (lamports):', priceLamports, `(${priceLamports / 1e6} USDC)`);
      console.log('   Posted (escrow) amount:', postedAmount, side === 'buy' ? '(USDC micro-units)' : '(lamports)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Create plain order
      const plainOrder: PlainOrder = {
        side: side === 'buy' ? 0 : 1,
        amount: baseLamports, // always base units in cipher
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
        const wrapAmount = BigInt(baseLamports) + BigInt(2_039_280); // Add rent for token account
        
        console.log('🔄 Wrapping SOL:');
        console.log('   User Token Account:', userTokenAccount.toString());
        console.log('   Amount to wrap:', baseLamports, 'lamports');
        console.log('   Rent reserve:', 2_039_280, 'lamports');
        console.log('   Total wrap amount:', Number(wrapAmount), 'lamports', `(${Number(wrapAmount) / 1e9} SOL)`);
        console.log('   From wallet:', this.provider.publicKey.toString());
        
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: this.provider.publicKey,
            toPubkey: userTokenAccount,
            lamports: Number(wrapAmount),
          })
        );
        transaction.add(createSyncNativeInstruction(userTokenAccount));
        
        console.log('✅ Wrap instructions added to transaction');
      }

      // Prepare cipher payload and encrypted amount buffers
      // Convert Uint8Array to Buffer for Anchor compatibility
      const cipherPayloadBuffer = Buffer.from(encryptedOrder.cipherPayload);
      
      // Ensure it's exactly 512 bytes (pad if needed)
      const paddedCipherPayload = Buffer.alloc(512);
      cipherPayloadBuffer.copy(paddedCipherPayload, 0, 0, Math.min(cipherPayloadBuffer.length, 512));

      // Create encrypted amount buffer (64 bytes to match MAX_ENCRYPTED_AMOUNT_SIZE)
      const encryptedAmountBuffer = Buffer.alloc(64);
      const amountBytes = Buffer.from(baseLamports.toString(), 'utf-8');
      amountBytes.copy(encryptedAmountBuffer, 0, 0, Math.min(amountBytes.length, 64));

      console.log('📤 Building submit order instruction:');
      console.log('   Order PDA:', orderPda.toString());
      console.log('   Escrow PDA:', escrowPda.toString());
      console.log('   Escrow Token Account:', escrowTokenPda.toString());
      console.log('   User Token Account:', userTokenAccount.toString());
      console.log('   Token Mint:', tokenMint.toString());
      console.log('   Owner:', this.provider.publicKey.toString());

      // Build submit order instruction
      const submitOrderIx = await this.program.methods
        .submitEncryptedOrder(paddedCipherPayload, encryptedAmountBuffer, new BN(postedAmount))
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
      
      console.log('✅ Submit order instruction added');
      console.log('📦 Total instructions in transaction:', transaction.instructions.length);

      // Manually handle blockhash, signing, and confirmation to prevent stale transactions
      const { blockhash, lastValidBlockHeight } = await getLatestBlockhashRL(this.connection);
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.provider.publicKey;

      const signedTx = await this.provider.wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });

      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      console.log('Order submitted successfully with signature:', signature);
      return { success: true, signature };
    } catch (error: any) {
      // Handle user rejection gracefully
      if (error?.message?.includes('User rejected') || error?.name === 'WalletSignTransactionError') {
        console.log('User cancelled transaction signing');
        return { success: false, error: 'Transaction cancelled by user' };
      }

      // Treat duplicate re-send as success and avoid noisy error logs
      if (
        error?.message?.includes('already been processed') ||
        error?.message?.includes('AlreadyProcessed') ||
        error?.message?.includes('This transaction has already been processed')
      ) {
        console.log('⚠️ Transaction already processed - treating as success');
        const sig = error?.signature || error?.txid || 'processed';
        return { success: true, signature: sig };
      }

      if (error instanceof SendTransactionError) {
        console.error('Transaction Logs:', error.logs);
      }
      console.error('Error submitting order:', error);

      // Return meaningful error message
      let errorMessage = 'Failed to submit order';
      if (error?.message?.includes('insufficient lamports') || error?.message?.includes('insufficient funds')) {
        const match = error.message.match(/insufficient lamports (\d+), need (\d+)/);
        if (match) {
          const have = (parseInt(match[1]) / 1e9).toFixed(4);
          const need = (parseInt(match[2]) / 1e9).toFixed(4);
          errorMessage = `Insufficient balance. You have ${have} SOL but need ${need} SOL (including transaction fees and rent).`;
        } else {
          errorMessage = 'Insufficient balance. Please reduce the amount or add more SOL to your wallet.';
        }
      } else if (error?.message?.includes('Simulation failed')) {
        errorMessage = 'Transaction simulation failed. Please try again.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      return { success: false, error: errorMessage };
    } finally {
      this._isSubmittingTx = false;
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
   * Fetch all orders (admin use)
   */
  async fetchAllOrders(): Promise<OrderData[]> {
    try {
      await this.initialize();
      if (!this.program) {
        return [];
      }

      // Fetch all encryptedOrder accounts
      const orders = await (this.program.account as any).encryptedOrder.all();

      return orders.map((order: any) => ({
        publicKey: order.publicKey.toString(),
        owner: order.account.owner.toString(),
        orderId: order.account.orderId.toString(),
        status: order.account.status,
        createdAt: order.account.createdAt.toNumber(),
      }));
    } catch (error) {
      console.error('Error fetching all orders:', error);
      return [];
    }
  }

  /**
   * Get user balances
   */
  async getBalances(): Promise<BalanceData> {
    try {
      if (!this.provider.publicKey) {
        console.error('❌ No public key available for balance check');
        return { sol: 0, usdc: 0 };
      }

      console.log('💰 Fetching balances for:', this.provider.publicKey.toString());

      // Get native SOL balance
      const solBalance = await this.connection.getBalance(this.provider.publicKey);
      let sol = solBalance / Math.pow(10, BASE_DECIMALS);
      console.log('   Native SOL balance:', sol, 'SOL');

      // Include WSOL balance (from associated token account) so filled orders show up as SOL
      try {
        const wsolAta = await getOrCreateAssociatedTokenAccount(
          this.connection,
          NATIVE_MINT,
          this.provider.publicKey,
          this.provider.publicKey
        );
        const wsolBalance = await getTokenBalance(this.connection, wsolAta);
        const wsol = Number(wsolBalance) / Math.pow(10, BASE_DECIMALS);
        if (wsol > 0) {
          console.log('   Wrapped SOL (WSOL) balance:', wsol, 'SOL');
          sol += wsol; // present combined SOL (native + wrapped)
        }
      } catch (_) {
        // ignore errors and just show native SOL
      }

      // Get USDC balance
      const usdcAta = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.quoteMint,
        this.provider.publicKey,
        this.provider.publicKey
      );
      const usdcBalance = await getTokenBalance(this.connection, usdcAta);
      const usdc = Number(usdcBalance) / Math.pow(10, QUOTE_DECIMALS);
      console.log('   USDC balance:', usdc, 'USDC');

      console.log('✅ Final balances - SOL:', sol, 'USDC:', usdc);

      return { 
        sol: sol, // Only show native SOL
        usdc 
      };
    } catch (error) {
      console.error('❌ Error fetching balances:', error);
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
      const escrowTokenAccountInfo = await getAccountInfoRL(escrowTokenPda, this.connection);
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
        console.log('Adding instruction to close WSOL account');
        const closeWsolIx = createCloseAccountInstruction(
          userTokenAccount,
          this.provider.publicKey,
          this.provider.publicKey
        );
        transaction.add(closeWsolIx);
      }

      // Manually handle blockhash, signing, and confirmation
      const { blockhash, lastValidBlockHeight } = await getLatestBlockhashRL(this.connection);
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.provider.publicKey;

      const signedTx = await this.provider.wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());

      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      console.log('Order cancelled successfully:', signature);

      return { success: true, signature };
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      
      if (error instanceof SendTransactionError) {
        console.error('Transaction Logs:', error.logs);
      }

      // Handle user rejection gracefully
      if (error.message?.includes('User rejected') || error.name === 'WalletSignTransactionError') {
        console.log('User cancelled transaction signing');
        return { 
          success: false, 
          error: 'Cancellation cancelled by user' 
        };
      }
      
      // Check for specific error codes
      if (error.message?.includes('InvalidOrderStatus')) {
        return { 
          success: false, 
          error: 'Order status changed - it may have been filled or already cancelled. Please refresh to see the latest status.' 
        };
      }
      
      // If transaction already processed, treat as success (avoid showing error)
      if (error.message?.includes('already been processed') || 
          error.message?.includes('AlreadyProcessed') ||
          error.message?.includes('This transaction has already been processed')) {
        console.log('⚠️ Transaction already processed - order was successfully cancelled');
        return { 
          success: true, 
          signature: 'already-processed' 
        };
      }
      
      // Return meaningful error message
      let errorMessage = 'Failed to cancel order';
      if (error.message?.includes('Simulation failed')) {
        errorMessage = 'Cancellation failed. Please refresh and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { 
        success: false, 
        error: errorMessage
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
