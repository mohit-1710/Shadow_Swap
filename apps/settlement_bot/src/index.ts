/**
 * ShadowSwap Keeper Bot - Main Entry Point
 * 
 * This bot implements the Hybrid architecture for ShadowSwap:
 * 1. Fetches encrypted orders from the blockchain
 * 2. Decrypts them securely using Arcium MPC
 * 3. Matches orders using price-time priority
 * 4. Submits settlement transactions via Sanctum (MEV protected)
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider, Program, BN, Idl } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

import {
  KeeperConfig,
  PlainOrder,
  MatchedPair,
  OrderStatus,
} from './types';
import { ArciumClient, MockArciumClient } from './arcium-client';
import { SanctumClient, MockSanctumClient, DirectRPCClient } from './sanctum-client';
import {
  matchOrders,
  validateMatch,
  calculateMatchStats,
  prioritizeMatches,
} from './matcher';

dotenv.config();

/**
 * Main Keeper Bot class
 */
class ShadowSwapKeeper {
  private connection: Connection;
  private provider: AnchorProvider;
  private program: Program<Idl>;
  private keeper: Keypair;
  private orderBook: PublicKey;
  private callbackAuth: PublicKey;
  
  private arciumClient: ArciumClient;
  private sanctumClient: SanctumClient;
  
  private config: KeeperConfig;
  private isRunning: boolean = false;
  private matchCount: number = 0;

