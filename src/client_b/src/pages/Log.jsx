import { useState } from 'react';
import { CodePill } from '../components/Pill';
import { Icons } from '../lib/icons';
import { fmt } from '../lib/fmt';

const LOG_TYPES = ['all', 'general', 'po_new_process', 'po_in', 'ack_in', 'ack_out_process', 'tx', 'cb_error'];

export function Log({ logs }) {
  const [type, setType] = useState('all');
  const list = logs.filter(l => type === 'all' || l.type === type);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Log</h1>
          <div className="page-sub">Every event passing through the bank · most recent first</div>
        </div>
        <button className="btn">{Icons.download(14)} Export</button>
      </div>

      <div className="tabs" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        {LOG_TYPES.map(t => (
          <button key={t} className={`tab ${type === t ? 'active' : ''}`} onClick={() => setType(t)}>{t}</button>
        ))}
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>id</th><th>datetime</th><th>type</th><th>message</th><th>po_id</th><th>code</th></tr></thead>
          <tbody>
            {list.map(l => (
              <tr key={l.id}>
                <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>#{l.id}</td>
                <td className="mono" style={{ fontSize: 12 }}>{fmt.dt(l.datetime)}</td>
                <td><span className="type-chip" data-t={l.type}>{l.type}</span></td>
                <td style={{ fontSize: 13 }}>{l.message}</td>
                <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{l.po_id || '—'}</td>
                <td><CodePill code={l.cb_code || l.bb_code || l.ob_code || null} /></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="empty">No log entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
