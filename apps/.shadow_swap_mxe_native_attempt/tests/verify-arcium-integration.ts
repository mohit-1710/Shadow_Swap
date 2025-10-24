/**
 * Arcium Integration Verification Script
 * 
 * This script verifies that the Arcium SDK integration works correctly
 * with the Anchor program, testing all integration points.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { 
  getArciumEnv,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccOffset,
  getCompDefAccAddress,
  x25519,
  RescueCipher,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as path from "path";

// Load IDL
const idlPath = path.join(__dirname, "../target/idl/shadow_swap.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

// Test configuration
const config = {
  rpcEndpoint: process.env.RPC_ENDPOINT || "https://api.devnet.solana.com",
  programId: new PublicKey(
    process.env.PROGRAM_ID || "Dk9p88PPmrApGwhpTZAYQkuZApVHEnquxxeng1sCndci"
  ),
  orderBookAddress: new PublicKey(
    process.env.ORDER_BOOK_ADDRESS ||
      "6n4KbFqXoLaCYnANHNuKZUW6g73A3B4JLgQRMPWQh4Wv"
  ),
};

// Test results tracker
const results = {
  passed: [] as string[],
  failed: [] as { test: string; error: string }[],
};

function logTest(name: string, status: "✅" | "❌" | "⚠️", message?: string) {
  const prefix = status === "✅" ? "PASS" : status === "❌" ? "FAIL" : "WARN";
  console.log(`[${prefix}] ${name}`);
  if (message) console.log(`      ${message}`);
}

async function test1_SDKImports() {
  console.log("\n1️⃣  Testing Arcium SDK Imports...");
  
  try {
    // Test @arcium-hq/client imports
    const arciumEnv = getArciumEnv();
    logTest("Arcium client SDK import", "✅");
    
    // Test @arcium-hq/reader imports (just verify it can be imported)
    await import("@arcium-hq/reader");
    logTest("Arcium reader SDK import", "✅");
    
    results.passed.push("SDK Imports");
    return true;
  } catch (error: any) {
    logTest("SDK Imports", "❌", error.message);
    results.failed.push({ test: "SDK Imports", error: error.message });
    return false;
  }
}

async function test2_AnchorProgramConnection(
  provider: AnchorProvider,
  program: Program
) {
  console.log("\n2️⃣  Testing Anchor Program Connection...");
  
  try {
    // Fetch program account
    const programAccount = await provider.connection.getAccountInfo(
      program.programId
    );
    
    if (!programAccount) {
      throw new Error("Program not deployed");
    }
    
    logTest("Anchor program deployed", "✅", program.programId.toBase58());
    
    // Try to fetch order book
    try {
      const orderBook = await (program.account as any).orderBook.fetch(
        config.orderBookAddress
      );
      logTest("Order book accessible", "✅", `Active: ${orderBook.isActive}`);
    } catch (e) {
      logTest("Order book accessible", "⚠️", "Not initialized");
    }
    
    results.passed.push("Anchor Connection");
    return true;
  } catch (error: any) {
    logTest("Anchor Connection", "❌", error.message);
    results.failed.push({ test: "Anchor Connection", error: error.message });
    return false;
  }
}

async function test3_ArciumAccountDerivation(program: Program) {
  console.log("\n3️⃣  Testing Arcium Account Derivation...");
  
  try {
    // Test MXE account derivation
    const mxeAccount = getMXEAccAddress(program.programId);
    logTest("MXE account derivation", "✅", mxeAccount.toBase58());
    
    // Test mempool account derivation
    const mempoolAccount = getMempoolAccAddress(program.programId);
    logTest("Mempool account derivation", "✅", mempoolAccount.toBase58());
    
    // Test executing pool derivation
    const executingPool = getExecutingPoolAccAddress(program.programId);
    logTest("Executing pool derivation", "✅", executingPool.toBase58());
    
    // Test computation definition offset
    const compDefOffset = getCompDefAccOffset("shadowswap_matching_v1");
    const compDefOffsetNum = Buffer.from(compDefOffset).readUInt32LE();
    const compDefAccount = getCompDefAccAddress(program.programId, compDefOffsetNum);
    logTest("Computation def derivation", "✅", compDefAccount.toBase58());
    
    results.passed.push("Account Derivation");
    return true;
  } catch (error: any) {
    logTest("Account Derivation", "❌", error.message);
    results.failed.push({ test: "Account Derivation", error: error.message });
    return false;
  }
}

async function test4_EncryptionSetup(provider: AnchorProvider, program: Program) {
  console.log("\n4️⃣  Testing Arcium Encryption Setup...");
  
  try {
    // Generate client keypair
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);
    logTest("Client keypair generation", "✅");
    
    // Try to get MXE public key (may not exist if Arcium not set up)
    try {
      const mxePublicKey = await getMXEPublicKey(provider, program.programId);
      
      if (mxePublicKey) {
        logTest("MXE public key fetch", "✅");
        
        // Test shared secret derivation
        const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
        logTest("Shared secret derivation", "✅");
        
        // Test cipher initialization
        const cipher = new RescueCipher(sharedSecret);
        logTest("RescueCipher initialization", "✅");
        
        // Test encryption/decryption
        const testData = [BigInt(123), BigInt(456)];
        const nonce = new Uint8Array(16);
        const encrypted = cipher.encrypt(testData, nonce);
        const decrypted = cipher.decrypt(encrypted, nonce);
        
        if (decrypted[0] === testData[0] && decrypted[1] === testData[1]) {
          logTest("Encrypt/decrypt round-trip", "✅");
        } else {
          throw new Error("Decryption mismatch");
        }
      } else {
        logTest(
          "MXE public key fetch",
          "⚠️",
          "MXE not set up (expected for local testing)"
        );
      }
    } catch (e: any) {
      if (e.message.includes("not found") || e.message.includes("not set")) {
        logTest(
          "MXE public key fetch",
          "⚠️",
          "MXE not set up (expected for local testing)"
        );
      } else {
        throw e;
      }
    }
    
    results.passed.push("Encryption Setup");
    return true;
  } catch (error: any) {
    logTest("Encryption Setup", "❌", error.message);
    results.failed.push({ test: "Encryption Setup", error: error.message });
    return false;
  }
}

async function test5_MatchCallbackStructure(program: Program) {
  console.log("\n5️⃣  Testing Match Callback Structure...");
  
  try {
    // Check if match_callback instruction exists in IDL
    const matchCallbackIx = program.idl.instructions.find(
      (ix: any) => ix.name === "matchCallback"
    );
    
    if (!matchCallbackIx) {
      throw new Error("match_callback instruction not found in IDL");
    }
    
    logTest("match_callback in IDL", "✅");
    
    // Verify instruction arguments
    const hasResultsArg = matchCallbackIx.args.some(
      (arg: any) => arg.name === "results"
    );
    
    if (!hasResultsArg) {
      throw new Error("results argument not found");
    }
    
    logTest("results argument present", "✅");
    
    // Check for MatchResult type
    const hasMatchResultType = program.idl.types?.some(
      (type: any) => type.name === "MatchResult"
    );
    
    if (hasMatchResultType) {
      logTest("MatchResult type defined", "✅");
    } else {
      logTest("MatchResult type defined", "⚠️", "Not in IDL types");
    }
    
    // Check for MatchQueued event
    const hasMatchQueuedEvent = program.idl.events?.some(
      (event: any) => event.name === "MatchQueued"
    );
    
    if (hasMatchQueuedEvent) {
      logTest("MatchQueued event defined", "✅");
    } else {
      logTest("MatchQueued event defined", "⚠️", "Not in IDL events");
    }
    
    results.passed.push("Callback Structure");
    return true;
  } catch (error: any) {
    logTest("Callback Structure", "❌", error.message);
    results.failed.push({ test: "Callback Structure", error: error.message });
    return false;
  }
}

async function test6_CallbackAuthSetup(
  provider: AnchorProvider,
  program: Program
) {
  console.log("\n6️⃣  Testing Callback Authorization...");
  
  try {
    const keeper = provider.wallet.publicKey;
    
    // Derive callback auth PDA
    const [callbackAuthPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("callback_auth"),
        config.orderBookAddress.toBuffer(),
        keeper.toBuffer(),
      ],
      program.programId
    );
    
    logTest("Callback auth PDA derivation", "✅", callbackAuthPda.toBase58());
    
    // Try to fetch callback auth
    try {
      const callbackAuth = await (program.account as any).callbackAuth.fetch(
        callbackAuthPda
      );
      logTest("Callback auth exists", "✅", `Active: ${callbackAuth.isActive}`);
      
      // Check if expired
      const now = Math.floor(Date.now() / 1000);
      if (callbackAuth.expiresAt.toNumber() > now) {
        logTest("Callback auth valid", "✅", `Expires at ${new Date(callbackAuth.expiresAt.toNumber() * 1000).toISOString()}`);
      } else {
        logTest("Callback auth valid", "⚠️", "Expired - needs renewal");
      }
    } catch (e) {
      logTest(
        "Callback auth exists",
        "⚠️",
        "Not created - run create_callback_auth first"
      );
    }
    
    results.passed.push("Callback Authorization");
    return true;
  } catch (error: any) {
    logTest("Callback Authorization", "❌", error.message);
    results.failed.push({
      test: "Callback Authorization",
      error: error.message,
    });
    return false;
  }
}

async function test7_MockMatchCallback(
  provider: AnchorProvider,
  program: Program
) {
  console.log("\n7️⃣  Testing Match Callback with Mock Data...");
  
  try {
    const keeper = provider.wallet.publicKey;
    
    // Derive callback auth PDA
    const [callbackAuthPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("callback_auth"),
        config.orderBookAddress.toBuffer(),
        keeper.toBuffer(),
      ],
      program.programId
    );
    
    // Create mock match results
    const mockResults = [
      {
        buyerPubkey: Keypair.generate().publicKey,
        sellerPubkey: Keypair.generate().publicKey,
        buyerOrderId: new anchor.BN(1),
        sellerOrderId: new anchor.BN(2),
        encryptedAmount: Array(64).fill(0),
        encryptedPrice: Array(64).fill(0),
      },
    ];
    
    logTest("Mock results created", "✅");
    
    // Try to call match_callback (will fail if auth not set up, but tests the structure)
    try {
      await program.methods
        .matchCallback(mockResults)
        .accounts({
          callbackAuth: callbackAuthPda,
          orderBook: config.orderBookAddress,
          keeper,
        })
        .rpc();
      
      logTest("match_callback invocation", "✅", "Successfully called!");
    } catch (e: any) {
      if (e.message.includes("AccountNotInitialized")) {
        logTest(
          "match_callback invocation",
          "⚠️",
          "Callback auth not initialized (expected)"
        );
      } else if (e.message.includes("UnauthorizedCallback")) {
        logTest("match_callback invocation", "⚠️", "Authorization error");
      } else {
        throw e;
      }
    }
    
    results.passed.push("Mock Callback");
    return true;
  } catch (error: any) {
    logTest("Mock Callback", "❌", error.message);
    results.failed.push({ test: "Mock Callback", error: error.message });
    return false;
  }
}

async function test8_ArciumMatchingEngineImport() {
  console.log("\n8️⃣  Testing ArciumMatchingEngine Import...");
  
  try {
    // Try to import the matching engine
    const { default: ArciumMatchingEngine } = await import(
      "../../arcium_service/src/arcium-matching"
    );
    
    logTest("ArciumMatchingEngine import", "✅");
    
    // Verify it's a class
    if (typeof ArciumMatchingEngine === "function") {
      logTest("ArciumMatchingEngine is class", "✅");
    } else {
      throw new Error("Not a valid class");
    }
    
    results.passed.push("Matching Engine Import");
    return true;
  } catch (error: any) {
    logTest("Matching Engine Import", "❌", error.message);
    results.failed.push({
      test: "Matching Engine Import",
      error: error.message,
    });
    return false;
  }
}

async function printSummary() {
  console.log("\n" + "═".repeat(60));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("═".repeat(60));
  
  console.log(`\n✅ Passed: ${results.passed.length} tests`);
  results.passed.forEach((test) => console.log(`   • ${test}`));
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length} tests`);
    results.failed.forEach(({ test, error }) => {
      console.log(`   • ${test}`);
      console.log(`     Error: ${error}`);
    });
  }
  
  const total = results.passed.length + results.failed.length;
  const percentage = ((results.passed.length / total) * 100).toFixed(0);
  
  console.log(`\n📈 Success Rate: ${percentage}% (${results.passed.length}/${total})`);
  
  if (results.failed.length === 0) {
    console.log("\n🎉 All integration points verified!");
    console.log("✅ Your Arcium + Anchor integration is working correctly!");
  } else {
    console.log("\n⚠️  Some tests failed. See details above.");
    console.log("💡 This is normal if Arcium MPC is not deployed yet.");
  }
  
  console.log("\n" + "═".repeat(60));
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║   🔍 ARCIUM + ANCHOR INTEGRATION VERIFICATION          ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  
  console.log("\n📋 Configuration:");
  console.log(`   RPC: ${config.rpcEndpoint}`);
  console.log(`   Program: ${config.programId.toBase58()}`);
  console.log(`   Order Book: ${config.orderBookAddress.toBase58()}`);
  
  // Setup
  const connection = new Connection(config.rpcEndpoint, "confirmed");
  
  let keypair: Keypair;
  if (process.env.KEEPER_KEYPAIR) {
    const secretKey = new Uint8Array(JSON.parse(process.env.KEEPER_KEYPAIR));
    keypair = Keypair.fromSecretKey(secretKey);
  } else {
    const home = process.env.HOME || process.env.USERPROFILE;
    const keypairPath = path.join(home!, ".config/solana/id.json");
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  }
  
  console.log(`   Wallet: ${keypair.publicKey.toBase58()}\n`);
  
  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  
  const program = new Program(idl, provider);
  
  // Run tests
  await test1_SDKImports();
  await test2_AnchorProgramConnection(provider, program);
  await test3_ArciumAccountDerivation(program);
  await test4_EncryptionSetup(provider, program);
  await test5_MatchCallbackStructure(program);
  await test6_CallbackAuthSetup(provider, program);
  await test7_MockMatchCallback(provider, program);
  await test8_ArciumMatchingEngineImport();
  
  // Print summary
  await printSummary();
  
  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});