  constructor(config: KeeperConfig) {
    this.config = config;
    
    // Initialize Solana connection
    this.connection = new Connection(config.rpcUrl, {
      commitment: 'confirmed',
      wsEndpoint: config.wssUrl,
    });
    
    // Load keeper keypair
    this.keeper = this.loadKeypair(config.keeperKeypairPath);
    
    // Initialize Anchor provider
    const wallet = new anchor.Wallet(this.keeper);
    this.provider = new AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
    });
    
    // Load program IDL and create program client
    this.program = this.loadProgram();
    
    // Order book and callback auth PDAs
    this.orderBook = new PublicKey(config.orderBookPubkey);
    this.callbackAuth = this.deriveCallbackAuth();
    
    // Initialize Arcium and Sanctum clients
    this.arciumClient = this.createArciumClient();
    this.sanctumClient = this.createSanctumClient();
  }

  /**
   * Start the keeper bot
   */
  async start(): Promise<void> {
    console.log('\n🚀 ============================================');
    console.log('   ShadowSwap Keeper Bot - Hybrid Architecture');
    console.log('============================================\n');
    console.log(`📍 Configuration:`);
    console.log(`   RPC URL:        ${this.config.rpcUrl}`);
    console.log(`   Program ID:     ${this.program.programId.toString()}`);
    console.log(`   Order Book:     ${this.orderBook.toString()}`);
    console.log(`   Keeper Wallet:  ${this.keeper.publicKey.toString()}`);
    console.log(`   Match Interval: ${this.config.matchInterval}ms`);
    console.log(`   Arcium MPC:     ${this.config.arciumMpcUrl}`);
    console.log(`   Sanctum:        ${this.config.sanctumGatewayUrl}\n`);

    // Initialize Arcium client
    await this.arciumClient.initialize();

    // Verify keeper authorization
    await this.verifyAuthorization();

    this.isRunning = true;
    console.log('✅ Keeper bot started successfully\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Main loop
    while (this.isRunning) {
      try {
        await this.processMatchingCycle();
        await this.sleep(this.config.matchInterval);
      } catch (error) {
        this.logError('Error in matching cycle', error);
        await this.sleep(5000); // Wait before retry
      }
    }
  }

  /**
   * Stop the keeper bot
   */
  stop(): void {
    console.log('\n🛑 Stopping keeper bot...');
    this.isRunning = false;
  }

  /**
   * Main matching cycle
   */
  private async processMatchingCycle(): Promise<void> {
    const cycleStart = Date.now();
    console.log(`\n⏱️  [${new Date().toISOString()}] Starting matching cycle #${++this.matchCount}...`);

    try {
      // Step 1: Fetch active encrypted orders
      const encryptedOrders = await this.fetchActiveOrders();
      
      if (encryptedOrders.length === 0) {
        console.log('   📭 No active orders found');
        return;
      }

      // Step 2: Decrypt orders using Arcium MPC
      const plainOrders = await this.decryptOrders(encryptedOrders);
      
      if (plainOrders.length === 0) {
        console.log('   ⚠️  No orders successfully decrypted');
        return;
      }

      // Step 3: Match orders
      const matches = matchOrders(plainOrders);
      
      if (matches.length === 0) {
        console.log('   💤 No matches found');
        return;
      }

      // Step 4: Validate and prioritize matches
      const validMatches = matches.filter(validateMatch);
      const prioritizedMatches = prioritizeMatches(validMatches);

      // Display match statistics
      const stats = calculateMatchStats(prioritizedMatches);
      console.log(`\n📈 Match Statistics:`);
      console.log(`   Matches:        ${stats.matchCount}`);
      console.log(`   Base Volume:    ${stats.totalBaseVolume.toFixed(4)}`);
      console.log(`   Quote Volume:   ${stats.totalVolume.toFixed(4)}`);
      console.log(`   Average Price:  ${stats.averagePrice.toFixed(4)}`);
      console.log(`   Total Fees:     ${stats.totalFees.toFixed(4)}`);

      // Step 5: Submit matches for settlement
      await this.submitMatches(prioritizedMatches);

      const duration = Date.now() - cycleStart;
      console.log(`\n✅ Matching cycle completed in ${duration}ms`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
      this.logError('Error in matching cycle', error);
    }
  }

  /**
   * Fetch active encrypted orders from the blockchain
   */
  private async fetchActiveOrders(): Promise<any[]> {
    console.log(`\n📥 Fetching active orders...`);

    try {
      // Fetch all EncryptedOrder accounts
      // Struct layout: discriminator (8) + owner (32) + order_book (32) + ...
      // To filter by order_book, offset should be: 8 + 32 = 40
      const accounts = await (this.program.account as any).encryptedOrder.all([
        {
          memcmp: {
            offset: 8 + 32, // After discriminator and owner, pointing to order_book field
            bytes: this.orderBook.toBase58(), // Filter by order book
          },
        },
      ]);

      // Filter for active orders
      const activeOrders = accounts
        .map((acc: any) => ({
          publicKey: acc.publicKey,
          account: acc.account,
        }))
        .filter(
          (order: any) =>
            order.account.status === OrderStatus.ACTIVE ||
            order.account.status === OrderStatus.PARTIAL
        );

      console.log(`   ✅ Found ${activeOrders.length} active orders`);

      return activeOrders.map((order: any) => ({
        publicKey: order.publicKey,
        ...order.account,
      }));
    } catch (error) {
      this.logError('Error fetching orders', error);
      return [];
    }
  }

  /**
   * Decrypt orders using Arcium MPC
   */
  private async decryptOrders(
    encryptedOrders: any[]
  ): Promise<PlainOrder[]> {
    console.log(`\n🔐 Decrypting ${encryptedOrders.length} orders via Arcium MPC...`);

    const plainOrders: PlainOrder[] = [];

    try {
      // Extract ciphertexts
      const ciphertexts = encryptedOrders.map(order => 
        Buffer.from(order.cipherPayload)
      );

      // Decrypt using Arcium MPC
      const decryptedResults = await this.arciumClient.decryptBatch(ciphertexts);

      // Parse decrypted orders
      for (let i = 0; i < encryptedOrders.length; i++) {
        const result = decryptedResults[i];
        
        if (result.error) {
          console.warn(`   ⚠️  Failed to decrypt order #${i}: ${result.error}`);
          continue;
        }

        try {
          // Parse plaintext order data
          const orderData = JSON.parse(result.plaintext);
          
          // Helper to safely parse BN or hex string to number
          const toNumber = (val: any): number => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') return parseInt(val, 16);
            if (val && typeof val.toNumber === 'function') return val.toNumber();
            return 0;
          };
          
          const plainOrder = {
            publicKey: encryptedOrders[i].publicKey,
            owner: encryptedOrders[i].owner,
            orderBook: encryptedOrders[i].orderBook,
            side: orderData.side,
            price: parseFloat(orderData.price),
            amount: parseFloat(orderData.amount),
            remainingAmount: parseFloat(orderData.remainingAmount || orderData.amount),
            escrow: encryptedOrders[i].escrow,
            createdAt: toNumber(encryptedOrders[i].createdAt),
            orderId: toNumber(encryptedOrders[i].orderId),
            status: encryptedOrders[i].status,
          };
          
          console.log(`   🔍 Order #${i}: side=${plainOrder.side}, price=${plainOrder.price}, amount=${plainOrder.amount}`);
          plainOrders.push(plainOrder);
        } catch (parseError) {
          console.warn(`   ⚠️  Failed to parse order #${i}:`, parseError);
          console.warn(`   Raw plaintext:`, result.plaintext);
        }
      }

      console.log(`   ✅ Successfully decrypted ${plainOrders.length} orders`);
      return plainOrders;
    } catch (error) {
      this.logError('Error decrypting orders', error);
      return [];
    }
  }

  /**
   * Submit matches for settlement
   */
  private async submitMatches(matches: MatchedPair[]): Promise<void> {
    console.log(`\n📤 Submitting ${matches.length} matches for settlement...`);

    const transactions: Transaction[] = [];

    // Build transactions for each match
    for (const match of matches) {
      try {
        const tx = await this.buildSettlementTransaction(match);
        transactions.push(tx);
      } catch (error) {
        this.logError(`Error building transaction for match`, error);
      }
    }

    if (transactions.length === 0) {
      console.log('   ⚠️  No transactions to submit');
      return;
    }

    // Submit via Sanctum (MEV protected)
    const results = await this.sanctumClient.submitBatch(
      transactions,
      this.config.maxRetries
    );

    // Log results
    const successful = results.filter(r => r.signature).length;
    const failed = results.filter(r => r.error).length;

    console.log(`\n📊 Settlement Results:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed:     ${failed}`);

    if (failed > 0) {
      console.log(`\n   Failed transactions:`);
      results.forEach((result, idx) => {
        if (result.error) {
          console.log(`      ${idx + 1}. ${result.error}`);
        }
      });
    }
  }

  /**
   * Build settlement transaction for a match
   */
  private async buildSettlementTransaction(
    match: MatchedPair
  ): Promise<Transaction> {
    // Convert amounts to BN (already in raw units from decryption)
    const matchedAmount = new BN(Math.floor(match.matchedAmount));
    const executionPrice = new BN(Math.floor(match.executionPrice));

    // Get escrow accounts - they contain the token account addresses
    const buyerEscrowData = await (this.program.account as any).escrow.fetch(match.buyOrder.escrow);
    const sellerEscrowData = await (this.program.account as any).escrow.fetch(match.sellOrder.escrow);

    // Get order book data to find mints
    const orderBookData = await (this.program.account as any).orderBook.fetch(this.orderBook);

    // Get the actual token accounts from the escrow data
    const buyerEscrowTokenAccount = buyerEscrowData.tokenAccount;
    const sellerEscrowTokenAccount = sellerEscrowData.tokenAccount;
    
    // User token accounts (derive ATAs)
    const buyerTokenAccount = await this.getUserTokenAccount(
      match.buyOrder.owner,
      orderBookData.baseMint
    );
    const sellerTokenAccount = await this.getUserTokenAccount(
      match.sellOrder.owner,
      orderBookData.quoteMint
    );

    // Build the instruction
    // Token accounts are passed as remaining_accounts to reduce stack size
    const ix = await this.program.methods
      .submitMatchResults({
        buyerPubkey: match.buyOrder.publicKey,
        sellerPubkey: match.sellOrder.publicKey,
        matchedAmount,
        executionPrice,
      })
      .accounts({
        callbackAuth: this.callbackAuth,
        orderBook: this.orderBook,
        buyerOrder: match.buyOrder.publicKey,
        sellerOrder: match.sellOrder.publicKey,
        buyerEscrow: match.buyOrder.escrow,
        sellerEscrow: match.sellOrder.escrow,
        keeper: this.keeper.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        // Order: buyer_escrow_token, seller_escrow_token, buyer_token, seller_token
        { pubkey: buyerEscrowTokenAccount, isSigner: false, isWritable: true },
        { pubkey: sellerEscrowTokenAccount, isSigner: false, isWritable: true },
        { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: sellerTokenAccount, isSigner: false, isWritable: true },
      ])
      .instruction();

    // Create and sign transaction
    const tx = new Transaction().add(ix);
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    tx.feePayer = this.keeper.publicKey;
    tx.sign(this.keeper);

    return tx;
  }

  /**
   * Verify keeper is authorized
   */
  private async verifyAuthorization(): Promise<void> {
    console.log('🔐 Verifying keeper authorization...');

    try {
      const callbackAuthData = await (this.program.account as any).callbackAuth.fetch(
        this.callbackAuth
      );

      if (!callbackAuthData.isActive) {
        throw new Error('Callback auth is not active');
      }

      const now = Math.floor(Date.now() / 1000);
      if (callbackAuthData.expiresAt.toNumber() < now) {
        throw new Error('Callback auth has expired');
      }

      if (!callbackAuthData.authority.equals(this.keeper.publicKey)) {
        throw new Error('Keeper is not authorized');
      }

      console.log('✅ Keeper authorization verified');
    } catch (error) {
      console.error('❌ Authorization failed:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */

  private loadKeypair(keypairPath: string): Keypair {
    const resolvedPath = keypairPath.startsWith('~')
      ? path.join(process.env.HOME || '', keypairPath.slice(1))
      : keypairPath;

    const secretKey = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  }

  private loadProgram(): Program<Idl> {
    // Load IDL from anchor_program
    const idlPath = path.join(
      __dirname,
      '../../anchor_program/target/idl/shadow_swap.json'
    );
    
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8')) as Idl;
    
    return new Program(
      idl,
      this.provider
    );
  }

  private deriveCallbackAuth(): PublicKey {
    const [callbackAuth] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('callback_auth'),
        this.orderBook.toBuffer(),
        this.keeper.publicKey.toBuffer(),
      ],
      this.program.programId
    );
    return callbackAuth;
  }

  private async getUserTokenAccount(
    owner: PublicKey,
    mint: PublicKey
  ): Promise<PublicKey> {
    // In production, fetch the actual token account
    // For now, derive ATA
    const [ata] = PublicKey.findProgramAddressSync(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    );
    return ata;
  }

  private createArciumClient(): ArciumClient {
    const useMock = process.env.USE_MOCK_ARCIUM === 'true';
    
    const config = {
      mpcUrl: this.config.arciumMpcUrl,
      clientId: this.config.arciumClientId,
      clientSecret: this.config.arciumClientSecret,
    };

    return useMock ? new MockArciumClient(config) : new ArciumClient(config);
  }

  private createSanctumClient(): SanctumClient {
    const useMock = process.env.USE_MOCK_SANCTUM === 'true';
    const useDirect = process.env.USE_DIRECT_RPC !== 'false'; // Default to true for testing
    
    const config = {
      gatewayUrl: this.config.sanctumGatewayUrl,
      apiKey: this.config.sanctumApiKey,
    };

    if (useMock) {
      return new MockSanctumClient(config);
    } else if (useDirect) {
      console.log('🚀 Using Direct RPC submission (no MEV protection)');
      return new DirectRPCClient(config, this.connection);
    } else {
      console.log('🔒 Using Sanctum Gateway (MEV protected)');
      return new SanctumClient(config);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logError(message: string, error: any): void {
    console.error(`❌ ${message}:`, error instanceof Error ? error.message : error);
    if (this.config.logLevel === 'debug' && error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  // Load configuration from environment
  const config: KeeperConfig = {
    rpcUrl: process.env.RPC_URL || 'https://api.devnet.solana.com',
    wssUrl: process.env.WSS_URL,
    programId: process.env.PROGRAM_ID || '5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt',
    orderBookPubkey: process.env.ORDER_BOOK_PUBKEY || 'CXSiQhcozGCvowrC4QFGHQi1BJwWdfw2ZEjhDawMK3Rr',
    keeperKeypairPath: process.env.KEEPER_KEYPAIR_PATH || '~/.config/solana/id.json',
    arciumMpcUrl: process.env.ARCIUM_MPC_URL || 'https://mpc.arcium.com',
    arciumClientId: process.env.ARCIUM_CLIENT_ID || '',
    arciumClientSecret: process.env.ARCIUM_CLIENT_SECRET || '',
    sanctumGatewayUrl: process.env.SANCTUM_GATEWAY_URL || 'https://gateway.sanctum.so',
    sanctumApiKey: process.env.SANCTUM_API_KEY || '',
    matchInterval: parseInt(process.env.MATCH_INTERVAL || '10000'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000'),
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
  };

  // Validate configuration
  if (!config.orderBookPubkey) {
    throw new Error('ORDER_BOOK_PUBKEY must be set in environment');
  }

  // Create and start keeper
  const keeper = new ShadowSwapKeeper(config);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    keeper.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    keeper.stop();
    process.exit(0);
  });

  await keeper.start();
}

// Run if this is the main module
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { ShadowSwapKeeper, KeeperConfig };
