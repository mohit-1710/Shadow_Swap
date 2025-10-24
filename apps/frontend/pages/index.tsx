import dynamic from 'next/dynamic';
import { PublicKey } from '@solana/web3.js';
import OrderSubmissionForm from '../components/OrderSubmissionForm';
import OrderBookDisplay from '../components/OrderBookDisplay';

// Dynamically import WalletMultiButton to avoid SSR issues
const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

// Program configuration (deployed on devnet - Phase 4)
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || '5Lg1BzRkhUPkcEVaBK8wbfpPcYf7PZdSVqRnoBv597wt'
);
const BASE_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_BASE_MINT || 'So11111111111111111111111111111111111111112'
); // Wrapped SOL
const QUOTE_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_QUOTE_MINT || 'CrkXs142BgVrLrkrSGXNXgFztT5mxKyzWJjtHw3rDagE'
); // Devnet USDC

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '20px' }}>
      {/* Header */}
      <header style={{ 
        maxWidth: '1200px', 
        margin: '0 auto 40px', 
        padding: '20px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: '0 0 10px 0' }}>🔒 ShadowSwap</h1>
          <p style={{ margin: 0, color: '#666' }}>
            Privacy-Preserving Decentralized Exchange on Solana
          </p>
        </div>
        <WalletMultiButton />
      </header>

      {/* Main content */}
      <main style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        display: 'grid',
        gap: '30px'
      }}>
        {/* Order Submission Form */}
        <section style={{ 
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <OrderSubmissionForm
            programId={PROGRAM_ID}
            baseMintAddress={BASE_MINT}
            quoteMintAddress={QUOTE_MINT}
          />
        </section>

        {/* Order Book Display */}
        <section style={{ 
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <OrderBookDisplay />
        </section>
      </main>

      {/* Footer */}
      <footer style={{ 
        maxWidth: '1200px', 
        margin: '40px auto 0', 
        textAlign: 'center',
        color: '#666',
        fontSize: '14px'
      }}>
        <p>
          <strong>Privacy Notice:</strong> All order details are encrypted client-side before submission.
          No plaintext order information is ever transmitted or stored on-chain.
        </p>
      </footer>
    </div>
  );
}
