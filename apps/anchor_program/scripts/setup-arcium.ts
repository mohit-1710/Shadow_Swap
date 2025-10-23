/**
 * Arcium Setup Script
 * 
 * One-time setup for deploying the matching circuit to Arcium network
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import ArciumMatchingEngine from "../src/arcium-matching";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 ShadowSwap Arcium Setup");
  console.log("====================================\n");

  // Load configuration
  const config = {
    rpcEndpoint: process.env.RPC_ENDPOINT || "https://api.devnet.solana.com",
    programId: new PublicKey(
      process.env.PROGRAM_ID || "Dk9p88PPmrApGwhpTZAYQkuZApVHEnquxxeng1sCndci"
    ),
    circuitPath: process.env.CIRCUIT_PATH || "./build/shadowswap_matching.arcis",
  };

  console.log("📋 Configuration:");
  console.log(`   RPC: ${config.rpcEndpoint}`);
  console.log(`   Program ID: ${config.programId.toBase58()}`);
  console.log(`   Circuit Path: ${config.circuitPath}\n`);

  // Load keeper keypair
  let keeperKeypair: Keypair;
  if (process.env.KEEPER_KEYPAIR) {
    const secretKey = new Uint8Array(JSON.parse(process.env.KEEPER_KEYPAIR));
    keeperKeypair = Keypair.fromSecretKey(secretKey);
  } else {
    console.log("⚠️  No KEEPER_KEYPAIR found, using default wallet");
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

  // Check if circuit file exists
  if (!fs.existsSync(config.circuitPath)) {
    console.log("⚠️  Circuit file not found!");
    console.log("\n📝 To create the circuit file:");
    console.log("   1. Write matching logic in Arcium DSL");
    console.log("   2. Compile with Arcium tools");
    console.log("   3. Place .arcis file at:", config.circuitPath);
    console.log("\n💡 For development, you can:");
    console.log("   - Skip circuit upload");
    console.log("   - Test match_callback with mock results");
    console.log("   - See tests/test-match-callback.ts\n");
    process.exit(0);
  }

  try {
    // Step 1: Upload circuit
    console.log("📤 Step 1: Uploading circuit to Arcium...");
    await engine.uploadMatchingCircuit(config.circuitPath);
    console.log("✅ Circuit uploaded!\n");

    // Step 2: Finalize computation definition
    console.log("🔧 Step 2: Finalizing computation definition...");
    await engine.finalizeComputationDefinition();
    console.log("✅ Computation definition finalized!\n");

    console.log("====================================");
    console.log("🎉 Arcium Setup Complete!");
    console.log("====================================\n");
    console.log("✅ Circuit deployed: shadowswap_matching_v1");
    console.log("✅ Ready for matching operations");
    console.log("\n📝 Next steps:");
    console.log("   1. Run keeper bot: ts-node scripts/run-matching.ts");
    console.log("   2. Or integrate into your keeper service");
    console.log("");
  } catch (error) {
    console.error("❌ Setup failed:", error);
    console.log("\n💡 Common issues:");
    console.log("   - Insufficient SOL for transactions");
    console.log("   - Arcium program not available on network");
    console.log("   - Invalid circuit file format");
    console.log("");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

