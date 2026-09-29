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

  const segBtn = (active: boolean) =>
    `px-4 min-h-9 text-body-sm font-medium rounded-full transition-colors ${
      active ? 'bg-[var(--panel-raised)] text-[var(--text)]' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
    }`;

  const chartLabel = 'text-body-sm font-medium text-[var(--text-2)] mb-2';
  const tagCls = 'shrink-0 font-mono text-caption px-2.5 py-0.5 rounded-full border';

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
      <PageHeader
        title="Environment & Data Sources"
        backTo="/"
        backLabel="HQ"
        className="bg-[var(--panel)]"
        rightContent={
          <div
            className="flex gap-1 bg-[var(--bg)] rounded-full border border-[var(--line)] p-1"
            role="group"
            aria-label="Station"
          >
             <button
               onClick={() => setStationId('bharati')}
               className={segBtn(stationId === 'bharati')}
               title="Bharati (BHR)"
             >
               Bharati
             </button>
             <button
               onClick={() => setStationId('maitri')}
               className={segBtn(stationId === 'maitri')}
               title="Maitri (MTR)"
             >
               Maitri
             </button>
          </div>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        
        {/* Main Content: Current Conditions & Charts & Coupling */}
        <div className="flex-1 min-w-0 overflow-y-auto px-6 py-5">
           <div className="max-w-5xl flex flex-col gap-6">
             
             {/* Current Conditions Row */}
             <section>
               <h3 className="text-title font-medium text-[var(--text)] mb-3">Current conditions</h3>
               <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
                 <StatTile label="Temperature" measurement={currentConditions.temperature} />
                 <StatTile label="Wind" measurement={currentConditions.wind} />
                 <StatTile label="Wind chill" measurement={currentConditions.windChill} />
                 <StatTile label="Pressure" measurement={currentConditions.pressure} />
                 <StatTile label="Humidity" measurement={currentConditions.humidity} />
               </div>
             </section>

             {/* Stacked Charts */}
             <section className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
               <div className="flex justify-between items-baseline gap-4 flex-wrap mb-4">
                 <h3 className="text-title font-medium text-[var(--text)]">Last 24 hours</h3>
                 <span className="text-body-sm text-[var(--text-3)]">Hover any chart to compare the same moment across all of them</span>
               </div>
               <div className="flex flex-col gap-5">
                 {tempSeries && (
                   <div>
                     <div className={chartLabel}>Temperature</div>
                     <div className="h-36">
                       <TimeSeriesChart series={[{ id: 't', name: 'Temperature', data: tempSeries.points, color: 'var(--text)' }]} />
                     </div>
                   </div>
                 )}
                 {windSeries && (
                   <div>
                     <div className={chartLabel}>Wind speed</div>
                     <div className="h-36">
                       <TimeSeriesChart series={[{ id: 'w', name: 'Wind Speed', data: windSeries.points, color: 'var(--brand)' }]} />
                     </div>
                   </div>
                 )}
                 {pressSeries && (
                   <div>
                     <div className={chartLabel}>Pressure</div>
                     <div className="h-36">
                       <TimeSeriesChart series={[{ id: 'p', name: 'Pressure', data: pressSeries.points, color: 'var(--text-3)' }]} />
                     </div>
                   </div>
                 )}
                 {heatSeries && (
                   <div className="pt-5 border-t border-[var(--line)]">
                     <div className={`${chartLabel} flex items-center gap-2 flex-wrap`} title="Derived: Heating Demand (MODELED)">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                       Heating demand
                       <span className="font-normal text-[var(--text-3)]">— calculated from the readings above</span>
                       <span className={`${tagCls} bg-[var(--panel-raised)] text-[var(--text-3)] border-[var(--line)]`}>MODELED</span>
                     </div>
                     <div className="h-36">
                       <TimeSeriesChart series={[{ id: 'h', name: 'Heating Demand', data: heatSeries.points, color: 'var(--watch)' }]} />
                     </div>
                   </div>
                 )}
               </div>
             </section>

             {/* Environmental Coupling Panel */}
             <section>
               <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
                 <h3 className="text-title font-medium text-[var(--text)]" title="Physics engine coupling">How the weather affects the station</h3>
                 <button 
                   onClick={() => navigate('/sandbox', { state: { stationId, currentConditions, engineInputs: stationData.engineInputs } })}
                   className="min-h-9 px-4 rounded-full border border-[var(--sim)] text-body-sm font-medium text-[var(--sim-soft)] hover:bg-[var(--panel-raised)] flex items-center gap-1.5"
                 >
                   Explore a what-if from here →
                 </button>
               </div>
               {causalInput && (
                 <CausalTrace input={causalInput} className="bg-[var(--panel)]" />
               )}
             </section>

           </div>
        </div>

        {/* Right Rail: Data Source Register */}
        <div className="w-[21rem] xl:w-[24rem] border-l border-[var(--line)] bg-[var(--panel)] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-5 border-b border-[var(--line)]">
            <h2 className="text-title font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>Data sources</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-body-sm text-[var(--text-3)]">
              <span><span className="font-mono text-[var(--text)]">{connectedSources.length}</span> live feeds</span>
              <span><span className="font-mono text-[var(--text)]">{derivedSources.length}</span> modelled</span>
              <span><span className="font-mono text-[var(--text)]">{awaitingSources.length}</span> not yet connected</span>
            </div>
            <div className="mt-5 flex gap-2">
               <button className="px-4 min-h-9 bg-[var(--bg)] border border-[var(--line-strong)] rounded-full text-body-sm font-medium text-[var(--text)] hover:bg-[var(--panel-raised)] transition-colors">
                 Export snapshot
               </button>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-6">
            
            {/* Connected (LIVE) */}
            <section>
              <h3 className="text-title font-medium flex items-center gap-2.5 mb-3" style={{ color: 'var(--ok)' }}>
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--ok)] m-breathe"></span>
                Connected
              </h3>
              <div className="flex flex-col gap-2">
                {connectedSources.map((ds: DataSource) => (
                  <div key={ds.id} className="px-4 py-3 bg-[var(--bg)] border border-[var(--line)] rounded-lg">
                    <div className="flex justify-between items-start gap-3 mb-1">
                      <div className="text-body font-medium text-[var(--text)]">{ds.name}</div>
                      <span className={`${tagCls} border-[var(--ok)] text-[var(--ok-soft)]`}>LIVE</span>
                    </div>
                    <div className="text-body-sm text-[var(--text-3)]">Provides: {ds.provides.join(', ')}</div>
                    <div className="flex justify-between items-center gap-3 flex-wrap border-t border-[var(--line)] pt-2.5 mt-3 text-body-sm">
                      <span className="text-[var(--text-3)]">Updates: {ds.cadence}</span>
                      <span className="text-[var(--ok)]">Coverage <span className="font-mono">{(ds.coverage * 100).toFixed(0)}%</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Derived (MODELED) */}
            <section>
              <h3 className="text-title font-medium flex items-center gap-2.5 mb-3" style={{ color: 'var(--text)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                Calculated models
              </h3>
              <div className="flex flex-col gap-2">
                {derivedSources.map((ds: DataSource) => (
                  <div key={ds.id} className="px-4 py-3 bg-[var(--bg)] border border-[var(--line)] rounded-lg">
                    <div className="flex justify-between items-start gap-3 mb-1">
                      <div className="text-body font-medium text-[var(--text)]">{ds.name}</div>
                      <span className={`${tagCls} bg-[var(--panel-raised)] text-[var(--text-3)] border-[var(--line)]`}>MODELED</span>
                    </div>
                    <div className="text-body-sm text-[var(--text-3)]">Provides: {ds.provides.join(', ')}</div>
                    <div className="text-body-sm text-[var(--text-3)] border-t border-[var(--line)] pt-2.5 mt-3">
                      Engine <span className="font-mono break-all">{ds.adapterInterface}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Awaiting (SYNTH) */}
            <section>
              <h3 className="text-title font-medium flex items-center gap-2.5 mb-3" style={{ color: 'var(--text-3)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Awaiting connection
              </h3>
              <div className="flex flex-col gap-2">
                {awaitingSources.map((ds: DataSource) => (
                  <div key={ds.id} className="px-4 py-3 bg-[var(--bg)] border border-[var(--line)] border-dashed rounded-lg">
                    <div className="flex justify-between items-start gap-3 mb-1">
                      <div className="text-body font-medium text-[var(--text-2)]">{ds.name}</div>
                      <span className={`${tagCls} bg-[var(--bg)] text-[var(--text-3)] border-[var(--line)]`}>SYNTH</span>
                    </div>
                    <div className="text-body-sm text-[var(--text-3)]">Waiting for: {ds.awaiting}</div>
                    <div className="text-body-sm text-[var(--text-3)] border-t border-[var(--line)] pt-2.5 mt-3">
                      Simulated updates: {ds.cadence}
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>

      </div>
    </div>
  );
}
