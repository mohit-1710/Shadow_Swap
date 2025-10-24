/**
 * Arcium SDK Client for secure MPC decryption
 * 
 * This module handles all interactions with the Arcium MPC network
 * for secure decryption of encrypted orders.
 */

import { ArciumDecryptResponse } from './types';

/**
 * Arcium client configuration
 */
interface ArciumConfig {
  mpcUrl: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Arcium MPC Client for decryption operations
 */
export class ArciumClient {
  private config: ArciumConfig;
  protected authToken?: string;

  constructor(config: ArciumConfig) {
    this.config = config;
  }

  /**
   * Initialize the Arcium client and authenticate
   */
  async initialize(): Promise<void> {
    console.log('🔐 Initializing Arcium MPC client...');
    
    try {
      // Authenticate with Arcium MPC network
      const authResponse = await fetch(`${this.config.mpcUrl}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
        }),
      });

      if (!authResponse.ok) {
        throw new Error(`Arcium authentication failed: ${authResponse.statusText}`);
      }

      const authData = await authResponse.json();
      this.authToken = authData.token;

      console.log('✅ Arcium MPC client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Arcium client:', error);
      throw error;
    }
  }

  /**
   * Decrypt an encrypted order payload using Arcium MPC
   * 
   * The decryption happens in a distributed manner across the Arcium MPC network.
   * No single party sees the plaintext data.
   * 
   * @param ciphertext - The encrypted order payload
   * @param nonce - Optional nonce for the decryption
   * @returns Decrypted plaintext order data
   */
  async decryptOrder(
    ciphertext: Buffer,
    nonce?: string
  ): Promise<ArciumDecryptResponse> {
    if (!this.authToken) {
      throw new Error('Arcium client not initialized. Call initialize() first.');
    }

    try {
      // Call Arcium MPC network for decryption
      const response = await fetch(`${this.config.mpcUrl}/compute/decrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          ciphertext: ciphertext.toString('base64'),
          nonce: nonce || '',
          computationType: 'order_decryption',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          plaintext: '',
          nonce: '',
          error: errorData.message || 'Decryption failed',
        };
      }

      const data = await response.json();
      return {
        plaintext: data.plaintext,
        nonce: data.nonce,
      };
    } catch (error) {
      console.error('Error decrypting with Arcium MPC:', error);
      return {
        plaintext: '',
        nonce: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Batch decrypt multiple orders
   * 
   * @param ciphertexts - Array of encrypted payloads
   * @returns Array of decrypted responses
   */
  async decryptBatch(ciphertexts: Buffer[]): Promise<ArciumDecryptResponse[]> {
    console.log(`🔓 Decrypting ${ciphertexts.length} orders via Arcium MPC...`);

    const results: ArciumDecryptResponse[] = [];

    // Process decryptions in parallel (with reasonable concurrency limit)
    const batchSize = 10;
    for (let i = 0; i < ciphertexts.length; i += batchSize) {
      const batch = ciphertexts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(ciphertext => this.decryptOrder(ciphertext))
      );
      results.push(...batchResults);
    }

    const successCount = results.filter(r => !r.error).length;
    console.log(`✅ Successfully decrypted ${successCount}/${ciphertexts.length} orders`);

    return results;
  }

  /**
   * Verify the decryption proof (for additional security)
   * 
   * @param plaintext - Decrypted data
   * @param proof - Proof from Arcium MPC
   * @returns Whether the proof is valid
   */
  async verifyDecryptionProof(
    plaintext: string,
    proof: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.mpcUrl}/verify/decryption`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          plaintext,
          proof,
        }),
      });

      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('Error verifying decryption proof:', error);
      return false;
    }
  }

}

/**
 * Mock Arcium client for testing without actual MPC network
 */
export class MockArciumClient extends ArciumClient {
  async initialize(): Promise<void> {
    console.log('🧪 Mock Arcium client initialized (testing mode)');
    this.authToken = 'mock-token';
  }

  async decryptOrder(ciphertext: Buffer): Promise<ArciumDecryptResponse> {
    // For testing: simulate decryption by deserializing the binary format
    // In production, this would be handled by the real Arcium MPC network
    
    try {
      // The frontend sends binary serialized data:
      // Bytes 0-3:   side (u32, little-endian)
      // Bytes 4-11:  amount (u64, little-endian)
      // Bytes 12-19: price (u64, little-endian)
      // Bytes 20-23: timestamp (u32, little-endian)
      
      if (ciphertext.length < 24) {
        throw new Error('Cipher too short - expected at least 24 bytes');
      }
      
      // Read binary fields
      const side = ciphertext.readUInt32LE(0);
      const amount = ciphertext.readBigUInt64LE(4);
      const price = ciphertext.readBigUInt64LE(12);
      const timestamp = ciphertext.readUInt32LE(20);
      
      // Validate side (0 = buy, 1 = sell)
      if (side !== 0 && side !== 1) {
        throw new Error(`Invalid side: ${side}`);
      }
      
      // Convert to JSON format for the bot's matching logic
      const orderData = {
        side,
        amount: amount.toString(), // Convert BigInt to string for JSON
        price: price.toString(),
        timestamp,
      };
      
      return {
        plaintext: JSON.stringify(orderData),
        nonce: 'mock-nonce',
      };
    } catch (error) {
      return {
        plaintext: '',
        nonce: '',
        error: `Mock decryption failed: ${error instanceof Error ? error.message : 'invalid format'}`,
      };
    }
  }
}

