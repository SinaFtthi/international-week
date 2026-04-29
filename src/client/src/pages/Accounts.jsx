import { useState, useMemo } from 'react';
import { Pill } from '../components/Pill';
import { Icons } from '../lib/icons';
import { fmt } from '../lib/fmt';

export function Accounts({ accounts }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => accounts.filter(a =>
    !q || a.id?.toLowerCase().includes(q.toLowerCase())
  ), [accounts, q]);
  const total = list.reduce((s, a) => s + parseFloat(a.balance ?? 0), 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Accounts</h1>
          <div className="page-sub">{list.length} accounts · total balance {fmt.eur(total)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="ttl">All accounts</span>
          <div className="acts">
            <div className="search" style={{ width: 240 }}>
              {Icons.search(14)}
              <input placeholder="Search IBAN…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
          </div>
        </div>
        <table className="tbl">
          <thead><tr>
            <th>IBAN</th><th>Status</th><th style={{ textAlign: 'right' }}>Balance</th>
          </tr></thead>
          <tbody>
            {list.map(a => (
              <tr key={a.id}>
                <td className="iban">{fmt.iban(a.id)}</td>
                <td><Pill kind="ok">active</Pill></td>
                <td className="amt">{fmt.eur(parseFloat(a.balance ?? 0))}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={3} className="empty">No accounts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
