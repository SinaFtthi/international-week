export function Pill({ kind = 'info', children }) {
  return (
    <span className={`pill ${kind}`}>
      <span className="dot" />
      {children}
    </span>
  );
}

export function CodePill({ code }) {
  const PF_CODES = {
    '2000': 'ok', '4001': 'err', '4002': 'err', '4003': 'err',
    '4004': 'err', '4005': 'err', '4404': 'err',
  };
  if (!code) return <span className="code-pill muted">—</span>;
  const kind = PF_CODES[String(code)] ?? 'muted';
  return <span className={`code-pill ${kind}`}>{code}</span>;
}
