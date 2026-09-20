// OWNER: Dev B
// connectivity — the link-state module. This is the app's simulated network
// condition: /comms owns the toggle, every other page (including Dev A's)
// READS from here and never writes.
//
// Frontend-only build: there is no WAN to observe, so the state is explicit
// and operator-driven rather than measured. The demo outage writes to a
// separate scenario bucket so it can never be confused with a real record
// (NFR-6.7).

import {
  type SyncState,
  type CommunicationEvent,
  type ConnectivityState,
  getConnectivity as contractGetConnectivity,
  setConnectivity as contractSetConnectivity,
} from '@/shared/contracts';
import { readStore, writeStore } from '@/lib/localStore';
import { ageSeconds } from '@/lib/time';
import { useStoreValue } from '@/state/useStore';
import { useCallback } from 'react';

export type StationId = 'bharati' | 'maitri';
export type { ConnectivityState };

export const STATION_IDS: StationId[] = ['bharati', 'maitri'];

// ---- Link state -------------------------------------------------------------

export function getConnectivity(stationId: StationId): ConnectivityState {
  return contractGetConnectivity(stationId);
}

export interface SyncInfo {
  state: SyncState;
  lastSyncAt: string;
  ageSeconds: number;
  /** True while the demo outage scenario is driving this station. */
  simulated: boolean;
}

function lastSyncKey(stationId: StationId): string {
  return 'lastSyncAt:' + stationId;
}

export function getLastSyncAt(stationId: StationId): string {
  return readStore<string>('hq', lastSyncKey(stationId), new Date().toISOString());
}

export function getSyncInfo(stationId: StationId): SyncInfo {
  const state = getConnectivity(stationId);
  const lastSyncAt = getLastSyncAt(stationId);
  return {
    state,
    lastSyncAt,
    ageSeconds: ageSeconds(lastSyncAt),
    simulated: getActiveScenario()?.stationId === stationId,
  };
}

/**
 * Sets the link state and closes/opens the matching CommunicationEvent so the
 * /comms timeline strip and "what we missed" both stay truthful.
 */
export function setStationConnectivity(
  stationId: StationId,
  state: ConnectivityState,
  cause?: string
): void {
  const previous = getConnectivity(stationId);
  if (previous === state) return;

  const now = new Date().toISOString();
  const history = getLinkHistory(stationId);
  const open = history[history.length - 1];
  if (open && !open.to) {
    open.to = now;
    open.durationSeconds = Math.max(0, Math.round((Date.parse(now) - Date.parse(open.from)) / 1000));
  }
  history.push({
    stationId,
    state,
    from: now,
    durationSeconds: 0,
    cause,
  });
  writeStore('hq', 'linkHistory:' + stationId, history);

  contractSetConnectivity(stationId, state);

  // Coming back up is a successful contact; going down is not.
  if (state === 'LIVE') recordSuccessfulSync(stationId);
}

export function recordSuccessfulSync(stationId: StationId): void {
  writeStore('hq', lastSyncKey(stationId), new Date().toISOString());
}

// ---- Link history -----------------------------------------------------------

export function getLinkHistory(stationId: StationId): CommunicationEvent[] {
  return readStore<CommunicationEvent[]>('hq', 'linkHistory:' + stationId, []);
}

export function setLinkHistory(stationId: StationId, events: CommunicationEvent[]): void {
  writeStore('hq', 'linkHistory:' + stationId, events);
}

export interface LinkSegment {
  state: SyncState;
  fromMs: number;
  toMs: number;
  durationSeconds: number;
  cause?: string;
  /** True while this interval is still running — it has no end yet. */
  open: boolean;
}

