// OWNER: Dev B
// AppShell — nav bar, the app-wide chain banner, the command palette and the
// session-expiry notice. Also the one place the local stores are seeded, so
// every page can assume data exists without each one guarding for it.

import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState, type CSSProperties } from 'react';
import { NavBar } from './NavBar';
import { tabIndex } from './navTabs';
import { PageSkeleton } from '@/components/shared/Loading';
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

  // Route transition direction: moving right along the nav tabs slides the
  // new page in from the right, moving left from the left. Drill-ins within
  // a tab (Overview → Action Centre) only fade and assemble.
  const { pathname } = useLocation();
  const [route, setRoute] = useState({ path: pathname, dx: 0 });
  if (route.path !== pathname) {
    setRoute({ path: pathname, dx: Math.sign(tabIndex(pathname) - tabIndex(route.path)) * 14 });
  }

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
      <main
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ '--route-dx': route.dx + 'px' } as CSSProperties}
      >
        {ready ? <Outlet /> : <PageSkeleton label="Restoring last known state" />}
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
      className="m-toast flex items-center gap-2.5 px-5 py-1.5 shrink-0"
      style={{ backgroundColor: 'rgba(217,164,65,0.12)', borderBottom: '1px solid var(--watch)' }}
    >
      <span className="text-body" style={{ color: 'var(--watch-soft)' }}>
        Session expires in <span className="font-mono">{formatDuration(remaining)}</span>. Queued
        local records are kept either way.
      </span>
      <button
        type="button"
        onClick={() => renewSession()}
        className="ml-auto text-body-sm font-medium px-3 py-1 rounded-full"
        style={{ border: '1px solid var(--watch)', color: 'var(--watch-soft)', fontFamily: 'var(--font-body)' }}
      >
        Renew
      </button>
    </div>
  );
}
