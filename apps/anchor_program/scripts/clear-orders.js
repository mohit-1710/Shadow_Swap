/**
 * Clear all orders from orderbook
 */

const anchor = require("@coral-xyz/anchor");
const { PublicKey, Connection } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

const PROGRAM_ID = "DcCs5AEhd6Sx5opAjhkpNUtNSQwQf7GV3UU7JsfxcvXu";

async function main() {
  console.log("\n🧹 Clearing Orderbook\n");

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync(path.join(__dirname, "../target/idl/shadow_swap.json"), "utf8"));
  const program = new anchor.Program(idl, provider);

  console.log(`Program ID: ${program.programId.toString()}`);
  console.log(`Wallet: ${provider.wallet.publicKey.toString()}\n`);

  // Fetch all order accounts
  console.log("📥 Fetching all orders...");
  const connection = provider.connection;
  
  // Get order discriminator (first 8 bytes of account for EncryptedOrder type)
  const orderAccounts = await connection.getProgramAccounts(new PublicKey(PROGRAM_ID), {
    filters: [
      {
        // Filter for accounts owned by our wallet (offset 8, 32 bytes for owner pubkey)
        memcmp: {
          offset: 8,
          bytes: provider.wallet.publicKey.toBase58(),
        },
      },
    ],
  });

  console.log(`   Found ${orderAccounts.length} orders owned by you\n`);

  if (orderAccounts.length === 0) {
    console.log("✅ No orders to cancel!\n");
    return;
  }

  let cancelled = 0;
  let failed = 0;

  for (const { pubkey } of orderAccounts) {
    try {
      const tx = await program.methods
        .cancelOrder()
        .accounts({
          order: pubkey,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      console.log(`✅ Cancelled: ${pubkey.toString().substring(0, 8)}... (tx: ${tx.substring(0, 8)}...)`);
      cancelled++;

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.log(`❌ Failed: ${pubkey.toString().substring(0, 8)}... - ${error.message.substring(0, 50)}`);
      failed++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Summary:`);
  console.log(`   ✅ Cancelled: ${cancelled}`);
  console.log(`   ❌ Failed:    ${failed}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (cancelled > 0) {
    console.log("✨ Orderbook cleared! Ready for fresh testing.\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });

