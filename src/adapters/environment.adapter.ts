/**
 * src/adapters/environment.adapter.ts
 *
 * Simulates fetching environmental data. In this frontend-only build,
 * it fetches the static snapshot from src/mock/environment-snapshot/.
 * The data provenance is LIVE because it is real historical data from
 * SCAR READER / AMRC / ERA5.
 */

import { type EnvironmentalSeries, type DataSource } from '@/shared/contracts';

export interface EnvironmentSnapshot {
  stationId: string;
  generatedAt: string;
  source: string;
  series: EnvironmentalSeries[];
  dataSources: DataSource[];
}

export async function fetchEnvironmentSnapshot(stationId: 'bharati' | 'maitri'): Promise<EnvironmentSnapshot> {
  // In a real app, this would be an HTTP call. Here we dynamically import the mock JSON.
  try {
    const data = await import(`../mock/environment-snapshot/${stationId}-env.json`);
    return data.default as EnvironmentSnapshot;
  } catch (error) {
    console.error(`Failed to load environment snapshot for ${stationId}:`, error);
    throw new Error(`Environment snapshot for ${stationId} not found.`);
  }
}
