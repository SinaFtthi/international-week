import { Icons } from '../lib/icons';

const items = [
  { key: 'dashboard',  label: 'Dashboard',        icon: Icons.dash    },
  { key: 'accounts',   label: 'Accounts',          icon: Icons.account },
  { key: 'po',         label: 'Payment orders',    icon: Icons.arrow   },
  { key: 'ack',        label: 'Acknowledgements',  icon: Icons.ack     },
  { key: 'tx',         label: 'Transactions',      icon: Icons.tx      },
  { key: 'log',        label: 'Log',               icon: Icons.log     },
];

export function Sidebar({ route, setRoute, counts, bankInfo }) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 14l5-5 4 4 7-9" />
            <circle cx="20" cy="4" r="1.6" fill="currentColor" />
          </svg>
        </div>
        <div>
          <div className="brand-name">PingFin</div>
          <div className="brand-meta">{bankInfo?.bank_bic ?? '…'}</div>
        </div>
      </div>

      <div className="nav-section">Operations</div>
      {items.slice(0, 5).map(it => (
        <button
          key={it.key}
          className={`nav-item ${route === it.key ? 'active' : ''}`}
          onClick={() => setRoute(it.key)}
        >
          <span style={{ display: 'inline-flex' }}>{it.icon(16)}</span>
          <span>{it.label}</span>
          {counts[it.key] != null && <span className="nav-count">{counts[it.key]}</span>}
        </button>
      ))}

      <div className="nav-section">Audit</div>
      {items.slice(5).map(it => (
        <button
          key={it.key}
          className={`nav-item ${route === it.key ? 'active' : ''}`}
          onClick={() => setRoute(it.key)}
        >
          <span style={{ display: 'inline-flex' }}>{it.icon(16)}</span>
          <span>{it.label}</span>
          {counts[it.key] != null && <span className="nav-count">{counts[it.key]}</span>}
        </button>
      ))}

      <div className="sidebar-foot">
        <div className="avatar">PF</div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>Bank Operator</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{bankInfo?.bank_name ?? '…'}</div>
        </div>
        <div className="signal" title="Connected" />
      </div>
    </aside>
  );
}
