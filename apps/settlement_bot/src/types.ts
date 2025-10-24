/**
 * Type definitions for ShadowSwap Keeper Bot
 */

import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Encrypted order as stored on-chain
 */
export interface EncryptedOrder {
  owner: PublicKey;
  orderBook: PublicKey;
  cipherPayload: Buffer;
  status: number;
  encryptedRemaining: Buffer;
  escrow: PublicKey;
  createdAt: BN;
  updatedAt: BN;
  orderId: BN;
  bump: number;
}

/**
 * Decrypted order with plaintext values
 */
export interface PlainOrder {
  publicKey: PublicKey;
  owner: PublicKey;
  orderBook: PublicKey;
  side: 0 | 1 | 'buy' | 'sell';  // 0 = buy, 1 = sell (from binary) OR 'buy'/'sell' (strings)
  price: number;
  amount: number;
  remainingAmount: number;
  escrow: PublicKey;
  createdAt: number;
  orderId: number;
  status: number;
}

/**
 * Match result to submit on-chain
 */
export interface MatchResultInput {
  buyerPubkey: PublicKey;
  sellerPubkey: PublicKey;
  matchedAmount: BN;
  executionPrice: BN;
}

/**
 * Matched pair with all details
 */
export interface MatchedPair {
  buyOrder: PlainOrder;
  sellOrder: PlainOrder;
  matchedAmount: number;
  executionPrice: number;
}

/**
 * Order status constants
 */
export enum OrderStatus {
  ACTIVE = 1,
  PARTIAL = 2,
  FILLED = 3,
  CANCELLED = 4,
  MATCHED_PENDING = 5,
}

/**
 * Bot configuration
 */
export interface KeeperConfig {
  // Solana connection
  rpcUrl: string;
  wssUrl?: string;
  
  // Program
  programId: string;
  orderBookPubkey: string;
  
  // Keeper credentials
  keeperKeypairPath: string;
  
  // Arcium SDK
  arciumMpcUrl: string;
  arciumClientId: string;
  arciumClientSecret: string;
  
  // Sanctum Gateway
  sanctumGatewayUrl: string;
  sanctumApiKey: string;
  
  // Bot behavior
  matchInterval: number; // milliseconds
  maxRetries: number;
  retryDelayMs: number;
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Sanctum transaction submission response
 */
export interface SanctumSubmitResponse {
  signature?: string;
  error?: string;
}

/**
 * Arcium decryption response
 */
export interface ArciumDecryptResponse {
  plaintext: string;
  nonce: string;
  error?: string;
}

