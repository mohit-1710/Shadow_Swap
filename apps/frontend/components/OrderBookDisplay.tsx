import { useEffect, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getProgram, ORDER_STATUS } from '../lib/program';
import { createCloseAccountInstruction } from '@solana/spl-token';

interface DisplayOrder {
  publicKey: string;
  owner: string;
  orderId: string;
  status: number;
  createdAt: number;
}

export default function OrderBookDisplay() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<number | 'all'>('all');
  const [statusFeed, setStatusFeed] = useState<string[]>([]);
  const baseMint = new PublicKey(
    process.env.NEXT_PUBLIC_BASE_MINT || 'So11111111111111111111111111111111111111112'
  );
  const orderStatusCache = useRef<Record<string, number>>({});

  const fetchOrders = async () => {
    if (!wallet.publicKey) {
      setOrders([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Create dummy wallet for read-only operations
      const dummyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };

      const program = getProgram(connection, dummyWallet);

      // Fetch ONLY this user's orders (by owner)
      // Cast to any for dynamic account access (TypeScript limitation with Anchor IDL)
      const userOrders = await (program.account as any).encryptedOrder.all([
        {
          memcmp: {
            offset: 8, // After discriminator, owner field
            bytes: wallet.publicKey.toBase58(),
          },
        },
      ]);

      const displayOrders: DisplayOrder[] = userOrders.map((order: any) => ({
        publicKey: order.publicKey.toString(),
        owner: order.account.owner.toString(),
        orderId: order.account.orderId.toString(),
        status: order.account.status,
        createdAt: order.account.createdAt.toNumber(),
      }));

      const prevStatuses = orderStatusCache.current;
      const updates: string[] = [];
      displayOrders.forEach(order => {
        const prev = prevStatuses[order.publicKey];
        if (prev !== undefined && prev !== order.status) {
          const label = getStatusLabel(order.status);
          updates.push(`Order #${order.orderId} is now ${label}`);
        }
        prevStatuses[order.publicKey] = order.status;
      });
      if (updates.length) {
        setStatusFeed(prev => [...updates, ...prev].slice(0, 5));
      }

      setOrders(displayOrders);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(`Failed to fetch orders: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderPubkey: string) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError('Please connect a wallet that supports direct signing');
      return;
    }

    try {
      setCancelling(orderPubkey);
      setError('');

      const program = getProgram(connection, wallet as any);
      const orderPubkeyObj = new PublicKey(orderPubkey);
      
      // Fetch order to get token details
      const orderAccount = await (program.account as any).encryptedOrder.fetch(orderPubkeyObj);
      
      // Derive escrow PDA
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), orderPubkeyObj.toBuffer()],
        program.programId
      );
      
      // Fetch escrow to get token account
      const escrowAccount = await (program.account as any).escrow.fetch(escrowPda);
      const escrowTokenAccount = escrowAccount.tokenAccount;
      
      // Get order book
      const orderBookPubkey = new PublicKey(process.env.NEXT_PUBLIC_ORDER_BOOK_PUBKEY!);
      
      // Get order book data to find the mint
      const orderBookData = await (program.account as any).orderBook.fetch(orderBookPubkey);
      
      // Determine which mint based on order side (we'd need to decrypt, but for cancel we can check escrow)
      // The escrow holds either base or quote tokens
      const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      
      // Get user's token account for the same mint as escrow
      const escrowTokenAccountInfo = await connection.getAccountInfo(escrowTokenAccount);
      if (!escrowTokenAccountInfo) {
        throw new Error('Escrow token account not found');
      }
      
      // Parse token account to get mint (mint is at offset 0, 32 bytes)
      const mintPubkey = new PublicKey(escrowTokenAccountInfo.data.slice(0, 32));
      
      // Derive user's ATA for this mint
      const [userTokenAccount] = PublicKey.findProgramAddressSync(
        [
          wallet.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          mintPubkey.toBuffer(),
        ],
        new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
      );
      
      const cancelInstruction = await program.methods
        .cancelOrder()
        .accounts({
          order: orderPubkeyObj,
          escrow: escrowPda,
          escrowTokenAccount,
          userTokenAccount,
          orderBook: orderBookPubkey,
          owner: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      const transaction = new Transaction().add(cancelInstruction);

      if (mintPubkey.equals(baseMint)) {
        transaction.add(
          createCloseAccountInstruction(
            userTokenAccount,
            wallet.publicKey,
            wallet.publicKey
          )
        );
      }

      transaction.feePayer = wallet.publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;

      const signed = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      console.log('✅ Order cancelled:', signature);
      
      // Refresh orders & balances
      await fetchOrders();
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      setError(`Failed to cancel order: ${err.message}`);
    } finally {
      setCancelling(null);
    }
  };

  useEffect(() => {
    fetchOrders();

    const refreshEvery = parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '5000');
    const interval = setInterval(fetchOrders, refreshEvery);
    return () => clearInterval(interval);
  }, [connection, wallet.publicKey]);

  const getStatusLabel = (status: number): string => {
    switch (status) {
      case ORDER_STATUS.ACTIVE:
        return 'Active';
      case ORDER_STATUS.FILLED:
        return 'Filled';
      case ORDER_STATUS.CANCELLED:
        return 'Cancelled';
      case ORDER_STATUS.EXECUTED:
        return 'Executed';
      case ORDER_STATUS.PARTIAL:
        return 'Partial';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: number): string => {
    switch (status) {
      case ORDER_STATUS.ACTIVE:
        return '#2196f3';
      case ORDER_STATUS.FILLED:
        return '#4caf50';
      case ORDER_STATUS.CANCELLED:
        return '#9e9e9e';
      case ORDER_STATUS.EXECUTED:
        return '#4caf50';
      case ORDER_STATUS.PARTIAL:
        return '#ff9800';
      default:
        return '#666';
    }
  };

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter(order => order.status === filterStatus);

  if (!wallet.publicKey) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center', padding: '40px' }}>
        <p style={{ fontSize: '18px', color: '#666' }}>
          🔐 Please connect your wallet to view your orders
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {statusFeed.length > 0 && (
        <div style={{
          marginBottom: '15px',
          padding: '12px 16px',
          background: '#e8f5e9',
          border: '1px solid #4caf50',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#1b5e20'
        }}>
          <strong>Recent updates:</strong>
          <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
            {statusFeed.map((msg, idx) => (
              <li key={`${msg}-${idx}`}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>📋 My Orders</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(
              e.target.value === 'all' ? 'all' : parseInt(e.target.value)
            )}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '2px solid #ddd',
              background: 'white'
            }}
          >
            <option value="all">All Status</option>
            <option value={ORDER_STATUS.ACTIVE}>Active</option>
            <option value={ORDER_STATUS.PARTIAL}>Partial</option>
            <option value={ORDER_STATUS.FILLED}>Filled</option>
            <option value={ORDER_STATUS.EXECUTED}>Executed</option>
            <option value={ORDER_STATUS.CANCELLED}>Cancelled</option>
          </select>
          <button
            onClick={fetchOrders}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '15px',
            background: '#ffebee',
            border: '2px solid #f44336',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#c62828'
          }}
        >
          {error}
        </div>
      )}

      <div style={{ 
        background: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #ddd'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse'
        }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                Order ID
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                Status
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                Created At
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#999'
                  }}
                >
                  {loading ? '⏳ Loading orders...' : '📭 No orders found'}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const canCancel = order.status === ORDER_STATUS.ACTIVE || order.status === ORDER_STATUS.PARTIAL;
                const isCancelling = cancelling === order.publicKey;
                
                return (
                  <tr
                    key={order.publicKey}
                    style={{
                      borderBottom: '1px solid #eee',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f9f9f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <code style={{ 
                        fontSize: '12px',
                        background: '#f5f5f5',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}>
                        {order.orderId.slice(0, 12)}...
                      </code>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: 'white',
                          background: getStatusColor(order.status)
                        }}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      {new Date(order.createdAt * 1000).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {canCancel ? (
                        <button
                          onClick={() => cancelOrder(order.publicKey)}
                          disabled={isCancelling}
                          style={{
                            padding: '6px 16px',
                            background: isCancelling ? '#ccc' : '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isCancelling ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}
                        >
                          {isCancelling ? '⏳ Cancelling...' : '❌ Cancel'}
                        </button>
                      ) : (
                        <span style={{ color: '#999', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          background: '#e3f2fd',
          borderRadius: '8px',
          fontSize: '13px',
          border: '1px solid #2196f3'
        }}
      >
        <strong>ℹ️ About Your Orders:</strong>
        <ul style={{ marginTop: '8px', paddingLeft: '20px', marginBottom: 0 }}>
          <li>Order details (price, amount, side) are encrypted for privacy</li>
          <li>Only authorized keeper bots can decrypt and match orders</li>
          <li>You can cancel Active or Partial orders at any time</li>
          <li>
            Showing {filteredOrders.length} of your order{filteredOrders.length !== 1 ? 's' : ''}
            {filterStatus !== 'all' && ` (filtered by ${getStatusLabel(filterStatus as number)})`}
          </li>
        </ul>
      </div>
    </div>
  );
}
