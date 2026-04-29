import { Pill } from '../components/Pill';
import { Icons } from '../lib/icons';
import { fmt } from '../lib/fmt';

export function Transactions({ txs, onOpenTx }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Transactions</h1>
          <div className="page-sub">{txs.length} settled or failed transactions on bank accounts</div>
        </div>
        <button className="btn">{Icons.download(14)} Export CSV</button>
      </div>
      <div className="card">
        <table className="tbl">
          <thead><tr>
            <th>id</th><th>datetime</th><th>account</th><th>po_id</th>
            <th>valid</th><th>complete</th><th style={{ textAlign: 'right' }}>amount</th>
          </tr></thead>
          <tbody>
            {txs.map(t => (
              <tr key={t.id} className="row-link" onClick={() => onOpenTx?.(t)}>
                <td className="mono" style={{ fontSize: 12 }}>#{t.id}</td>
                <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fmt.dt(t.datetime)}</td>
                <td className="iban">{fmt.iban(t.account_id)}</td>
                <td className="mono" style={{ fontSize: 12 }}>{t.po_id}</td>
                <td>{t.isvalid ? <Pill kind="ok">valid</Pill> : <Pill kind="err">invalid</Pill>}</td>
                <td>{t.iscomplete ? <Pill kind="ok">complete</Pill> : <Pill kind="warn">pending</Pill>}</td>
                <td className={`amt ${parseFloat(t.amount) < 0 ? 'neg' : 'pos'}`}>
                  {(parseFloat(t.amount) < 0 ? '−' : '+') + fmt.num(t.amount)}
                </td>
              </tr>
            ))}
            {txs.length === 0 && <tr><td colSpan={7} className="empty">No transactions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
