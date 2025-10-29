/**
 * SPL Token Utilities
 * 
 * Helper functions for working with SPL tokens and associated token accounts
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';

/**
 * Get or create an associated token account
 * Returns the ATA address and optionally adds create instruction to transaction
 */
export async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  payer: PublicKey,
  transaction?: Transaction
): Promise<PublicKey> {
  // Derive ATA address
  const ata = await getAssociatedTokenAddress(
    mint,
    owner,
    false, // allowOwnerOffCurve
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Check if ATA exists (only if we're not creating it)
  let accountExists = false;
  try {
    await getAccount(connection, ata, 'confirmed');
    accountExists = true;
  } catch (error) {
    // Account doesn't exist
    accountExists = false;
  }

  // If account doesn't exist and we have a transaction, add create instruction
  if (!accountExists && transaction) {
    const createInstruction = createAssociatedTokenAccountInstruction(
      payer, // payer
      ata, // ata
      owner, // owner
      mint, // mint
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    transaction.add(createInstruction);
    console.log(`Will create token account: ${ata.toString()}`);
  }

  return ata;
}

/**
 * Get token account balance
 */
export async function getTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<bigint> {
  try {
    const account = await getAccount(connection, tokenAccount);
    return account.amount;
  } catch (error) {
    // Token account doesn't exist yet, return 0
    return BigInt(0);
  }
}

/**
 * Check if token account exists
 */
export async function tokenAccountExists(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<boolean> {
  try {
    await getAccount(connection, tokenAccount);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(
  amount: bigint | number,
  decimals: number
): string {
  const amountNum = typeof amount === 'bigint' ? Number(amount) : amount;
  return (amountNum / Math.pow(10, decimals)).toFixed(decimals);
}

/**
 * Parse token amount from string to smallest unit
 */
export function parseTokenAmount(
  amount: string,
  decimals: number
): bigint {
  const amountFloat = parseFloat(amount);
  if (isNaN(amountFloat) || amountFloat <= 0) {
    throw new Error('Invalid amount');
  }
  return BigInt(Math.floor(amountFloat * Math.pow(10, decimals)));
}

