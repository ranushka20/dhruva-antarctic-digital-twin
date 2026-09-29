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
import { PanelLoader } from '@/components/shared/Loading';

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

  if (!stationData) return <PanelLoader label="Loading station twin" />;

  const segBtn = (active: boolean) =>
    `px-4 min-h-9 text-body-sm font-medium rounded-full transition-colors ${
      active ? 'bg-[var(--panel-raised)] text-[var(--text)]' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
    }`;

  const COLOR_MODE_LABEL: Record<'status' | 'provenance' | 'freshness', { label: string; hint: string }> = {
    status: { label: 'Health status', hint: 'Colour zones by operating status' },
    provenance: { label: 'Data source', hint: 'Colour zones by provenance (live, modelled, synthetic)' },
    freshness: { label: 'Data age', hint: 'Colour zones by freshness of the latest reading' },
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
      {/* Header */}
      <PageHeader
        title={`${stationName} Digital Twin`}
        backTo="/"
        backLabel="HQ"
        className="bg-[var(--panel)]"
        rightContent={
          <div className="flex gap-4 items-center flex-wrap">
            <div
              className="flex gap-1 bg-[var(--bg)] rounded-full border border-[var(--line)] p-1"
              role="group"
              aria-label="Station"
            >
              <button
                onClick={() => navigate('/stations/bharati/twin')}
                className={segBtn(stationId === 'bharati')}
                title="Bharati (BHR)"
              >
                Bharati
              </button>
              <button
                onClick={() => navigate('/stations/maitri/twin')}
                className={segBtn(stationId === 'maitri')}
                title="Maitri (MTR)"
              >
                Maitri
              </button>
            </div>

            <div
              className="flex gap-1 bg-[var(--bg)] rounded-full border border-[var(--line)] p-1"
              role="group"
              aria-label="View"
            >
              <button
                onClick={() => setRenderMode('svg')}
                className={segBtn(renderMode === 'svg')}
                title="Operations view (SVG floor plan)"
              >
                Floor plan
              </button>
              <button
                onClick={() => setRenderMode('3d')}
                className={`${segBtn(renderMode === '3d')} disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={stationId === 'maitri'} // Only Bharati has 3D model
                title={stationId === 'maitri' ? '3D model not available for Maitri' : 'Facility view (3D model)'}
              >
                3D model
              </button>
            </div>
          </div>
        }
      />

      {/* Main Content: 3 Columns */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Column: Zone List & Autonomy Strip */}
        <div className="w-[15rem] xl:w-[17rem] border-r border-[var(--line)] bg-[var(--panel)] flex flex-col shrink-0">
          <div className="p-5 border-b border-[var(--line)]">
            <h3 className="text-body-sm font-medium text-[var(--text-3)] mb-2">Colour zones by</h3>
            <div className="flex flex-col gap-1">
              {(['status', 'provenance', 'freshness'] as const).map(mode => (
                <label
                  key={mode}
                  className="flex items-center gap-3 min-h-9 px-2 rounded-lg cursor-pointer hover:bg-[var(--panel-raised)]"
                  title={COLOR_MODE_LABEL[mode].hint}
                >
                  <input
                    type="radio"
                    name="colorMode"
                    value={mode}
                    checked={colorMode === mode}
                    onChange={() => setColorMode(mode)}
                    className="accent-[var(--ok)] w-4 h-4"
                  />
                  <span className="text-body text-[var(--text)]">{COLOR_MODE_LABEL[mode].label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <h3 className="text-body-sm font-medium text-[var(--text-3)] mb-2 px-2">Zones</h3>
            <div className="flex flex-col gap-1.5">
              {stationData.zones.map((zone: ZoneModel) => (
                <button
                  key={zone.code}
                  onClick={() => setSelectedZone(zone.code)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selectedZone === zone.code ? 'bg-[var(--panel-raised)]' : 'hover:bg-[var(--panel-raised)]'
                  }`}
                  aria-pressed={selectedZone === zone.code}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-1.5 shrink-0"><StatusDot status={zone.status} /></span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-body font-medium text-[var(--text)] line-clamp-2">{zone.name}</span>
                      <span className="font-mono text-body-sm text-[var(--text-3)]">{zone.code}</span>
                    </div>
                  </div>
                  {zone.openActionCount > 0 && (
                    <span
                      className="shrink-0 bg-[var(--act-soft)] text-[var(--act)] font-mono text-body-sm font-medium px-2.5 py-0.5 rounded-full"
                      title="Open actions in this zone"
                    >
                      {zone.openActionCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 border-t border-[var(--line)] bg-[var(--bg)]">
            <h3 className="text-body-sm font-medium text-[var(--text-3)] mb-3" title="Autonomy & resources">
              Supplies — days remaining
            </h3>
            <div className="flex flex-col gap-3.5">
              {stationData.resources.slice(0, 3).map((r: any) => (
                <div key={r.id} className="flex justify-between items-start gap-3">
                   <div className="flex flex-col min-w-0">
                     <span className="text-body text-[var(--text)]">{r.name}</span>
                     <span className="font-mono text-body-sm text-[var(--text-3)]">{r.stock.value.toLocaleString()} {r.stock.unit}</span>
                   </div>
                   <div className="flex flex-col items-end shrink-0" title={`Autonomy estimate: ${r.autonomyDays} days, ±${r.autonomyBandDays} days`}>
                     <span className="font-mono text-body font-semibold" style={{ color: r.risk === 'ok' ? 'var(--text)' : 'var(--act)' }}>
                       {r.autonomyDays} ±{r.autonomyBandDays} d
                     </span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Centre Column: Render Viewport */}
        <div className="flex-1 min-w-[20rem] relative bg-[var(--bg)] overflow-hidden flex flex-col">
          <div className="absolute top-4 left-4 z-10 flex gap-2">
             <div className="bg-[var(--panel)] border border-[var(--line)] rounded-full px-4 py-2 text-body-sm text-[var(--text-2)] flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-2" title="OK"><span className="w-2.5 h-2.5 rounded-full bg-[var(--ok)]" aria-hidden></span> Healthy</span>
                <span className="flex items-center gap-2" title="WATCH"><span className="w-2.5 h-2.5 rounded-full bg-[var(--watch)]" aria-hidden></span> Watch</span>
                <span className="flex items-center gap-2" title="WARN"><span className="w-2.5 h-2.5 rounded-full bg-[var(--act)]" aria-hidden></span> Needs action</span>
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
               <Suspense fallback={<PanelLoader label="Loading 3D model" />}>
                 <Bharati3D />
               </Suspense>
            </div>
          )}
        </div>

        {/* Right Column: Zone Inspector */}
        <div className="w-[22rem] xl:w-[24rem] 2xl:w-[27rem] border-l border-[var(--line)] bg-[var(--panel)] flex flex-col shrink-0 overflow-y-auto">
          {activeZone ? (
            <div className="p-5 flex flex-col gap-6">
              {/* Identity Header */}
              <div>
                <div className="flex items-start gap-3 mb-2">
                  <span className="mt-2 shrink-0"><StatusDot status={activeZone.status} /></span>
                  <div className="min-w-0">
                    <h2 className="text-title font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                      {activeZone.name}
                    </h2>
                    <span className="font-mono text-body-sm text-[var(--text-3)]">Zone {activeZone.code}</span>
                  </div>
                </div>
                <div
                  className="mt-4 px-4 py-3 rounded-lg border border-[var(--line)] bg-[var(--bg)] flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
                  title="Top telemetry"
                >
                  <span className="flex flex-col">
                    <span className="text-body-sm text-[var(--text-3)]">Latest reading</span>
                    <span className="text-body text-[var(--text-2)]">{activeZone.topLabel}</span>
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-mono text-title font-medium text-[var(--text)]">{activeZone.topValue.value}</span>
                    <span className="font-mono text-body-sm text-[var(--text-3)]">{activeZone.topValue.unit}</span>
                  </span>
                </div>
              </div>

              {/* Assets list */}
              <div>
                <h3 className="text-title font-medium text-[var(--text)] mb-3">Monitored assets</h3>
                <div className="flex flex-col gap-2">
                  {activeZone.assets.length === 0 && (
                    <div className="text-body-sm text-[var(--text-3)]">No connected assets in this zone.</div>
                  )}
                  {activeZone.assets.map((asset: any) => (
                    <div key={asset.id} className="px-4 py-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]">
                       <div className="flex justify-between items-start gap-3 mb-2.5">
                         <div className="flex items-start gap-2.5 min-w-0">
                           <span className="mt-2 shrink-0"><StatusDot status={asset.status} /></span>
                           <span className="text-body font-medium text-[var(--text)]">{asset.name}</span>
                         </div>
                         <div className="flex items-baseline gap-1.5 shrink-0">
                           <span className="font-mono text-title font-medium text-[var(--text)]">{asset.current.value}</span>
                           <span className="font-mono text-body-sm text-[var(--text-3)]">{asset.current.unit}</span>
                         </div>
                       </div>
                       {asset.threshold && (
                         <div className="w-full bg-[var(--line)] h-2 rounded-full overflow-hidden relative" title={asset.threshold.label}>
                            {/* Simple visual indicator, assumes higher = closer to threshold */}
                            <div
                              className={`h-full ${asset.status === 'ok' ? 'bg-[var(--ok)]' : asset.status === 'watch' ? 'bg-[var(--watch)]' : 'bg-[var(--act)]'}`}
                              style={{ width: `${Math.min(100, (asset.current.value / asset.threshold.value) * 100)}%` }}
                            />
                            <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-[var(--act)]" title={asset.threshold.label} />
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
                <h3 className="text-title font-medium text-[var(--text)] mb-3" title="Active tickets">Open actions</h3>
                <div className="flex flex-col gap-3">
                  {activeZone.openActions.length === 0 && (
                    <div className="text-body-sm text-[var(--text-3)]">No open actions in this zone.</div>
                  )}
                  {activeZone.openActions.map((action: any) => (
                    <div key={action.id} className="bg-[var(--panel)] border border-[var(--line)] rounded-lg overflow-hidden">
                      <ActionCard action={action} compact />
                      <div className="bg-[var(--bg)] p-3 flex flex-col gap-2 border-t border-[var(--line)]">
                        <button className="w-full min-h-10 px-4 text-body-sm font-semibold text-[var(--bg)] bg-[var(--act)] rounded-full hover:opacity-90" onClick={() => alert('ACK action dispatched')}>Acknowledge</button>
                        <div className="grid grid-cols-2 gap-2">
                          <button className="min-h-9 px-4 text-body-sm font-medium text-[var(--text-2)] border border-[var(--line-strong)] rounded-full hover:bg-[var(--panel-raised)]" onClick={() => alert('Assign action dispatched')}>Assign</button>
                          <button className="min-h-9 px-4 text-body-sm font-medium text-[var(--text-2)] border border-[var(--line-strong)] rounded-full hover:bg-[var(--panel-raised)]" onClick={() => alert('Defer action dispatched')}>Defer</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="p-5 flex items-center justify-center h-full">
              <span className="text-body text-[var(--text-3)]">Select a zone to inspect it</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
