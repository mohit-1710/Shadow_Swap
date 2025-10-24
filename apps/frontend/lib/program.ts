/**
 * Anchor Program Client Utilities
 * 
 * Helper functions for interacting with the ShadowSwap Anchor program
 */

import { PublicKey, Connection } from '@solana/web3.js';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import ShadowSwapIDL from '../idl/shadow_swap.json';

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
  const orderCountBuffer = Buffer.alloc(8);
  orderCountBuffer.writeBigUInt64LE(BigInt(orderCount.toString()));
  
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
 */
export async function fetchOrderCount(
  connection: Connection,
  orderBookAddress: PublicKey
): Promise<BN> {
  try {
    const accountInfo = await connection.getAccountInfo(orderBookAddress);
    
    if (!accountInfo) {
      throw new Error('Order book account not found');
    }
    
    // Parse order_count from account data
    // Assuming order_count is at offset 40 (after authority + base_mint + quote_mint)
    // Adjust based on your actual struct layout
    const offset = 40;
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
export function getProgram(
  connection: Connection,
  wallet: any
): Program<Idl> {
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: 'confirmed' }
  );
  
  // Set the program ID in the IDL object
  const idl = { ...ShadowSwapIDL } as Idl;
  
  return new Program(
    idl,
    provider
  );
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

