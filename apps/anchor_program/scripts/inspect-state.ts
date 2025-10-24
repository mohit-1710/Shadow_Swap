/**
 * ShadowSwap State Inspector
 * 
 * Utility script to inspect the on-chain state of the ShadowSwap program.
 * Displays OrderBook, CallbackAuth, and all EncryptedOrder accounts.
 * 
 * Usage:
 *   ts-node scripts/inspect-state.ts
 */

import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration from environment or defaults
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = process.env.PROGRAM_ID || 'DcCs5AEhd6Sx5opAjhkpNUtNSQwQf7GV3UU7JsfxcvXu';
const ORDER_BOOK_PUBKEY = process.env.ORDER_BOOK_PUBKEY || 'J5NkY5hUS1DoMYXtyMt4dY87RFkbS7MD4eTH7YeKY8dn';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(title: string) {
  console.log('\n' + colorize('='.repeat(60), 'bright'));
  console.log(colorize(`  ${title}`, 'bright'));
  console.log(colorize('='.repeat(60), 'bright') + '\n');
}

function printSection(title: string) {
  console.log(colorize(`\n${title}:`, 'cyan'));
  console.log(colorize('-'.repeat(title.length + 1), 'cyan'));
}

async function main() {
  console.clear();
  printHeader('ShadowSwap State Inspector');

  // Initialize connection
  console.log(colorize('📡 Connecting to Solana...', 'blue'));
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Load wallet
  const walletPath = process.env.ANCHOR_WALLET || path.join(
    require('os').homedir(),
    '.config',
    'solana',
    'id.json'
  );
  
  let wallet: anchor.Wallet;
  try {
    const keypairData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    const keypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(keypairData));
    wallet = new anchor.Wallet(keypair);
  } catch (err) {
    console.error(colorize('❌ Error loading wallet:', 'red'), err);
    process.exit(1);
  }

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  // Load program
  let program: anchor.Program;
  try {
    const idlPath = path.join(__dirname, '..', 'target', 'idl', 'shadow_swap.json');
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
    program = new anchor.Program(
      idl,
      new PublicKey(PROGRAM_ID),
      provider
    );
  } catch (err) {
    console.error(colorize('❌ Error loading program:', 'red'), err);
    process.exit(1);
  }

  console.log(colorize('✅ Connected successfully\n', 'green'));
  console.log(`${colorize('RPC URL:', 'bright')}        ${RPC_URL}`);
  console.log(`${colorize('Program ID:', 'bright')}     ${PROGRAM_ID}`);
  console.log(`${colorize('Order Book:', 'bright')}     ${ORDER_BOOK_PUBKEY}`);
  console.log(`${colorize('Wallet:', 'bright')}         ${wallet.publicKey.toString()}`);

  // ======================
  // 1. OrderBook
  // ======================
  printSection('📖 Order Book');
  try {
    const orderBook = await program.account.orderBook.fetch(
      new PublicKey(ORDER_BOOK_PUBKEY)
    );
    
    console.log(`  ${colorize('Authority:', 'bright')}           ${(orderBook as any).authority.toString()}`);
    console.log(`  ${colorize('Base Mint:', 'bright')}           ${(orderBook as any).baseMint.toString()}`);
    console.log(`  ${colorize('Quote Mint:', 'bright')}          ${(orderBook as any).quoteMint.toString()}`);
    console.log(`  ${colorize('Order Count:', 'bright')}         ${(orderBook as any).orderCount.toString()}`);
    console.log(`  ${colorize('Fee (bps):', 'bright')}           ${(orderBook as any).feeBps}`);
    console.log(`  ${colorize('Min Base Order Size:', 'bright')} ${(orderBook as any).minBaseOrderSize.toString()}`);
  } catch (err: any) {
    console.log(colorize(`  ❌ Error fetching order book: ${err.message}`, 'red'));
  }

  // ======================
  // 2. CallbackAuth
  // ======================
  printSection('🔐 Callback Authorization');
  try {
    const [callbackAuthPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('callback_auth'),
        new PublicKey(ORDER_BOOK_PUBKEY).toBuffer(),
        wallet.publicKey.toBuffer(),
      ],
      program.programId
    );
    
    const callbackAuth = await program.account.callbackAuth.fetch(callbackAuthPda);
    
    console.log(`  ${colorize('PDA:', 'bright')}         ${callbackAuthPda.toString()}`);
    console.log(`  ${colorize('Authority:', 'bright')}   ${(callbackAuth as any).authority.toString()}`);
    console.log(`  ${colorize('Order Book:', 'bright')}  ${(callbackAuth as any).orderBook.toString()}`);
    console.log(`  ${colorize('Keeper:', 'bright')}      ${(callbackAuth as any).keeper.toString()}`);
    console.log(`  ${colorize('Expires At:', 'bright')}  ${new Date((callbackAuth as any).expiresAt.toNumber() * 1000).toLocaleString()}`);
    console.log(`  ${colorize('Created At:', 'bright')}  ${new Date((callbackAuth as any).createdAt.toNumber() * 1000).toLocaleString()}`);
  } catch (err: any) {
    console.log(colorize(`  ❌ Error fetching callback auth: ${err.message}`, 'red'));
  }

  // ======================
  // 3. All Orders
  // ======================
  printSection('📝 Encrypted Orders');
  try {
    const orders = await program.account.encryptedOrder.all();
    
    if (orders.length === 0) {
      console.log(colorize('  📭 No orders found', 'yellow'));
    } else {
      console.log(`  ${colorize(`Found ${orders.length} order(s)`, 'green')}\n`);
      
      orders.forEach((order, idx) => {
        const account = order.account as any;
        const status = ['Active', 'Filled', 'Cancelled', 'Executed', 'Partial'][account.status] || 'Unknown';
        const statusColor = account.status === 0 ? 'green' : account.status === 3 ? 'blue' : 'yellow';
        
        console.log(colorize(`  Order ${idx + 1}:`, 'bright'));
        console.log(`    ${colorize('Address:', 'bright')}      ${order.publicKey.toString()}`);
        console.log(`    ${colorize('Owner:', 'bright')}        ${account.owner.toString()}`);
        console.log(`    ${colorize('Order ID:', 'bright')}     ${account.orderId.toString()}`);
        console.log(`    ${colorize('Status:', 'bright')}       ${colorize(status, statusColor)} (${account.status})`);
        console.log(`    ${colorize('Order Book:', 'bright')}   ${account.orderBook.toString()}`);
        console.log(`    ${colorize('Escrow:', 'bright')}       ${account.escrow.toString()}`);
        console.log(`    ${colorize('Created At:', 'bright')}   ${new Date(account.createdAt.toNumber() * 1000).toLocaleString()}`);
        console.log(`    ${colorize('Cipher Size:', 'bright')}  ${account.cipher.length} bytes`);
        console.log('');
      });
    }
  } catch (err: any) {
    console.log(colorize(`  ❌ Error fetching orders: ${err.message}`, 'red'));
  }

  // ======================
  // Summary
  // ======================
  printSection('📊 Summary');
  try {
    const orders = await program.account.encryptedOrder.all();
    const activeOrders = orders.filter((o) => (o.account as any).status === 0);
    const executedOrders = orders.filter((o) => (o.account as any).status === 3);
    const cancelledOrders = orders.filter((o) => (o.account as any).status === 2);
    
    console.log(`  ${colorize('Total Orders:', 'bright')}      ${orders.length}`);
    console.log(`  ${colorize('Active:', 'green')}            ${activeOrders.length}`);
    console.log(`  ${colorize('Executed:', 'blue')}          ${executedOrders.length}`);
    console.log(`  ${colorize('Cancelled:', 'yellow')}        ${cancelledOrders.length}`);
  } catch (err: any) {
    console.log(colorize(`  ❌ Error generating summary: ${err.message}`, 'red'));
  }

  printHeader('Inspection Complete');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(colorize('\n❌ Fatal Error:', 'red'), err);
    process.exit(1);
  });

