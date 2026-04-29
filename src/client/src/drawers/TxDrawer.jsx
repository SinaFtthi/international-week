import { Pill } from '../components/Pill';
import { Icons } from '../lib/icons';
import { fmt } from '../lib/fmt';

export function TxDrawer({ tx, onClose }) {
  if (!tx) return null;

  const pillKind  = tx.iscomplete ? 'ok' : tx.isvalid ? 'warn' : 'err';
  const stateLabel = tx.iscomplete ? 'complete' : tx.isvalid ? 'pending' : 'invalid';

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="drawer-title">TX #{tx.id}</div>
            <div className="drawer-sub">{tx.po_id}</div>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            {Icons.close()}
          </button>
        </div>

        <div className="drawer-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div className="kpi-value" style={{ fontSize: 28 }}>{fmt.eur(tx.amount)}</div>
            <Pill kind={pillKind}>{stateLabel}</Pill>
          </div>

          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>FROM</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{tx.ob_id ?? '—'}</div>
                <div className="iban" style={{ fontSize: 12 }}>{fmt.iban(tx.oa_id)}</div>
              </div>
              <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 20 }}>→</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>TO</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{tx.bb_id ?? '—'}</div>
                <div className="iban" style={{ fontSize: 12 }}>{fmt.iban(tx.ba_id)}</div>
              </div>
            </div>
          </div>

          <dl className="kv">
            <dt>amount</dt>    <dd>{fmt.num(tx.amount)}</dd>
            <dt>datetime</dt>  <dd>{fmt.dt(tx.datetime)}</dd>
            <dt>po_id</dt>     <dd>{tx.po_id}</dd>
            <dt>account_id</dt><dd>{fmt.iban(tx.account_id)}</dd>
            <dt>message</dt>   <dd>{tx.po_message ?? '—'}</dd>
            <dt>valid</dt>     <dd>{tx.isvalid ? <Pill kind="ok">valid</Pill> : <Pill kind="err">invalid</Pill>}</dd>
            <dt>complete</dt>  <dd>{tx.iscomplete ? <Pill kind="ok">complete</Pill> : <Pill kind="warn">pending</Pill>}</dd>
          </dl>
        </div>

        <div className="drawer-foot">
          <button className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(JSON.stringify(tx, null, 2))}>
            Copy JSON
          </button>
          <button className="btn" onClick={() => navigator.clipboard?.writeText(tx.po_id)}>
            Copy PO ID
          </button>
        </div>
      </aside>
    </>
  );
}
