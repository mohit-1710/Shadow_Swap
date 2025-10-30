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
  TransactionInstruction,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider, Program, BN, Idl } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
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

const BASE_DECIMALS = 1_000_000_000n; // SOL decimals
const U64_MAX = 18446744073709551615n;

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
          const orderData = JSON.parse(result.plaintext);
          const side = Number(orderData.side);
          if (!Number.isInteger(side) || (side !== 0 && side !== 1)) {
            console.warn(`   ⚠️  Invalid side for order ${encryptedOrders[i].publicKey.toBase58()}: ${orderData.side}`);
            continue;
          }

          const priceBigInt = this.parseBigInt(orderData.price);
          const amountBigInt = this.parseBigInt(orderData.amount);
          const remainingBigInt = this.parseBigInt(orderData.remainingAmount ?? orderData.amount);

          if (priceBigInt === null || amountBigInt === null || remainingBigInt === null) {
            console.warn(`   ⚠️  Invalid numeric fields for order ${encryptedOrders[i].publicKey.toBase58()}`);
            continue;
          }

          if (priceBigInt < 0n || amountBigInt <= 0n || remainingBigInt <= 0n) {
            console.warn(`   ⚠️  Non-positive price/amount for order ${encryptedOrders[i].publicKey.toBase58()}`);
            continue;
          }

          const decryptedOwner = orderData.owner || orderData.ownerPubkey || orderData.ownerPublicKey;
          if (decryptedOwner && decryptedOwner !== encryptedOrders[i].owner.toBase58()) {
            console.warn(`   ⚠️  Owner mismatch for order ${encryptedOrders[i].publicKey.toBase58()}`);
            continue;
          }
          
          const plainOrder: PlainOrder = {
            publicKey: encryptedOrders[i].publicKey,
            owner: encryptedOrders[i].owner,
            orderBook: encryptedOrders[i].orderBook,
            side: side as 0 | 1,
            price: priceBigInt,
            amount: amountBigInt,
            remainingAmount: remainingBigInt,
            escrow: encryptedOrders[i].escrow,
            createdAt: encryptedOrders[i].createdAt.toNumber(),
            orderId: encryptedOrders[i].orderId.toNumber(),
            status: encryptedOrders[i].status,
          };
          
          console.log(`   🔍 Order #${i}: side=${plainOrder.side}, price=${plainOrder.price.toString()}, amount=${plainOrder.amount.toString()}`);
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

    let successful = 0;
    let failed = 0;
    const failures: string[] = [];

    // Track orders that have been settled this cycle to avoid duplicate attempts
    const settledOrderSet = new Set<string>();

    // Submit sequentially so we can adapt to status changes
    for (const match of matches) {
      const buyKey = match.buyOrder.publicKey.toString();
      const sellKey = match.sellOrder.publicKey.toString();

      if (match.matchedAmount <= 0n || match.executionPrice <= 0n) {
        console.warn('   ⚠️  Skipping invalid match (amount/price)');
        continue;
      }

      if (settledOrderSet.has(buyKey) || settledOrderSet.has(sellKey)) {
        console.log(`   ⏭️  Skipping match; order already settled in this cycle (buyer ${match.buyOrder.orderId}, seller ${match.sellOrder.orderId})`);
        continue;
      }

      // Verify on-chain status before building
      const ok = await this.ordersAreActive(match);
      if (!ok) {
        console.log(`   ⏭️  Skipping match; order status not ACTIVE/PARTIAL (buyer ${match.buyOrder.orderId}, seller ${match.sellOrder.orderId})`);
        continue;
      }

      try {
        const tx = await this.buildSettlementTransaction(match);
        const res = await this.sanctumClient.submitTransaction(tx, this.config.maxRetries);
        if (res.signature) {
          console.log(
            `   🎉 Completed: buy order ${match.buyOrder.orderId} ↔ sell order ${match.sellOrder.orderId} at ${match.executionPrice} (tx ${res.signature})`
          );
          successful++;
          settledOrderSet.add(buyKey);
          settledOrderSet.add(sellKey);
        } else {
          const msg = res.error || 'Unknown submission error';
          console.log(
            `   ❌ Failed: buy order ${match.buyOrder.orderId} ↔ sell order ${match.sellOrder.orderId} :: ${msg}`
          );
          failed++;
          failures.push(msg);
        }
      } catch (error: any) {
        const msg = error?.message || 'Build/submit error';
        console.log(
          `   ❌ Failed: buy order ${match.buyOrder.orderId} ↔ sell order ${match.sellOrder.orderId} :: ${msg}`
        );
        failed++;
        failures.push(msg);
      }
    }

    console.log(`\n📊 Settlement Results:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed:     ${failed}`);
    if (failed > 0) {
      console.log(`\n   Failed transactions:`);
      failures.forEach((f, i) => console.log(`      ${i + 1}. ${f}`));
    }
  }

  private async ordersAreActive(match: MatchedPair): Promise<boolean> {
    try {
      const buyerOrder = await (this.program.account as any).encryptedOrder.fetch(match.buyOrder.publicKey);
      const sellerOrder = await (this.program.account as any).encryptedOrder.fetch(match.sellOrder.publicKey);
      // 1 = ACTIVE, 2 = PARTIAL
      const isActive = (s: number) => s === 1 || s === 2;
      return isActive(buyerOrder.status) && isActive(sellerOrder.status);
    } catch (e) {
      console.warn('   ⚠️  Unable to fetch order status before submit:', e);
      return false;
    }
  }

  /**
   * Build settlement transaction for a match
   */
  private async buildSettlementTransaction(
    match: MatchedPair
  ): Promise<Transaction> {
    const matchAmountBigInt = match.matchedAmount;
    const executionPriceBigInt = match.executionPrice;

    if (matchAmountBigInt <= 0n) {
      throw new Error('Matched amount must be positive');
    }

    if (executionPriceBigInt <= 0n) {
      throw new Error('Execution price must be positive');
    }

    if (matchAmountBigInt > U64_MAX) {
      throw new Error(`Matched amount ${matchAmountBigInt.toString()} exceeds u64 range`);
    }

    const quoteAmountBigInt = (matchAmountBigInt * executionPriceBigInt) / BASE_DECIMALS;

    if (quoteAmountBigInt <= 0n) {
      throw new Error('Quote amount underflow, check pricing decimals');
    }

    if (quoteAmountBigInt > U64_MAX) {
      throw new Error(`Quote amount ${quoteAmountBigInt.toString()} exceeds u64 range`);
    }

    const matchedAmountBn = new BN(matchAmountBigInt.toString());
    const executionPriceBn = new BN(executionPriceBigInt.toString());

    // Get escrow accounts - they contain the token account addresses
    const buyerEscrowData = await (this.program.account as any).escrow.fetch(match.buyOrder.escrow);
    const sellerEscrowData = await (this.program.account as any).escrow.fetch(match.sellOrder.escrow);

    // Get order book data to find mints
    const orderBookData = await (this.program.account as any).orderBook.fetch(this.orderBook);

    // Get the actual token accounts from the escrow data
    const buyerEscrowTokenAccount = buyerEscrowData.tokenAccount;
    const sellerEscrowTokenAccount = sellerEscrowData.tokenAccount;
    
    // User token accounts (derive ATAs)
    const buyerTokenAccount = this.getAssociatedTokenAccount(
      match.buyOrder.owner,
      orderBookData.baseMint
    );
    const sellerTokenAccount = this.getAssociatedTokenAccount(
      match.sellOrder.owner,
      orderBookData.quoteMint
    );

    const preInstructions: TransactionInstruction[] = [];

    const buyerTokenInfo = await this.connection.getAccountInfo(buyerTokenAccount);
    if (!buyerTokenInfo) {
      console.log(`   ⚠️  Buyer base ATA missing, creating ${buyerTokenAccount.toBase58()}`);
      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          this.keeper.publicKey,
          buyerTokenAccount,
          match.buyOrder.owner,
          orderBookData.baseMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    const sellerTokenInfo = await this.connection.getAccountInfo(sellerTokenAccount);
    if (!sellerTokenInfo) {
      console.log(`   ⚠️  Seller quote ATA missing, creating ${sellerTokenAccount.toBase58()}`);
      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          this.keeper.publicKey,
          sellerTokenAccount,
          match.sellOrder.owner,
          orderBookData.quoteMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    const buyerEscrowBalanceInfo = await this.connection.getTokenAccountBalance(buyerEscrowTokenAccount).catch(() => null);
    const sellerEscrowBalanceInfo = await this.connection.getTokenAccountBalance(sellerEscrowTokenAccount).catch(() => null);

    const buyerEscrowAmount = buyerEscrowBalanceInfo ? BigInt(buyerEscrowBalanceInfo.value.amount) : 0n;
    const sellerEscrowAmount = sellerEscrowBalanceInfo ? BigInt(sellerEscrowBalanceInfo.value.amount) : 0n;

    if (buyerEscrowAmount < quoteAmountBigInt) {
      throw new Error(
        `Buyer escrow underfunded. Need ${quoteAmountBigInt.toString()} quote units, have ${buyerEscrowAmount.toString()}`
      );
    }

    if (sellerEscrowAmount < matchAmountBigInt) {
      throw new Error(
        `Seller escrow underfunded. Need ${matchAmountBigInt.toString()} base units, have ${sellerEscrowAmount.toString()}`
      );
    }

    // Build the instruction
    // Token accounts are passed as remaining_accounts to reduce stack size
    const ix = await this.program.methods
      .submitMatchResults({
        buyerPubkey: match.buyOrder.publicKey,
        sellerPubkey: match.sellOrder.publicKey,
        matchedAmount: matchedAmountBn,
        executionPrice: executionPriceBn,
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
    const tx = new Transaction();
    preInstructions.forEach((instruction) => tx.add(instruction));
    tx.add(ix);
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
    const idlPath = this.resolveIdlPath();

    let idl: Idl;
    try {
      idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8')) as Idl;
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'unknown read error';
      throw new Error(
        `Failed to read ShadowSwap IDL at ${idlPath}: ${reason}`
      );
    }

    const configuredProgramId = this.config.programId?.trim();
    const idlWithAddress = idl as Idl & {
      address?: string;
      metadata?: { address?: string; [key: string]: any };
    };
    const idlAddresses = [
      idlWithAddress.address,
      idlWithAddress.metadata?.address,
    ].filter((value): value is string => Boolean(value));

    if (!configuredProgramId && idlAddresses.length === 0) {
      throw new Error(
        'No program ID configured. Set PROGRAM_ID in the environment or ensure the IDL contains an address.'
      );
    }

    const programId = new PublicKey(
      configuredProgramId || (idlAddresses[0] as string)
    ).toBase58();

    if (
      idlAddresses.length > 0 &&
      !idlAddresses.every((address) => address === programId)
    ) {
      throw new Error(
        `Program ID mismatch. Config reports ${configuredProgramId}, but IDL contains ${idlAddresses.join(
          ', '
        )}.`
      );
    }

    idlWithAddress.address = programId;
    idlWithAddress.metadata = {
      ...(idlWithAddress.metadata ?? {}),
      address: programId,
    };

    return new Program(idlWithAddress, this.provider);
  }

  private resolveIdlPath(): string {
    const repoRoot = path.resolve(__dirname, '../../..');
    const candidatePaths = Array.from(
      new Set(
        [
          this.config.idlPath,
          process.env.SHADOW_SWAP_IDL_PATH,
          process.env.IDL_PATH,
          path.resolve(__dirname, '../../anchor_program/target/idl/shadow_swap.json'),
          path.join(repoRoot, 'apps/anchor_program/target/idl/shadow_swap.json'),
          path.join(process.cwd(), '../anchor_program/target/idl/shadow_swap.json'),
        ].filter((value): value is string => Boolean(value))
      )
    );

    const checked: string[] = [];

    for (const candidate of candidatePaths) {
      const resolved = path.isAbsolute(candidate)
        ? candidate
        : path.resolve(candidate);
      checked.push(resolved);

      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }

    throw new Error(
      [
        'ShadowSwap IDL not found.',
        'Run "yarn anchor:build" to generate the IDL or set SHADOW_SWAP_IDL_PATH to an existing shadow_swap.json.',
        `Checked paths: ${checked.join(', ') || 'none'}`,
      ].join(' ')
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

  private getAssociatedTokenAccount(owner: PublicKey, mint: PublicKey): PublicKey {
    return getAssociatedTokenAddressSync(
      mint,
      owner,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
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
    const sanctumConfig = {
      gatewayUrl: this.config.sanctumGatewayUrl,
      apiKey: this.config.sanctumApiKey,
    };

    if (useMock) {
      return new MockSanctumClient(sanctumConfig);
    }

    // Devnet builds send directly to public RPC; mainnet switches to Sanctum's private gateway.
    const shouldUseGateway = this.shouldUseSanctumGateway();

    if (!shouldUseGateway) {
      const directRpcUrls = this.getDirectRpcUrls();
      const primaryRpcUrl = directRpcUrls[0] ?? this.config.rpcUrl;

      console.log('🚀 Using direct RPC submission for development (no MEV protection)');
      console.log(`   Primary RPC endpoint: ${primaryRpcUrl}`);
      if (directRpcUrls.length > 1) {
        console.log(`   Fallback RPC endpoints: ${directRpcUrls.slice(1).join(', ')}`);
      }

      const directConnection = this.buildDirectRpcConnection(primaryRpcUrl);
      return new DirectRPCClient(sanctumConfig, directConnection);
    }

    console.log('🔒 Using Sanctum Gateway (private-only MEV protection enabled)');
    return new SanctumClient(sanctumConfig);
  }

  private buildDirectRpcConnection(endpoint: string): Connection {
    if (endpoint === this.config.rpcUrl) {
      return this.connection;
    }

    return new Connection(endpoint, {
      commitment: 'confirmed',
      wsEndpoint: this.config.wssUrl,
    });
  }

  private shouldUseSanctumGateway(): boolean {
    const explicitGateway = process.env.USE_SANCTUM_GATEWAY;
    if (explicitGateway === 'true') return true;
    if (explicitGateway === 'false') return false;

    const explicitDirect = process.env.USE_DIRECT_RPC;
    if (explicitDirect === 'true') return false;
    if (explicitDirect === 'false') return true;

    const normalizedRpc = this.config.rpcUrl.toLowerCase();
    const isMainnet =
      normalizedRpc.includes('mainnet') &&
      !normalizedRpc.includes('devnet') &&
      !normalizedRpc.includes('testnet');

    return isMainnet;
  }

  private getDirectRpcUrls(): string[] {
    const configured = this.config.sanctumDirectRpcUrls ?? [];
    return configured.filter(url => url.trim().length > 0);
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

  private parseBigInt(value: any): bigint | null {
    try {
      if (typeof value === 'bigint') {
        return value;
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        return BigInt(Math.trunc(value));
      }
      if (typeof value === 'string') {
        if (value.trim() === '') return null;
        return BigInt(value.trim());
      }
      if (value && typeof value.toString === 'function') {
        const str = value.toString();
        if (str) {
          return BigInt(str);
        }
      }
    } catch (error) {
      console.warn('   ⚠️  Failed to parse bigint value:', error);
    }
    return null;
  }
}

/**
 * Main entry point
 */
async function main() {
  // Load configuration from environment
  const defaultRpcUrl =
    process.env.RPC_URL ||
    'https://solana-devnet.g.alchemy.com/v2/adhb_t3nkZM8basT45GGA';

  const parseCsv = (value?: string): string[] =>
    value
      ? value
          .split(',')
          .map(entry => entry.trim())
          .filter(Boolean)
      : [];

  const normalizedRpcUrl = defaultRpcUrl.toLowerCase();
  const isLikelyMainnet =
    normalizedRpcUrl.includes('mainnet') &&
    !normalizedRpcUrl.includes('devnet') &&
    !normalizedRpcUrl.includes('testnet');

  // Development defaults stick to public devnet RPCs; mainnet flips over to Sanctum's private gateway.
  const devnetDirectRpcDefaults = [
    'https://solana-devnet.g.alchemy.com/v2/adhb_t3nkZM8basT45GGA',
    'https://devnet.helius-rpc.com/?api-key=f5dc6516-fe72-497f-9c75-1aa3a8d6928b',
  ];

  const directRpcUrlsFromEnv = parseCsv(process.env.SANCTUM_DIRECT_RPC_URLS);
  const sanctumDirectRpcUrls =
    directRpcUrlsFromEnv.length > 0
      ? directRpcUrlsFromEnv
      : isLikelyMainnet
        ? []
        : devnetDirectRpcDefaults;

  const config: KeeperConfig = {
    rpcUrl: defaultRpcUrl,
    wssUrl: process.env.WSS_URL,
    programId: process.env.PROGRAM_ID || 'CwE5KHSTsStjt2pBYjK7G7vH5T1dk3tBvePb1eg26uhA',
    orderBookPubkey: process.env.ORDER_BOOK_PUBKEY || '63kRwuBA7VZHrP4KU97g1B218fKMShuvKk7qLZjGqBqJ',
    idlPath: process.env.SHADOW_SWAP_IDL_PATH || process.env.IDL_PATH,
    keeperKeypairPath: process.env.KEEPER_KEYPAIR_PATH || '~/.config/solana/id.json',
    arciumMpcUrl: process.env.ARCIUM_MPC_URL || 'https://mpc.arcium.com',
    arciumClientId: process.env.ARCIUM_CLIENT_ID || '',
    arciumClientSecret: process.env.ARCIUM_CLIENT_SECRET || '',
    sanctumGatewayUrl: process.env.SANCTUM_GATEWAY_URL || 'https://gateway.sanctum.so',
    sanctumApiKey: process.env.SANCTUM_API_KEY || '',
    sanctumDirectRpcUrls: sanctumDirectRpcUrls.length > 0 ? sanctumDirectRpcUrls : undefined,
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
