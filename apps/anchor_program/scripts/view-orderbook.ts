import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROGRAM_ID = "DcCs5AEhd6Sx5opAjhkpNUtNSQwQf7GV3UU7JsfxcvXu";
const ORDER_BOOK_PUBKEY = "J5NkY5hUS1DoMYXtyMt4dY87RFkbS7MD4eTH7YeKY8dn";
const RPC_URL = "https://api.devnet.solana.com";

async function viewOrderBook() {
  try {
    console.log("🔍 Fetching OrderBook...\n");

    const connection = new Connection(RPC_URL, "confirmed");
    const provider = new anchor.AnchorProvider(
      connection,
      {} as any,
      { commitment: "confirmed" }
    );

    // Load IDL
    const idlPath = path.join(__dirname, "../target/idl/shadow_swap.json");
    const idlData = fs.readFileSync(idlPath, "utf8");
    const idl = JSON.parse(idlData);
    const program = new anchor.Program(idl, provider);

    // Fetch orderbook account
    const orderBookPubkey = new PublicKey(ORDER_BOOK_PUBKEY);
    const orderBook = await (program.account as any).orderBook.fetch(orderBookPubkey);

    console.log("📖 ORDER BOOK DETAILS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Address:         ${ORDER_BOOK_PUBKEY}`);
    console.log(`Base Mint:       ${orderBook.baseMint.toString()}`);
    console.log(`Quote Mint:      ${orderBook.quoteMint.toString()}`);
    console.log(`Authority:       ${orderBook.authority.toString()}`);
    console.log(`Order Count:     ${orderBook.orderCount.toString()}`);
    console.log(`Min Base Size:   ${orderBook.minBaseOrderSize.toString()}`);
    console.log(`Fee Rate (bps):  ${orderBook.feeRateBps}`);
    console.log(`Active Orders:   ${orderBook.orderCount.toString()}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Fetch all orders
    console.log("📋 FETCHING ALL ORDERS...\n");
    const orders = await (program.account as any).encryptedOrder.all([
      {
        memcmp: {
          offset: 8 + 32, // After discriminator + owner
          bytes: orderBookPubkey.toBase58(),
        },
      },
    ]);

    if (orders.length === 0) {
      console.log("   No orders found yet.\n");
    } else {
      console.log(`   Found ${orders.length} order(s):\n`);
      
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const statusMap = ["Active", "Cancelled", "PartiallyFilled", "Executed"];
        const status = statusMap[order.account.status] || "Unknown";

        console.log(`   Order #${i + 1}:`);
        console.log(`   ├─ Address:   ${order.publicKey.toString()}`);
        console.log(`   ├─ Owner:     ${order.account.owner.toString()}`);
        console.log(`   ├─ Status:    ${status}`);
        console.log(`   ├─ Nonce:     ${order.account.nonce.toString()}`);
        console.log(`   ├─ Order ID:  ${order.account.orderId.toString()}`);
        console.log(`   ├─ Cipher:    ${Buffer.from(order.account.cipher).toString('base64').substring(0, 40)}...`);
        console.log(`   └─ Timestamp: ${new Date(order.account.timestamp.toNumber() * 1000).toISOString()}`);
        console.log();
      }
    }

    console.log("✅ Done!\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

viewOrderBook();

