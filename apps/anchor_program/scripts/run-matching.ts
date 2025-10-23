/**
 * Arcium Matching Runner
 * 
 * Continuously runs the matching process using Arcium MPC
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import ArciumMatchingEngine from "../src/arcium-matching";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔄 ShadowSwap Matching Engine");
  console.log("====================================\n");

  // Load configuration
  const config = {
    rpcEndpoint: process.env.RPC_ENDPOINT || "https://api.devnet.solana.com",
    programId: new PublicKey(
      process.env.PROGRAM_ID || "Dk9p88PPmrApGwhpTZAYQkuZApVHEnquxxeng1sCndci"
    ),
    orderBookAddress: new PublicKey(
      process.env.ORDER_BOOK_ADDRESS ||
        "6n4KbFqXoLaCYnANHNuKZUW6g73A3B4JLgQRMPWQh4Wv"
    ),
    intervalSeconds: parseInt(process.env.MATCH_INTERVAL || "30"),
  };

  console.log("📋 Configuration:");
  console.log(`   RPC: ${config.rpcEndpoint}`);
  console.log(`   Program ID: ${config.programId.toBase58()}`);
  console.log(`   Order Book: ${config.orderBookAddress.toBase58()}`);
  console.log(`   Interval: ${config.intervalSeconds}s\n`);

  // Load keeper keypair
  let keeperKeypair: Keypair;
  if (process.env.KEEPER_KEYPAIR) {
    const secretKey = new Uint8Array(JSON.parse(process.env.KEEPER_KEYPAIR));
    keeperKeypair = Keypair.fromSecretKey(secretKey);
  } else {
    const home = process.env.HOME || process.env.USERPROFILE;
    const keypairPath = path.join(home!, ".config/solana/id.json");
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    keeperKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  }

  console.log(`🔑 Keeper: ${keeperKeypair.publicKey.toBase58()}\n`);

  // Initialize connection and engine
  const connection = new Connection(config.rpcEndpoint, "confirmed");
  const wallet = new anchor.Wallet(keeperKeypair);
  const engine = new ArciumMatchingEngine(
    connection,
    wallet,
    config.programId
  );

  console.log("🚀 Starting matching loop...\n");

  let runCount = 0;

  // Main matching loop
  while (true) {
    runCount++;
    console.log(`\n${"=".repeat(50)}`);
    console.log(`🔄 Match Run #${runCount}`);
    console.log(`${new Date().toISOString()}`);
    console.log("=".repeat(50));

    try {
      // Fetch orders
      console.log("\n📥 Fetching orders...");
      const orders = await engine.prepareOrdersForMatching(
        config.orderBookAddress
      );

      if (orders.length < 2) {
        console.log(`⚠️  Only ${orders.length} order(s) - need at least 2`);
        console.log(`⏳ Waiting ${config.intervalSeconds}s...\n`);
        await sleep(config.intervalSeconds * 1000);
        continue;
      }

      console.log(`✅ Found ${orders.length} orders`);

      // Submit to Arcium MPC
      console.log("\n🔐 Submitting to Arcium MPC...");
      const computationOffset = await engine.submitMatchingComputation(orders);
      console.log(`✅ Computation ID: ${computationOffset}`);

      // Wait for results
      console.log("\n⏳ Waiting for MPC results...");
      await engine.awaitAndProcessResults(
        computationOffset,
        config.orderBookAddress
      );

      console.log("✅ Match run complete!");
    } catch (error: any) {
      console.error("❌ Error during matching:", error.message);

      // Check for specific errors
      if (error.message.includes("insufficient funds")) {
        console.error("\n💰 Insufficient funds! Keeper needs more SOL.");
      } else if (error.message.includes("Computation not found")) {
        console.error("\n⚠️  Arcium computation not found - may not be deployed");
      } else if (error.message.includes("CallbackAuthExpired")) {
        console.error("\n🔐 Callback authorization expired - renew it");
      }
    }

    // Wait before next run
    console.log(`\n⏸️  Waiting ${config.intervalSeconds}s until next run...`);
    await sleep(config.intervalSeconds * 1000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n🛑 Stopping matching engine...");
  console.log("✅ Goodbye!\n");
  process.exit(0);
});

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

