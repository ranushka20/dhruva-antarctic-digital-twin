// OWNER: Dev B
// NavBar — five tabs, search, alerts, user chip (FRONTEND.md §6.1).
// The alert dot is real: it lights only when an unacknowledged T0 or T1
// exists on EITHER station, which is the one condition worth interrupting
// an operator for.

import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, Snowflake, LogOut } from 'lucide-react';
import { useState } from 'react';
import { hasUrgentUnacked } from '@/state/data';
import { useStoreValue } from '@/state/useStore';
import { useSession, logout, ROLE_LABEL } from '@/state/auth';

const NAV_TABS = [
  { label: 'Overview', to: '/' },
  { label: 'Stations', to: '/stations/bharati/twin' },
  { label: 'Logistics', to: '/logistics' },
  { label: 'Compliance', to: '/compliance' },
  { label: 'Sandbox', to: '/sandbox' },
];

/** Secondary routes light up the nearest parent tab (FRONTEND.md §6). */
function getActiveTab(pathname: string): string {
  if (pathname === '/') return '/';
  if (pathname.startsWith('/logistics')) return '/logistics';
  if (pathname.startsWith('/compliance') || pathname.startsWith('/handover')) return '/compliance';
  if (pathname.startsWith('/sandbox')) return '/sandbox';
  if (pathname.startsWith('/actions') || pathname.startsWith('/comms') || pathname.startsWith('/settings')) return '/';
  if (pathname.startsWith('/stations') || pathname.startsWith('/assets') || pathname.startsWith('/environment')) {
    return '/stations/bharati/twin';
  }
  return '/';
}

export function NavBar({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const urgent = useStoreValue(hasUrgentUnacked);
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="glow-nav flex items-center h-[52px] px-5 gap-3 shrink-0 z-30"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      <NavLink to="/" className="flex items-center gap-2 mr-4">
        <Snowflake size={18} style={{ color: 'var(--ok)' }} aria-hidden />
        <span
          className="text-[15px] font-semibold tracking-[0.1em]"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Antarasetu
        </span>
      </NavLink>

      <div className="flex items-center gap-1">
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.to;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-colors"
              style={{
                fontFamily: 'var(--font-body)',
                backgroundColor: isActive ? 'var(--text)' : 'transparent',
                color: isActive ? 'var(--bg)' : 'var(--text-3)',
              }}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onOpenSearch}
        className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--panel-alt)]"
        style={{ color: 'var(--text-3)' }}
        aria-label="Search assets, actions, records"
      >
        <Search size={16} />
      </button>

      <button
        type="button"
        onClick={() => navigate('/actions?state=RAISED')}
        className="relative w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--panel-alt)]"
        style={{ color: 'var(--text-3)' }}
        aria-label={urgent ? 'Alerts — unacknowledged T0/T1 action open' : 'Alerts — none unacknowledged'}
      >
        <Bell size={16} />
        {urgent && (
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--act)' }}
          />
        )}
      </button>

      <div className="relative ml-1">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-full"
          style={{ backgroundColor: '#23302B' }}
          aria-expanded={menuOpen}
          aria-label="Account menu"
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{ backgroundColor: 'var(--panel-alt)', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}
          >
            {session.initials}
          </span>
          <span className="flex flex-col leading-tight items-start">
            <span className="text-[11.5px]" style={{ color: 'var(--text)' }}>{session.name}</span>
            <span className="font-mono text-[8.5px]" style={{ color: 'var(--text-3)' }}>{session.handle}</span>
          </span>
          <ChevronDown size={12} style={{ color: 'var(--text-3)' }} />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 mt-1.5 w-52 p-1.5 z-50"
            style={{
              backgroundColor: 'var(--panel-alt)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--r-inner)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            }}
          >
            <p className="px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>
              {ROLE_LABEL[session.role].toUpperCase()}
            </p>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); navigate('/settings'); }}
              className="w-full text-left px-2.5 py-1.5 rounded text-[12px] hover:bg-[var(--panel-raised)]"
              style={{ color: 'var(--text-2)' }}
            >
              Settings &amp; parameters
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); navigate('/station'); }}
              className="w-full text-left px-2.5 py-1.5 rounded text-[12px] hover:bg-[var(--panel-raised)]"
              style={{ color: 'var(--text-2)' }}
            >
              Station console
            </button>
            <button
              type="button"
              onClick={() => { logout(); setMenuOpen(false); navigate('/login'); }}
              className="w-full flex items-center gap-2 text-left px-2.5 py-1.5 rounded text-[12px] hover:bg-[var(--panel-raised)]"
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
