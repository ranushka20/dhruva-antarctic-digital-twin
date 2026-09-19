// NavBar — five tabs: Overview, Stations, Logistics, Compliance, Sandbox.
// Per FRONTEND.md §6.1.

import { NavLink, useLocation } from 'react-router-dom';
import { Search, Bell, ChevronDown, Snowflake } from 'lucide-react';

const NAV_TABS = [
  { label: 'Overview', to: '/' },
  { label: 'Stations', to: '/stations/bharati/twin' },
  { label: 'Logistics', to: '/logistics' },
  { label: 'Compliance', to: '/compliance' },
  { label: 'Sandbox', to: '/sandbox' },
];

// Map child routes to parent tab
function getActiveTab(pathname: string): string {
  if (pathname === '/') return '/';
  if (pathname.startsWith('/stations') || pathname.startsWith('/assets') || pathname.startsWith('/environment')) return '/stations/bharati/twin';
  if (pathname.startsWith('/actions')) return '/stations/bharati/twin';
  if (pathname.startsWith('/logistics')) return '/logistics';
  if (pathname.startsWith('/compliance') || pathname.startsWith('/handover')) return '/compliance';
  if (pathname.startsWith('/sandbox')) return '/sandbox';
  if (pathname.startsWith('/comms') || pathname.startsWith('/station')) return '/stations/bharati/twin';
  return '/';
}

export function NavBar() {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  return (
    <nav
      className="glow-nav flex items-center h-[52px] px-5 gap-3 shrink-0 z-30"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      {/* Logo */}
      <NavLink to="/" className="flex items-center gap-2 mr-4">
        <Snowflake size={18} style={{ color: 'var(--ok)' }} />
        <span
          className="text-[15px] font-semibold tracking-[0.1em]"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Antarasetu
        </span>
      </NavLink>

      {/* Tabs */}
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

      {/* Search */}
      <button
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--panel-alt)] transition-colors"
        style={{ color: 'var(--text-3)' }}
        aria-label="Search assets, actions, records"
      >
        <Search size={16} />
      </button>

      {/* Alerts */}
      <button
        className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--panel-alt)] transition-colors"
        style={{ color: 'var(--text-3)' }}
        aria-label="Alerts"
      >
        <Bell size={16} />
        {/* Orange dot when unacked T0/T1 exists — placeholder, always shown */}
        <span
          className="absolute top-1 right-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: 'var(--act)' }}
        />
      </button>

      {/* User chip */}
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-full ml-1"
        style={{ backgroundColor: '#23302B' }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold"
          style={{ backgroundColor: 'var(--panel-alt)', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}
        >
          HQ
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[11.5px]" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
            HQ Operator
          </span>
          <span className="font-mono text-[8.5px]" style={{ color: 'var(--text-3)' }}>
            @hq_operator
          </span>
        </div>
        <ChevronDown size={12} style={{ color: 'var(--text-3)' }} />
      </div>
    </nav>
  );
}
