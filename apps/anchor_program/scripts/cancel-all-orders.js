const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const fs = require('fs');
const os = require('os');

async function main() {
  console.log('🧹 Cancelling all old orders...\n');

  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet
  const keypairPath = `${os.homedir()}/.config/solana/id.json`;
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(new Uint8Array(secretKey)));
  
  // Setup provider
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  anchor.setProvider(provider);
  
  // Load program
  const programId = new PublicKey('DcCs5AEhd6Sx5opAjhkpNUtNSQwQf7GV3UU7JsfxcvXu');
  const idl = JSON.parse(fs.readFileSync(__dirname + '/../target/idl/shadow_swap.json'));
  const program = new anchor.Program(idl, programId, provider);
  
  // Fetch all orders
  console.log('📥 Fetching all orders...');
  const allOrders = await program.account.encryptedOrder.all();
  console.log(`   Found ${allOrders.length} orders\n`);
  
  let cancelled = 0;
  let failed = 0;
  
  for (const order of allOrders) {
    try {
      // Only cancel if owner matches
      if (order.account.owner.toString() === wallet.publicKey.toString()) {
        await program.methods
          .cancelOrder()
          .accounts({
            order: order.publicKey,
            authority: wallet.publicKey,
          })
          .rpc();
        
        console.log(`✅ Cancelled order: ${order.publicKey.toString()}`);
        cancelled++;
      } else {
        console.log(`⏭️  Skipped order (not owner): ${order.publicKey.toString()}`);
      }
    } catch (error) {
      console.log(`❌ Failed to cancel ${order.publicKey.toString()}: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Cancelled: ${cancelled}`);
  console.log(`   ❌ Failed:    ${failed}`);
  console.log(`   ⏭️  Skipped:   ${allOrders.length - cancelled - failed}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

