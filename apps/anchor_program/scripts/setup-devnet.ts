/**
 * Setup script for ShadowSwap on Devnet
 * 
 * This script:
 * 1. Initializes the order book for SOL/USDC
 * 2. Creates callback authorization for the keeper
 * 3. Outputs all necessary environment variables
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { ShadowSwap } from "../target/types/shadow_swap";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = "DcCs5AEhd6Sx5opAjhkpNUtNSQwQf7GV3UU7JsfxcvXu";

// Devnet token mints
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112"); // Wrapped SOL
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // USDC devnet

async function main() {
  console.log("\n🚀 ============================================");
  console.log("   ShadowSwap Devnet Setup");
  console.log("============================================\n");

  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load program
  const program = anchor.workspace.ShadowSwap as Program<ShadowSwap>;
  console.log(`📝 Program ID: ${program.programId.toString()}`);
  console.log(`👛 Wallet: ${provider.wallet.publicKey.toString()}\n`);

  // Derive order book PDA
  const [orderBook] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("order_book"),
      SOL_MINT.toBuffer(),
      USDC_MINT.toBuffer(),
    ],
    program.programId
  );

  console.log("📍 Derived Accounts:");
  console.log(`   Order Book: ${orderBook.toString()}`);

  // Check if order book already exists
  try {
    const orderBookAccount = await program.account.orderBook.fetch(orderBook);
    console.log("\n✅ Order book already initialized!");
    console.log(`   Base Mint: ${orderBookAccount.baseMint.toString()}`);
    console.log(`   Quote Mint: ${orderBookAccount.quoteMint.toString()}`);
    console.log(`   Fee: ${orderBookAccount.feeBps} bps (${(orderBookAccount.feeBps / 100).toFixed(2)}%)`);
    console.log(`   Active Orders: ${orderBookAccount.activeOrders.toString()}`);
  } catch (error) {
    console.log("\n📦 Initializing order book...");
    
    try {
      const tx = await program.methods
        .initializeOrderBook(
          SOL_MINT,
          USDC_MINT,
          30, // 0.3% fee
          new anchor.BN(1_000_000) // 0.001 SOL minimum order size
        )
        .accounts({
          authority: provider.wallet.publicKey,
          feeCollector: provider.wallet.publicKey, // For now, use same wallet
          baseMint: SOL_MINT,
          quoteMint: USDC_MINT,
        })
        .rpc();

      console.log(`   ✅ Order book initialized!`);
      console.log(`   Transaction: ${tx}`);
      
      // Wait for confirmation
      await provider.connection.confirmTransaction(tx);
      
      // Fetch the created order book
      const orderBookAccount = await program.account.orderBook.fetch(orderBook);
      console.log(`\n   Details:`);
      console.log(`   - Base Mint: ${orderBookAccount.baseMint.toString()}`);
      console.log(`   - Quote Mint: ${orderBookAccount.quoteMint.toString()}`);
      console.log(`   - Fee: ${orderBookAccount.feeBps} bps`);
    } catch (err) {
      console.error("   ❌ Error initializing order book:", err);
      throw err;
    }
  }

  // Setup keeper authorization
  console.log("\n🔐 Setting up keeper authorization...");
  
  // Use the same wallet as keeper for now (in production, use a separate keeper wallet)
  const keeperPubkey = provider.wallet.publicKey;
  
  const [callbackAuth] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("callback_auth"),
      orderBook.toBuffer(),
      keeperPubkey.toBuffer(),
    ],
    program.programId
  );

  console.log(`   Keeper: ${keeperPubkey.toString()}`);
  console.log(`   Callback Auth: ${callbackAuth.toString()}`);

  // Check if callback auth already exists
  try {
    const callbackAuthAccount = await program.account.callbackAuth.fetch(callbackAuth);
    console.log("\n   ✅ Callback auth already exists!");
    console.log(`   Authority: ${callbackAuthAccount.authority.toString()}`);
    console.log(`   Expires: ${new Date(callbackAuthAccount.expiresAt.toNumber() * 1000).toISOString()}`);
    console.log(`   Active: ${callbackAuthAccount.isActive}`);
  } catch (error) {
    console.log("   Creating callback auth...");
    
    try {
      // Expires in 365 days
      const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60));
      
      const tx = await program.methods
        .createCallbackAuth(expiresAt)
        .accounts({
          orderBook,
          authority: provider.wallet.publicKey,
          keeper: keeperPubkey,
        })
        .rpc();

      console.log(`   ✅ Callback auth created!`);
      console.log(`   Transaction: ${tx}`);
      
      await provider.connection.confirmTransaction(tx);
    } catch (err) {
      console.error("   ❌ Error creating callback auth:", err);
      throw err;
    }
  }

  // Generate .env file
  console.log("\n📝 Generating environment configuration...\n");

  const envContent = `# ShadowSwap Devnet Configuration
# Generated: ${new Date().toISOString()}

# Solana Connection
RPC_URL=https://api.devnet.solana.com
WSS_URL=wss://api.devnet.solana.com

# Program Configuration
PROGRAM_ID=${PROGRAM_ID}
ORDER_BOOK_PUBKEY=${orderBook.toString()}

# Keeper Credentials
KEEPER_KEYPAIR_PATH=~/.config/solana/id.json

# Arcium MPC Configuration (for production)
ARCIUM_MPC_URL=https://mpc.arcium.com
ARCIUM_CLIENT_ID=your_client_id_here
ARCIUM_CLIENT_SECRET=your_client_secret_here

# Sanctum Gateway (for production)
SANCTUM_GATEWAY_URL=https://gateway.sanctum.so
SANCTUM_API_KEY=your_sanctum_api_key_here

# Bot Behavior
MATCH_INTERVAL=10000         # 10 seconds
MAX_RETRIES=3
RETRY_DELAY_MS=1000

# Testing/Development
USE_MOCK_ARCIUM=true         # Set to false when you have Arcium credentials
USE_MOCK_SANCTUM=true        # Set to false when you have Sanctum API key

# Logging
LOG_LEVEL=info
`;

  const envPath = path.join(__dirname, "../../settlement_bot/.env");
  fs.writeFileSync(envPath, envContent);
  
  console.log(`✅ Environment file created: ${envPath}\n`);

  // Print summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Setup Complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📋 Configuration Summary:");
  console.log(`   Network: Devnet`);
  console.log(`   Program ID: ${PROGRAM_ID}`);
  console.log(`   Order Book: ${orderBook.toString()}`);
  console.log(`   Callback Auth: ${callbackAuth.toString()}`);
  console.log(`   Keeper: ${keeperPubkey.toString()}`);
  console.log(`   Base Token: SOL`);
  console.log(`   Quote Token: USDC`);

  console.log("\n🚀 Next Steps:");
  console.log("   1. Review the .env file in apps/settlement_bot/");
  console.log("   2. (Optional) Get Arcium credentials and update .env");
  console.log("   3. (Optional) Get Sanctum API key and update .env");
  console.log("   4. Start the keeper bot:");
  console.log("      cd apps/settlement_bot && yarn dev");

  console.log("\n✨ Your ShadowSwap is ready to use!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  });

