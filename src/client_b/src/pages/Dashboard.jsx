import { Kpi } from '../components/Kpi';
import { Pill } from '../components/Pill';
import { fmt, poOutState, poInState } from '../lib/fmt';

export function Dashboard({ poNew, poOut, poIn, txs, accounts, bankInfo, autoLastRun, busy, onOpenPo }) {
  const totalBal = accounts.reduce((s, a) => s + parseFloat(a.balance ?? 0), 0);
  const failed   = poOut.filter(p => poOutState(p) === 'failed').length;
  const awaiting = poOut.filter(p => poOutState(p) === 'awaiting_ack').length + poNew.length;
  const complete = txs.filter(t => t.iscomplete).length;

  const recent = [...poOut.map(p => ({ ...p, _dir: 'out' })), ...poIn.map(p => ({ ...p, _dir: 'in' }))]
    .sort((a, b) => (b.ob_datetime || b.po_datetime || '').localeCompare(a.ob_datetime || a.po_datetime || ''))
    .slice(0, 6);

  const autoStatus = busy
    ? { color: 'var(--brand)', text: '⚙ verwerken…' }
    : autoLastRun
      ? { color: 'var(--ok)',   text: `✓ auto · ${autoLastRun.toLocaleTimeString()}` }
      : { color: 'var(--ink-3)', text: 'wacht op eerste cyclus…' };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-sub">
            Operations overview · {bankInfo?.bank_name} · {bankInfo?.bank_bic}
            <span style={{ marginLeft: 12, fontSize: 12, color: autoStatus.color }}>
              {autoStatus.text}
            </span>
          </div>
        </div>
      </div>

      <div className="kpis">
        <Kpi label="Accounts balance"
          value={'€' + Math.round(totalBal).toLocaleString('en-GB')}
          delta={`${accounts.length} accounts active`}
          spark={[42,45,43,48,52,51,55,58,57,62]} />
        <Kpi label="Outstanding payments"
          value={awaiting} unit="POs" deltaKind={awaiting > 0 ? 'warn' : 'ok'}
          delta={`${poNew.length} in queue · ${poOut.filter(p => poOutState(p) === 'awaiting_ack').length} awaiting ACK`}
          spark={[2,4,3,5,4,6,5,7,6,7]} />
        <Kpi label="Transactions"
          value={txs.length} unit="tx"
          delta={`${complete} complete · ${txs.length - complete} pending`}
          spark={[1,2,2,3,4,3,5,6,5,6]} />
        <Kpi label="Failed"
          value={failed} unit="tx" deltaKind={failed > 0 ? 'err' : 'ok'}
          delta={failed > 0 ? `${failed} need attention` : 'all clear'}
          spark={[0,1,0,1,2,1,1,2,1,1]} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <span className="ttl">Recent payment orders</span>
            <span className="sub">PO_OUT + PO_IN combined</span>
          </div>
          <table className="tbl">
            <thead><tr>
              <th>Direction</th><th>po_id</th><th>Counterparty</th>
              <th style={{ textAlign: 'right' }}>Amount</th><th>Status</th>
            </tr></thead>
            <tbody>
              {recent.map(p => {
                const out = p._dir === 'out';
                const state = out ? poOutState(p) : poInState(p);
                return (
                  <tr key={p.po_id} className="row-link" onClick={() => onOpenPo(p, out ? 'PO_OUT' : 'PO_IN')}>
                    <td>{out
                      ? <Pill kind="info">→ outgoing</Pill>
                      : <Pill kind="ok">← incoming</Pill>}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{p.po_id}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{out ? p.bb_id : p.ob_id}</td>
                    <td className="amt">{fmt.num(p.po_amount)}</td>
                    <td><StatePill state={state} /></td>
                  </tr>
                );
              })}
              {recent.length === 0 && (
                <tr><td colSpan={5} className="empty" style={{ padding: '24px 14px' }}>No payment orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-head"><span className="ttl">Connectivity</span><span className="sub">SEPA endpoints</span></div>
          <div style={{ padding: 16 }}>
            {[
              { label: 'Clearing bank API', host: 'stevenop.be/pingfin/api/v2', status: 'ok', meta: 'token active' },
              { label: 'Database (MySQL)',   host: 'localhost:3307',             status: 'ok', meta: 'bankb db' },
              { label: 'Backend API',        host: 'localhost:3001',             status: 'ok', meta: 'express server' },
            ].map(s => (
              <div key={s.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 4px', borderBottom: '1px solid var(--hair)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{s.host} · {s.meta}</div>
                </div>
                <div style={{ alignSelf: 'center' }}>
                  <Pill kind={s.status}>{s.status === 'ok' ? 'online' : 'degraded'}</Pill>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="ttl">Payment funnel</span>
          <span className="sub">stages PO_NEW → PO_OUT → ACK → TX</span>
        </div>
        <div style={{ padding: 18 }}>
          <div className="timeline-bar">
            <span style={{ width: `${Math.max(5, poNew.length * 10)}%`,  background: 'var(--brand-3)' }} />
            <span style={{ width: `${Math.max(5, poOut.length * 8)}%`,   background: 'var(--brand-2)' }} />
            <span style={{ width: `${Math.max(5, complete * 6)}%`,       background: 'var(--brand)'   }} />
            <span style={{ width: `${Math.max(5, failed * 8)}%`,         background: 'var(--err)'     }} />
          </div>
          <div className="legend-row" style={{ marginTop: 12 }}>
            <span className="lr"><span className="sw" style={{ background: 'var(--brand-3)' }} />queued ({poNew.length})</span>
            <span className="lr"><span className="sw" style={{ background: 'var(--brand-2)' }} />sent ({poOut.length})</span>
            <span className="lr"><span className="sw" style={{ background: 'var(--brand)'   }} />settled ({complete})</span>
            <span className="lr"><span className="sw" style={{ background: 'var(--err)'     }} />failed ({failed})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatePill({ state }) {
  if (!state) return null;
  const map = {
    completed:    ['ok',   'completed'],
    awaiting_ack: ['warn', 'awaiting ACK'],
    pending_ack:  ['warn', 'to ack'],
    failed:       ['err',  'failed'],
    rejected:     ['err',  'rejected'],
    pending:      ['warn', 'pending'],
  };
  const [kind, label] = map[state] ?? ['info', state];
  return <Pill kind={kind}>{label}</Pill>;
}
