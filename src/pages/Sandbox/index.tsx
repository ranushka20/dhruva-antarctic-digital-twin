// OWNER: Dev A
// Route: /sandbox

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/shell/PageHeader';
import { DiffPanel } from '@/components/viz/DiffPanel';
import { CausalTrace } from '@/components/shared/CausalTrace';
import { ZoneGrid } from '@/components/viz/ZoneGrid';
import { TimeSeriesChart } from '@/components/shared/TimeSeriesChart';
import { runCausalTrace, type CausalTraceInput, type Provenance, type Risk } from '@/shared/contracts';

export default function SandboxPage() {
  const [stationData, setStationData] = useState<any>(null);
  const [presets, setPresets] = useState<any[]>([]);
  
  // Scenario state
  const [ambientTemp, setAmbientTemp] = useState<number>(-28.4);
  const [windSpeed, setWindSpeed] = useState<number>(18);
  const [crewSize, setCrewSize] = useState<number>(23);
  const [resupplyDelay, setResupplyDelay] = useState<number>(0);

  useEffect(() => {
    async function load() {
      const stData = await import('../../mock/bharati.json');
      setStationData(stData.default);
      setAmbientTemp(stData.default.engineInputs.ambientTempC);
      setWindSpeed(stData.default.engineInputs.windKmh);
      setCrewSize(stData.default.crew);

      const pr = await import('../../mock/scenarios/presets.json');
      setPresets(pr.default);
    }
    load();
  }, []);

  const loadPreset = (preset: any) => {
    setAmbientTemp(preset.parameters.ambientTemp);
    setWindSpeed(preset.parameters.windSpeed);
    setCrewSize(preset.parameters.crewSize);
    setResupplyDelay(preset.parameters.resupplyInterval - 365);
  };

  const baselineResult = useMemo(() => {
    if (!stationData) return null;
    return runCausalTrace({
      ...stationData.engineInputs,
      provenanceOverride: 'MODELED' as Provenance
    });
  }, [stationData]);

  const scenarioResult = useMemo(() => {
    if (!stationData) return null;
    
    const shipWindow = {
      earliestDay: stationData.engineInputs.shipWindow.earliestDay + resupplyDelay,
      latestDay: stationData.engineInputs.shipWindow.latestDay + resupplyDelay,
    };

    return runCausalTrace({
      ...stationData.engineInputs,
      ambientTempC: ambientTemp,
      windKmh: windSpeed,
      shipWindow,
      provenanceOverride: 'SIM' as Provenance
    });
  }, [stationData, ambientTemp, windSpeed, resupplyDelay]);

  if (!stationData || !baselineResult || !scenarioResult) return <div className="p-5 font-mono text-[11px] text-[var(--text-3)]">Loading Sandbox...</div>;

  const diffMetrics = [
    {
      key: 'autonomy', label: 'Fuel Autonomy', unit: 'd',
      before: { value: baselineResult.autonomyDays, band: baselineResult.autonomyBandDays, risk: 'ok' as Risk, provenance: 'MODELED' as Provenance },
      after: { value: scenarioResult.autonomyDays, band: scenarioResult.autonomyBandDays, risk: 'ok' as Risk, provenance: 'SIM' as const },
      delta: scenarioResult.autonomyDays - baselineResult.autonomyDays
    },
    {
      key: 'lsod', label: 'Last Safe Order Date', unit: 'd',
      before: { value: baselineResult.lsodDays || 0, risk: baselineResult.risk, provenance: 'MODELED' as Provenance },
      after: { value: scenarioResult.lsodDays || 0, risk: scenarioResult.risk, provenance: 'SIM' as const },
      delta: (scenarioResult.lsodDays || 0) - (baselineResult.lsodDays || 0)
    }
  ];

  // For demo: if temp is extremely low, heating demand causes Generator 2 to go critical
  const gen2Risk: Risk = ambientTemp < -40 ? 'critical' : ambientTemp < -35 ? 'warning' : 'ok';
  const impactOverrides = [
    { zoneCode: 'A1', after: gen2Risk } // Power House
  ];

  // Dummy projection data for chart
  const baselineProjection = Array.from({length: 12}, (_, i) => ({ t: new Date(Date.now() + i*30*86400000).toISOString(), v: Math.max(0, baselineResult.autonomyDays - i*30) }));
  const scenarioProjection = Array.from({length: 12}, (_, i) => ({ t: new Date(Date.now() + i*30*86400000).toISOString(), v: Math.max(0, scenarioResult.autonomyDays - i*30) }));

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
      
      {/* SIMULATION BANNER - Persistent, undismissible */}
      <div className="bg-[var(--sim-soft)] border-b border-[var(--sim)] px-5 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sim)" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
           <span className="font-mono text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--sim)' }}>
             Research Sandbox Active
           </span>
        </div>
        <span className="font-mono text-[10px]" style={{ color: 'var(--sim)' }}>
          State is forked. No actions can be raised from this view. All results are synthetic (SIM).
        </span>
      </div>

      <div className="px-5 pt-4 pb-2 border-b border-[var(--line)] shrink-0 bg-[var(--panel)]">
        <PageHeader title="Research Sandbox" backTo="/" backLabel="← HQ" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Rail: Parameters */}
        <div className="w-[300px] border-r border-[var(--line)] bg-[var(--panel)] p-5 flex flex-col shrink-0 overflow-y-auto">
          <h3 className="font-mono text-[10px] uppercase text-[var(--text-3)] mb-4 tracking-widest">Scenario Parameters</h3>
          
          {/* Sliders */}
          <div className="space-y-6 mb-8">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-mono text-[11px] text-[var(--text)]">Ambient Temp</label>
                <span className="font-mono text-[11px] font-semibold text-[var(--sim)]">{ambientTemp}°C</span>
              </div>
              <input type="range" min="-60" max="10" step="0.5" value={ambientTemp} onChange={(e) => setAmbientTemp(parseFloat(e.target.value))} className="w-full accent-[var(--sim)]" />
              <div className="flex justify-between text-[9px] font-mono text-[var(--text-4)] mt-1"><span>-60°C (Historical min)</span><span>10°C</span></div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-mono text-[11px] text-[var(--text)]">Wind Speed</label>
                <span className="font-mono text-[11px] font-semibold text-[var(--sim)]">{windSpeed} kt</span>
              </div>
              <input type="range" min="0" max="100" step="1" value={windSpeed} onChange={(e) => setWindSpeed(parseFloat(e.target.value))} className="w-full accent-[var(--sim)]" />
              <div className="flex justify-between text-[9px] font-mono text-[var(--text-4)] mt-1"><span>0 kt</span><span>100 kt</span></div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-mono text-[11px] text-[var(--text)]">Resupply Delay</label>
                <span className="font-mono text-[11px] font-semibold text-[var(--sim)]">{resupplyDelay > 0 ? '+' : ''}{resupplyDelay} days</span>
              </div>
              <input type="range" min="0" max="90" step="1" value={resupplyDelay} onChange={(e) => setResupplyDelay(parseFloat(e.target.value))} className="w-full accent-[var(--sim)]" />
              <div className="flex justify-between text-[9px] font-mono text-[var(--text-4)] mt-1"><span>0 (On time)</span><span>+90 days</span></div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-mono text-[11px] text-[var(--text)]">Crew Size</label>
                <span className="font-mono text-[11px] font-semibold text-[var(--sim)]">{crewSize} pax</span>
              </div>
              <input type="range" min="5" max="50" step="1" value={crewSize} onChange={(e) => setCrewSize(parseInt(e.target.value))} className="w-full accent-[var(--sim)]" />
              <div className="flex justify-between text-[9px] font-mono text-[var(--text-4)] mt-1"><span>5 (Winter frame)</span><span>50 (Max cap)</span></div>
            </div>
          </div>

          <div className="border-t border-[var(--line)] pt-4">
            <h3 className="font-mono text-[10px] uppercase text-[var(--text-3)] mb-3 tracking-widest">Presets</h3>
            <div className="flex flex-col gap-2">
              {presets.map(p => (
                <button 
                  key={p.id}
                  onClick={() => loadPreset(p)}
                  className="text-left p-2 rounded border border-[var(--line)] hover:border-[var(--sim)] transition-colors bg-[var(--bg)] font-mono text-[11px] text-[var(--text)]"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content: Diff, Trace, Impact */}
        <div className="flex-1 overflow-y-auto p-5 bg-[var(--bg)]">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Top Level Diff */}
            <div>
              <h3 className="font-mono text-[10px] uppercase text-[var(--text-3)] mb-3 tracking-widest">Scenario Impact</h3>
              <DiffPanel metrics={diffMetrics} />
            </div>

            {/* Projection Chart & Zone Impact */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
                <h3 className="font-mono text-[10px] uppercase text-[var(--text-3)] mb-4 tracking-widest flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                  Autonomy Projection
                </h3>
                <div className="h-48 mb-2">
                  <TimeSeriesChart 
                    series={[
                      { id: 'baseline', name: 'Baseline', data: baselineProjection, color: 'var(--text-4)' },
                      { id: 'scenario', name: 'Scenario', data: scenarioProjection, color: 'var(--sim)' }
                    ]} 
                  />
                </div>
                <div className="font-mono text-[9px] text-[var(--text-4)] italic">
                  Projection method: linear-rate. Both paths assume constant burn based on current scenario parameters.
                </div>
              </div>

              <div className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
                 <h3 className="font-mono text-[10px] uppercase text-[var(--text-3)] mb-4 tracking-widest flex items-center gap-2">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                   Zone Impact
                 </h3>
                 <ZoneGrid zones={stationData.zones} impactOverrides={impactOverrides} />
              </div>

            </div>

            {/* Causal Trace Comparisons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-mono text-[10px] uppercase text-[var(--text-3)] mb-3 tracking-widest">Baseline Trace</h3>
                <div className="opacity-70 pointer-events-none grayscale">
                  <CausalTrace input={{...stationData.engineInputs, provenanceOverride: 'MODELED'}} />
                </div>
              </div>
              <div>
                <h3 className="font-mono text-[10px] uppercase text-[var(--sim)] mb-3 tracking-widest">Scenario Trace</h3>
                <div style={{ border: '1px solid var(--sim)', borderRadius: '0.75rem' }}>
                  <CausalTrace 
                    input={{
                      ...stationData.engineInputs, 
                      ambientTempC: ambientTemp, 
                      windKmh: windSpeed,
                      shipWindow: {
                         earliestDay: stationData.engineInputs.shipWindow.earliestDay + resupplyDelay,
                         latestDay: stationData.engineInputs.shipWindow.latestDay + resupplyDelay,
                      },
                      provenanceOverride: 'SIM'
                    }} 
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
