import { useState } from 'react';
import { Icons } from '../lib/icons';
import { fmt } from '../lib/fmt';

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function NewPoModal({ accounts, bankInfo, onClose, onCreate }) {
  const [oa, setOa]   = useState(accounts[0]?.id ?? '');
  const [bb, setBb]   = useState('');
  const [ba, setBa]   = useState('');
  const [amt, setAmt] = useState('100.00');
  const [msg, setMsg] = useState('Workshop test run');
  const [err, setErr] = useState('');

  const overLimit = parseFloat(amt) > 500;

  const submit = () => {
    const n = parseFloat(amt);
    if (!oa) { setErr('Select an originator account.'); return; }
    if (!bb) { setErr('Enter a beneficiary bank BIC.'); return; }
    const baClean = ba.replace(/\s+/g, '').toUpperCase();
    if (!baClean) { setErr('Enter a beneficiary account IBAN.'); return; }
    if (isNaN(n) || n <= 0) { setErr('Amount must be positive.'); return; }
    if (n > 500) { setErr('Max 500 EUR per transaction.'); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(String(n))) { setErr('Max 2 decimal places.'); return; }

    const bic = bankInfo?.bank_bic ?? 'JOUWBIC';
    const po_id = `${bic}_${Date.now().toString(36).toUpperCase()}`;

    onCreate({
      po_id,
      po_amount: n,
      po_message: msg || 'Workshop test run',
      po_datetime: now(),
      oa_id: oa,
      bb_id: bb.toUpperCase(),
      ba_id: baClean,
    });
    onClose();
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>New payment order</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
              Will be added to PO_NEW. Use "Process PO_NEW" to send to the clearing bank.
            </div>
          </div>
          <button className="iconbtn" onClick={onClose}>{Icons.close()}</button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>Originator account (oa_id)</label>
            <select className="select mono" value={oa} onChange={e => setOa(e.target.value)}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{fmt.iban(a.id)} — €{parseFloat(a.balance).toFixed(2)}</option>
              ))}
            </select>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Beneficiary bank BIC (bb_id)</label>
              <input className="input mono" placeholder="e.g. BBRUBEBB" value={bb} onChange={e => setBb(e.target.value)} />
            </div>
            <div className="field">
              <label>Amount (max 500 EUR)</label>
              <input className="input mono" value={amt} onChange={e => setAmt(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Beneficiary account IBAN (ba_id)</label>
            <input className="input mono" placeholder="BE71096012345697" value={ba} onChange={e => setBa(e.target.value)} />
          </div>

          <div className="field">
            <label>Message (must include test-run name)</label>
            <input className="input" value={msg} onChange={e => setMsg(e.target.value)} />
          </div>

          {overLimit && (
            <div style={{ padding: '10px 12px', background: 'var(--err-tint)', color: 'var(--err-ink)', borderRadius: 'var(--r-md)', fontSize: 12.5 }}>
              Amount exceeds 500 EUR — CB will reject with code 4002.
            </div>
          )}
          {err && (
            <div style={{ padding: '10px 12px', background: 'var(--err-tint)', color: 'var(--err-ink)', borderRadius: 'var(--r-md)', fontSize: 12.5 }}>
              {err}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Create PO</button>
        </div>
      </div>
    </div>
  );
}
