// OWNER: Dev B
// PAGE 10c — Auth (/login).
//
// FRONTEND-ONLY BUILD. The JWT-shaped token is issued and verified in the
// browser and role claims gate the UI only. That is stated on the card
// rather than implied away — a login screen that looks like real security
// while providing none is the kind of thing an examiner asks about once.
//
// FR-C4: a failed sign-in gives one generic message. Never reveal whether
// the username exists.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snowflake, ArrowRight, Terminal } from 'lucide-react';
import { login, AuthError, DEMO_ACCOUNTS, ROLE_LABEL } from '@/state/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      login(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const field = {
    backgroundColor: 'var(--panel-raised)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-inner)',
    color: 'var(--text)',
  } as const;

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-5 glow-page"
      style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}
    >
      <main
        className="w-full max-w-[400px] p-6"
        style={{
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-card)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Snowflake size={20} style={{ color: 'var(--ok)' }} aria-hidden />
          <h1
            className="text-headline font-semibold tracking-[0.1em]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            DHRUVA
          </h1>
        </div>
        <p className="text-body-sm mb-5" style={{ color: 'var(--text-3)' }}>
          Digital platform for remote management of Indian Antarctic research stations
        </p>

        <form onSubmit={submit}>
          <label className="block font-mono text-micro uppercase tracking-label mb-1" style={{ color: 'var(--text-4)' }}>
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="w-full px-3 mb-3 text-body outline-none"
            style={{ ...field, minHeight: 44 }}
          />

          <label className="block font-mono text-micro uppercase tracking-label mb-1" style={{ color: 'var(--text-4)' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full px-3 mb-3 text-body outline-none"
            style={{ ...field, minHeight: 44 }}
          />

          {error && (
            <p className="text-body-sm mb-3" style={{ color: 'var(--act-soft)' }} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !username || !password}
            className="w-full flex items-center justify-center gap-2 rounded-full text-body font-medium"
            style={{
              minHeight: 46,
              backgroundColor: username && password ? 'var(--act)' : 'var(--panel-raised)',
              color: username && password ? 'var(--bg)' : 'var(--text-4)',
            }}
          >
            Sign in <ArrowRight size={14} />
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/station')}
          className="w-full flex items-center justify-center gap-2 mt-2.5 rounded-full text-body"
          style={{ minHeight: 44, border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
        >
          <Terminal size={13} /> Station console
        </button>

        {/* Roles come from the account — never offered as a choice at sign-in */}
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
          <p className="font-mono text-micro uppercase tracking-label mb-2" style={{ color: 'var(--text-4)' }}>
            Provisioned accounts
          </p>
          <ul className="space-y-1">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.username}>
                <button
                  type="button"
                  onClick={() => { setUsername(a.username); setPassword('antarasetu'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-left rounded"
                  style={{ backgroundColor: 'var(--panel-raised)' }}
                >
                  <span className="font-mono text-caption flex-1" style={{ color: 'var(--text-2)' }}>
                    {a.username}
                  </span>
                  <span className="font-mono text-micro" style={{ color: 'var(--text-4)' }}>
                    {ROLE_LABEL[a.role]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-caption mt-3" style={{ color: 'var(--text-4)' }}>
            Accounts are provisioned — there is no registration, password reset or SSO in this
            build. This is a frontend-only prototype: the token is issued and checked in the
            browser and role claims gate the interface only, not data access.
          </p>
        </div>
      </main>
    </div>
  );
}
