import { Card } from './primitives/Card';

export function UserAnalytics({ users }: { users: { dau: number; wau: number; mau: number; newUsers: number; topTraders: { wallet: string; trades: number; volume: number }[] } }) {
  const fmt = (n: number) => Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n);
  return (
    <div className="grid two">
      <Card title="Active Users" right={<span className="badge">DAU / WAU / MAU</span>}>
        <div className="grid three">
          <div className="stack"><span className="sub">DAU</span><div className="stat">{fmt(users.dau)}</div></div>
          <div className="stack"><span className="sub">WAU</span><div className="stat">{fmt(users.wau)}</div></div>
          <div className="stack"><span className="sub">MAU</span><div className="stat">{fmt(users.mau)}</div></div>
        </div>
      </Card>
      <Card title="Top Traders" right={<span className="badge">7d</span>}>
        <table className="table">
          <thead>
            <tr>
              <th>Wallet</th>
              <th>Trades</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {users.topTraders.map((t) => (
              <tr key={t.wallet}>
                <td>{t.wallet}</td>
                <td>{t.trades}</td>
                <td>{fmt(t.volume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

