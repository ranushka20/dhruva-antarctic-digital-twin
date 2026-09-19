// OWNER: Dev B
// AppShell — nav bar, the app-wide chain banner, the command palette and the
// session-expiry notice. Also the one place the local stores are seeded, so
// every page can assume data exists without each one guarding for it.

import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { NavBar } from './NavBar';
import { CommandPalette } from './CommandPalette';
import { ChainBanner } from '@/components/shared/ChainBanner';
import { ensureSeeded } from '@/state/bootstrap';
import { refreshChainStatus } from '@/lib/hashChain';
import { useSession, renewSession, secondsUntilExpiry, EXPIRY_WARNING_SECONDS } from '@/state/auth';
import { formatDuration } from '@/lib/time';
import { useTick } from '@/state/useStore';

export function AppShell() {
  const [ready, setReady] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureSeeded()
      .then(() => refreshChainStatus('hq'))
      .catch((err) => console.error('[bootstrap] seeding failed', err))
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  // FR-13.1 / FR-2.2 — Cmd/Ctrl + Space opens global search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden glow-page"
      style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}
    >
      <NavBar onOpenSearch={() => setPaletteOpen(true)} />
      <ChainBanner />
      <SessionNotice />
      <main className="flex-1 min-h-0 overflow-y-auto">
        {ready ? (
          <Outlet />
        ) : (
          <div className="flex items-center justify-center h-64">
            <span className="font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
              Restoring last known state…
            </span>
          </div>
        )}
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

/**
 * FR-C6 — warn five minutes ahead and offer renewal. Expiry never discards
 * queued local records, so the message says so rather than implying data loss.
 */
function SessionNotice() {
  const session = useSession();
  useTick(20_000);
  const remaining = secondsUntilExpiry(session);
  if (remaining === null || remaining > EXPIRY_WARNING_SECONDS) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2.5 px-5 py-1.5 shrink-0"
      style={{ backgroundColor: 'rgba(217,164,65,0.12)', borderBottom: '1px solid var(--watch)' }}
    >
      <span className="text-[12px]" style={{ color: 'var(--watch-soft)' }}>
        Session expires in <span className="font-mono">{formatDuration(remaining)}</span>. Queued
        local records are kept either way.
      </span>
      <button
        type="button"
        onClick={() => renewSession()}
        className="ml-auto font-mono text-[9.5px] tracking-[0.08em] px-2.5 py-1 rounded-full"
        style={{ border: '1px solid var(--watch)', color: 'var(--watch-soft)' }}
      >
        RENEW
      </button>
    </div>
  );
}
