const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const fs = require('fs');
const os = require('os');

async function main() {
  console.log('🧹 Clearing orderbook...\n');

  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet
  const keypairPath = `${os.homedir()}/.config/solana/id.json`;
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
  const wallet = new anchor.Wallet(keypair);
  
  console.log(`👤 Wallet: ${wallet.publicKey.toString()}\n`);
  
  // Setup provider
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  anchor.setProvider(provider);
  
  // Load program
  const programId = new PublicKey('DcCs5AEhd6Sx5opAjhkpNUtNSQwQf7GV3UU7JsfxcvXu');
  const idl = JSON.parse(fs.readFileSync(__dirname + '/../target/idl/shadow_swap.json'));
  const program = new anchor.Program(idl, programId);
  
  // Fetch all orders
  console.log('📥 Fetching all orders...');
  const allOrders = await program.account.encryptedOrder.all();
  console.log(`   Found ${allOrders.length} orders\n`);
  
  if (allOrders.length === 0) {
    console.log('✅ Orderbook is already empty!');
    return;
  }
  
  let cancelled = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const order of allOrders) {
    const orderAddr = order.publicKey.toString();
    const owner = order.account.owner.toString();
    
    // Only cancel if we own it
    if (owner !== wallet.publicKey.toString()) {
      console.log(`⏭️  Skipped (not owner): ${orderAddr.substring(0, 8)}...`);
      skipped++;
      continue;
    }
    
    try {
      const tx = await program.methods
        .cancelOrder()
        .accounts({
          order: order.publicKey,
          authority: wallet.publicKey,
        })
        .rpc();
      
      console.log(`✅ Cancelled: ${orderAddr.substring(0, 8)}... (tx: ${tx.substring(0, 8)}...)`);
      cancelled++;
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`❌ Failed: ${orderAddr.substring(0, 8)}... - ${error.message.substring(0, 60)}`);
      failed++;
    }
  }
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Summary:`);
  console.log(`   ✅ Cancelled: ${cancelled}`);
  console.log(`   ⏭️  Skipped:   ${skipped}`);
  console.log(`   ❌ Failed:    ${failed}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  if (cancelled > 0) {
    console.log('✨ Orderbook cleared! Ready for fresh testing.\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });

