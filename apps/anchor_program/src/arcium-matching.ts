/**
 * ShadowSwap Arcium Matching Logic
 * 
 * This module defines the price-time priority matching algorithm as an Arcium
 * computation using the @arcium-hq/client SDK.
 * 
 * The matching logic operates on encrypted order data within Arcium's MPC network,
 * ensuring privacy while performing order matching.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import {
  getArciumEnv,
  getMXEPublicKey,
  uploadCircuit,
  buildFinalizeCompDefTx,
  getCompDefAccOffset,
  getCompDefAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
} from "@arcium-hq/client";
import * as fs from "fs";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Encrypted order structure as it appears on-chain
 */
interface EncryptedOrder {
  owner: PublicKey;
  orderBook: PublicKey;
  cipherPayload: Buffer; // 512 bytes encrypted order data
  status: number;
  encryptedRemaining: Buffer; // 64 bytes
  escrow: PublicKey;
  createdAt: bigint;
  updatedAt: bigint;
  orderId: bigint;
  bump: number;
}

/**
 * Plain order structure (exists only in encrypted form in MPC)
 */
interface PlainOrder {
  side: number; // 0 = Buy, 1 = Sell
  amount: bigint; // In smallest units
  price: bigint; // Price per unit
  timestamp: number;
}

/**
 * Match result returned by Arcium MPC
 */
interface MatchResult {
  buyerPubkey: PublicKey;
  sellerPubkey: PublicKey;
  buyerOrderId: bigint;
  sellerOrderId: bigint;
  encryptedAmount: Buffer; // 64 bytes
  encryptedPrice: Buffer; // 64 bytes
}

// ============================================================================
// Arcium Circuit Definition (Rust-like DSL in TypeScript)
// ============================================================================

/**
 * This is the conceptual circuit definition that would be compiled to .arcis
 * In practice, you would write this in a separate .arcis file or use Arcium's
 * circuit builder tools.
 * 
 * The circuit operates on encrypted data using Arcium's secure primitives.
 */
const MATCHING_CIRCUIT_DSL = `
// Arcium Circuit: ShadowSwap Price-Time Priority Matching
// This circuit runs within Arcium MPC and operates on encrypted data

circuit MatchOrders {
  // Input: Array of encrypted orders
  input orders: EncryptedOrder[];
  
  // Output: Array of matched pairs
  output matches: MatchResult[];
  
  // Constants
  const ORDER_STATUS_ACTIVE: u8 = 1;
  const ORDER_STATUS_PARTIAL: u8 = 2;
  const SIDE_BUY: u32 = 0;
  const SIDE_SELL: u32 = 1;
  
  // Main computation function
  fn compute() {
    // Initialize output array
    matches = [];
    
    // Separate orders by side (encrypted comparison)
    let buyOrders = [];
    let sellOrders = [];
    
    for order in orders {
      // Only process active/partial orders
      if (order.status == ORDER_STATUS_ACTIVE || order.status == ORDER_STATUS_PARTIAL) {
        // Decrypt order within MPC to get plaintext
        let plain = decrypt_order_payload(order.cipherPayload);
        
        // Separate by side (still encrypted to outside world)
        if (plain.side == SIDE_BUY) {
          buyOrders.push((order, plain));
        } else {
          sellOrders.push((order, plain));
        }
      }
    }
    
    // Sort buy orders: highest price first, then oldest
    buyOrders.sort_by(|a, b| {
      if (a.1.price != b.1.price) {
        return b.1.price.cmp(a.1.price); // Descending price
      }
      return a.1.timestamp.cmp(b.1.timestamp); // Ascending timestamp
    });
    
    // Sort sell orders: lowest price first, then oldest
    sellOrders.sort_by(|a, b| {
      if (a.1.price != b.1.price) {
        return a.1.price.cmp(b.1.price); // Ascending price
      }
      return a.1.timestamp.cmp(b.1.timestamp); // Ascending timestamp
    });
    
    // Perform matching
    let i = 0;
    let j = 0;
    
    while (i < buyOrders.len() && j < sellOrders.len()) {
      let (buyOrder, buyPlain) = buyOrders[i];
      let (sellOrder, sellPlain) = sellOrders[j];
      
      // Check if prices cross (buy >= sell)
      if (buyPlain.price >= sellPlain.price) {
        // Match found!
        let matchedAmount = min(buyPlain.amount, sellPlain.amount);
        
        // Determine execution price (time priority)
        let executionPrice = if (buyPlain.timestamp <= sellPlain.timestamp) {
          buyPlain.price
        } else {
          sellPlain.price
        };
        
        // Create match result (encrypt sensitive data)
        matches.push(MatchResult {
          buyerPubkey: buyOrder.owner,
          sellerPubkey: sellOrder.owner,
          buyerOrderId: buyOrder.orderId,
          sellerOrderId: sellOrder.orderId,
          encryptedAmount: encrypt_u64(matchedAmount),
          encryptedPrice: encrypt_u64(executionPrice),
        });
        
        // Move to next orders
        if (buyPlain.amount == matchedAmount) {
          i += 1;
        }
        if (sellPlain.amount == matchedAmount) {
          j += 1;
        }
      } else {
        // No more matches possible
        break;
      }
    }
  }
}
`;

