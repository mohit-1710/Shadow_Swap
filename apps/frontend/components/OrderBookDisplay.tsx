import { useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getProgram, ORDER_STATUS } from '../lib/program';

interface DisplayOrder {
  publicKey: string;
  owner: string;
  orderId: string;
  status: number;
  createdAt: number;
}

export default function OrderBookDisplay() {
  const { connection } = useConnection();
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | 'all'>('all');

  const fetchOrders = async () => {
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

      // Fetch all encrypted orders
      const orderBookPubkeyStr = process.env.NEXT_PUBLIC_ORDER_BOOK_PUBKEY;
      if (!orderBookPubkeyStr) {
        setError('Order book address not configured');
        return;
      }
      
      const orderBookPubkey = new PublicKey(orderBookPubkeyStr);

      // Cast to any for dynamic account access (TypeScript limitation with Anchor IDL)
      const allOrders = await (program.account as any).encryptedOrder.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: orderBookPubkey.toBase58(),
          },
        },
      ]);

      const displayOrders: DisplayOrder[] = allOrders.map((order: any) => ({
        publicKey: order.publicKey.toString(),
        owner: order.account.owner.toString(),
        orderId: order.account.orderId.toString(),
        status: order.account.status,
        createdAt: order.account.createdAt.toNumber(),
      }));

      setOrders(displayOrders);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(`Failed to fetch orders: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Auto-refresh if enabled
    const autoRefresh = process.env.NEXT_PUBLIC_AUTO_REFRESH === 'true';
    if (autoRefresh) {
      const interval = setInterval(
        fetchOrders,
        parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '5000')
      );
      return () => clearInterval(interval);
    }
  }, [connection]);

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

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>📊 Order Book</h2>
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
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                Owner
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                Status
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                Created At
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
              filteredOrders.map((order) => (
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
                  <td style={{ padding: '12px' }}>
                    <code style={{ fontSize: '12px' }}>
                      {order.owner.slice(0, 8)}...{order.owner.slice(-6)}
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
                </tr>
              ))
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
        <strong>ℹ️ Privacy Notice:</strong>
        <ul style={{ marginTop: '8px', paddingLeft: '20px', marginBottom: 0 }}>
          <li>Order details (price, amount, side) are encrypted and not displayed</li>
          <li>Only authorized keeper bots can decrypt and match orders</li>
          <li>
            Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
            {filterStatus !== 'all' && ` (filtered by ${getStatusLabel(filterStatus as number)})`}
          </li>
        </ul>
      </div>
    </div>
  );
}

