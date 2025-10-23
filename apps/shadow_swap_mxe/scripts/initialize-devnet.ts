/**
 * Initialize Order Book on Devnet
 * 
 * This script initializes the SOL/USDC order book on devnet
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ShadowSwap } from "../target/types/shadow_swap";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

// Native SOL mint (Wrapped SOL)
const NATIVE_SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

async function main() {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ShadowSwap as Program<ShadowSwap>;

  console.log("\n🚀 Initializing ShadowSwap on Devnet...\n");
  console.log("📍 Program ID:", program.programId.toString());
  console.log("🔑 Wallet:", provider.wallet.publicKey.toString());
  
  // Check balance
  const balance = await provider.connection.getBalance(provider.wallet.publicKey);
  console.log("💰 Balance:", balance / 1e9, "SOL\n");

  if (balance < 0.5 * 1e9) {
    console.log("⚠️  Warning: Low balance! You may need more SOL for initialization.");
    console.log("   Run: solana airdrop 2\n");
  }

  // Step 1: Create or use existing USDC mint (for testing)
  console.log("📦 Step 1: Setting up test USDC mint...");
  
  let usdcMint: PublicKey;
  
  // For devnet, we'll create a test USDC mint
  // In production, you'd use the actual USDC mint
  try {
    console.log("   Creating test USDC mint...");
    usdcMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6 // USDC has 6 decimals
    );
    console.log("   ✅ Test USDC mint created:", usdcMint.toString());
  } catch (error) {
    console.error("   ❌ Error creating USDC mint:", error);
    throw error;
  }

  // Step 2: Derive Order Book PDA
  console.log("\n📦 Step 2: Deriving Order Book PDA...");
  const [orderBookPda, orderBookBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("order_book"),
      NATIVE_SOL_MINT.toBuffer(),
      usdcMint.toBuffer(),
    ],
    program.programId
  );
  console.log("   ✅ Order Book PDA:", orderBookPda.toString());
  console.log("   🔢 Bump:", orderBookBump);

  // Step 3: Check if order book already exists
  console.log("\n📦 Step 3: Checking if order book exists...");
  try {
    const existingOrderBook = await program.account.orderBook.fetch(orderBookPda);
    console.log("   ℹ️  Order book already initialized!");
    console.log("   📊 Order Count:", (existingOrderBook as any).orderCount.toString());
    console.log("   📊 Active Orders:", (existingOrderBook as any).activeOrders.toString());
    console.log("\n✅ Setup complete! You can now use the frontend.\n");
    console.log("📝 Update your frontend with:");
    console.log("   BASE_MINT:", NATIVE_SOL_MINT.toString());
    console.log("   QUOTE_MINT:", usdcMint.toString());
    console.log("   ORDER_BOOK:", orderBookPda.toString());
    return;
  } catch (error) {
    console.log("   ℹ️  Order book not found. Initializing...");
  }

  // Step 4: Initialize Order Book
  console.log("\n📦 Step 4: Initializing Order Book...");
  
  const feeCollector = Keypair.generate();
  const feeBps = 30; // 0.3% fee
  const minBaseOrderSize = new anchor.BN(100000); // 0.0001 SOL minimum

  try {
    const tx = await program.methods
      .initializeOrderBook(
        NATIVE_SOL_MINT,
        usdcMint,
        feeBps,
        minBaseOrderSize
      )
      .accountsStrict({
        orderBook: orderBookPda,
        authority: provider.wallet.publicKey,
        feeCollector: feeCollector.publicKey,
        baseMint: NATIVE_SOL_MINT,
        quoteMint: usdcMint,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("   ✅ Order Book initialized!");
    console.log("   📝 Transaction:", tx);
    console.log("   🔗 View on Explorer:");
    console.log("      https://explorer.solana.com/tx/" + tx + "?cluster=devnet");
  } catch (error) {
    console.error("   ❌ Error initializing order book:", error);
    throw error;
  }

  // Step 5: Create Callback Auth for keeper
  console.log("\n📦 Step 5: Creating Callback Auth for keeper...");
  
  const keeper = provider.wallet.publicKey; // For testing, use same wallet
  const [callbackAuthPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("callback_auth"),
      orderBookPda.toBuffer(),
      keeper.toBuffer(),
    ],
    program.programId
  );

  const expiresAt = new anchor.BN(Date.now() / 1000 + 365 * 24 * 60 * 60); // 1 year

  try {
    const tx = await program.methods
      .createCallbackAuth(expiresAt)
      .accountsStrict({
        orderBook: orderBookPda,
        callbackAuth: callbackAuthPda,
        authority: provider.wallet.publicKey,
        keeper: keeper,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("   ✅ Callback Auth created!");
    console.log("   📝 Transaction:", tx);
  } catch (error) {
    console.error("   ❌ Error creating callback auth:", error);
    throw error;
  }

  // Step 6: Create test token accounts and mint some tokens
  console.log("\n📦 Step 6: Setting up test token accounts...");
  
  try {
    const usdcTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      usdcMint,
      provider.wallet.publicKey
    );

    console.log("   ✅ USDC Token Account:", usdcTokenAccount.address.toString());

    // Mint 10,000 test USDC
    console.log("   💰 Minting 10,000 test USDC...");
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      usdcMint,
      usdcTokenAccount.address,
      provider.wallet.publicKey,
      10000 * 1e6 // 10,000 USDC with 6 decimals
    );

    console.log("   ✅ Minted 10,000 test USDC to your wallet!");
  } catch (error) {
    console.error("   ❌ Error setting up token accounts:", error);
    throw error;
  }

  // Final Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEVNET INITIALIZATION COMPLETE! 🎉");
  console.log("=".repeat(60));
  console.log("\n📋 Configuration for Frontend:\n");
  console.log("NEXT_PUBLIC_PROGRAM_ID=" + program.programId.toString());
  console.log("NEXT_PUBLIC_BASE_MINT=" + NATIVE_SOL_MINT.toString());
  console.log("NEXT_PUBLIC_QUOTE_MINT=" + usdcMint.toString());
  console.log("NEXT_PUBLIC_ORDER_BOOK=" + orderBookPda.toString());
  console.log("\n📊 Order Book Details:\n");
  console.log("Order Book Address:", orderBookPda.toString());
  console.log("Fee Collector:", feeCollector.publicKey.toString());
  console.log("Fee (bps):", feeBps, "(0.3%)");
  console.log("Min Order Size:", minBaseOrderSize.toString(), "lamports");
  console.log("\n🔐 Callback Auth:\n");
  console.log("Callback Auth PDA:", callbackAuthPda.toString());
  console.log("Keeper:", keeper.toString());
  console.log("\n💰 Your Test Tokens:\n");
  console.log("SOL Balance:", balance / 1e9, "SOL");
  console.log("Test USDC Balance: 10,000 USDC");
  console.log("\n🚀 Next Steps:\n");
  console.log("1. Frontend is already running at http://localhost:3000");
  console.log("2. The config is automatically derived from mints");
  console.log("3. Connect your wallet (should have", (balance / 1e9).toFixed(2), "SOL)");
  console.log("4. You now have 10,000 test USDC to trade!");
  console.log("5. Try submitting a test order!\n");
  console.log("🔗 View on Solana Explorer:");
  console.log("   https://explorer.solana.com/address/" + orderBookPda.toString() + "?cluster=devnet");
  console.log("\n" + "=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

