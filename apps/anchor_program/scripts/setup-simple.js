/**
 * Simple setup script for ShadowSwap on Devnet
 */

const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

const PROGRAM_ID = "DcCs5AEhd6Sx5opAjhkpNUtNSQwQf7GV3UU7JsfxcvXu";
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

async function main() {
  console.log("\n🚀 ShadowSwap Devnet Setup\n");

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync(path.join(__dirname, "../target/idl/shadow_swap.json"), "utf8"));
  const program = new anchor.Program(idl, provider);

  console.log(`Program ID: ${program.programId.toString()}`);
  console.log(`Wallet: ${provider.wallet.publicKey.toString()}\n`);

  const [orderBook] = PublicKey.findProgramAddressSync(
    [Buffer.from("order_book"), SOL_MINT.toBuffer(), USDC_MINT.toBuffer()],
    program.programId
  );

  console.log(`Order Book PDA: ${orderBook.toString()}`);

  try {
    const ob = await program.account.orderBook.fetch(orderBook);
    console.log("\n✅ Order book already exists!");
    console.log(`   Active Orders: ${ob.activeOrders.toString()}`);
  } catch {
    console.log("\n📦 Initializing order book...");
    const tx = await program.methods
      .initializeOrderBook(SOL_MINT, USDC_MINT, 30, new anchor.BN(1_000_000))
      .accounts({
        authority: provider.wallet.publicKey,
        feeCollector: provider.wallet.publicKey,
        baseMint: SOL_MINT,
        quoteMint: USDC_MINT,
      })
      .rpc();
    console.log(`✅ Initialized! TX: ${tx}`);
    await provider.connection.confirmTransaction(tx);
  }

  const keeperPubkey = provider.wallet.publicKey;
  const [callbackAuth] = PublicKey.findProgramAddressSync(
    [Buffer.from("callback_auth"), orderBook.toBuffer(), keeperPubkey.toBuffer()],
    program.programId
  );

  console.log(`\nCallback Auth PDA: ${callbackAuth.toString()}`);

  try {
    await program.account.callbackAuth.fetch(callbackAuth);
    console.log("✅ Callback auth already exists!");
  } catch {
    console.log("🔐 Creating callback auth...");
    const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60));
    const tx = await program.methods
      .createCallbackAuth(expiresAt)
      .accounts({
        orderBook,
        authority: provider.wallet.publicKey,
        keeper: keeperPubkey,
      })
      .rpc();
    console.log(`✅ Created! TX: ${tx}`);
    await provider.connection.confirmTransaction(tx);
  }

  const envContent = `# ShadowSwap Devnet Configuration
RPC_URL=https://api.devnet.solana.com
WSS_URL=wss://api.devnet.solana.com
PROGRAM_ID=${PROGRAM_ID}
ORDER_BOOK_PUBKEY=${orderBook.toString()}
KEEPER_KEYPAIR_PATH=~/.config/solana/id.json
ARCIUM_MPC_URL=https://mpc.arcium.com
ARCIUM_CLIENT_ID=test
ARCIUM_CLIENT_SECRET=test
SANCTUM_GATEWAY_URL=https://gateway.sanctum.so
SANCTUM_API_KEY=test
MATCH_INTERVAL=10000
MAX_RETRIES=3
RETRY_DELAY_MS=1000
USE_MOCK_ARCIUM=true
USE_MOCK_SANCTUM=true
LOG_LEVEL=info
`;

  fs.writeFileSync(path.join(__dirname, "../../settlement_bot/.env"), envContent);
  console.log("\n✅ .env file created in apps/settlement_bot/\n");
  console.log("🎉 Setup complete! Run: cd apps/settlement_bot && yarn dev\n");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

