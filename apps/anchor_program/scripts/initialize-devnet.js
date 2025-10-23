/**
 * Initialize Order Book on Devnet
 */

const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair, SystemProgram } = require("@solana/web3.js");
const {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

// Native SOL mint (Wrapped SOL)
const NATIVE_SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

async function main() {
  // Load IDL
  const idlPath = path.join(__dirname, "../target/idl/shadow_swap.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

  // Configure the client to use devnet
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load wallet
  const walletPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME, ".config/solana/id.json");
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf8")))
  );
  
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed"
  });
  
  const programId = new PublicKey(idl.address);
  const program = new anchor.Program(idl, provider);

  console.log("\n🚀 Initializing ShadowSwap on Devnet...\n");
  console.log("📍 Program ID:", programId.toString());
  console.log("🔑 Wallet:", wallet.publicKey.toString());
  
  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("💰 Balance:", balance / 1e9, "SOL\n");

  if (balance < 0.5 * 1e9) {
    console.log("⚠️  Warning: Low balance! You may need more SOL for initialization.");
    console.log("   Run: solana airdrop 2\n");
  }

  // Step 1: Create test USDC mint
  console.log("📦 Step 1: Setting up test USDC mint...");
  
  let usdcMint;
  try {
    console.log("   Creating test USDC mint...");
    usdcMint = await createMint(
      connection,
      walletKeypair,
      wallet.publicKey,
      null,
      6 // USDC has 6 decimals
    );
    console.log("   ✅ Test USDC mint created:", usdcMint.toString());
  } catch (error) {
    console.error("   ❌ Error creating USDC mint:", error.message);
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
    programId
  );
  console.log("   ✅ Order Book PDA:", orderBookPda.toString());
  console.log("   🔢 Bump:", orderBookBump);

  // Step 3: Check if order book already exists
  console.log("\n📦 Step 3: Checking if order book exists...");
  try {
    const existingOrderBook = await program.account.orderBook.fetch(orderBookPda);
    console.log("   ℹ️  Order book already initialized!");
    console.log("   📊 Order Count:", existingOrderBook.orderCount.toString());
    console.log("   📊 Active Orders:", existingOrderBook.activeOrders.toString());
    console.log("\n✅ Setup complete! You can now use the frontend.\n");
    console.log("📝 Configuration:");
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
      .accounts({
        orderBook: orderBookPda,
        authority: wallet.publicKey,
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
    console.error("   ❌ Error initializing order book:", error.message);
    if (error.logs) {
      console.log("   Program logs:", error.logs.join("\n   "));
    }
    throw error;
  }

  // Step 5: Create Callback Auth for keeper
  console.log("\n📦 Step 5: Creating Callback Auth for keeper...");
  
  const keeper = wallet.publicKey;
  const [callbackAuthPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("callback_auth"),
      orderBookPda.toBuffer(),
      keeper.toBuffer(),
    ],
    programId
  );

  const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60); // 1 year

  try {
    const tx = await program.methods
      .createCallbackAuth(expiresAt)
      .accounts({
        orderBook: orderBookPda,
        callbackAuth: callbackAuthPda,
        authority: wallet.publicKey,
        keeper: keeper,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("   ✅ Callback Auth created!");
    console.log("   📝 Transaction:", tx);
  } catch (error) {
    console.error("   ❌ Error creating callback auth:", error.message);
  }

  // Step 6: Create test token accounts and mint tokens
  console.log("\n📦 Step 6: Setting up test token accounts...");
  
  try {
    const usdcTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      walletKeypair,
      usdcMint,
      wallet.publicKey
    );

    console.log("   ✅ USDC Token Account:", usdcTokenAccount.address.toString());

    // Mint 10,000 test USDC
    console.log("   💰 Minting 10,000 test USDC...");
    await mintTo(
      connection,
      walletKeypair,
      usdcMint,
      usdcTokenAccount.address,
      wallet.publicKey,
      10000 * 1e6 // 10,000 USDC with 6 decimals
    );

    console.log("   ✅ Minted 10,000 test USDC to your wallet!");
  } catch (error) {
    console.error("   ❌ Error setting up token accounts:", error.message);
  }

  // Final Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEVNET INITIALIZATION COMPLETE! 🎉");
  console.log("=".repeat(60));
  console.log("\n📋 Configuration for Frontend:\n");
  console.log("NEXT_PUBLIC_PROGRAM_ID=" + programId.toString());
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
  console.log("SOL Balance:", (balance / 1e9).toFixed(4), "SOL");
  console.log("Test USDC Balance: 10,000 USDC");
  console.log("\n🚀 Next Steps:\n");
  console.log("1. Frontend is running at http://localhost:3001");
  console.log("2. Update frontend with the USDC mint above");
  console.log("3. Connect your wallet");
  console.log("4. You now have 10,000 test USDC to trade!");
  console.log("5. Try submitting a test order!\n");
  console.log("🔗 View on Solana Explorer:");
  console.log("   https://explorer.solana.com/address/" + orderBookPda.toString() + "?cluster=devnet");
  console.log("\n" + "=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message || error);
    process.exit(1);
  });

