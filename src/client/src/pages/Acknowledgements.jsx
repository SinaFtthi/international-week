import { useState } from 'react';
import { CodePill } from '../components/Pill';
import { fmt } from '../lib/fmt';

export function Acknowledgements({ ackIn, ackOut }) {
  const [tab, setTab] = useState('ACK_IN');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Acknowledgements</h1>
          <div className="page-sub">Replies between this bank and the clearing bank</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 12 }}>
        <button className={`tab ${tab === 'ACK_IN' ? 'active' : ''}`} onClick={() => setTab('ACK_IN')}>
          ACK_IN <span className="tab-count">{ackIn.length}</span>
        </button>
        <button className={`tab ${tab === 'ACK_OUT' ? 'active' : ''}`} onClick={() => setTab('ACK_OUT')}>
          ACK_OUT <span className="tab-count">{ackOut.length}</span>
        </button>
      </div>

      <div className="card">
        {tab === 'ACK_IN' ? (
          <table className="tbl">
            <thead><tr><th>po_id</th><th>ob_id</th><th>cb_code</th><th>cb_datetime</th></tr></thead>
            <tbody>
              {ackIn.map(a => (
                <tr key={a.po_id}>
                  <td className="mono" style={{ fontSize: 12 }}>{a.po_id}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{a.ob_id}</td>
                  <td><CodePill code={a.cb_code} /></td>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fmt.dt(a.cb_datetime)}</td>
                </tr>
              ))}
              {ackIn.length === 0 && <tr><td colSpan={4} className="empty">No ACK_IN records.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="tbl">
            <thead><tr><th>po_id</th><th>bb_id</th><th>ba_id</th><th>bb_code</th><th>bb_datetime</th></tr></thead>
            <tbody>
              {ackOut.map(a => (
                <tr key={a.po_id}>
                  <td className="mono" style={{ fontSize: 12 }}>{a.po_id}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{a.bb_id}</td>
                  <td className="iban">{fmt.iban(a.ba_id)}</td>
                  <td><CodePill code={a.bb_code} /></td>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fmt.dt(a.bb_datetime)}</td>
                </tr>
              ))}
              {ackOut.length === 0 && <tr><td colSpan={5} className="empty">No ACK_OUT records.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
