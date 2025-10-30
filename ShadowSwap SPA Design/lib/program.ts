/**
 * Anchor Program Client Utilities
 * 
 * Helper functions for interacting with the ShadowSwap Anchor program
 */

import { PublicKey, Connection } from '@solana/web3.js';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { loadShadowSwapIdl } from './shadowSwapIdlLoader';

/**
 * PDA derivation utilities matching the Anchor program
 */

/**
 * Derive Order PDA
 * Seeds: ["order", order_book, order_count]
 */
export function deriveOrderPda(
  orderBookAddress: PublicKey,
  orderCount: BN,
  programId: PublicKey
): [PublicKey, number] {
  // Use BN's toArrayLike method for better browser compatibility
  const orderCountBuffer = orderCount.toArrayLike(Buffer, 'le', 8);
  
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('order'),
      orderBookAddress.toBuffer(),
      orderCountBuffer,
    ],
    programId
  );
}

/**
 * Derive Escrow PDA
 * Seeds: ["escrow", order]
 */
export function deriveEscrowPda(
  orderAddress: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), orderAddress.toBuffer()],
    programId
  );
}

/**
 * Derive Escrow Token Account PDA
 * Seeds: ["escrow_token", order]
 */
export function deriveEscrowTokenAccountPda(
  orderAddress: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow_token'), orderAddress.toBuffer()],
    programId
  );
}

/**
 * Derive Order Book PDA
 * Seeds: ["order_book", base_mint, quote_mint]
 */
export function deriveOrderBookPda(
  baseMint: PublicKey,
  quoteMint: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('order_book'),
      baseMint.toBuffer(),
      quoteMint.toBuffer(),
    ],
    programId
  );
}

/**
 * Derive Callback Auth PDA
 * Seeds: ["callback_auth", order_book, keeper]
 */
export function deriveCallbackAuthPda(
  orderBookAddress: PublicKey,
  keeperAddress: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('callback_auth'),
      orderBookAddress.toBuffer(),
      keeperAddress.toBuffer(),
    ],
    programId
  );
}

/**
 * Fetch order count from OrderBook account
 * Note: This requires the program instance to properly deserialize the account
 */
export async function fetchOrderCount(
  connection: Connection,
  orderBookAddress: PublicKey,
  program?: any
): Promise<BN> {
  try {
    if (program) {
      // Use Anchor program to fetch and deserialize the order book account
      const orderBookAccount = await program.account.orderBook.fetch(orderBookAddress);
      return new BN(orderBookAccount.orderCount.toString());
    }
    
    // Fallback: manual parsing (less reliable)
    const accountInfo = await connection.getAccountInfo(orderBookAddress);
    
    if (!accountInfo) {
      throw new Error('Order book account not found');
    }
    
    // OrderBook struct layout:
    // discriminator (8) + authority (32) + base_mint (32) + quote_mint (32) = 104 bytes
    // Then order_count (u64 - 8 bytes) starts at offset 104
    const offset = 104;
    const orderCountBuffer = accountInfo.data.slice(offset, offset + 8);
    const orderCount = new BN(orderCountBuffer, 'le');
    
    return orderCount;
  } catch (error) {
    console.error('Error fetching order count:', error);
    return new BN(0);
  }
}

/**
 * Get program instance
 */
export async function getProgramAsync(
  connection: Connection,
  wallet: any
): Promise<Program<Idl>> {
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: 'confirmed' }
  );

  const idl = (await loadShadowSwapIdl()) as Idl;

  return new Program(idl, provider);
}

/**
 * Constants matching the Anchor program
 * MUST match the constants in lib.rs!
 */
export const ORDER_STATUS = {
  ACTIVE: 1,           // ORDER_STATUS_ACTIVE in Rust
  PARTIAL: 2,          // ORDER_STATUS_PARTIAL in Rust
  FILLED: 3,           // ORDER_STATUS_FILLED in Rust
  CANCELLED: 4,        // ORDER_STATUS_CANCELLED in Rust
  EXECUTED: 3,         // Same as FILLED
  MATCHED_PENDING: 5,  // ORDER_STATUS_MATCHED_PENDING in Rust
} as const;

export const MAX_CIPHER_PAYLOAD_SIZE = 512;
export const MAX_ENCRYPTED_AMOUNT_SIZE = 64;

