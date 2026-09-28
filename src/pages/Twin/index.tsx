// OWNER: Dev A
// Route: /stations/:id/twin

import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shell/PageHeader';
import { IsoStationModel } from '@/components/viz/IsoStationModel';
import { CausalTrace } from '@/components/shared/CausalTrace';
import { ActionCard } from '@/components/shared/ActionCard';
import { StatusDot } from '@/components/shared/StatusDot';
import { TierChip } from '@/components/shared/TierChip';
import { type StationModel, type ZoneModel, type CausalTraceInput, type Provenance } from '@/shared/contracts';

// Lazy load the existing 3D model
const Bharati3D = lazy(() => import('@/twin/Bharati3D'));

export default function TwinPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id === 'maitri' ? 'maitri' : 'bharati';
  const stationName = stationId === 'maitri' ? 'Maitri' : 'Bharati';

  // --- State ---
  const [stationData, setStationData] = useState<any>(null); // Full mock data
  const [selectedZone, setSelectedZone] = useState<string | undefined>();
  const [colorMode, setColorMode] = useState<'status' | 'provenance' | 'freshness'>('status');
  const [renderMode, setRenderMode] = useState<'svg' | '3d'>(stationId === 'bharati' ? '3d' : 'svg');

  // Switch to SVG if navigating to Maitri
  useEffect(() => {
    if (stationId === 'maitri') setRenderMode('svg');
    else setRenderMode('3d');
  }, [stationId]);

  // --- Fetch Mock Data ---
  useEffect(() => {
    async function loadData() {
      try {
        const data = await import(`../../mock/${stationId}.json`);
        setStationData(data.default);
        // Default select first zone if none selected
        if (data.default.zones?.length > 0) {
          setSelectedZone(data.default.zones[0].code);
        }
      } catch (err) {
        console.error("Failed to load mock data:", err);
      }
    }
    loadData();
  }, [stationId]);

  // --- Derived Data ---
  const activeZone = useMemo(() => {
    if (!stationData || !selectedZone) return null;
    return stationData.zones.find((z: ZoneModel) => z.code === selectedZone) || null;
  }, [stationData, selectedZone]);

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

  if (!stationData) return <div className="p-5 font-mono text-[11px] text-[var(--text-3)]">Loading station twin...</div>;

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 border-b border-[var(--line)] shrink-0 flex justify-between items-center bg-[var(--panel)]">
        <PageHeader title={`${stationName} Digital Twin`} backTo="/" backLabel="← HQ" />
        <div className="flex gap-4 items-center">
           <div className="flex bg-[var(--bg)] rounded-md border border-[var(--line)] p-0.5">
             <button
               onClick={() => navigate('/stations/bharati/twin')}
               className={`px-3 py-1 text-[11px] font-mono rounded ${stationId === 'bharati' ? 'bg-[var(--panel-raised)] text-[var(--text)]' : 'text-[var(--text-3)]'}`}
             >
               BHR
             </button>
             <button
               onClick={() => navigate('/stations/maitri/twin')}
               className={`px-3 py-1 text-[11px] font-mono rounded ${stationId === 'maitri' ? 'bg-[var(--panel-raised)] text-[var(--text)]' : 'text-[var(--text-3)]'}`}
             >
               MTR
             </button>
           </div>
           
           <div className="flex bg-[var(--bg)] rounded-md border border-[var(--line)] p-0.5">
             <button
               onClick={() => setRenderMode('svg')}
               className={`px-3 py-1 text-[11px] font-mono rounded ${renderMode === 'svg' ? 'bg-[var(--panel-raised)] text-[var(--text)]' : 'text-[var(--text-3)]'}`}
             >
               Ops (SVG)
             </button>
             <button
               onClick={() => setRenderMode('3d')}
               className={`px-3 py-1 text-[11px] font-mono rounded ${renderMode === '3d' ? 'bg-[var(--panel-raised)] text-[var(--text)]' : 'text-[var(--text-3)]'}`}
               disabled={stationId === 'maitri'} // Only Bharati has 3D model
               title={stationId === 'maitri' ? '3D model not available for Maitri' : ''}
             >
               Facility (3D)
             </button>
           </div>
        </div>
      </div>

      {/* Main Content: 3 Columns */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Zone List & Autonomy Strip */}
        <div className="w-[260px] border-r border-[var(--line)] bg-[var(--panel)] flex flex-col shrink-0">
          <div className="p-4 border-b border-[var(--line)]">
            <h3 className="font-mono text-[10px] uppercase text-[var(--text-3)] mb-3 tracking-widest">Colour By</h3>
            <div className="flex flex-col gap-2">
              {(['status', 'provenance', 'freshness'] as const).map(mode => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="colorMode"
                    value={mode}
                    checked={colorMode === mode}
                    onChange={() => setColorMode(mode)}
                    className="accent-[var(--ok)]"
                  />
                  <span className="font-mono text-[11px] text-[var(--text)] capitalize">{mode}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <h3 className="font-mono text-[10px] uppercase text-[var(--text-3)] mb-2 px-2 tracking-widest">Zones</h3>
            <div className="space-y-1">
              {stationData.zones.map((zone: ZoneModel) => (
                <button
                  key={zone.code}
                  onClick={() => setSelectedZone(zone.code)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                    selectedZone === zone.code ? 'bg-[var(--panel-raised)]' : 'hover:bg-[var(--panel-raised)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={zone.status} />
                    <span className="font-mono text-[11px] text-[var(--text)] font-semibold">{zone.code}</span>
                    <span className="font-mono text-[11px] text-[var(--text-3)] truncate">{zone.name}</span>
                  </div>
                  {zone.openActions.length > 0 && (
                    <span className="bg-[var(--act-soft)] text-[var(--act)] font-mono text-[9px] px-1.5 py-0.5 rounded-full">
                      {zone.openActions.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t border-[var(--line)] bg-[var(--bg)]">
            <h3 className="font-mono text-[10px] uppercase text-[var(--text-3)] mb-2 tracking-widest">Autonomy & Resources</h3>
            <div className="space-y-3">
              {stationData.resources.slice(0, 3).map((r: any) => (
                <div key={r.id} className="flex justify-between items-center">
                   <div className="flex flex-col">
                     <span className="font-mono text-[10px] text-[var(--text)]">{r.name}</span>
                     <span className="font-mono text-[9px] text-[var(--text-4)]">{r.stock.value.toLocaleString()} {r.stock.unit}</span>
                   </div>
                   <div className="flex flex-col items-end">
                     <span className="font-mono text-[11px] font-semibold" style={{ color: r.risk === 'ok' ? 'var(--text)' : 'var(--act)' }}>
                       {r.autonomyDays} ±{r.autonomyBandDays} d
                     </span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Centre Column: Render Viewport */}
        <div className="flex-1 relative bg-[var(--bg)] overflow-hidden flex flex-col">
          <div className="absolute top-4 left-4 z-10 flex gap-2">
             <div className="bg-[var(--panel)] border border-[var(--line)] rounded-md p-2 font-mono text-[10px] text-[var(--text-3)] flex items-center gap-3">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[var(--ok)]"></div> OK</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[var(--watch)]"></div> WATCH</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[var(--act)]"></div> WARN</span>
             </div>
          </div>
          
          {renderMode === 'svg' ? (
            <IsoStationModel
               zones={stationData.zones}
               selectedZoneCode={selectedZone}
               onZoneSelect={setSelectedZone}
               colorMode={colorMode}
               className="flex-1"
            />
          ) : (
            <div className="flex-1 relative">
               <Suspense fallback={<div className="flex items-center justify-center h-full font-mono text-[11px] text-[var(--text-3)]">Loading 3D Model...</div>}>
                 <Bharati3D />
               </Suspense>
            </div>
          )}
        </div>

        {/* Right Column: Zone Inspector */}
        <div className="w-[396px] border-l border-[var(--line)] bg-[var(--panel)] flex flex-col shrink-0 overflow-y-auto">
          {activeZone ? (
            <div className="p-5 space-y-6">
              {/* Identity Header */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusDot status={activeZone.status} />
                  <h2 className="text-[18px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                    {activeZone.code} — {activeZone.name}
                  </h2>
                </div>
                <div className="font-mono text-[10px] text-[var(--text-3)] mb-4">
                  Top telemetry: {activeZone.topLabel} {activeZone.topValue.value} {activeZone.topValue.unit}
                </div>
              </div>

              {/* Assets list */}
              <div>
                <h3 className="font-mono text-[10px] uppercase text-[var(--text-3)] mb-3 tracking-widest">Monitored Assets</h3>
                <div className="space-y-3">
                  {activeZone.assets.length === 0 && (
                    <div className="text-[11px] font-mono text-[var(--text-4)]">No connected assets in this zone.</div>
                  )}
                  {activeZone.assets.map((asset: any) => (
                    <div key={asset.id} className="p-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]">
                       <div className="flex justify-between items-start mb-2">
                         <div className="flex items-center gap-2">
                           <StatusDot status={asset.status} />
                           <span className="font-mono text-[11px] font-semibold text-[var(--text)]">{asset.name}</span>
                         </div>
                         <div className="flex items-baseline gap-1">
                           <span className="font-mono text-[14px] font-medium text-[var(--text)]">{asset.current.value}</span>
                           <span className="font-mono text-[9px] text-[var(--text-3)]">{asset.current.unit}</span>
                         </div>
                       </div>
                       {asset.threshold && (
                         <div className="w-full bg-[var(--line)] h-1 rounded-full overflow-hidden mt-1 relative">
                            {/* Simple visual indicator, assumes higher = closer to threshold */}
                            <div 
                              className={`h-full ${asset.status === 'ok' ? 'bg-[var(--ok)]' : asset.status === 'watch' ? 'bg-[var(--watch)]' : 'bg-[var(--act)]'}`} 
                              style={{ width: `${Math.min(100, (asset.current.value / asset.threshold.value) * 100)}%` }}
                            />
                            <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-[var(--act)]" title={asset.threshold.label} />
                         </div>
                       )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Engine Coupling: Causal Trace */}
              {causalInput && (
                <div>
                  <CausalTrace input={causalInput} />
                </div>
              )}

              {/* Open Actions */}
              <div>
                <h3 className="font-mono text-[10px] uppercase text-[var(--text-3)] mb-3 tracking-widest">Active Tickets</h3>
                <div className="space-y-3">
                  {activeZone.openActions.length === 0 && (
                    <div className="text-[11px] font-mono text-[var(--text-4)]">No open actions.</div>
                  )}
                  {activeZone.openActions.map((action: any) => (
                    <div key={action.id} className="bg-[var(--panel)] border border-[var(--line)] rounded-lg overflow-hidden">
                      <ActionCard action={action} />
                      <div className="bg-[var(--bg)] p-2 flex justify-end gap-2 border-t border-[var(--line)]">
                        <button className="px-3 py-1 font-mono text-[9px] text-[var(--text-4)] border border-[var(--line)] rounded hover:bg-[var(--panel-raised)]" onClick={() => alert('Defer action dispatched')}>DEFER</button>
                        <button className="px-3 py-1 font-mono text-[9px] text-[var(--text-3)] border border-[var(--line)] rounded hover:bg-[var(--panel-raised)]" onClick={() => alert('Assign action dispatched')}>ASSIGN</button>
                        <button className="px-3 py-1 font-mono text-[9px] text-[var(--bg)] bg-[var(--act)] rounded hover:opacity-90" onClick={() => alert('ACK action dispatched')}>ACK</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="p-5 flex items-center justify-center h-full">
              <span className="font-mono text-[11px] text-[var(--text-4)]">Select a zone to inspect</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
