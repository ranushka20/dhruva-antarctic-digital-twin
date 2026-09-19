// AppShell — layout wrapper providing NavBar + page padding + ambient glow background.
// Every page renders inside <AppShell>. Per FRONTEND.md §6.

import { Outlet } from 'react-router-dom';
import { NavBar } from './NavBar';

export function AppShell() {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden glow-page" style={{ color: 'var(--text)' }}>
      <NavBar />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
