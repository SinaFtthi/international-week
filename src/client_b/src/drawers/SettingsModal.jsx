import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Pill } from '../components/Pill';
import { Icons } from '../lib/icons';
import { fmt } from '../lib/fmt';

export function SettingsModal({ user, onClose }) {
  const [tab, setTab] = useState('users');

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" style={{ width: 480 }}>
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="drawer-title">Instellingen</div>
            <div className="drawer-sub">Ingelogd als {user?.username} · {user?.role}</div>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Sluiten">
            {Icons.close()}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '0 20px', borderBottom: '1px solid var(--hair)' }}>
          {user?.role === 'admin' && (
            <TabBtn active={tab === 'users'} onClick={() => setTab('users')}>Gebruikers</TabBtn>
          )}
          <TabBtn active={tab === 'general'} onClick={() => setTab('general')}>Algemeen</TabBtn>
        </div>

        <div className="drawer-body" style={{ padding: 20 }}>
          {tab === 'users'   && <UsersTab currentUser={user} />}
          {tab === 'general' && <GeneralTab user={user} />}
        </div>
      </aside>
    </>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '10px 14px', fontSize: 13, fontWeight: active ? 600 : 400,
        color: active ? 'var(--brand)' : 'var(--ink-2)',
        borderBottom: active ? '2px solid var(--brand)' : '2px solid transparent',
        marginBottom: -1,
      }}
    >
      {children}
    </button>
  );
}

function UsersTab({ currentUser }) {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [newUser,  setNewUser]  = useState({ username: '', password: '', role: 'user' });
  const [adding,   setAdding]   = useState(false);
  const [addErr,   setAddErr]   = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      if (Array.isArray(res)) setUsers(res);
      else setError(res?.message ?? 'Fout bij laden');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) { setAddErr('Vul alle velden in.'); return; }
    setAdding(true); setAddErr('');
    const res = await api.createUser(newUser.username, newUser.password, newUser.role);
    setAdding(false);
    if (res?.ok) {
      setNewUser({ username: '', password: '', role: 'user' });
      load();
    } else {
      setAddErr(res?.message ?? 'Fout bij aanmaken');
    }
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Gebruiker "${username}" verwijderen?`)) return;
    setDeleting(id);
    await api.deleteUser(id);
    setDeleting(null);
    load();
  };

  if (loading) return <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Laden…</div>;
  if (error)   return <div style={{ color: 'var(--err)', fontSize: 13 }}>{error}</div>;

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Gebruikers ({users.length})
      </div>

      <table className="tbl" style={{ marginBottom: 24 }}>
        <thead><tr>
          <th>Gebruikersnaam</th><th>Rol</th><th>Aangemaakt</th><th></th>
        </tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td style={{ fontWeight: u.username === currentUser?.username ? 600 : 400 }}>
                {u.username}
                {u.username === currentUser?.username && (
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 6 }}>(jij)</span>
                )}
              </td>
              <td><Pill kind={u.role === 'admin' ? 'info' : 'ok'}>{u.role}</Pill></td>
              <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {fmt.dt(u.created_at)}
              </td>
              <td style={{ textAlign: 'right' }}>
                {u.username !== currentUser?.username && (
                  <button
                    className="btn"
                    style={{ fontSize: 12, padding: '3px 10px', color: 'var(--err)' }}
                    onClick={() => handleDelete(u.id, u.username)}
                    disabled={deleting === u.id}
                  >
                    {deleting === u.id ? '…' : 'Verwijder'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Gebruiker toevoegen
      </div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Gebruikersnaam</label>
          <input className="input" value={newUser.username}
            onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
            placeholder="janepoe" style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: '1 1 130px' }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Wachtwoord</label>
          <input className="input" type="password" value={newUser.password}
            onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
            placeholder="••••••••" style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: '0 0 110px' }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Rol</label>
          <select className="input" value={newUser.role}
            onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
            style={{ width: '100%', boxSizing: 'border-box' }}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={adding} style={{ flexShrink: 0 }}>
          {adding ? '…' : '+ Toevoegen'}
        </button>
      </form>
      {addErr && <div style={{ color: 'var(--err)', fontSize: 13, marginTop: 8 }}>{addErr}</div>}
    </div>
  );
}

function GeneralTab({ user }) {
  return (
    <dl className="kv">
      <dt>Gebruiker</dt>  <dd>{user?.username}</dd>
      <dt>Rol</dt>        <dd><Pill kind={user?.role === 'admin' ? 'info' : 'ok'}>{user?.role}</Pill></dd>
      <dt>Sessie TTL</dt> <dd>30 minuten inactiviteit</dd>
    </dl>
  );
}
