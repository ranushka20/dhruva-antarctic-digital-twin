// Antarasetu — React Router configuration
// All routes per FRONTEND.md §6.3.

import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { PageSkeleton } from '@/components/shared/Loading';

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

// The page mounts inside .route-view only once its chunk has loaded, so the
// entrance animation plays when the real content appears — not while the
// skeleton is showing. Two routes that render the same page component
// (/actions ↔ /actions/:id) reconcile in place, so opening a drawer never
// replays the page entrance. See styles/motion.css.
//
// `page` keys the boundary: without it React would reuse the same Suspense +
// div across different pages and the entrance would never replay.
function withSuspense(Component: ComponentType, page: string) {
  return (
    <Suspense key={page} fallback={<PageSkeleton />}>
      <div className="route-view">
        <Component />
      </div>
    </Suspense>
  );
}

const routes: RouteObject[] = [
  {
    // Login is outside the shell — no nav bar
    path: '/login',
    element: withSuspense(LoginPage, 'login'),
  },
  {
    // The station console runs a REDUCED shell — station name, local time,
    // link banner, outbox counter, and nothing else. It is the station edge,
    // not a view of HQ, so it never carries the HQ nav tabs (Page 6 FR-5.1).
    path: '/station',
    element: withSuspense(StationConsolePage, 'station'),
  },
  {
    // All other routes render inside AppShell
    element: <AppShell />,
    children: [
      { index: true, element: withSuspense(OverviewPage, 'overview') },
      { path: 'stations/:id/twin', element: withSuspense(TwinPage, 'twin') },
      { path: 'actions', element: withSuspense(ActionsPage, 'actions') },
      { path: 'actions/:actionId', element: withSuspense(ActionsPage, 'actions') },
      { path: 'logistics', element: withSuspense(LogisticsPage, 'logistics') },
      { path: 'logistics/manifest/:id', element: withSuspense(ManifestPage, 'manifest') },
      { path: 'environment', element: withSuspense(EnvironmentPage, 'environment') },
      { path: 'comms', element: withSuspense(CommsPage, 'comms') },
      { path: 'compliance', element: withSuspense(CompliancePage, 'compliance') },
      { path: 'sandbox', element: withSuspense(SandboxPage, 'sandbox') },
      { path: 'assets', element: withSuspense(AssetsPage, 'assets') },
      { path: 'assets/:assetId', element: withSuspense(AssetsPage, 'assets') },
      { path: 'handover', element: withSuspense(HandoverPage, 'handover') },
      { path: 'settings', element: withSuspense(SettingsPage, 'settings') },
    ],
  },
];

export const router = createBrowserRouter(routes);
