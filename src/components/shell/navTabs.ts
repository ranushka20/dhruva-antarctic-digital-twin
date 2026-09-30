// OWNER: Dev B
// The five top-level nav tabs (FRONTEND.md §6.1), shared by NavBar (which
// renders them) and AppShell (which uses their order to pick the direction
// of the route transition).

export const NAV_TABS = [
  { label: 'Overview', to: '/' },
  { label: 'Stations', to: '/stations/bharati/twin' },
  { label: 'Logistics', to: '/logistics' },
  { label: 'Compliance', to: '/compliance' },
  { label: 'Sandbox', to: '/sandbox' },
] as const;

/** Secondary routes light up the nearest parent tab (FRONTEND.md §6). */
export function getActiveTab(pathname: string): string {
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

export function tabIndex(pathname: string): number {
  const active = getActiveTab(pathname);
  return NAV_TABS.findIndex((t) => t.to === active);
}
