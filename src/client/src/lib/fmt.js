export const fmt = {
  iban:    (s) => s ? s.replace(/(.{4})/g, '$1 ').trim() : '—',
  eur:     (n) => (n < 0 ? '-' : '') + '€' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  num:     (n) => Math.abs(n ?? 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  shortDt: (s) => s ? s.slice(11, 19) : '—',
  dt:      (s) => s ?? '—',
};

export const PF_CODES = {
  '2000': { kind: 'ok',  label: 'OK' },
  '4001': { kind: 'err', label: 'Internal-only PO sent to CB' },
  '4002': { kind: 'err', label: 'Amount exceeds 500 EUR' },
  '4003': { kind: 'err', label: 'Negative amount' },
  '4004': { kind: 'err', label: 'Unknown bb_id at CB' },
  '4005': { kind: 'err', label: 'Duplicate po_id (pending)' },
  '4404': { kind: 'err', label: 'Beneficiary account not found' },
};

export function poOutState(po) {
  if (!po) return 'new';
  if (po.bb_code) return String(po.bb_code) === '2000' ? 'completed' : 'rejected';
  if (po.cb_code) return String(po.cb_code) === '2000' ? 'awaiting_ack' : 'failed';
  return 'pending';
}

export function poInState(po) {
  if (!po) return 'new';
  if (po.bb_code) return String(po.bb_code) === '2000' ? 'completed' : 'rejected';
  return 'pending_ack';
}
