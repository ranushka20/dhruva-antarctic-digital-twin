// OWNER: Dev A
// Route: /assets and /assets/:assetId

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/shell/PageHeader';
import { StatusDot } from '@/components/shared/StatusDot';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { TimeSeriesChart } from '@/components/shared/TimeSeriesChart';
import { StatTile } from '@/components/shared/StatTile';
import { ActionCard } from '@/components/shared/ActionCard';
import { CausalTrace } from '@/components/shared/CausalTrace';
import { findSimilarFaults, SIMILARITY_METHOD_DISCLOSURE } from '@/engine/similarity';

export default function AssetsPage() {
  const navigate = useNavigate();
  const { assetId } = useParams<{ assetId: string }>();
  
  const [bharati, setBharati] = useState<any>(null);
  const [maitri, setMaitri] = useState<any>(null);

  // Filters for list view
  const [filterStation, setFilterStation] = useState<'all' | 'bharati' | 'maitri'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const bhr = await import('../../mock/bharati.json');
      const mtr = await import('../../mock/maitri.json');
      setBharati(bhr.default);
      setMaitri(mtr.default);
    }
    load();
  }, []);

  const allAssets = useMemo(() => {
    if (!bharati || !maitri) return [];
    
    const extractAssets = (stationData: any) => {
      const assets: any[] = [];
      for (const zone of stationData.zones) {
        for (const asset of zone.assets) {
           assets.push({
             ...asset,
             stationId: stationData.id,
             stationCode: stationData.code,
             zoneCode: zone.code,
             zoneName: zone.name,
             engineInputs: stationData.engineInputs // needed for causal trace
           });
        }
      }
      return assets;
    };

    return [...extractAssets(bharati), ...extractAssets(maitri)];
  }, [bharati, maitri]);

  const filteredAssets = useMemo(() => {
    return allAssets.filter(a => {
       if (filterStation !== 'all' && a.stationId !== filterStation) return false;
       if (filterStatus !== 'all' && a.status !== filterStatus) return false;
       if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.id.toLowerCase().includes(search.toLowerCase())) return false;
       return true;
    });
  }, [allAssets, filterStation, filterStatus, search]);

  if (!bharati || !maitri) return <div className="p-5 text-body-sm text-[var(--text-3)]">Loading assets...</div>;

  // DETAIL VIEW
  if (assetId) {
    const asset = allAssets.find(a => a.id === assetId);
    if (!asset) return <div className="p-5 text-body-sm text-[var(--text-3)]">Asset not found.</div>;
    
    const isBharati = asset.stationId === 'bharati';
    const stationData = isBharati ? bharati : maitri;
    const actions = stationData.openActions.filter((a: any) => a.assetId === assetId);

    // Mock fault history for demo
    const faultHistory = [
      { id: 'f-1', symptom: 'High coil temperature', diagnosis: 'Cooling loop obstruction', raisedAt: '2025-11-12T08:00:00Z', resolvedAt: '2025-11-12T14:30:00Z', timeToResolveMinutes: 390, provenance: 'SYNTH' },
      { id: 'f-2', symptom: 'Vibration alert', diagnosis: 'Bearing wear', raisedAt: '2024-06-05T11:20:00Z', resolvedAt: '2024-06-06T09:00:00Z', timeToResolveMinutes: 1300, provenance: 'SYNTH' }
    ];

    // Mock similar faults across whole corpus (just hardcoded for this specific demo beat)
    const similarFaults = [
      { fault: { id: 'sf-1', symptom: 'Coil temp spike', diagnosis: 'Cooling fan failure', raisedAt: '2023-04-10T00:00:00Z', provenance: 'SYNTH' }, score: 0.84 },
      { fault: { id: 'sf-2', symptom: 'Overheating under load', diagnosis: 'Blocked intake', raisedAt: '2022-09-22T00:00:00Z', provenance: 'SYNTH' }, score: 0.62 }
    ];

    return (
      <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
        <div className="px-5 pt-4 pb-2 border-b border-[var(--line)] shrink-0 flex justify-between items-center bg-[var(--panel)]">
          <PageHeader title={asset.name} backTo="/assets" backLabel="Asset Register" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Content (Left 2 cols) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Identity & Spec */}
              <div className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <StatusDot status={asset.status} />
                    <div>
                      <h2 className="text-headline font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                        {asset.name}
                      </h2>
                      <div className="font-mono text-body-sm text-[var(--text-3)] mt-1">
                        {asset.id} · {asset.stationCode} / {asset.zoneCode}
                      </div>
                    </div>
                  </div>
                  {asset.status !== 'ok' && (
                    <div className="px-3 py-1 bg-[var(--act-soft)] text-[var(--act)] font-mono text-body-sm rounded uppercase">
                      Condition Degraded
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate(`/stations/${asset.stationId}/twin?zone=${asset.zoneCode}`)}
                      className="px-3 py-1.5 bg-[var(--bg)] border border-[var(--line)] rounded text-body-sm font-medium text-[var(--text)] hover:bg-[var(--panel-raised)] transition-colors"
                    >
                      View in 3D Twin
                    </button>
                    <button 
                      onClick={() => alert('Log Service action dispatched (Dev B handles real decrement)')}
                      className="px-3 py-1.5 bg-[var(--act-soft)] text-[var(--act)] text-body-sm font-medium rounded hover:opacity-80 transition-opacity"
                    >
                      Log Service
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Metrics */}
              <div className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
                <h3 className="font-mono text-micro uppercase text-[var(--text-3)] mb-4 tracking-label">Live Telemetry</h3>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <StatTile 
                    label={asset.threshold ? asset.threshold.label : "CURRENT"} 
                    measurement={asset.current}
                    trend={asset.series24h?.length > 1 ? (asset.series24h[asset.series24h.length-1].v - asset.series24h[0].v) / asset.series24h[0].v : undefined}
                  />
                  {asset.threshold && (
                    <div className="p-3 rounded-lg border border-[var(--line)] flex flex-col justify-center">
                      <span className="font-mono text-micro uppercase tracking-label text-[var(--text-4)] mb-1">Threshold limit</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-headline font-medium text-[var(--text)]">{asset.threshold.value}</span>
                        <span className="font-mono text-body-sm text-[var(--text-3)]">{asset.threshold.unit}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {asset.series24h && asset.series24h.length > 0 && (
                  <div className="h-48 mt-2">
                    <TimeSeriesChart 
                      series={[{ id: 's1', name: asset.name, data: asset.series24h, color: 'var(--brand)' }]} 
                      threshold={asset.threshold?.value}
                    />
                  </div>
                )}
              </div>

              {/* Maintenance & Fault History */}
              <div className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
                <h3 className="font-mono text-micro uppercase text-[var(--text-3)] mb-4 tracking-label">Fault History</h3>
                <div className="space-y-4">
                  {faultHistory.map((f: any) => (
                    <div key={f.id} className="border border-[var(--line)] rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-body font-semibold text-[var(--text)]">{f.symptom}</div>
                        <div className="font-mono text-caption text-[var(--text-4)]">{new Date(f.raisedAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-body-sm text-[var(--text-3)] mb-2">Diagnosis: {f.diagnosis}</div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--line)]">
                        <ProvenanceBadge measurement={{ provenance: f.provenance, value: null, unit: '', timestamp: '', source: '', freshnessSeconds: 0 }} />
                        <span className="font-mono text-caption text-[var(--text-4)]">TTR: {f.timeToResolveMinutes} min</span>
                      </div>
                    </div>
                  ))}
                  <div className="text-caption text-[var(--text-4)] italic">
                    Historical records are synthetic pending connection to NCPOR station maintenance log.
                  </div>
                </div>
              </div>

            </div>
            
            {/* Right Rail */}
            <div className="flex flex-col gap-6">
              
              {/* Active Actions */}
              {actions.length > 0 && (
                <div className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
                  <h3 className="font-mono text-micro uppercase text-[var(--text-3)] mb-4 tracking-label flex justify-between">
                    <span>Active Tickets</span>
                    <span className="bg-[var(--act-soft)] text-[var(--act)] px-1.5 rounded-full">{actions.length}</span>
                  </h3>
                  <div className="space-y-3">
                    {actions.map((action: any) => (
                      <ActionCard key={action.id} action={action} compact />
                    ))}
                  </div>
                </div>
              )}

              {/* Engine Coupling */}
              <div className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
                <CausalTrace input={{...asset.engineInputs, provenanceOverride: 'MODELED'}} />
              </div>

              {/* Similar Faults via TF-IDF */}
              <div className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
                <h3 className="font-mono text-micro uppercase text-[var(--text-3)] mb-4 tracking-label flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  Similar Past Faults
                </h3>
                <div className="space-y-3">
                  {similarFaults.map((sf: any) => (
                    <div key={sf.fault.id} className="p-2 border border-[var(--line)] rounded-lg bg-[var(--bg)] cursor-pointer hover:border-[var(--brand)] transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-body-sm font-semibold text-[var(--text)]">{sf.fault.symptom}</div>
                        <div className="font-mono text-micro px-1 bg-[var(--panel-raised)] rounded text-[var(--brand)]">
                          {(sf.score * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-caption text-[var(--text-3)] truncate mb-2">
                        {sf.fault.diagnosis}
                      </div>
                      <div className="flex justify-between items-center">
                        <ProvenanceBadge measurement={{ provenance: sf.fault.provenance, value: null, unit: '', timestamp: '', source: '', freshnessSeconds: 0 }} />
                        <span className="font-mono text-micro text-[var(--text-4)]">{new Date(sf.fault.raisedAt).getFullYear()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--line)] text-caption text-[var(--text-4)] leading-snug">
                  {SIMILARITY_METHOD_DISCLOSURE}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW (unchanged layout from before, but added into same component)
  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
      <div className="px-5 pt-4 pb-2 border-b border-[var(--line)] shrink-0 flex justify-between items-center bg-[var(--panel)]">
        <PageHeader title="Asset Register" backTo="/" backLabel="HQ" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Filter Rail */}
        <div className="w-[240px] border-r border-[var(--line)] bg-[var(--panel)] p-4 flex flex-col shrink-0 overflow-y-auto">
           <h3 className="font-mono text-micro uppercase text-[var(--text-3)] mb-3 tracking-label">Filters</h3>
           
           <div className="mb-4">
             <label className="text-caption text-[var(--text-3)] block mb-1">Search</label>
             <input 
               type="text" 
               placeholder="Asset name or ID..."
               className="w-full bg-[var(--bg)] border border-[var(--line)] rounded p-2 text-body text-[var(--text)] focus:border-[var(--brand)] outline-none"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
           </div>

           <div className="mb-4">
             <label className="text-caption text-[var(--text-3)] block mb-1">Station</label>
             <select 
               className="w-full bg-[var(--bg)] border border-[var(--line)] rounded p-2 text-body text-[var(--text)] focus:border-[var(--brand)] outline-none"
               value={filterStation}
               onChange={(e) => setFilterStation(e.target.value as any)}
             >
               <option value="all">All Stations</option>
               <option value="bharati">Bharati (BHR)</option>
               <option value="maitri">Maitri (MTR)</option>
             </select>
           </div>

           <div className="mb-4">
             <label className="text-caption text-[var(--text-3)] block mb-1">Status</label>
             <select 
               className="w-full bg-[var(--bg)] border border-[var(--line)] rounded p-2 text-body text-[var(--text)] focus:border-[var(--brand)] outline-none"
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
             >
               <option value="all">All Statuses</option>
               <option value="ok">OK</option>
               <option value="watch">Watch</option>
               <option value="warning">Warning / Critical</option>
             </select>
           </div>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg)] p-5">
           <div className="mb-4 flex justify-between items-end">
              <span className="font-mono text-body-sm text-[var(--text-3)]">
                Showing {filteredAssets.length} of {allAssets.length} assets
              </span>
           </div>

           <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg overflow-hidden">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b border-[var(--line)] bg-[var(--panel-raised)]">
                   <th className="p-3 font-mono text-micro uppercase tracking-label text-[var(--text-3)] font-normal w-8">St.</th>
                   <th className="p-3 font-mono text-micro uppercase tracking-label text-[var(--text-3)] font-normal">Asset</th>
                   <th className="p-3 font-mono text-micro uppercase tracking-label text-[var(--text-3)] font-normal">Location</th>
                   <th className="p-3 font-mono text-micro uppercase tracking-label text-[var(--text-3)] font-normal text-right">Current Value</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredAssets.length === 0 ? (
                   <tr>
                     <td colSpan={4} className="p-8 text-center text-body-sm text-[var(--text-4)]">
                       No assets found matching filters.
                     </td>
                   </tr>
                 ) : (
                   filteredAssets.map(asset => (
                     <tr 
                       key={asset.id} 
                       className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-raised)] cursor-pointer transition-colors"
                       onClick={() => navigate(`/assets/${asset.id}`)}
                     >
                       <td className="p-3 align-middle text-center">
                         <StatusDot status={asset.status} />
                       </td>
                       <td className="p-3 align-middle">
                         <div className="text-body font-semibold text-[var(--text)]">{asset.name}</div>
                         <div className="font-mono text-caption text-[var(--text-4)] mt-0.5">{asset.id}</div>
                       </td>
                       <td className="p-3 align-middle">
                         <div className="font-mono text-body-sm text-[var(--text)]">{asset.stationCode} / {asset.zoneCode}</div>
                         <div className="text-caption text-[var(--text-4)] mt-0.5 truncate max-w-[200px]">{asset.zoneName}</div>
                       </td>
                       <td className="p-3 align-middle text-right">
                         <div className="flex items-baseline justify-end gap-1">
                           <span className="font-mono text-body font-medium text-[var(--text)]">
                             {typeof asset.current?.value === 'number' ? asset.current.value.toFixed(1) : asset.current?.value || '—'}
                           </span>
                           <span className="font-mono text-micro text-[var(--text-3)]">{asset.current?.unit}</span>
                         </div>
                         {asset.threshold && (
                           <div className="font-mono text-micro text-[var(--text-4)] mt-0.5">
                             Threshold: {asset.threshold.value} {asset.threshold.unit}
                           </div>
                         )}
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
}
