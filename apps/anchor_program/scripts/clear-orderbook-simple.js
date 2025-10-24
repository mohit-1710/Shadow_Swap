const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const fs = require('fs');
const os = require('os');

async function main() {
  console.log('🧹 Clearing orderbook...\n');

  // Setup
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const keypairPath = `${os.homedir()}/.config/solana/id.json`;
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
  
  console.log(`👤 Wallet: ${keypair.publicKey.toString()}\n`);
  
  // Load program
  const programId = new PublicKey('DcCs5AEhd6Sx5opAjhkpNUtNSQwQf7GV3UU7JsfxcvXu');
  const idl = JSON.parse(fs.readFileSync(__dirname + '/../target/idl/shadow_swap.json'));
  
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new anchor.Program(idl, programId, provider);
  
  // Get order discriminator
  const orderDiscriminator = Buffer.from([0x76, 0x10, 0x83, 0x97, 0x07, 0x44, 0xf5, 0x1b]); // "order" account discriminator
  
  // Fetch all program accounts manually
  console.log('📥 Fetching all order accounts...');
  const accounts = await connection.getProgramAccounts(programId, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: anchor.utils.bytes.bs58.encode(orderDiscriminator),
        },
      },
    ],
  });
  
  console.log(`   Found ${accounts.length} orders\n`);
  
  if (accounts.length === 0) {
    console.log('✅ Orderbook is already empty!');
    return;
  }
  
  let cancelled = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const { pubkey, account } of accounts) {
    const orderAddr = pubkey.toString();
    
    // Owner is at offset 8 (after discriminator)
    const owner = new PublicKey(account.data.slice(8, 40));
    
    // Only cancel if we own it
    if (owner.toString() !== keypair.publicKey.toString()) {
      console.log(`⏭️  Skipped (not owner): ${orderAddr.substring(0, 8)}...`);
      skipped++;
      continue;
    }
    
    try {
      const tx = await program.methods
        .cancelOrder()
        .accounts({
          order: pubkey,
          authority: keypair.publicKey,
        })
        .rpc();
      
      console.log(`✅ Cancelled: ${orderAddr.substring(0, 8)}... (tx: ${tx.substring(0, 8)}...)`);
      cancelled++;
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      const errMsg = error.message || error.toString();
      console.log(`❌ Failed: ${orderAddr.substring(0, 8)}... - ${errMsg.substring(0, 50)}`);
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
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

