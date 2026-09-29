// OWNER: Dev B
// Manifest builder route — /logistics/manifest/:id
//
// The dedicated, full-width view of the builder that lives compactly on
// /logistics. Versions are append-only: regenerating creates a new version
// and the previous ones stay listed with their audit hashes (NFR-4.4).

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { ManifestBuilder } from './ManifestBuilder';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  buildCandidates, fillCapacity, generateManifest, getManifests,
  manifestCsv, downloadText, type Candidate,
} from '@/state/manifest';
import { getVoyages } from '@/state/data';
import { useStoreValue } from '@/state/useStore';
import { getParamValue } from '@/state/params';
import { useCan } from '@/state/auth';
import { formatShortIST } from '@/lib/time';
import { shortHash } from '@/lib/hashChain';

export default function ManifestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const voyages = useStoreValue(getVoyages);
  const voyage = voyages.find((v) => v.id === id) ?? null;
  const canGenerate = useCan('logistics.manifest');

  const [capacityKg, setCapacityKg] = useState(() => getParamValue<number>('logistics.capacityMaxKg'));
  const [toast, setToast] = useState<string | null>(null);

  // Only the operator's departures from the algorithm are state. The ranked
  // list itself is derived, so a parameter or voyage change flows straight
  // through without an effect that could fight the store (NFR-4.2).
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const seed = useStoreValue(() => buildCandidates('all', voyage?.season));
  const seedKey = seed.map((c) => `${c.resourceId}:${c.stationId}:${c.massKg}:${c.score.toFixed(4)}`).join('|');

  const candidates: Candidate[] = useMemo(() => {
    const filled = fillCapacity(
      seed.map((c) => {
        const key = c.resourceId + '|' + c.stationId;
        return key in overrides
          ? { ...c, included: overrides[key], manualOverride: true }
          : c;
      }),
      capacityKg
    );
    return filled;
    // seedKey stands in for seed's contents — seed is a fresh array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey, capacityKg, overrides]);

  const versions = useStoreValue(() => (voyage ? getManifests(voyage.id) : []));

  const toggleItem = (resourceId: string, stationId: string) => {
    const key = resourceId + '|' + stationId;
    const current = candidates.find((c) => c.resourceId === resourceId && c.stationId === stationId);
    setOverrides((cur) => ({ ...cur, [key]: !(current?.included ?? false) }));
  };

  const onGenerate = async () => {
    if (!voyage) return;
    const manifest = await generateManifest(voyage, candidates, capacityKg);
    setToast(`Manifest v${manifest.version} generated and appended to the audit chain.`);
  };

  const latest = versions[0];
  const csv = useMemo(
    () => (latest ? manifestCsv(latest, candidates) : ''),
    [latest, candidates]
  );

  if (!voyage) {
    return (
      <div className="p-6">
        <EmptyState reason={`No voyage matches "${id}". Open /logistics and pick a voyage from the season selector.`} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-4 flex-wrap px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <button
          type="button"
          onClick={() => navigate('/logistics')}
          className="m-back flex items-center gap-2 px-3.5 min-h-9 rounded-full text-body-sm font-medium hover:bg-[var(--panel-alt)]"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
        >
          <ArrowLeft size={14} /> Logistics
        </button>
        <h1 className="text-display font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          Manifest — {voyage.name}
        </h1>
        <span className="text-body-sm px-3 py-1 rounded-full" style={{ color: 'var(--text-2)', backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)' }}>
          Season <span className="font-mono">{voyage.season}</span> · <span className="capitalize">{voyage.status}</span>
        </span>
      </div>

      {toast && (
        <div key={toast} className="m-toast px-6 py-2.5 shrink-0" role="status"
          style={{ backgroundColor: 'rgba(79,174,133,0.10)', borderBottom: '1px solid var(--ok)' }}>
          <span className="text-body" style={{ color: 'var(--ok-soft)' }}>{toast}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <div className="flex flex-col xl:flex-row gap-5 max-w-[100rem] mx-auto">
          <div className="flex-1 min-w-0">
            <ManifestBuilder
              voyage={voyage}
              candidates={candidates}
              capacityKg={capacityKg}
              onCapacityChange={setCapacityKg}
              onToggleItem={toggleItem}
              onGenerate={onGenerate}
              canGenerate={canGenerate}
            />
          </div>

          <aside className="w-full xl:w-[24rem] xl:shrink-0">
            <section
              className="p-5 xl:sticky xl:top-0"
              style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
            >
              <h2 className="text-title font-semibold mb-3" style={{ color: 'var(--text)' }}>Versions</h2>
              {versions.length === 0 ? (
                <p className="text-body" style={{ color: 'var(--text-3)' }}>
                  No manifest generated for this voyage yet. Generating creates version 1 and appends
                  it to the audit chain — later runs never overwrite it.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {versions.map((m) => (
                    <li
                      key={m.id}
                      className="px-4 py-3"
                      style={{ backgroundColor: 'var(--panel-raised)', borderRadius: 'var(--r-inner)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-body font-medium" style={{ color: 'var(--text)' }}>v{m.version}</span>
                        <span className="font-mono text-caption" style={{ color: 'var(--text-3)' }}>
                          {formatShortIST(m.generatedAt)}
                        </span>
                        <span className="font-mono text-body-sm ml-auto" style={{ color: 'var(--text-2)' }}>
                          {m.totalMassKg.toLocaleString()} kg
                        </span>
                      </div>
                      <p className="font-mono text-caption mt-1.5" style={{ color: 'var(--text-3)' }}>
                        {m.generatedBy} · {shortHash(m.auditHash)}
                      </p>
                      {m.deferredAtRisk > 0 && (
                        <p className="text-caption mt-1" style={{ color: 'var(--act-soft)' }}>
                          {m.deferredAtRisk} deferred at risk
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {latest && (
                <button
                  type="button"
                  onClick={() => downloadText(`${latest.id}.csv`, csv, 'text/csv')}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-full text-body-sm font-medium min-h-10 hover:bg-[var(--panel-alt)]"
                  style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
                >
                  <Download size={16} /> Export v{latest.version} as CSV
                </button>
              )}

              <p
                className="text-body-sm mt-5 pt-4"
                style={{ color: 'var(--text-3)', borderTop: '1px solid var(--line)' }}
              >
                Quantities come from placeholder (SYNTH) stock and burn-rate figures, and every
                exported row says so. A manifest must never present placeholder tonnage as fact.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
