const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

const PROGRAM_ID = "D1gSf58XLm4VN5BqLai5d21fQngz4D7GWXZDPKieW7K";
const ORDER_BOOK_PUBKEY = "12N5FWVgKmZRNmhGsYuVcias1aLPtrnEk1GkQqmtwEv2";
const RPC_URL = "https://api.devnet.solana.com";

async function viewOrderBook() {
  try {
    console.log("🔍 Fetching OrderBook...\n");

    const connection = new Connection(RPC_URL, "confirmed");
    const provider = new anchor.AnchorProvider(
      connection,
      {},
      { commitment: "confirmed" }
    );

    // Load IDL
    const idlPath = path.join(__dirname, "../target/idl/shadow_swap.json");
    const idlData = fs.readFileSync(idlPath, "utf8");
    const idl = JSON.parse(idlData);
    const program = new anchor.Program(idl, provider);

    // Fetch orderbook account
    const orderBookPubkey = new PublicKey(ORDER_BOOK_PUBKEY);
    const orderBook = await program.account.orderBook.fetch(orderBookPubkey);

    console.log("📖 ORDER BOOK DETAILS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Address:         ${ORDER_BOOK_PUBKEY}`);
    console.log(`Base Mint:       ${orderBook.baseMint.toString()}`);
    console.log(`Quote Mint:      ${orderBook.quoteMint.toString()}`);
    console.log(`Authority:       ${orderBook.authority.toString()}`);
    console.log(`Order Count:     ${orderBook.orderCount.toString()}`);
    console.log(`Min Base Size:   ${orderBook.minBaseOrderSize.toString()}`);
    console.log(`Fee Rate (bps):  ${orderBook.feeRateBps}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Fetch all orders
    console.log("📋 FETCHING ALL ORDERS...\n");
    const orders = await program.account.encryptedOrder.all([
      {
        memcmp: {
          offset: 8 + 32, // After discriminator + owner
          bytes: orderBookPubkey.toBase58(),
        },
      },
    ]);

    if (orders.length === 0) {
      console.log("   ✅ No orders found yet. Ready for trading!\n");
    } else {
      console.log(`   Found ${orders.length} order(s):\n`);
      
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        // Status codes MUST match lib.rs constants
        const statusMap = {
          1: "Active",
          2: "Partial",
          3: "Filled",
          4: "Cancelled",
          5: "Matched Pending"
        };
        const status = statusMap[order.account.status] || `Unknown (${order.account.status})`;

        console.log(`   Order #${i + 1}:`);
        console.log(`   ├─ Address:   ${order.publicKey.toString()}`);
        console.log(`   ├─ Owner:     ${order.account.owner.toString()}`);
        console.log(`   ├─ Status:    ${status}`);
        console.log(`   ├─ Nonce:     ${order.account.nonce ? order.account.nonce.toString() : 'N/A'}`);
        console.log(`   ├─ Order ID:  ${order.account.orderId ? order.account.orderId.toString() : 'N/A'}`);
        
        if (order.account.cipher && order.account.cipher.length > 0) {
          const cipherPreview = Buffer.from(order.account.cipher).toString('base64').substring(0, 40);
          console.log(`   ├─ Cipher:    ${cipherPreview}...`);
        } else {
          console.log(`   ├─ Cipher:    (empty)`);
        }
        
        if (order.account.timestamp) {
          const timestamp = new Date(order.account.timestamp.toNumber() * 1000).toISOString();
          console.log(`   └─ Timestamp: ${timestamp}`);
        } else {
          console.log(`   └─ Timestamp: N/A`);
        }
        console.log();
      }
    }

    console.log("✅ Done!\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

viewOrderBook();