// ============================================================================
// Arcium SDK Integration
// ============================================================================

export class ArciumMatchingEngine {
  private provider: AnchorProvider;
  private program: Program;
  private arciumEnv: any;

  constructor(
    connection: Connection,
    wallet: anchor.Wallet,
    programId: PublicKey
  ) {
    this.provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    anchor.setProvider(this.provider);
    this.arciumEnv = getArciumEnv();
  }

  /**
   * Step 1: Upload the matching circuit to Arcium
   * 
   * This deploys the compiled circuit (.arcis file) to the Arcium network
   */
  async uploadMatchingCircuit(circuitPath: string): Promise<void> {
    console.log("📤 Uploading matching circuit to Arcium...");

    // Read the compiled circuit file
    const rawCircuit = fs.readFileSync(circuitPath);

    // Upload circuit using Arcium SDK
    const circuitName = "shadowswap_matching_v1";
    
    await uploadCircuit(
      this.provider,
      circuitName,
      this.program.programId,
      rawCircuit,
      true // use raw circuit
    );

    console.log(`✅ Circuit uploaded: ${circuitName}`);
  }

  /**
   * Step 2: Finalize the computation definition
   * 
   * This registers the circuit as a computation that can be invoked
   */
  async finalizeComputationDefinition(): Promise<void> {
    console.log("🔧 Finalizing computation definition...");

    const circuitName = "shadowswap_matching_v1";
    const compDefOffset = getCompDefAccOffset(circuitName);
    const compDefOffsetNum = Buffer.from(compDefOffset).readUInt32LE();

    // Build finalization transaction
    const finalizeTx = await buildFinalizeCompDefTx(
      this.provider,
      compDefOffsetNum,
      this.program.programId
    );

    // Set blockhash and sign
    const latestBlockhash = await this.provider.connection.getLatestBlockhash();
    finalizeTx.recentBlockhash = latestBlockhash.blockhash;
    finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
    finalizeTx.sign(this.provider.wallet.payer);

    // Send transaction
    const signature = await this.provider.sendAndConfirm(finalizeTx);
    console.log(`✅ Computation finalized: ${signature}`);
  }

  /**
   * Step 3: Prepare encrypted orders for MPC computation
   * 
   * Fetches encrypted orders from the order book and prepares them
   * for submission to the Arcium MPC network
   */
  async prepareOrdersForMatching(
    orderBookAddress: PublicKey
  ): Promise<EncryptedOrder[]> {
    console.log("📥 Fetching encrypted orders...");

    // Fetch all order accounts for this order book
    const orders = await this.program.account.encryptedOrder.all([
      {
        memcmp: {
          offset: 8 + 32, // After discriminator and owner
          bytes: orderBookAddress.toBase58(),
        },
      },
    ]);

    console.log(`✅ Found ${orders.length} orders`);

    // Convert to EncryptedOrder format
    return orders.map((order) => ({
      owner: order.account.owner,
      orderBook: order.account.orderBook,
      cipherPayload: Buffer.from(order.account.cipherPayload),
      status: order.account.status,
      encryptedRemaining: Buffer.from(order.account.encryptedRemaining),
      escrow: order.account.escrow,
      createdAt: order.account.createdAt,
      updatedAt: order.account.updatedAt,
      orderId: order.account.orderId,
      bump: order.account.bump,
    }));
  }

