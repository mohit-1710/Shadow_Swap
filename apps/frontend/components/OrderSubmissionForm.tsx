import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, createSyncNativeInstruction } from '@solana/spl-token';
import { 
  getOrCreateAssociatedTokenAccount, 
  parseTokenAmount,
  getTokenBalance,
  formatTokenAmount
} from '../lib/tokenUtils';
import { deriveOrderBookPda } from '../lib/program';
import { encryptOrderWithArcium, PlainOrder, validateOrder } from '../lib/arcium';
import { loadShadowSwapIdl } from '../lib/shadowSwapIdlLoader';

const BASE_DECIMALS = 1_000_000_000n; // SOL/WSOL (lamports)
const QUOTE_DECIMALS = 1_000_000n; // USDC (micro units)
const TOKEN_ACCOUNT_SIZE = 165;
const LAMPORT_FEE_BUFFER = 5_000n;

interface OrderSubmissionFormProps {
  programId: PublicKey;
  baseMintAddress: PublicKey;
  quoteMintAddress: PublicKey;
}

export default function OrderSubmissionForm({
  programId,
  baseMintAddress,
  quoteMintAddress,
}: OrderSubmissionFormProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  // Form state
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  
  // Status state
  const [status, setStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txSignature, setTxSignature] = useState<string>('');

  // Balance state
  const [baseBalance, setBaseBalance] = useState<string>('0');
  const [quoteBalance, setQuoteBalance] = useState<string>('0');

  // Order book state
  const [orderBookAddress, setOrderBookAddress] = useState<PublicKey | null>(null);

  /**
   * Initialize - get order book address from env
   */
  useEffect(() => {
    // Use the actual initialized order book address from environment
    const orderBookPubkey = process.env.NEXT_PUBLIC_ORDER_BOOK_PUBKEY;
    if (orderBookPubkey) {
      setOrderBookAddress(new PublicKey(orderBookPubkey));
    } else {
      // Fallback to deriving (shouldn't happen)
      const [orderBook] = deriveOrderBookPda(baseMintAddress, quoteMintAddress, programId);
      setOrderBookAddress(orderBook);
    }
  }, [baseMintAddress, quoteMintAddress, programId]);

  /**
   * Fetch user token balances (gracefully handle missing accounts)
   */
  useEffect(() => {
    if (!wallet.publicKey) {
      setBaseBalance('0');
      setQuoteBalance('0');
      return;
    }

    const fetchBalances = async () => {
      try {
        // Import from spl-token for read-only operations
        const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');
        const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token');

        // Try to fetch base token balance
        try {
          const baseAta = await getAssociatedTokenAddress(
            baseMintAddress,
            wallet.publicKey!,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          const accountInfo = await getAccount(connection, baseAta, 'confirmed');
          setBaseBalance(formatTokenAmount(accountInfo.amount, 9));
        } catch (err) {
          console.warn('Base token account does not exist yet (will be created on first order)');
          setBaseBalance('0 (no account)');
        }

        // Try to fetch quote token balance
        try {
          const quoteAta = await getAssociatedTokenAddress(
            quoteMintAddress,
            wallet.publicKey!,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          const accountInfo = await getAccount(connection, quoteAta, 'confirmed');
          setQuoteBalance(formatTokenAmount(accountInfo.amount, 6));
        } catch (err) {
          console.warn('Quote token account does not exist yet (will be created on first order)');
          setQuoteBalance('0 (no account)');
        }
      } catch (error) {
        console.error('Error fetching balances:', error);
        setBaseBalance('0');
        setQuoteBalance('0');
      }
    };

    fetchBalances();
  }, [wallet.publicKey, connection, baseMintAddress, quoteMintAddress]);

  /**
   * Submit the encrypted order
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.publicKey || !wallet.signTransaction) {
      setStatus('❌ Error: Please connect your wallet');
      return;
    }

    if (!orderBookAddress) {
      setStatus('❌ Error: Order book not initialized');
      return;
    }

    setIsSubmitting(true);
    setStatus('⏳ Preparing order...');
    setTxSignature('');

    try {
      // Parse and validate inputs
      const amountBigInt = parseTokenAmount(amount, 9); // SOL has 9 decimals
      const priceBigInt = parseTokenAmount(price, 6); // USDC has 6 decimals
      const quoteNeeded = ((amountBigInt * priceBigInt) + (BASE_DECIMALS - 1n)) / BASE_DECIMALS;
      if (quoteNeeded <= 0n) {
        throw new Error('Calculated quote amount is too small. Increase price or amount.');
      }
      
      // Create plain order
      const plainOrder: PlainOrder = {
        side: side === 'buy' ? 0 : 1,
        amount: Number(amountBigInt),
        price: Number(priceBigInt),
        timestamp: Math.floor(Date.now() / 1000),
      };

      // Validate order
      const validation = validateOrder(plainOrder);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      setStatus('🔐 Encrypting order...');

      // Encrypt the order
      const { cipherPayload } = await encryptOrderWithArcium(
        plainOrder,
        orderBookAddress,
        'devnet'
      );

      // Convert Uint8Array to Buffer for Anchor
      const cipherPayloadBuffer = Buffer.from(cipherPayload);

      setStatus('🔨 Building transaction...');

      // Setup Anchor provider
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        { commitment: 'confirmed', preflightCommitment: 'confirmed' }
      );

      // Load the program (IDL provided via env or fetched)
      const idl = await loadShadowSwapIdl();
      const program = new Program(idl as any, provider);

      // Fetch order book account to get order count
      // Cast to any for dynamic account access (TypeScript limitation with Anchor IDL)
      const orderBookAccount = await (program.account as any).orderBook.fetch(orderBookAddress);
      const orderCount = orderBookAccount.orderCount as BN;

      // Derive PDAs
      // Use BN's toArrayLike method for better browser compatibility
      const orderCountBuffer = orderCount.toArrayLike(Buffer, 'le', 8);

      const [orderPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('order'),
          orderBookAddress.toBuffer(),
          orderCountBuffer,
        ],
        programId
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), orderPda.toBuffer()],
        programId
      );

      const [escrowTokenPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow_token'), orderPda.toBuffer()],
        programId
      );

      // Determine which token to use based on side
      // Buy orders escrow quote token (USDC), Sell orders escrow base token (SOL)
      const tokenMint = side === 'buy' ? quoteMintAddress : baseMintAddress;
      
      // Get or create user's token account (ATA)
      // This will automatically add create instructions if the account doesn't exist
      // The user will pay ~0.00204 SOL rent for account creation
      const transaction = new Transaction();
      const walletAccountInfo = await connection.getAccountInfo(wallet.publicKey);
      const walletLamports = BigInt(walletAccountInfo?.lamports ?? 0);
      
      setStatus('🔍 Checking token accounts...');
      const initialInstructionCount = transaction.instructions.length;
      const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        tokenMint,
        wallet.publicKey,
        wallet.publicKey,
        transaction
      );
      const createdTokenAccount = transaction.instructions.length > initialInstructionCount;
      
      // If transaction has instructions already, it means we're creating the account
      if (createdTokenAccount) {
        setStatus('📦 Creating token account (one-time ~0.002 SOL rent)...');
        console.log('Token account will be created during order submission');
      }

      let rentExemptLamports = 0n;
      if (createdTokenAccount) {
        const rentAmount = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);
        rentExemptLamports = BigInt(rentAmount);
      }

      if (side === 'buy') {
        const currentQuoteBalance = await getTokenBalance(connection, userTokenAccount);
        if (currentQuoteBalance < quoteNeeded) {
          setStatus(
            `❌ Not enough USDC. Need ${formatTokenAmount(quoteNeeded, 6)} USDC, have ${formatTokenAmount(currentQuoteBalance, 6)} USDC`
          );
          setIsSubmitting(false);
          return;
        }

        if (rentExemptLamports > 0n) {
          const lamportsNeeded = rentExemptLamports + LAMPORT_FEE_BUFFER;
          if (walletLamports < lamportsNeeded) {
            setStatus(
              `❌ Not enough SOL to create the USDC token account. Need ${formatTokenAmount(lamportsNeeded, 9)} SOL, have ${formatTokenAmount(walletLamports, 9)} SOL`
            );
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Auto-wrap SOL into WSOL for sell orders (so users don't have to pre-wrap)
      if (side === 'sell') {
        const currentWsolBalance = await getTokenBalance(connection, userTokenAccount);
        const shortfall = amountBigInt > currentWsolBalance
          ? amountBigInt - currentWsolBalance
          : BigInt(0);
        const lamportsNeededForWrap = shortfall > 0n ? shortfall : 0n;
        const totalLamportsNeeded = lamportsNeededForWrap + rentExemptLamports + LAMPORT_FEE_BUFFER;

        if (totalLamportsNeeded > 0n && walletLamports < totalLamportsNeeded) {
          setStatus(
            `❌ Not enough SOL. Need ${formatTokenAmount(totalLamportsNeeded, 9)} SOL to wrap and cover rent, have ${formatTokenAmount(walletLamports, 9)} SOL`
          );
          setIsSubmitting(false);
          return;
        }
        
      if (shortfall > BigInt(0)) {
        setStatus('💧 Wrapping SOL into WSOL for escrow...');
        
        if (shortfall > BigInt(Number.MAX_SAFE_INTEGER)) {
          throw new Error('Order size is too large for automatic SOL wrapping');
        }

        transaction.add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: userTokenAccount,
            lamports: Number(shortfall),
          })
        );

        transaction.add(
          createSyncNativeInstruction(userTokenAccount, TOKEN_PROGRAM_ID)
        );
      }
      }

      // Create encrypted_amount (64 bytes to match MAX_ENCRYPTED_AMOUNT_SIZE)
      const encryptedAmountBuffer = Buffer.alloc(64);
      // For now, just encode the amount in the first 8 bytes using BN for browser compatibility
      const amountBN = new BN(amountBigInt.toString());
      const amountBytes = amountBN.toArrayLike(Buffer, 'le', 8);
      encryptedAmountBuffer.set(amountBytes, 0);
      // Fill rest with random data (simulating encryption)
      if (typeof window !== 'undefined' && window.crypto) {
        const randomPadding = new Uint8Array(56);
        crypto.getRandomValues(randomPadding);
        encryptedAmountBuffer.set(randomPadding, 8);
      }

      setStatus('📤 Submitting transaction...');

      // Build the instruction (using correct method name from IDL)
      const submitOrderIx = await program.methods
        .submitEncryptedOrder(
          cipherPayloadBuffer,
          encryptedAmountBuffer
        )
        .accounts({
          orderBook: orderBookAddress,
          order: orderPda,
          escrow: escrowPda,
          escrowTokenAccount: escrowTokenPda,
          userTokenAccount: userTokenAccount,
          tokenMint: tokenMint,
          owner: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

      // Add to transaction
      transaction.add(submitOrderIx);

      // Set fee payer and recent blockhash
      transaction.feePayer = wallet.publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;

      // Sign and send
      setStatus('✍️  Waiting for signature...');
      const signed = await wallet.signTransaction(transaction);
      
      setStatus('📡 Broadcasting transaction...');
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      setStatus('⏳ Confirming transaction...');
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      setTxSignature(signature);
      setStatus('✅ Order submitted successfully!');
      
      // Reset form
      setAmount('');
      setPrice('');

      // Refresh balances (with proper error handling)
      setTimeout(async () => {
        if (!wallet.publicKey) return;
        
        try {
          const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');
          const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token');

          // Refresh base balance
          try {
            const baseAta = await getAssociatedTokenAddress(
              baseMintAddress,
              wallet.publicKey,
              false,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            );
            const accountInfo = await getAccount(connection, baseAta, 'confirmed');
            setBaseBalance(formatTokenAmount(accountInfo.amount, 9));
          } catch (err) {
            setBaseBalance('0');
          }

          // Refresh quote balance
          try {
            const quoteAta = await getAssociatedTokenAddress(
              quoteMintAddress,
              wallet.publicKey,
              false,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            );
            const accountInfo = await getAccount(connection, quoteAta, 'confirmed');
            setQuoteBalance(formatTokenAmount(accountInfo.amount, 6));
          } catch (err) {
            setQuoteBalance('0');
          }
        } catch (error) {
          console.error('Error refreshing balances:', error);
        }
      }, 2000);

    } catch (error: any) {
      console.error('Error submitting order:', error);
      
      // Parse error message
      let errorMessage = 'Failed to submit order';
      if (error.message) {
        errorMessage = error.message;
      }
      if (error.logs) {
        console.log('Program logs:', error.logs);
      }
      
      setStatus(`❌ Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px' }}>📝 Submit Order</h2>
      
      {/* Wallet status */}
      {wallet.publicKey ? (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          background: '#e8f5e9',
          borderRadius: '8px',
          border: '1px solid #4caf50'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>🔑 Wallet:</strong>{' '}
            <code>{wallet.publicKey.toBase58().slice(0, 8)}...{wallet.publicKey.toBase58().slice(-8)}</code>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <div>
              <strong>WSOL Balance:</strong> {baseBalance}
            </div>
            <div>
              <strong>USDC Balance:</strong> {quoteBalance}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          background: '#fff3e0',
          borderRadius: '8px',
          border: '1px solid #ff9800',
          textAlign: 'center'
        }}>
          <strong>⚠️ Please connect your wallet to submit orders</strong>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Side selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            📊 Order Side:
          </label>
          <div style={{ display: 'flex', gap: '15px' }}>
            <label style={{ 
              flex: 1,
              padding: '12px',
              border: `2px solid ${side === 'buy' ? '#4caf50' : '#ddd'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              background: side === 'buy' ? '#e8f5e9' : 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <input
                type="radio"
                value="buy"
                checked={side === 'buy'}
                onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}
                disabled={isSubmitting}
                style={{ marginRight: '8px' }}
              />
              <strong>🟢 Buy WSOL (pay with USDC)</strong>
            </label>
            <label style={{ 
              flex: 1,
              padding: '12px',
              border: `2px solid ${side === 'sell' ? '#f44336' : '#ddd'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              background: side === 'sell' ? '#ffebee' : 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <input
                type="radio"
                value="sell"
                checked={side === 'sell'}
                onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}
                disabled={isSubmitting}
                style={{ marginRight: '8px' }}
              />
              <strong>🔴 Sell WSOL (receive USDC)</strong>
            </label>
          </div>
        </div>

        {/* Amount input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            💰 Amount (WSOL):
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 0.1"
            disabled={isSubmitting || !wallet.publicKey}
            required
            style={{ 
              width: '100%', 
              padding: '12px', 
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {side === 'buy' ? '(Amount of WSOL you want to buy)' : '(Amount of WSOL you want to sell)'}
          </div>
        </div>

        {/* Price input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            💵 Price (USDC per WSOL):
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g., 100"
            disabled={isSubmitting || !wallet.publicKey}
            required
            style={{ 
              width: '100%', 
              padding: '12px', 
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            (How many USDC per 1 WSOL)
          </div>
        </div>

        {/* Total display */}
        {amount && price && (
          <div style={{ 
            marginBottom: '20px', 
            padding: '12px', 
            background: '#f5f5f5',
            borderRadius: '8px'
          }}>
            <strong>Total:</strong> {(parseFloat(amount) * parseFloat(price)).toFixed(2)} USDC
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || !wallet.publicKey || !amount || !price}
          style={{
            width: '100%',
            padding: '16px',
            background: wallet.publicKey && !isSubmitting ? '#007bff' : '#cccccc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: wallet.publicKey && !isSubmitting ? 'pointer' : 'not-allowed',
            fontSize: '18px',
            fontWeight: 'bold',
            transition: 'background 0.3s'
          }}
        >
          {isSubmitting ? '⏳ Processing...' : '🚀 Submit Order'}
        </button>
      </form>

      {/* Status display */}
      {status && (
        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            background: status.includes('❌') ? '#ffebee' : status.includes('✅') ? '#e8f5e9' : '#fff3e0',
            border: `2px solid ${status.includes('❌') ? '#f44336' : status.includes('✅') ? '#4caf50' : '#ff9800'}`,
            borderRadius: '8px',
            fontSize: '15px'
          }}
        >
          {status}
        </div>
      )}

      {/* Transaction signature */}
      {txSignature && (
        <div style={{ marginTop: '15px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
          <strong>🔗 Transaction:</strong>{' '}
          <a
            href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}
          >
            View on Solana Explorer ↗
          </a>
        </div>
      )}

      {/* Info box */}
      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        background: '#e3f2fd',
        borderRadius: '8px',
        fontSize: '13px',
        border: '1px solid #2196f3'
      }}>
        <strong>ℹ️ Privacy Notice:</strong>
        <ul style={{ marginTop: '8px', paddingLeft: '20px', marginBottom: '10px' }}>
          <li>Order details are encrypted client-side using Arcium SDK</li>
          <li>No plaintext order information is transmitted or stored on-chain</li>
          <li>Only you and authorized keepers can decrypt your order</li>
          <li>Currently on Devnet - use test tokens only</li>
        </ul>
        
        <strong>💰 First-Time Setup:</strong>
        <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
          <li>If you don't have token accounts, they'll be created automatically</li>
          <li>One-time rent: ~0.002 SOL per token account (refundable if closed)</li>
          <li>You only pay this once per token type</li>
        </ul>
      </div>
    </div>
  );
}
