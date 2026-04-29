import { useMemo } from 'react';
import { Pill, CodePill } from '../components/Pill';
import { Icons } from '../lib/icons';
import { fmt } from '../lib/fmt';

export function PoDrawer({ po, kind, onClose }) {
  if (!po) return null;

  const isInternal = po.ob_id && po.bb_id && po.ob_id === po.bb_id;

  const steps = useMemo(() => {
    if (isInternal) return [
      {
        key: 'created',
        label: 'PO created (OB)',
        meta: po.po_datetime ?? 'pending',
        status: 'done',
      },
      {
        key: 'internal',
        label: 'Internal transaction processed',
        meta: kind === 'PO_NEW' ? 'queued — run Process PO_NEW' : 'direct (no CB)',
        status: kind === 'PO_NEW' ? 'pending' : 'done',
      },
    ];
    return [
      {
        key: 'created',
        label: 'PO created (OB)',
        meta: po.po_datetime ?? 'pending',
        status: 'done',
      },
      {
        key: 'ob',
        label: 'OB validation',
        meta: po.ob_datetime ? `${po.ob_code ?? ''} · ${po.ob_datetime}` : 'pending',
        status: po.ob_code ? (String(po.ob_code) === '2000' ? 'done' : 'err') : 'pending',
      },
      {
        key: 'cb',
        label: 'CB validation',
        meta: po.cb_datetime ? `${po.cb_code ?? ''} · ${po.cb_datetime}` : 'pending',
        status: po.cb_code ? (String(po.cb_code) === '2000' ? 'done' : 'err') : 'pending',
      },
      {
        key: 'bb',
        label: 'BB validation & credit',
        meta: po.bb_datetime ? `${po.bb_code ?? ''} · ${po.bb_datetime}` : 'awaiting',
        status: po.bb_code ? (String(po.bb_code) === '2000' ? 'done' : 'err') : 'pending',
      },
    ];
  }, [po, isInternal, kind]);

  const pillKind = (() => {
    if (isInternal) return kind === 'PO_NEW' ? 'warn' : 'ok';
    if (po.bb_code) return String(po.bb_code) === '2000' ? 'ok' : 'err';
    if (po.cb_code) return String(po.cb_code) === '2000' ? 'warn' : 'err';
    return 'warn';
  })();

  const stateLabel = (() => {
    if (isInternal) return kind === 'PO_NEW' ? 'queued (internal)' : 'internal';
    if (po.bb_code) return String(po.bb_code) === '2000' ? 'completed' : 'rejected';
    if (po.cb_code) return String(po.cb_code) === '2000' ? 'awaiting ack' : 'failed';
    if (kind === 'PO_NEW') return 'queued';
    return 'pending';
  })();

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="drawer-title">{po.po_id}</div>
            <div className="drawer-sub">{kind} · {po.po_message}</div>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            {Icons.close()}
          </button>
        </div>

        <div className="drawer-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div className="kpi-value" style={{ fontSize: 28 }}>{fmt.eur(po.po_amount)}</div>
            <Pill kind={pillKind}>{stateLabel}</Pill>
          </div>

          <h4 style={{ margin: '8px 0 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>
            Lifecycle
          </h4>
          <div className="steps">
            {steps.map((s, i) => (
              <div key={s.key} className={`step ${s.status}`}>
                <div className="bullet">{i + 1}</div>
                <div>
                  <div className="label">{s.label}</div>
                  <div className="meta">{s.meta}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="divider" />

          <h4 style={{ margin: '8px 0 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>
            Message fields
          </h4>
          <dl className="kv">
            <dt>po_id</dt>      <dd>{po.po_id}</dd>
            <dt>po_amount</dt>  <dd>{fmt.num(po.po_amount)}</dd>
            <dt>po_message</dt> <dd style={{ fontFamily: 'inherit' }}>{po.po_message}</dd>
            <dt>po_datetime</dt><dd>{fmt.dt(po.po_datetime)}</dd>
            <dt>ob_id</dt>      <dd>{po.ob_id}</dd>
            <dt>oa_id</dt>      <dd>{fmt.iban(po.oa_id)}</dd>
            <dt>ob_code</dt>    <dd><CodePill code={po.ob_code} /></dd>
            <dt>ob_datetime</dt><dd>{fmt.dt(po.ob_datetime)}</dd>
            <dt>cb_code</dt>    <dd><CodePill code={po.cb_code} /></dd>
            <dt>cb_datetime</dt><dd>{fmt.dt(po.cb_datetime)}</dd>
            <dt>bb_id</dt>      <dd>{po.bb_id}</dd>
            <dt>ba_id</dt>      <dd>{fmt.iban(po.ba_id)}</dd>
            <dt>bb_code</dt>    <dd><CodePill code={po.bb_code} /></dd>
            <dt>bb_datetime</dt><dd>{fmt.dt(po.bb_datetime)}</dd>
          </dl>
        </div>

        <div className="drawer-foot">
          <button className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(JSON.stringify(po, null, 2))}>
            Copy JSON
          </button>
          <button className="btn" onClick={() => navigator.clipboard?.writeText(po.po_id)}>
            Copy ID
          </button>
        </div>
      </aside>
    </>
  );
}
