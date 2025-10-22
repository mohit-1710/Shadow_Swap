/**
 * ShadowSwap Shared Types
 * 
 * Common TypeScript types shared between frontend and settlement bot
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Order status enum matching on-chain values
 */
export enum OrderStatus {
  Active = 1,
  PartiallyFilled = 2,
  Filled = 3,
  Cancelled = 4,
}

/**
 * Order side (buy/sell)
 */
export enum OrderSide {
  Buy = 'buy',
  Sell = 'sell',
}

/**
 * Decrypted order data (client-side only)
 */
export interface DecryptedOrder {
  side: OrderSide;
  price: number;
  amount: number;
  timestamp: number;
}

/**
 * Encrypted order data (as stored on-chain)
 */
export interface EncryptedOrderData {
  owner: PublicKey;
  orderBook: PublicKey;
  cipherPayload: Uint8Array;
  status: OrderStatus;
  encryptedRemaining: Uint8Array;
  escrow: PublicKey;
  createdAt: number;
  updatedAt: number;
  orderId: bigint;
  bump: number;
}

/**
 * Order book data
 */
export interface OrderBookData {
  authority: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  orderCount: bigint;
  activeOrders: bigint;
  encryptedVolumeBase: Uint8Array;
  encryptedVolumeQuote: Uint8Array;
  createdAt: number;
  lastTradeAt: number;
  feeBps: number;
  feeCollector: PublicKey;
  minBaseOrderSize: bigint;
  isActive: boolean;
  bump: number;
}

/**
 * Escrow account data
 */
export interface EscrowData {
  order: PublicKey;
  owner: PublicKey;
  orderBook: PublicKey;
  tokenAccount: PublicKey;
  tokenMint: PublicKey;
  encryptedAmount: Uint8Array;
  encryptedRemaining: Uint8Array;
  createdAt: number;
  bump: number;
}

/**
 * Callback auth data
 */
export interface CallbackAuthData {
  authority: PublicKey;
  orderBook: PublicKey;
  nonce: bigint;
  expiresAt: number;
  isActive: boolean;
  createdAt: number;
  bump: number;
}

/**
 * Trade match result
 */
export interface TradeMatch {
  buyOrder: PublicKey;
  sellOrder: PublicKey;
  price: number;
  amount: number;
  timestamp: number;
}

/**
 * Constants from on-chain program
 */
export const MAX_CIPHER_PAYLOAD_SIZE = 512;
export const MAX_ENCRYPTED_AMOUNT_SIZE = 64;
export const MAX_ENCRYPTED_VOLUME_SIZE = 64;

/**
 * PDA Seeds
 */
export const ORDER_BOOK_SEED = 'order_book';
export const ORDER_SEED = 'order';
export const ESCROW_SEED = 'escrow';
export const CALLBACK_AUTH_SEED = 'callback_auth';

