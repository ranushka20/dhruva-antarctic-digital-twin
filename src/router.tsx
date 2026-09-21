// Antarasetu — React Router configuration
// All routes per FRONTEND.md §6.3.

import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';
import { AppShell } from '@/components/shell/AppShell';

// Lazy-load every page so heavy chunks (Three.js etc.) don't block initial paint.
const OverviewPage = lazy(() => import('@/pages/Overview'));
const TwinPage = lazy(() => import('@/pages/Twin'));
const ActionsPage = lazy(() => import('@/pages/Actions'));
const LogisticsPage = lazy(() => import('@/pages/Logistics'));
const ManifestPage = lazy(() => import('@/pages/Logistics/Manifest'));
const EnvironmentPage = lazy(() => import('@/pages/Environment'));
const CommsPage = lazy(() => import('@/pages/Comms'));
const StationConsolePage = lazy(() => import('@/pages/StationConsole'));
const CompliancePage = lazy(() => import('@/pages/Compliance'));
const SandboxPage = lazy(() => import('@/pages/Sandbox'));
const AssetsPage = lazy(() => import('@/pages/Assets'));
const HandoverPage = lazy(() => import('@/pages/Handover'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const LoginPage = lazy(() => import('@/pages/Login'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="font-mono text-[11px] animate-pulse" style={{ color: 'var(--text-3)' }}>
        Loading…
      </div>
    </div>
  );
}

function withSuspense(Component: ComponentType) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

const routes: RouteObject[] = [
  {
    // Login is outside the shell — no nav bar
    path: '/login',
    element: withSuspense(LoginPage),
  },
  {
    // The station console runs a REDUCED shell — station name, local time,
    // link banner, outbox counter, and nothing else. It is the station edge,
    // not a view of HQ, so it never carries the HQ nav tabs (Page 6 FR-5.1).
    path: '/station',
    element: withSuspense(StationConsolePage),
  },
  {
    // All other routes render inside AppShell
    element: <AppShell />,
    children: [
      { index: true, element: withSuspense(OverviewPage) },
      { path: 'stations/:id/twin', element: withSuspense(TwinPage) },
      { path: 'actions', element: withSuspense(ActionsPage) },
      { path: 'actions/:actionId', element: withSuspense(ActionsPage) },
      { path: 'logistics', element: withSuspense(LogisticsPage) },
      { path: 'logistics/manifest/:id', element: withSuspense(ManifestPage) },
      { path: 'environment', element: withSuspense(EnvironmentPage) },
      { path: 'comms', element: withSuspense(CommsPage) },
      { path: 'compliance', element: withSuspense(CompliancePage) },
      { path: 'sandbox', element: withSuspense(SandboxPage) },
      { path: 'assets', element: withSuspense(AssetsPage) },
      { path: 'assets/:assetId', element: withSuspense(AssetsPage) },
      { path: 'handover', element: withSuspense(HandoverPage) },
      { path: 'settings', element: withSuspense(SettingsPage) },
    ],
  },
];

export const router = createBrowserRouter(routes);
