/**
 * Sanctum Gateway Client for MEV-protected transaction submission
 * 
 * Sanctum provides MEV protection by routing transactions through private mempools.
 */

import { Connection, Transaction, SendTransactionError } from '@solana/web3.js';
import { SanctumSubmitResponse } from './types';

/**
 * Sanctum Gateway configuration
 */
interface SanctumConfig {
  gatewayUrl: string;
  apiKey: string;
}

/**
 * Sanctum Gateway Client for submitting transactions with MEV protection
 */
export class SanctumClient {
  private config: SanctumConfig;

  constructor(config: SanctumConfig) {
    this.config = config;
  }

  /**
   * Submit a transaction through Sanctum Gateway with MEV protection
   * 
   * @param transaction - The signed transaction to submit
   * @param maxRetries - Maximum number of retry attempts
   * @returns Transaction signature or error
   */
  async submitTransaction(
    transaction: Transaction,
    maxRetries: number = 3
  ): Promise<SanctumSubmitResponse> {
    const serializedTx = transaction.serialize({
      requireAllSignatures: true,
      verifySignatures: true,
    });

    const base64Tx = serializedTx.toString('base64');

    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   📤 Submitting transaction (attempt ${attempt}/${maxRetries})...`);

        const response = await fetch(`${this.config.gatewayUrl}/transaction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            transaction: base64Tx,
            strategy: 'private_only', // MEV protection
            options: {
              skipPreflight: false,
              maxRetries: 3,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          lastError = errorData.error || errorData.message || response.statusText;
          console.warn(`   ⚠️  Attempt ${attempt} failed: ${lastError}`);
          
          if (attempt < maxRetries) {
            await this.sleep(1000 * attempt); // Exponential backoff
            continue;
          }
          
          return { error: lastError };
        }

        const data = await response.json();
        console.log(`   ✅ Transaction submitted: ${data.signature}`);
        
        return { signature: data.signature };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ❌ Attempt ${attempt} error:`, lastError);
        
        if (attempt < maxRetries) {
          await this.sleep(1000 * attempt);
          continue;
        }
      }
    }

    return { error: `Failed after ${maxRetries} attempts: ${lastError}` };
  }

  /**
   * Submit multiple transactions in batch
   * 
   * @param transactions - Array of signed transactions
   * @param maxRetries - Maximum retries per transaction
   * @returns Array of submission results
   */
  async submitBatch(
    transactions: Transaction[],
    maxRetries: number = 3
  ): Promise<SanctumSubmitResponse[]> {
    console.log(`📦 Submitting ${transactions.length} transactions via Sanctum...`);

    const results: SanctumSubmitResponse[] = [];

    // Submit transactions sequentially to avoid rate limits
    for (let i = 0; i < transactions.length; i++) {
      console.log(`\n📍 Transaction ${i + 1}/${transactions.length}:`);
      const result = await this.submitTransaction(transactions[i], maxRetries);
      results.push(result);

      // Small delay between submissions
      if (i < transactions.length - 1) {
        await this.sleep(500);
      }
    }

    const successCount = results.filter(r => r.signature).length;
    console.log(`\n✅ Successfully submitted ${successCount}/${transactions.length} transactions`);

    return results;
  }

  /**
   * Get transaction status from Sanctum
   * 
   * @param signature - Transaction signature
   * @returns Transaction status
   */
  async getTransactionStatus(signature: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.config.gatewayUrl}/transaction/${signature}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Mock Sanctum client for testing without actual gateway
 */
export class MockSanctumClient extends SanctumClient {
  async submitTransaction(
    _transaction: Transaction,
    _maxRetries: number = 3
  ): Promise<SanctumSubmitResponse> {
    console.log('   🧪 Mock transaction submission (testing mode)');
    
    // Simulate network delay
    await this.mockSleep(500);
    
    // Generate mock signature
    const mockSignature = Buffer.from(
      Array.from({ length: 64 }, () => Math.floor(Math.random() * 256))
    ).toString('base64');

    return {
      signature: mockSignature,
    };
  }

  private mockSleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Direct RPC Client - submits transactions directly to Solana (no MEV protection)
 * Use this for testing/development before enabling Sanctum
 */
export class DirectRPCClient extends SanctumClient {
  private connection: Connection;

  constructor(config: SanctumConfig, connection: Connection) {
    super(config);
    this.connection = connection;
  }

  /**
   * Submit transaction directly to Solana RPC (bypassing Sanctum)
   */
  async submitTransaction(
    transaction: Transaction,
    maxRetries: number = 3
  ): Promise<SanctumSubmitResponse> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   🚀 Submitting transaction to RPC (attempt ${attempt}/${maxRetries})...`);

        // Submit directly to Solana
        const signature = await this.connection.sendRawTransaction(
          transaction.serialize(),
          {
            skipPreflight: false,
            maxRetries: 3,
          }
        );

        // Wait for confirmation
        console.log(`   ⏳ Waiting for confirmation: ${signature}`);
        const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');

        if (confirmation.value.err) {
          lastError = `Transaction failed: ${JSON.stringify(confirmation.value.err)}`;
          console.warn(`   ⚠️  Attempt ${attempt} failed: ${lastError}`);
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          
          return { error: lastError };
        }

        console.log(`   ✅ Transaction confirmed: ${signature}`);
        return { signature };
      } catch (error) {
        if (error instanceof SendTransactionError && error.logs) {
          console.error('   🧾 Simulation logs:\n' + error.logs.map(log => `      ${log}`).join('\n'));
        }
        lastError = error instanceof Error ? error.message : String(error);
        console.warn(`   ⚠️  Attempt ${attempt} failed: ${lastError}`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        return { error: lastError };
      }
    }

    return { error: lastError || 'Unknown error' };
  }
}
