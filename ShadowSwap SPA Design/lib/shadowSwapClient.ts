import { AnchorProvider, Program, Idl, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import idl from "./idl/shadow_swap.json";

// Environment configuration
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
const ORDER_BOOK = new PublicKey(process.env.NEXT_PUBLIC_ORDER_BOOK!);
const BASE_MINT = new PublicKey(process.env.NEXT_PUBLIC_BASE_MINT!);
const QUOTE_MINT = new PublicKey(process.env.NEXT_PUBLIC_QUOTE_MINT!);
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;

export interface OrderParams {
  side: "buy" | "sell";
  price: number;
  amount: number;
}

export interface OrderData {
  owner: PublicKey;
  orderBook: PublicKey;
  side: number;
  price: BN;
  baseAmount: BN;
  quoteAmount: BN;
  filledBaseAmount: BN;
  filledQuoteAmount: BN;
  status: number;
  createdAt: BN;
  lastUpdatedAt: BN;
  bump: number;
}

export enum OrderStatus {
  PENDING = 0,
  PARTIALLY_FILLED = 1,
  FILLED = 2,
  CANCELLED = 3,
}

/**
 * ShadowSwap Client for interacting with the on-chain program
 */
export class ShadowSwapClient {
  private connection: Connection;
  private program: Program;

  constructor(provider: AnchorProvider) {
    this.connection = provider.connection;
    this.program = new Program(idl as Idl, provider);
  }

  /**
   * Create a ShadowSwap client from a wallet
   */
  static fromWallet(wallet: any): ShadowSwapClient {
    const connection = new Connection(RPC_URL, "confirmed");
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return new ShadowSwapClient(provider);
  }

  /**
   * Mock encryption function - pads plaintext to look encrypted
   * In production, this would use Arcium MPC
   */
  private mockEncrypt(data: string): Uint8Array {
    const bytes = new TextEncoder().encode(data);
    // Pad to 128 bytes to simulate encrypted payload
    const padded = new Uint8Array(128);
    padded.set(bytes);
    return padded;
  }

  /**
   * Submit an encrypted order to the orderbook
   */
  async submitOrder(params: OrderParams): Promise<string> {
    const { side, price, amount } = params;
    
    // Convert to on-chain units (assuming 6 decimals for USDC, 9 for SOL)
    const priceInLamports = Math.floor(price * 1_000_000); // USDC has 6 decimals
    const baseAmount = Math.floor(amount * 1_000_000_000); // SOL has 9 decimals
    const quoteAmount = Math.floor((price * amount) * 1_000_000); // USDC amount

    // Create encrypted payload (mocked)
    // NOTE: The price is included in the cipher_payload, not as a separate argument
    const orderData = JSON.stringify({
      side: side === "buy" ? 0 : 1,
      price: priceInLamports,
      amount: baseAmount,
    });
    const cipherPayload = Array.from(this.mockEncrypt(orderData));
    const encryptedAmount = Array.from(this.mockEncrypt(baseAmount.toString()));

    // Derive PDAs
    const [orderPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("encrypted_order"),
        ORDER_BOOK.toBuffer(),
        this.program.provider.publicKey!.toBuffer(),
        Buffer.from(new BN(Date.now()).toArray("le", 8)),
      ],
      PROGRAM_ID
    );

    const [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), orderPDA.toBuffer()],
      PROGRAM_ID
    );

    // Get user token accounts
    const userBaseAccount = side === "sell"
      ? await getAssociatedTokenAddress(BASE_MINT, this.program.provider.publicKey!)
      : await getAssociatedTokenAddress(BASE_MINT, this.program.provider.publicKey!);
    
    const userQuoteAccount = await getAssociatedTokenAddress(
      QUOTE_MINT,
      this.program.provider.publicKey!
    );

    // Get escrow token accounts
    const escrowBaseAccount = await getAssociatedTokenAddress(BASE_MINT, escrowPDA, true);
    const escrowQuoteAccount = await getAssociatedTokenAddress(QUOTE_MINT, escrowPDA, true);

    try {
      // Submit the order
      // Note: Only 2 args - cipher_payload and encrypted_amount
      // The price is embedded in cipher_payload, not a separate parameter
      const tx = await this.program.methods
        .submitEncryptedOrder(
          cipherPayload,
          encryptedAmount
        )
        .accounts({
          order: orderPDA,
          orderBook: ORDER_BOOK,
          user: this.program.provider.publicKey!,
          escrow: escrowPDA,
          userTokenAccount: side === "buy" ? userQuoteAccount : userBaseAccount,
          escrowTokenAccount: side === "buy" ? escrowQuoteAccount : escrowBaseAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      return tx;
    } catch (error: any) {
      console.error("Error submitting order:", error);
      throw new Error(error.message || "Failed to submit order");
    }
  }

  /**
   * Fetch all orders for the current user
   */
  async fetchUserOrders(): Promise<OrderData[]> {
    try {
      const orders = await this.program.account.encryptedOrder.all([
        {
          memcmp: {
            offset: 8, // Discriminator
            bytes: this.program.provider.publicKey!.toBase58(),
          },
        },
      ]);

      return orders.map((order) => order.account as unknown as OrderData);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      return [];
    }
  }

  /**
   * Fetch all active orders from the orderbook
   */
  async fetchAllOrders(): Promise<OrderData[]> {
    try {
      const orders = await this.program.account.encryptedOrder.all([
        {
          memcmp: {
            offset: 8 + 32, // Discriminator + owner pubkey
            bytes: ORDER_BOOK.toBase58(),
          },
        },
      ]);

      return orders.map((order) => order.account as unknown as OrderData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      return [];
    }
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderPDA: PublicKey): Promise<string> {
    try {
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), orderPDA.toBuffer()],
        PROGRAM_ID
      );

      const orderAccount = await this.program.account.encryptedOrder.fetch(orderPDA);
      
      // Determine which token account to refund to based on order side
      const userTokenAccount = await getAssociatedTokenAddress(
        orderAccount.side === 0 ? QUOTE_MINT : BASE_MINT,
        this.program.provider.publicKey!
      );

      const escrowTokenAccount = await getAssociatedTokenAddress(
        orderAccount.side === 0 ? QUOTE_MINT : BASE_MINT,
        escrowPDA,
        true
      );

      const tx = await this.program.methods
        .cancelOrder()
        .accounts({
          order: orderPDA,
          escrow: escrowPDA,
          user: this.program.provider.publicKey!,
          userTokenAccount,
          escrowTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return tx;
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      throw new Error(error.message || "Failed to cancel order");
    }
  }

  /**
   * Get SPL token balance for a user
   */
  async getTokenBalance(mint: PublicKey, owner?: PublicKey): Promise<number> {
    try {
      const ownerPubkey = owner || this.program.provider.publicKey!;
      const tokenAccount = await getAssociatedTokenAddress(mint, ownerPubkey);
      
      const balance = await this.connection.getTokenAccountBalance(tokenAccount);
      return parseFloat(balance.value.uiAmount?.toString() || "0");
    } catch (error) {
      console.error("Error fetching token balance:", error);
      return 0;
    }
  }

  /**
   * Get SOL balance
   */
  async getSolBalance(owner?: PublicKey): Promise<number> {
    try {
      const ownerPubkey = owner || this.program.provider.publicKey!;
      const balance = await this.connection.getBalance(ownerPubkey);
      return balance / 1_000_000_000; // Convert lamports to SOL
    } catch (error) {
      console.error("Error fetching SOL balance:", error);
      return 0;
    }
  }

  /**
   * Get orderbook data
   */
  async getOrderBook() {
    try {
      const orderBook = await this.program.account.orderBook.fetch(ORDER_BOOK);
      return orderBook;
    } catch (error) {
      console.error("Error fetching orderbook:", error);
      return null;
    }
  }
}

// Export constants for use in components
export { PROGRAM_ID, ORDER_BOOK, BASE_MINT, QUOTE_MINT, RPC_URL };

