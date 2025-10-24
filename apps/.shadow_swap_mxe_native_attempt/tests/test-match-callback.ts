/**
 * Test Match Callback
 * 
 * This test simulates Arcium MPC calling the match_callback function
 * with sample match results.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ShadowSwap } from "../target/types/shadow_swap";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";

describe("Match Callback Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ShadowSwap as Program<ShadowSwap>;

  let baseMint: PublicKey;
  let quoteMint: PublicKey;
  let orderBookPda: PublicKey;
  let callbackAuthPda: PublicKey;
  let keeper: Keypair;
  let userA: Keypair;
  let userB: Keypair;
  let feeCollector: Keypair;

  // Helper function to derive order PDA
  function deriveOrderPda(orderBookAddress: PublicKey, orderCount: number): [PublicKey, number] {
    const orderCountBuffer = Buffer.alloc(8);
    orderCountBuffer.writeBigUInt64LE(BigInt(orderCount));
    
    return PublicKey.findProgramAddressSync(
      [Buffer.from("order"), orderBookAddress.toBuffer(), orderCountBuffer],
      program.programId
    );
  }

  // Helper function to derive callback auth PDA
  function deriveCallbackAuthPda(
    orderBookAddress: PublicKey,
    keeperAddress: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("callback_auth"), orderBookAddress.toBuffer(), keeperAddress.toBuffer()],
      program.programId
    );
  }

  before(async () => {
    console.log("\n🔧 Setting up test environment...\n");

    userA = Keypair.generate();
    userB = Keypair.generate();
    keeper = Keypair.generate();
    feeCollector = Keypair.generate();

    // Airdrop SOL
    const airdropAmount = 5 * LAMPORTS_PER_SOL;
    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(userA.publicKey, airdropAmount)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(userB.publicKey, airdropAmount)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(keeper.publicKey, airdropAmount)
      ),
    ]);

    // Create mints
    baseMint = await createMint(
      provider.connection,
      userA,
      userA.publicKey,
      null,
      9
    );

    quoteMint = await createMint(
      provider.connection,
      userA,
      userA.publicKey,
      null,
      6
    );

    // Derive order book PDA
    [orderBookPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("order_book"), baseMint.toBuffer(), quoteMint.toBuffer()],
      program.programId
    );

    // Initialize order book
    await program.methods
      .initializeOrderBook(baseMint, quoteMint, 30, new anchor.BN(100000))
      .accounts({
        orderBook: orderBookPda,
        authority: provider.wallet.publicKey,
        feeCollector: feeCollector.publicKey,
        baseMint: baseMint,
        quoteMint: quoteMint,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Create callback auth
    [callbackAuthPda] = deriveCallbackAuthPda(orderBookPda, keeper.publicKey);
    const expiresAt = new anchor.BN(Date.now() / 1000 + 86400); // 24 hours

    await program.methods
      .createCallbackAuth(expiresAt)
      .accounts({
        orderBook: orderBookPda,
        callbackAuth: callbackAuthPda,
        authority: provider.wallet.publicKey,
        keeper: keeper.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Setup complete!");
    console.log("   Order Book:", orderBookPda.toString());
    console.log("   Callback Auth:", callbackAuthPda.toString());
    console.log("   Keeper:", keeper.publicKey.toString());
  });

  it("Successfully calls match_callback with sample results", async () => {
    console.log("\n🧪 Testing match_callback...\n");

    // Create sample match results (simulating Arcium MPC output)
    const matchResults = [
      {
        buyerPubkey: deriveOrderPda(orderBookPda, 0)[0],
        sellerPubkey: deriveOrderPda(orderBookPda, 1)[0],
        buyerOrderId: new anchor.BN(0),
        sellerOrderId: new anchor.BN(1),
        encryptedAmount: Buffer.from(new Uint8Array(64).fill(1)), // Mock encrypted amount
        encryptedPrice: Buffer.from(new Uint8Array(64).fill(2)),  // Mock encrypted price
      },
    ];

    console.log("📊 Match Results:");
    console.log("   Buyer Order:", matchResults[0].buyerPubkey.toString());
    console.log("   Seller Order:", matchResults[0].sellerPubkey.toString());

    // Call match_callback
    const tx = await program.methods
      .matchCallback(matchResults)
      .accounts({
        callbackAuth: callbackAuthPda,
        orderBook: orderBookPda,
        keeper: keeper.publicKey,
      })
      .signers([keeper])
      .rpc();

    console.log("\n✅ Match callback successful!");
    console.log("   Transaction:", tx);
    console.log("   View on Explorer:");
    console.log("   https://explorer.solana.com/tx/" + tx + "?cluster=devnet");

    // Verify transaction succeeded
    const txDetails = await provider.connection.getTransaction(tx, {
      maxSupportedTransactionVersion: 0,
    });
    
    assert.isNotNull(txDetails, "Transaction should exist");
    assert.isNull(txDetails!.meta!.err, "Transaction should not have errors");

    console.log("\n🎉 Test passed! Callback works correctly.");
  });

  it("Rejects callback from unauthorized keeper", async () => {
    console.log("\n🧪 Testing unauthorized callback rejection...\n");

    const unauthorizedKeeper = Keypair.generate();

    // Airdrop for gas
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        unauthorizedKeeper.publicKey,
        LAMPORTS_PER_SOL
      )
    );

    const matchResults = [
      {
        buyerPubkey: deriveOrderPda(orderBookPda, 0)[0],
        sellerPubkey: deriveOrderPda(orderBookPda, 1)[0],
        buyerOrderId: new anchor.BN(0),
        sellerOrderId: new anchor.BN(1),
        encryptedAmount: Buffer.from(new Uint8Array(64)),
        encryptedPrice: Buffer.from(new Uint8Array(64)),
      },
    ];

    try {
      await program.methods
        .matchCallback(matchResults)
        .accounts({
          callbackAuth: callbackAuthPda,
          orderBook: orderBookPda,
          keeper: unauthorizedKeeper.publicKey,
        })
        .signers([unauthorizedKeeper])
        .rpc();

      assert.fail("Should have failed with unauthorized error");
    } catch (error: any) {
      console.log("✅ Correctly rejected unauthorized keeper");
      assert.include(error.toString(), "ConstraintSeeds", "Should fail with constraint error");
    }
  });

  it("Handles multiple matches in one callback", async () => {
    console.log("\n🧪 Testing multiple matches...\n");

    // Create multiple match results
    const matchResults = [
      {
        buyerPubkey: deriveOrderPda(orderBookPda, 0)[0],
        sellerPubkey: deriveOrderPda(orderBookPda, 1)[0],
        buyerOrderId: new anchor.BN(0),
        sellerOrderId: new anchor.BN(1),
        encryptedAmount: Buffer.from(new Uint8Array(64).fill(1)),
        encryptedPrice: Buffer.from(new Uint8Array(64).fill(2)),
      },
      {
        buyerPubkey: deriveOrderPda(orderBookPda, 2)[0],
        sellerPubkey: deriveOrderPda(orderBookPda, 3)[0],
        buyerOrderId: new anchor.BN(2),
        sellerOrderId: new anchor.BN(3),
        encryptedAmount: Buffer.from(new Uint8Array(64).fill(3)),
        encryptedPrice: Buffer.from(new Uint8Array(64).fill(4)),
      },
    ];

    console.log("📊 Processing", matchResults.length, "matches");

    const tx = await program.methods
      .matchCallback(matchResults)
      .accounts({
        callbackAuth: callbackAuthPda,
        orderBook: orderBookPda,
        keeper: keeper.publicKey,
      })
      .signers([keeper])
      .rpc();

    console.log("✅ Multiple matches processed!");
    console.log("   Transaction:", tx);

    // Verify transaction
    const txDetails = await provider.connection.getTransaction(tx, {
      maxSupportedTransactionVersion: 0,
    });
    
    assert.isNotNull(txDetails);
    assert.isNull(txDetails!.meta!.err);

    console.log("🎉 Multiple match test passed!");
  });
});