/** Segments clipped to a window, ready for the timeline strip (FR-1.2). */
export function getLinkSegments(stationId: StationId, windowHours: number, now = Date.now()): LinkSegment[] {
  const windowStart = now - windowHours * 3600_000;
  const history = getLinkHistory(stationId);
  const segments: LinkSegment[] = [];

  history.forEach((event, i) => {
    const fromMs = Date.parse(event.from);
    const toMs = event.to ? Date.parse(event.to) : (i === history.length - 1 ? now : fromMs);
    if (toMs < windowStart) return;
    const clippedFrom = Math.max(fromMs, windowStart);
    const clippedTo = Math.min(toMs, now);
    if (clippedTo <= clippedFrom) return;
    segments.push({
      state: event.state,
      fromMs: clippedFrom,
      toMs: clippedTo,
      durationSeconds: Math.round((clippedTo - clippedFrom) / 1000),
      cause: event.cause,
      open: !event.to,
    });
  });

  return segments;
}

export interface LinkStats {
  uptimePct: number;
  longestGapSeconds: number;
  longestGapFrom?: string;
  segments: LinkSegment[];
}

/** FR-1.3 — uptime over the range and the longest single gap. */
export function getLinkStats(stationId: StationId, windowHours: number, now = Date.now()): LinkStats {
  const segments = getLinkSegments(stationId, windowHours, now);
  const total = segments.reduce((sum, s) => sum + s.durationSeconds, 0);
  const up = segments.filter((s) => s.state === 'LIVE').reduce((sum, s) => sum + s.durationSeconds, 0);
  let longest = 0;
  let longestFrom: string | undefined;
  for (const s of segments) {
    if (s.state === 'DARK' && s.durationSeconds > longest) {
      longest = s.durationSeconds;
      longestFrom = new Date(s.fromMs).toISOString();
    }
  }
  return {
    uptimePct: total > 0 ? (up / total) * 100 : 0,
    longestGapSeconds: longest,
    longestGapFrom: longestFrom,
    segments,
  };
}

// ---- Demo outage scenario ---------------------------------------------------
// FR-1.5 / NFR-6.7: writes ONLY here, never to the real record, and every
// surface that reads it labels the state as simulated.

export interface OutageScenario {
  id: string;
  stationId: StationId;
  startedAt: string;
  startedBy: string;
  label: string;
  /** The state the station was in before the scenario, restored on stop. */
  restoreTo: ConnectivityState;
}

export function getActiveScenario(): OutageScenario | null {
  return readStore<OutageScenario | null>('hq', 'demoScenario', null);
}

export function startOutageScenario(stationId: StationId, by: string, label = 'Scripted outage — demo only'): OutageScenario {
  const scenario: OutageScenario = {
    id: 'demo-' + Date.now().toString(36),
    stationId,
    startedAt: new Date().toISOString(),
    startedBy: by,
    label,
    restoreTo: getConnectivity(stationId),
  };
  writeStore('hq', 'demoScenario', scenario);
  setStationConnectivity(stationId, 'DARK', 'simulated outage (demo scenario)');
  return scenario;
}

export function stopOutageScenario(): void {
  const scenario = getActiveScenario();
  writeStore<OutageScenario | null>('hq', 'demoScenario', null);
  if (scenario) {
    setStationConnectivity(scenario.stationId, scenario.restoreTo, 'simulated outage ended (demo scenario)');
  }
}

// ---- React bindings ---------------------------------------------------------

export function useConnectivity(stationId: StationId): ConnectivityState {
  const read = useCallback(() => getConnectivity(stationId), [stationId]);
  return useStoreValue(read);
}

export function useSyncInfo(stationId: StationId): SyncInfo {
  const read = useCallback(() => getSyncInfo(stationId), [stationId]);
  return useStoreValue(read);
}

export function useAllSyncInfo(): Record<StationId, SyncInfo> {
  const read = useCallback(
    () => ({ bharati: getSyncInfo('bharati'), maitri: getSyncInfo('maitri') }),
    []
  );
  return useStoreValue(read);
}

export function useOutageScenario(): OutageScenario | null {
  return useStoreValue(getActiveScenario);
}
