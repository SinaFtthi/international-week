import { useState } from 'react';
import { Pill, CodePill } from '../components/Pill';
import { Icons } from '../lib/icons';
import { fmt, poOutState, poInState } from '../lib/fmt';

function StatePill({ state }) {
  const map = {
    completed:   ['ok',   'completed'],
    awaiting_ack:['warn', 'awaiting ACK'],
    pending_ack: ['warn', 'to ack'],
    failed:      ['err',  'failed'],
    rejected:    ['err',  'rejected'],
    pending:     ['warn', 'pending'],
  };
  const [kind, label] = map[state] ?? ['info', state ?? 'new'];
  return <Pill kind={kind}>{label}</Pill>;
}

export function PaymentOrders({ poNew, poOut, poIn, onOpenPo, onNew, onProcess, onPollCb, busy }) {
  const [tab, setTab] = useState('PO_NEW');
  const lists = { PO_NEW: poNew, PO_OUT: poOut, PO_IN: poIn };
  const list = lists[tab];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Payment orders</h1>
          <div className="page-sub">SEPA messages flowing through the bank</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={onPollCb} disabled={busy}>{Icons.refresh(14)} Poll CB</button>
          <button className="btn" onClick={onProcess} disabled={busy}>{Icons.play(14)} {busy ? 'Bezig...' : 'Process PO_NEW'}</button>
          <button className="btn btn-primary" onClick={onNew}>{Icons.plus(14)} New PO</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="tabs">
          {['PO_NEW', 'PO_OUT', 'PO_IN'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t} <span className="tab-count">{lists[t].length}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-ghost">{Icons.refresh(14)}</button>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            {tab === 'PO_NEW' && (
              <tr><th>po_id</th><th>oa_id</th><th>→ bb_id</th><th>ba_id</th><th>Message</th><th style={{ textAlign: 'right' }}>Amount</th><th>Created</th></tr>
            )}
            {tab === 'PO_OUT' && (
              <tr><th>po_id</th><th>→ bb_id</th><th>ob_code</th><th>cb_code</th><th>bb_code</th><th>State</th><th style={{ textAlign: 'right' }}>Amount</th><th>Last action</th></tr>
            )}
            {tab === 'PO_IN' && (
              <tr><th>po_id</th><th>← ob_id</th><th>ba_id</th><th>cb_code</th><th>bb_code</th><th>State</th><th style={{ textAlign: 'right' }}>Amount</th><th>Last action</th></tr>
            )}
          </thead>
          <tbody>
            {list.map(p => {
              const last = p.bb_datetime || p.cb_datetime || p.ob_datetime || p.po_datetime;
              if (tab === 'PO_NEW') return (
                <tr key={p.po_id} className="row-link" onClick={() => onOpenPo(p, 'PO_NEW')}>
                  <td className="mono" style={{ fontSize: 12 }}>{p.po_id}</td>
                  <td className="iban">{fmt.iban(p.oa_id)}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{p.bb_id}</td>
                  <td className="iban">{fmt.iban(p.ba_id)}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.po_message}</td>
                  <td className="amt">{fmt.num(p.po_amount)}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{fmt.shortDt(p.po_datetime)}</td>
                </tr>
              );
              const state = tab === 'PO_OUT' ? poOutState(p) : poInState(p);
              return (
                <tr key={p.po_id} className="row-link" onClick={() => onOpenPo(p, tab)}>
                  <td className="mono" style={{ fontSize: 12 }}>{p.po_id}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{tab === 'PO_OUT' ? p.bb_id : p.ob_id}</td>
                  {tab === 'PO_IN'
                    ? <td className="iban">{fmt.iban(p.ba_id)}</td>
                    : <td><CodePill code={p.ob_code} /></td>
                  }
                  <td><CodePill code={p.cb_code} /></td>
                  <td><CodePill code={p.bb_code} /></td>
                  <td><StatePill state={state} /></td>
                  <td className="amt">{fmt.num(p.po_amount)}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{fmt.shortDt(last)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">No payment orders in {tab}.</div>}
      </div>
    </div>
  );
}
