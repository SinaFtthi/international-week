import { useState } from 'react';
import { api } from '../lib/api';

export function LoginPage({ onLogin, bankInfo }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Vul gebruikersnaam en wachtwoord in.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.login(username, password);
      if (res?.ok && res?.data?.token) {
        localStorage.setItem('session_token', res.data.token);
        onLogin({ username: res.data.username, role: res.data.role });
      } else {
        setError(res?.message ?? 'Inloggen mislukt. Controleer je gegevens.');
      }
    } catch (_) {
      setError('Server niet bereikbaar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)',
    }}>
      <div style={{ width: 360 }}>
        {/* Logo / brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--brand)', letterSpacing: '-0.5px' }}>
            PingFin
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
            {bankInfo?.bank_name ?? 'Bank'} · {bankInfo?.bank_bic ?? ''}
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Inloggen</div>

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
                Gebruikersnaam
              </label>
              <input
                className="input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="admin"
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
                Wachtwoord
              </label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--err-bg, #fff0f0)', color: 'var(--err)',
                border: '1px solid var(--err)', borderRadius: 6,
                padding: '8px 12px', fontSize: 13, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '9px 0' }}
            >
              {loading ? 'Bezig…' : 'Inloggen'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', marginTop: 16 }}>
          Sessie verloopt na 30 minuten inactiviteit
        </div>
      </div>
    </div>
  );
}
