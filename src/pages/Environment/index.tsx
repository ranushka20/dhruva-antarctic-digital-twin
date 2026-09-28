// OWNER: Dev A
// Route: /environment

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shell/PageHeader';
import { StatTile } from '@/components/shared/StatTile';
import { TimeSeriesChart } from '@/components/shared/TimeSeriesChart';
import { CausalTrace } from '@/components/shared/CausalTrace';
import { fetchEnvironmentSnapshot, type EnvironmentSnapshot } from '@/adapters/environment.adapter';
import { type DataSource, type CausalTraceInput, type Provenance } from '@/shared/contracts';
import { PanelLoader } from '@/components/shared/Loading';

export default function EnvironmentPage() {
  const navigate = useNavigate();
  const [stationId, setStationId] = useState<'bharati' | 'maitri'>('bharati');
  
  const [envSnapshot, setEnvSnapshot] = useState<EnvironmentSnapshot | null>(null);
  const [stationData, setStationData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const snap = await fetchEnvironmentSnapshot(stationId);
      setEnvSnapshot(snap);
      
      const stData = await import(`../../mock/${stationId}.json`);
      setStationData(stData.default);
    }
    load();
  }, [stationId]);

  const causalInput: CausalTraceInput | null = useMemo(() => {
    if (!stationData) return null;
    return {
      ambientTempC: stationData.engineInputs.ambientTempC,
      windKmh: stationData.engineInputs.windKmh,
      uValue: stationData.engineInputs.uValue,
      areaM2: stationData.engineInputs.areaM2,
      stockUnits: stationData.engineInputs.stockUnits,
      shipWindow: stationData.engineInputs.shipWindow,
      provenanceOverride: 'MODELED' as Provenance
    };
  }, [stationData]);

  if (!envSnapshot || !stationData) return <PanelLoader label="Loading environment telemetry" />;

  const currentConditions = stationData.environment;
  
  // Group data sources
  const connectedSources = envSnapshot.dataSources.filter(ds => ds.group === 'connected');
  const derivedSources = envSnapshot.dataSources.filter(ds => ds.group === 'derived');
  const awaitingSources = envSnapshot.dataSources.filter(ds => ds.group === 'awaiting');

  const getSeries = (metric: string) => {
    return envSnapshot.series.find(s => s.metric === metric);
  };

  const tempSeries = getSeries('temperature');
  const windSeries = getSeries('windSpeed');
  const pressSeries = getSeries('pressure');
  const heatSeries = getSeries('heatingDemand');

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
      <div className="px-5 pt-4 pb-2 border-b border-[var(--line)] shrink-0 flex justify-between items-center bg-[var(--panel)]">
        <PageHeader title="Environment & Data Sources" backTo="/" backLabel="HQ" />
        <div className="flex bg-[var(--bg)] rounded-md border border-[var(--line)] p-0.5">
           <button
             onClick={() => setStationId('bharati')}
             className={`px-3 py-1 text-body-sm font-mono rounded ${stationId === 'bharati' ? 'bg-[var(--panel-raised)] text-[var(--text)]' : 'text-[var(--text-3)]'}`}
           >
             BHR
           </button>
           <button
             onClick={() => setStationId('maitri')}
             className={`px-3 py-1 text-body-sm font-mono rounded ${stationId === 'maitri' ? 'bg-[var(--panel-raised)] text-[var(--text)]' : 'text-[var(--text-3)]'}`}
           >
             MTR
           </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Main Content: Current Conditions & Charts & Coupling */}
        <div className="flex-1 overflow-y-auto p-5">
           <div className="max-w-4xl space-y-6">
             
             {/* Current Conditions Row */}
             <div>
               <h3 className="font-mono text-micro uppercase text-[var(--text-3)] mb-3 tracking-label">Current Conditions</h3>
               <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                 <StatTile label="TEMP" measurement={currentConditions.temperature} />
                 <StatTile label="WIND" measurement={currentConditions.wind} />
                 <StatTile label="WIND CHILL" measurement={currentConditions.windChill} />
                 <StatTile label="PRESSURE" measurement={currentConditions.pressure} />
                 <StatTile label="HUMIDITY" measurement={currentConditions.humidity} />
               </div>
             </div>

             {/* Stacked Charts */}
             <div className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
               <h3 className="font-mono text-micro uppercase text-[var(--text-3)] mb-4 tracking-label flex justify-between items-center">
                 <span>24H Telemetry History</span>
                 <span className="font-mono text-micro text-[var(--text-4)] lowercase">shared crosshair enabled</span>
               </h3>
               <div className="space-y-4">
                 {tempSeries && (
                   <div className="h-32">
                     <TimeSeriesChart series={[{ id: 't', name: 'Temperature', data: tempSeries.points, color: 'var(--text)' }]} />
                   </div>
                 )}
                 {windSeries && (
                   <div className="h-32">
                     <TimeSeriesChart series={[{ id: 'w', name: 'Wind Speed', data: windSeries.points, color: 'var(--brand)' }]} />
                   </div>
                 )}
                 {pressSeries && (
                   <div className="h-32">
                     <TimeSeriesChart series={[{ id: 'p', name: 'Pressure', data: pressSeries.points, color: 'var(--text-3)' }]} />
                   </div>
                 )}
                 {heatSeries && (
                   <div className="h-32 pt-4 border-t border-[var(--line)]">
                     <div className="font-mono text-micro text-[var(--text-4)] mb-2 flex items-center gap-2">
                       <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                       Derived: Heating Demand (MODELED)
                     </div>
                     <TimeSeriesChart series={[{ id: 'h', name: 'Heating Demand', data: heatSeries.points, color: 'var(--watch)' }]} />
                   </div>
                 )}
               </div>
             </div>

             {/* Environmental Coupling Panel */}
             <div>
               <div className="flex justify-between items-end mb-3">
                 <h3 className="font-mono text-micro uppercase text-[var(--text-3)] tracking-label">Physics Engine Coupling</h3>
                 <button 
                   onClick={() => navigate('/sandbox', { state: { stationId, currentConditions, engineInputs: stationData.engineInputs } })}
                   className="text-body-sm font-medium text-[var(--sim-soft)] hover:underline flex items-center gap-1"
                 >
                   Explore a what-if from here →
                 </button>
               </div>
               {causalInput && (
                 <CausalTrace input={causalInput} className="bg-[var(--panel)]" />
               )}
             </div>

           </div>
        </div>

        {/* Right Rail: Data Source Register */}
        <div className="w-[380px] border-l border-[var(--line)] bg-[var(--panel)] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-5 border-b border-[var(--line)]">
            <h2 className="text-headline font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>Data Source Register</h2>
            <div className="font-mono text-caption text-[var(--text-3)] mt-2">
              {connectedSources.length} feeds live · {derivedSources.length} modelled · {awaitingSources.length} awaiting
            </div>
            <div className="mt-4 flex gap-2">
               <button className="px-3 py-1.5 bg-[var(--bg)] border border-[var(--line)] rounded text-body-sm font-medium text-[var(--text)] hover:bg-[var(--panel-raised)] transition-colors">
                 Export Snapshot
               </button>
            </div>
          </div>

          <div className="p-5 space-y-6">
            
            {/* Connected (LIVE) */}
            <div>
              <h3 className="font-mono text-micro uppercase tracking-label flex items-center gap-2 mb-3" style={{ color: 'var(--ok)' }}>
                <span className="w-2 h-2 rounded-full bg-[var(--ok)] m-breathe"></span>
                Connected
              </h3>
              <div className="space-y-3">
                {connectedSources.map((ds: DataSource) => (
                  <div key={ds.id} className="p-3 bg-[var(--bg)] border border-[var(--line)] rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-body-sm font-semibold text-[var(--text)]">{ds.name}</div>
                      <span className="font-mono text-micro border border-[var(--ok)] text-[var(--ok-soft)] px-1 rounded">LIVE</span>
                    </div>
                    <div className="text-caption text-[var(--text-3)] mb-2">Provides: {ds.provides.join(', ')}</div>
                    <div className="flex justify-between items-center border-t border-[var(--line)] pt-2 mt-2">
                      <span className="font-mono text-micro text-[var(--text-3)]">{ds.cadence}</span>
                      <span className="font-mono text-micro text-[var(--ok)]">Coverage {(ds.coverage * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Derived (MODELED) */}
            <div>
              <h3 className="font-mono text-micro uppercase tracking-label flex items-center gap-2 mb-3" style={{ color: 'var(--text)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                Derived Models
              </h3>
              <div className="space-y-3">
                {derivedSources.map((ds: DataSource) => (
                  <div key={ds.id} className="p-3 bg-[var(--bg)] border border-[var(--line)] rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-body-sm font-semibold text-[var(--text)]">{ds.name}</div>
                      <span className="font-mono text-micro bg-[var(--panel-raised)] text-[var(--text-3)] border border-[var(--line)] px-1 rounded">MODELED</span>
                    </div>
                    <div className="text-caption text-[var(--text-3)] mb-2">Provides: {ds.provides.join(', ')}</div>
                    <div className="font-mono text-micro text-[var(--text-3)] border-t border-[var(--line)] pt-2 mt-2">
                      Engine: {ds.adapterInterface}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Awaiting (SYNTH) */}
            <div>
              <h3 className="font-mono text-micro uppercase tracking-label flex items-center gap-2 mb-3" style={{ color: 'var(--text-4)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Awaiting Connection
              </h3>
              <div className="space-y-3">
                {awaitingSources.map((ds: DataSource) => (
                  <div key={ds.id} className="p-3 bg-[var(--bg)] border border-[var(--line)] border-dashed rounded-lg opacity-80">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-body-sm font-semibold text-[var(--text-2)]">{ds.name}</div>
                      <span className="font-mono text-micro bg-[var(--bg)] text-[var(--text-4)] border border-[var(--line)] px-1 rounded">SYNTH</span>
                    </div>
                    <div className="text-caption text-[var(--text-3)] mb-2">Awaiting: {ds.awaiting}</div>
                    <div className="font-mono text-micro text-[var(--text-4)] border-t border-[var(--line)] pt-2 mt-2">
                      Mock cadence: {ds.cadence}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
