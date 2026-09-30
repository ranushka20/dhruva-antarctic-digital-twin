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

  if (!bharati || !maitri) return <div className="px-6 py-5 text-body text-[var(--text-3)]">Loading assets…</div>;

  // DETAIL VIEW
  if (assetId) {
    const asset = allAssets.find(a => a.id === assetId);
    if (!asset) return <div className="px-6 py-5 text-body text-[var(--text-3)]">Asset not found.</div>;
    
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
        <PageHeader title={asset.name} backTo="/assets" backLabel="Asset register" className="bg-[var(--panel)]" />
        
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-5">
            
            {/* Main Content (Left 2 cols) */}
            <div className="xl:col-span-2 flex flex-col gap-5 min-w-0">
              
              {/* Identity & Spec */}
              <div className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
                <div className="flex items-start justify-between gap-x-6 gap-y-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-2 shrink-0"><StatusDot status={asset.status} /></span>
                    <div className="min-w-0">
                      <h2 className="text-title font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                        {asset.name}
                      </h2>
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-1.5 text-body-sm text-[var(--text-3)]">
                        <span>ID <span className="font-mono text-[var(--text-2)]">{asset.id}</span></span>
                        <span>Station <span className="font-mono text-[var(--text-2)]">{asset.stationCode}</span></span>
                        <span title={`Zone ${asset.zoneCode}`}>{asset.zoneName} <span className="font-mono">({asset.zoneCode})</span></span>
                      </div>
                      {asset.status !== 'ok' && (
                        <div className="inline-flex mt-3 px-4 py-1 bg-[var(--watch-soft)]/15 border border-[var(--watch)] text-[var(--watch-soft)] text-body-sm font-medium rounded-full">
                          Condition degraded
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button 
                      onClick={() => navigate(`/stations/${asset.stationId}/twin?zone=${asset.zoneCode}`)}
                      className="px-4 min-h-9 bg-[var(--bg)] border border-[var(--line-strong)] rounded-full text-body-sm font-medium text-[var(--text)] hover:bg-[var(--panel-raised)] transition-colors"
                    >
                      View in 3D twin
                    </button>
                    <button 
                      onClick={() => alert('Log Service action dispatched (Dev B handles real decrement)')}
                      className="px-4 min-h-10 bg-[var(--act)] text-[var(--bg)] text-body-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
                    >
                      Log service
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Metrics */}
              <div className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
                <h3 className="text-title font-medium text-[var(--text)] mb-4">Live readings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <StatTile 
                    label={asset.threshold ? asset.threshold.label : "CURRENT"} 
                    measurement={asset.current}
                    trend={asset.series24h?.length > 1 ? (asset.series24h[asset.series24h.length-1].v - asset.series24h[0].v) / asset.series24h[0].v : undefined}
                  />
                  {asset.threshold && (
                    <div className="p-4 rounded-lg border border-[var(--line)] flex flex-col justify-center">
                      <span className="text-body-sm text-[var(--text-3)] mb-1.5">Threshold limit</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-headline font-medium text-[var(--text)]">{asset.threshold.value}</span>
                        <span className="font-mono text-body-sm text-[var(--text-3)]">{asset.threshold.unit}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {asset.series24h && asset.series24h.length > 0 && (
                  <div className="h-52 mt-2">
                    <TimeSeriesChart 
                      series={[{ id: 's1', name: asset.name, data: asset.series24h, color: 'var(--brand)' }]} 
                      threshold={asset.threshold?.value}
                    />
                  </div>
                )}
              </div>

              {/* Maintenance & Fault History */}
              <div className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
                <h3 className="text-title font-medium text-[var(--text)] mb-4">Fault history</h3>
                <div className="flex flex-col gap-3">
                  {faultHistory.map((f: any) => (
                    <div key={f.id} className="border border-[var(--line)] rounded-lg px-4 py-3">
                      <div className="flex justify-between items-baseline gap-4 flex-wrap mb-1.5">
                        <div className="text-body font-medium text-[var(--text)]">{f.symptom}</div>
                        <div className="font-mono text-body-sm text-[var(--text-3)]">{new Date(f.raisedAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-body-sm text-[var(--text-3)]">
                        Diagnosis: <span className="text-[var(--text-2)]">{f.diagnosis}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4 flex-wrap mt-3 pt-3 border-t border-[var(--line)]">
                        <ProvenanceBadge measurement={{ provenance: f.provenance, value: null, unit: '', timestamp: '', source: '', freshnessSeconds: 0 }} />
                        <span className="text-body-sm text-[var(--text-3)]" title="Time to resolve (TTR)">
                          Fixed in <span className="font-mono text-[var(--text-2)]">{f.timeToResolveMinutes}</span> min
                        </span>
                      </div>
                    </div>
                  ))}
                  <p className="text-body-sm text-[var(--text-3)] mt-1 max-w-[70ch]">
                    Historical records are synthetic pending connection to NCPOR station maintenance log.
                  </p>
                </div>
              </div>

            </div>
            
            {/* Right Rail */}
            <div className="flex flex-col gap-5 min-w-0">
              
              {/* Active Actions */}
              {actions.length > 0 && (
                <div className="bg-[var(--panel)] rounded-xl border border-[var(--line)] p-5">
                  <h3 className="text-title font-medium text-[var(--text)] mb-4 flex justify-between items-center gap-3" title="Active tickets">
                    <span>Open actions</span>
                    <span className="bg-[var(--act-soft)] text-[var(--act)] font-mono text-body-sm px-2.5 py-0.5 rounded-full">{actions.length}</span>
                  </h3>
                  <div className="flex flex-col gap-3">
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
                <h3 className="text-title font-medium text-[var(--text)] mb-4 flex items-center gap-2.5" title="Similar past faults (TF-IDF match)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  Similar past faults
                </h3>
                <div className="flex flex-col gap-2">
                  {similarFaults.map((sf: any) => (
                    <div key={sf.fault.id} className="px-4 py-3 border border-[var(--line)] rounded-lg bg-[var(--bg)] cursor-pointer hover:border-[var(--brand)] transition-colors">
                      <div className="flex justify-between items-start gap-3 mb-1">
                        <div className="text-body font-medium text-[var(--text)]">{sf.fault.symptom}</div>
                        <div className="shrink-0 font-mono text-body-sm px-2.5 py-0.5 bg-[var(--panel-raised)] rounded-full text-[var(--brand)]" title="Similarity score">
                          {(sf.score * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-body-sm text-[var(--text-3)] mb-3">
                        {sf.fault.diagnosis}
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <ProvenanceBadge measurement={{ provenance: sf.fault.provenance, value: null, unit: '', timestamp: '', source: '', freshnessSeconds: 0 }} />
                        <span className="font-mono text-body-sm text-[var(--text-3)]">{new Date(sf.fault.raisedAt).getFullYear()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-[var(--line)] text-body-sm text-[var(--text-3)]">
                  {SIMILARITY_METHOD_DISCLOSURE}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  const fieldCls = "w-full min-h-10 bg-[var(--bg)] border border-[var(--line-strong)] rounded-lg px-3 text-body text-[var(--text)] focus:border-[var(--brand)] outline-none";

  // LIST VIEW (unchanged layout from before, but added into same component)
  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
      <PageHeader title="Asset Register" backTo="/" backLabel="HQ" className="bg-[var(--panel)]" />

      <div className="flex-1 flex overflow-hidden">
        {/* Filter Rail */}
        <div className="w-[17rem] border-r border-[var(--line)] bg-[var(--panel)] p-5 flex flex-col gap-5 shrink-0 overflow-y-auto">
           <h3 className="text-title font-medium text-[var(--text)]">Filters</h3>
           
           <div>
             <label htmlFor="asset-search" className="text-body-sm text-[var(--text-3)] block mb-1.5">Search</label>
             <input 
               id="asset-search"
               type="text" 
               placeholder="Name or ID…"
               className={fieldCls}
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
           </div>

           <div>
             <label htmlFor="asset-station" className="text-body-sm text-[var(--text-3)] block mb-1.5">Station</label>
             <select 
               id="asset-station"
               className={fieldCls}
               value={filterStation}
               onChange={(e) => setFilterStation(e.target.value as any)}
             >
               <option value="all">All stations</option>
               <option value="bharati">Bharati (BHR)</option>
               <option value="maitri">Maitri (MTR)</option>
             </select>
           </div>

           <div>
             <label htmlFor="asset-status" className="text-body-sm text-[var(--text-3)] block mb-1.5">Status</label>
             <select 
               id="asset-status"
               className={fieldCls}
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
             >
               <option value="all">All statuses</option>
               <option value="ok">Healthy</option>
               <option value="watch">Watch</option>
               <option value="warning">Warning / critical</option>
             </select>
           </div>
        </div>

        {/* Table View */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-[var(--bg)] px-6 py-5">
           <div className="mb-4 flex justify-between items-end">
              <span className="text-body text-[var(--text-3)]">
                Showing <span className="font-mono text-[var(--text)]">{filteredAssets.length}</span> of <span className="font-mono">{allAssets.length}</span> assets
              </span>
           </div>

           <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl overflow-hidden">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b border-[var(--line)] bg-[var(--panel-raised)]">
                   <th className="px-4 py-3 text-body-sm text-[var(--text-3)] font-medium w-24 text-center">Status</th>
                   <th className="px-4 py-3 text-body-sm text-[var(--text-3)] font-medium">Asset</th>
                   <th className="px-4 py-3 text-body-sm text-[var(--text-3)] font-medium">Location</th>
                   <th className="px-4 py-3 text-body-sm text-[var(--text-3)] font-medium text-right">Current reading</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredAssets.length === 0 ? (
                   <tr>
                     <td colSpan={4} className="p-10 text-center text-body text-[var(--text-3)]">
                       No assets match these filters.
                     </td>
                   </tr>
                 ) : (
                   filteredAssets.map(asset => (
                     <tr 
                       key={asset.id} 
                       className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-raised)] cursor-pointer transition-colors"
                       onClick={() => navigate(`/assets/${asset.id}`)}
                     >
                       <td className="px-4 py-3 align-middle text-center">
                         <StatusDot status={asset.status} />
                       </td>
                       <td className="px-4 py-3 align-middle">
                         <div className="text-body font-medium text-[var(--text)]">{asset.name}</div>
                         <div className="font-mono text-body-sm text-[var(--text-3)] mt-0.5">{asset.id}</div>
                       </td>
                       <td className="px-4 py-3 align-middle">
                         <div className="text-body text-[var(--text-2)]">{asset.zoneName}</div>
                         <div className="font-mono text-body-sm text-[var(--text-3)] mt-0.5">{asset.stationCode} / {asset.zoneCode}</div>
                       </td>
                       <td className="px-4 py-3 align-middle text-right">
                         <div className="flex items-baseline justify-end gap-1.5">
                           <span className="font-mono text-title font-medium text-[var(--text)]">
                             {typeof asset.current?.value === 'number' ? asset.current.value.toFixed(1) : asset.current?.value || '—'}
                           </span>
                           <span className="font-mono text-body-sm text-[var(--text-3)]">{asset.current?.unit}</span>
                         </div>
                         {asset.threshold && (
                           <div className="text-body-sm text-[var(--text-3)] mt-0.5">
                             Limit <span className="font-mono">{asset.threshold.value} {asset.threshold.unit}</span>
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
