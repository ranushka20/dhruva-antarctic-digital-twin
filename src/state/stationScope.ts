// OWNER: Dev B
// stationScope — station scope is global app state, not a route param on
// every page (FRONTEND.md §6.3).
//
// Equality principle: Bharati and Maitri are equals. `primary` and `compare`
// are interchangeable, and swapping is a single call so no panel can quietly
// treat one station as the default and the other as a footnote.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StationId } from '@/state/connectivity';

interface StationScopeState {
  primary: StationId;
  compare: StationId;
  setPrimary: (id: StationId) => void;
  swap: () => void;
}

const OTHER: Record<StationId, StationId> = { bharati: 'maitri', maitri: 'bharati' };

export const useStationScope = create<StationScopeState>()(
  persist(
    (set) => ({
      primary: 'bharati',
      compare: 'maitri',
      setPrimary: (id) => set({ primary: id, compare: OTHER[id] }),
      swap: () => set((s) => ({ primary: s.compare, compare: s.primary })),
    }),
    { name: 'antarasetu:hq:stationScope' }
  )
);

/** Cross-station pages filter by this instead of re-scoping the whole app. */
export type StationFilter = 'all' | StationId;

export const STATION_LABEL: Record<StationId, string> = {
  bharati: 'Bharati',
  maitri: 'Maitri',
};

export const STATION_CODE: Record<StationId, 'BHR' | 'MTR'> = {
  bharati: 'BHR',
  maitri: 'MTR',
};
