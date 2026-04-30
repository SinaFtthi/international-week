import { Icons } from '../lib/icons';

const titles = {
  dashboard: 'Dashboard',
  accounts:  'Accounts',
  po:        'Payment orders',
  ack:       'Acknowledgements',
  tx:        'Transactions',
  log:       'Log',
};

export function Topbar({ route, onNew, bankInfo, user, onSettings, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{titles[route]}</div>
        <div className="topbar-crumbs">{bankInfo?.bank_name ?? '…'} / {route}</div>
      </div>
      <div className="spacer" />
      <div className="search">
        {Icons.search(14)}
        <input placeholder="Search po_id, IBAN, BIC…" readOnly />
        <kbd>⌘K</kbd>
      </div>
      <button className="iconbtn" title="Notifications">{Icons.bell(16)}</button>
      <button className="iconbtn" title="Instellingen" onClick={onSettings}>{Icons.cog(16)}</button>
      {user && (
        <span style={{
          fontSize: 12, fontWeight: 600, color: 'var(--ink-2)',
          background: 'var(--hair)', borderRadius: 6, padding: '4px 10px',
        }}>
          {user.username}
        </span>
      )}
      {user && (
        <button className="btn" style={{ fontSize: 12 }} onClick={onLogout} title="Uitloggen">
          Uitloggen
        </button>
      )}
      <button className="btn btn-primary" onClick={onNew}>
        {Icons.plus(14)} New PO
      </button>
    </header>
  );
}
