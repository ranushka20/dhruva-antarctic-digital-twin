// OWNER: Dev B
// NavBar — five tabs, search, alerts, user chip (FRONTEND.md §6.1).
// The alert dot is real: it lights only when an unacknowledged T0 or T1
// exists on EITHER station, which is the one condition worth interrupting
// an operator for.

import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, Snowflake, LogOut, ALargeSmall } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { hasUrgentUnacked } from '@/state/data';
import { useStoreValue } from '@/state/useStore';
import { useSession, logout, ROLE_LABEL } from '@/state/auth';
import { usePresence } from '@/hooks/usePresence';
import { NAV_TABS, getActiveTab } from './navTabs';
import { TEXT_SIZES, setTextSize, useTextSize } from '@/state/textSize';
import { ActiveIndicator } from '@/components/shared/ActiveIndicator';

const TAB_CLASS = 'px-3.5 py-1.5 rounded-full text-body-sm font-medium whitespace-nowrap';

export function NavBar({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const urgent = useStoreValue(hasUrgentUnacked);
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = usePresence(menuOpen, 120);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <nav
      className="glow-nav flex items-center h-[3.5rem] px-6 gap-3 shrink-0 z-30"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      <NavLink to="/" className="flex items-center gap-2 mr-4">
        <Snowflake size={18} style={{ color: 'var(--ok)' }} aria-hidden />
        <span
          className="text-title font-semibold tracking-[0.1em]"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          DHRUVA
        </span>
      </NavLink>

      <NavTabs activeTab={activeTab} />

      <div className="flex-1" />

      <TextSizeControl />

      <button
        type="button"
        onClick={onOpenSearch}
        data-press="icon"
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--panel-alt)]"
        style={{ color: 'var(--text-3)' }}
        aria-label="Search assets, actions, records"
      >
        <Search size={18} />
      </button>

      <button
        type="button"
        onClick={() => navigate('/actions?state=RAISED')}
        data-press="icon"
        className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--panel-alt)]"
        style={{ color: 'var(--text-3)' }}
        aria-label={urgent ? 'Alerts — unacknowledged T0/T1 action open' : 'Alerts — none unacknowledged'}
      >
        <Bell size={18} />
        {urgent && (
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--act)' }}
          >
            <span className="m-ping" aria-hidden />
          </span>
        )}
      </button>

      <div className="relative ml-1" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-full"
          style={{ backgroundColor: '#23302B' }}
          aria-expanded={menuOpen}
          aria-label="Account menu"
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-caption font-semibold"
            style={{ backgroundColor: 'var(--panel-alt)', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}
          >
            {session.initials}
          </span>
          <span className="flex flex-col leading-tight items-start">
            <span className="text-body-sm" style={{ color: 'var(--text)' }}>{session.name}</span>
            <span className="font-mono text-micro" style={{ color: 'var(--text-3)' }}>{session.handle}</span>
          </span>
          <ChevronDown
            size={12}
            style={{
              color: 'var(--text-3)',
              rotate: menuOpen ? '180deg' : '0deg',
              transition: 'rotate var(--dur-base) var(--ease-out)',
            }}
          />
        </button>

        {menu.mounted && (
          <div
            data-state={menu.state}
            className="m-pop absolute right-0 mt-2 w-64 p-2 z-50"
            style={{
              backgroundColor: 'var(--panel-alt)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--r-inner)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
              ['--pop-origin' as string]: 'top right',
            }}
          >
            <p className="px-2.5 py-1.5 font-mono text-micro tracking-label" style={{ color: 'var(--text-3)' }}>
              {ROLE_LABEL[session.role].toUpperCase()}
            </p>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); navigate('/settings'); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-body hover:bg-[var(--panel-raised)]"
              style={{ color: 'var(--text-2)' }}
            >
              Settings &amp; parameters
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); navigate('/station'); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-body hover:bg-[var(--panel-raised)]"
              style={{ color: 'var(--text-2)' }}
            >
              Station console
            </button>
            <button
              type="button"
              onClick={() => { logout(); setMenuOpen(false); navigate('/login'); }}
              className="w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-lg text-body hover:bg-[var(--panel-raised)]"
              style={{ color: 'var(--text-2)' }}
            >
              <LogOut size={12} /> Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

/**
 * The tab row is drawn twice: the base layer (muted labels, the real links)
 * and an aria-hidden "active" layer — white pill, dark labels — clipped to
 * the active tab. Changing tab animates the clip, so the pill slides and each
 * label changes colour exactly as the pill edge crosses it.
 */
function NavTabs({ activeTab }: { activeTab: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const clip = clipRef.current;
    if (!list || !clip) return;
    const place = () => {
      const active = list.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) {
        clip.style.opacity = '0';
        return;
      }
      const left = active.offsetLeft;
      const right = list.offsetWidth - left - active.offsetWidth;
      clip.style.clipPath = `inset(0 ${right}px 0 ${left}px round 999px)`;
      clip.style.opacity = '1';
    };
    place();
    const resize = new ResizeObserver(place);
    resize.observe(list);
    return () => resize.disconnect();
  }, [activeTab]);

  // Enable the transition only after the first placement has painted.
  useEffect(() => {
    const raf = requestAnimationFrame(() => clipRef.current?.setAttribute('data-ready', ''));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={listRef} className="relative flex items-center gap-1">
      {NAV_TABS.map((tab) => {
        const isActive = activeTab === tab.to;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            data-press="none"
            className={`${TAB_CLASS} hover:bg-[var(--panel-alt)] hover:text-[var(--text-2)]`}
            style={{ fontFamily: 'var(--font-body)', color: 'var(--text-3)' }}
          >
            {tab.label}
          </Link>
        );
      })}
      <div
        ref={clipRef}
        aria-hidden
        className="m-nav-clip absolute inset-0 flex items-center gap-1 pointer-events-none"
        style={{ backgroundColor: 'var(--text)', clipPath: 'inset(0 100% 0 0 round 999px)' }}
      >
        {NAV_TABS.map((tab) => (
          <span key={tab.to} className={TAB_CLASS} style={{ fontFamily: 'var(--font-body)', color: 'var(--bg)' }}>
            {tab.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Reading-comfort control. A visible "Aa" button rather than a buried
 * setting: the people who need larger text are the least likely to go
 * looking for it in a menu.
 */
function TextSizeControl() {
  const size = useTextSize();
  const [open, setOpen] = useState(false);
  const pop = usePresence(open, 120);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-press="icon"
        className="h-10 px-3 flex items-center gap-1.5 rounded-full hover:bg-[var(--panel-alt)]"
        style={{ color: 'var(--text-2)' }}
        aria-expanded={open}
        aria-label="Text size"
        title="Text size"
      >
        <ALargeSmall size={18} />
        <span className="text-body-sm hidden xl:inline">Text size</span>
      </button>

      {pop.mounted && (
        <div
          data-state={pop.state}
          role="dialog"
          aria-label="Text size"
          className="m-pop absolute right-0 mt-2 p-4 z-50 w-[19rem]"
          style={{
            backgroundColor: 'var(--panel-alt)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--r-card)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            ['--pop-origin' as string]: 'top right',
          }}
        >
          <p className="text-body font-medium mb-1" style={{ color: 'var(--text)' }}>Text size</p>
          <p className="text-body-sm mb-3" style={{ color: 'var(--text-3)' }}>
            Makes all text and spacing larger. Saved on this computer.
          </p>
          <div
            data-segmented
            className="relative isolate grid grid-cols-3 gap-1 p-1 rounded-2xl"
            style={{ border: '1px solid var(--line)' }}
          >
            {TEXT_SIZES.map((t, i) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={size === t.id}
                onClick={() => setTextSize(t.id)}
                className="flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl"
                style={{ color: size === t.id ? 'var(--bg)' : 'var(--text-2)' }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: `${1 + i * 0.25}rem`, lineHeight: 1 }} aria-hidden>
                  A
                </span>
                <span className="text-caption">{t.label}</span>
              </button>
            ))}
            <ActiveIndicator className="rounded-xl" style={{ backgroundColor: 'var(--text)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