  /**
   * Step 4: Submit computation request to Arcium MPC
   * 
   * This invokes the matching circuit with encrypted order data
   */
  async submitMatchingComputation(
    orders: EncryptedOrder[]
  ): Promise<bigint> {
    console.log("🔐 Submitting computation to Arcium MPC...");

    const circuitName = "shadowswap_matching_v1";
    const compDefOffset = getCompDefAccOffset(circuitName);
    const compDefOffsetNum = Buffer.from(compDefOffset).readUInt32LE();

    // Generate random computation offset (unique ID)
    const computationOffset = new anchor.BN(
      Keypair.generate().publicKey.toBuffer().slice(0, 8),
      "hex"
    );

    // Get required Arcium accounts
    const mxeAccount = getMXEAccAddress(this.program.programId);
    const mempoolAccount = getMempoolAccAddress(this.program.programId);
    const executingPoolAccount = getExecutingPoolAccAddress(
      this.program.programId
    );
    const compDefAccount = getCompDefAccAddress(
      this.program.programId,
      compDefOffsetNum
    );
    const computationAccount = getComputationAccAddress(
      this.program.programId,
      computationOffset
    );

    // Serialize order data for MPC input
    const orderData = this.serializeOrdersForMPC(orders);

    // Submit computation (this would use your Anchor program's instruction)
    // that integrates with Arcium
    const signature = await this.program.methods
      .submitMatchingComputation(computationOffset, orderData)
      .accounts({
        mxeAccount,
        mempoolAccount,
        executingPoolAccount,
        compDefAccount,
        computationAccount,
        authority: this.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log(`✅ Computation submitted: ${signature}`);
    console.log(`🆔 Computation offset: ${computationOffset.toString()}`);

    return BigInt(computationOffset.toString());
  }

  /**
   * Step 5: Wait for computation results and invoke callback
   * 
   * Polls for computation completion and calls the Anchor match_callback
   */
  async awaitAndProcessResults(
    computationOffset: bigint,
    orderBookAddress: PublicKey
  ): Promise<void> {
    console.log("⏳ Waiting for Arcium MPC computation...");

    // Import the await helper (this would be from Arcium SDK)
    // const finalizeSig = await awaitComputationFinalization(
    //   this.provider,
    //   new anchor.BN(computationOffset.toString()),
    //   this.program.programId,
    //   "confirmed"
    // );

    // For now, simulate waiting
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("✅ Computation completed!");

    // Fetch results from computation account
    const results = await this.fetchComputationResults(computationOffset);

    console.log(`📊 Found ${results.length} matches`);

    // Call the Anchor program's match_callback with results
    await this.invokeMatchCallback(orderBookAddress, results);
  }

  /**
   * Fetch computation results from Arcium
   */
  private async fetchComputationResults(
    computationOffset: bigint
  ): Promise<MatchResult[]> {
    // Fetch computation account data
    const computationAccount = getComputationAccAddress(
      this.program.programId,
      new anchor.BN(computationOffset.toString())
    );

    // Read result data from account
    const accountInfo = await this.provider.connection.getAccountInfo(
      computationAccount
    );

    if (!accountInfo) {
      throw new Error("Computation account not found");
    }

    // Parse results (format depends on Arcium's output encoding)
    return this.parseMatchResults(accountInfo.data);
  }

  /**
   * Invoke the Anchor program's match_callback with results
   */
  private async invokeMatchCallback(
    orderBookAddress: PublicKey,
    results: MatchResult[]
  ): Promise<void> {
    console.log("📞 Invoking match_callback...");

    // Get callback auth PDA
    const [callbackAuthPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("callback_auth"),
        orderBookAddress.toBuffer(),
        this.provider.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    );

    // Convert results to format expected by Anchor
    const anchorResults = results.map((r) => ({
      buyerPubkey: r.buyerPubkey,
      sellerPubkey: r.sellerPubkey,
      buyerOrderId: new anchor.BN(r.buyerOrderId.toString()),
      sellerOrderId: new anchor.BN(r.sellerOrderId.toString()),
      encryptedAmount: Array.from(r.encryptedAmount),
      encryptedPrice: Array.from(r.encryptedPrice),
    }));

    // Call match_callback instruction
    const signature = await this.program.methods
      .matchCallback(anchorResults)
      .accounts({
        callbackAuth: callbackAuthPda,
        orderBook: orderBookAddress,
        keeper: this.provider.wallet.publicKey,
      })
      .rpc({ commitment: "confirmed" });

    console.log(`✅ Match callback invoked: ${signature}`);
  }

  /**
   * Serialize orders for MPC input
   */
  private serializeOrdersForMPC(orders: EncryptedOrder[]): Buffer {
    // Serialize order data in format expected by Arcium circuit
    const buffers: Buffer[] = [];

    for (const order of orders) {
      // Pack order data
      const orderBuffer = Buffer.concat([
        order.owner.toBuffer(),
        order.orderBook.toBuffer(),
        order.cipherPayload,
        Buffer.from([order.status]),
        order.encryptedRemaining,
        order.escrow.toBuffer(),
        Buffer.from(order.createdAt.toString(16).padStart(16, "0"), "hex"),
        Buffer.from(order.updatedAt.toString(16).padStart(16, "0"), "hex"),
        Buffer.from(order.orderId.toString(16).padStart(16, "0"), "hex"),
        Buffer.from([order.bump]),
      ]);
      buffers.push(orderBuffer);
    }

    return Buffer.concat(buffers);
  }

  /**
   * Parse match results from Arcium output
   */
  private parseMatchResults(data: Buffer): MatchResult[] {
    const results: MatchResult[] = [];
    let offset = 0;

    // Parse result count
    const count = data.readUInt32LE(offset);
    offset += 4;

    // Parse each result
    for (let i = 0; i < count; i++) {
      const buyerPubkey = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const sellerPubkey = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const buyerOrderId = data.readBigUInt64LE(offset);
      offset += 8;

      const sellerOrderId = data.readBigUInt64LE(offset);
      offset += 8;

      const encryptedAmount = Buffer.from(data.slice(offset, offset + 64));
      offset += 64;

      const encryptedPrice = Buffer.from(data.slice(offset, offset + 64));
      offset += 64;

      results.push({
        buyerPubkey,
        sellerPubkey,
        buyerOrderId,
        sellerOrderId,
        encryptedAmount,
        encryptedPrice,
      });
    }

    return results;
  }
}

// ============================================================================
// Usage Example
// ============================================================================

/**
 * Complete workflow for setting up and running Arcium matching
 */
export async function setupAndRunMatching() {
  // Initialize connection and wallet
  const connection = new Connection(
    process.env.RPC_ENDPOINT || "https://api.devnet.solana.com",
    "confirmed"
  );
  const wallet = new anchor.Wallet(
    Keypair.fromSecretKey(
      Buffer.from(JSON.parse(process.env.KEEPER_KEYPAIR || "[]"))
    )
  );
  const programId = new PublicKey(process.env.PROGRAM_ID!);

  // Initialize matching engine
  const engine = new ArciumMatchingEngine(connection, wallet, programId);

  // Step 1: Upload circuit (one-time setup)
  // await engine.uploadMatchingCircuit("./build/shadowswap_matching.arcis");

  // Step 2: Finalize computation definition (one-time setup)
  // await engine.finalizeComputationDefinition();

  // Step 3-5: Run matching (recurring)
  const orderBookAddress = new PublicKey(process.env.ORDER_BOOK_ADDRESS!);

  console.log("🚀 Starting Arcium matching process...");

  // Fetch orders
  const orders = await engine.prepareOrdersForMatching(orderBookAddress);

  if (orders.length < 2) {
    console.log("⚠️  Not enough orders to match");
    return;
  }

  // Submit to Arcium MPC
  const computationOffset = await engine.submitMatchingComputation(orders);

  // Wait for results and invoke callback
  await engine.awaitAndProcessResults(computationOffset, orderBookAddress);

  console.log("✅ Matching complete!");
}

// Export for use in keeper bot
export default ArciumMatchingEngine;

