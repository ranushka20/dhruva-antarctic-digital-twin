// OWNER: Dev B
// CommandPalette — global search across actions, resources, obligations,
// records and routes, on Cmd/Ctrl + Space (FR-2.2, FR-13.1).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getActions, getResources, getObligations, getInspections } from '@/state/data';
import { getChain, shortHash } from '@/lib/hashChain';
import { STATION_LABEL } from '@/state/stationScope';
import { TierChip } from '@/components/shared/TierChip';

interface Hit {
  kind: 'Action' | 'Resource' | 'Obligation' | 'Inspection' | 'Audit' | 'Page';
  id: string;
  title: string;
  sub: string;
  to: string;
  tier?: 'T0' | 'T1' | 'T2' | 'T3';
}

const PAGES: Hit[] = [
  { kind: 'Page', id: 'p-overview', title: 'HQ Overview', sub: '/', to: '/' },
  { kind: 'Page', id: 'p-actions', title: 'Action Centre', sub: '/actions', to: '/actions' },
  { kind: 'Page', id: 'p-logistics', title: 'Logistics & Resupply', sub: '/logistics', to: '/logistics' },
  { kind: 'Page', id: 'p-comms', title: 'Sync & Comms', sub: '/comms', to: '/comms' },
  { kind: 'Page', id: 'p-station', title: 'Station Console', sub: '/station', to: '/station' },
  { kind: 'Page', id: 'p-compliance', title: 'Compliance & Audit', sub: '/compliance', to: '/compliance' },
  { kind: 'Page', id: 'p-handover', title: 'Crew Handover', sub: '/handover', to: '/handover' },
  { kind: 'Page', id: 'p-settings', title: 'Settings & Parameters', sub: '/settings', to: '/settings' },
];

function buildIndex(): Hit[] {
  const hits: Hit[] = [...PAGES];

  for (const a of getActions('all')) {
    hits.push({
      kind: 'Action',
      id: a.id,
      title: a.title,
      sub: `${STATION_LABEL[a.stationId]} · ${a.state}${a.zoneCode ? ' · ' + a.zoneCode : ''}`,
      to: '/actions/' + a.id,
      tier: a.tier,
    });
  }
  for (const r of getResources('all')) {
    hits.push({
      kind: 'Resource',
      id: r.id,
      title: r.name,
      sub: `${STATION_LABEL[r.stationId]} · autonomy ${Math.round(r.autonomyDays)} ±${Math.round(r.autonomyBandDays)} d`,
      to: '/logistics?resource=' + r.id,
    });
  }
  for (const o of getObligations('all')) {
    hits.push({
      kind: 'Obligation',
      id: o.id,
      title: o.name,
      sub: `${STATION_LABEL[o.stationId]} · ${o.status.replace('_', ' ')}`,
      to: '/compliance?tab=obligations&record=' + o.id,
    });
  }
  for (const i of getInspections('all')) {
    hits.push({
      kind: 'Inspection',
      id: i.id,
      title: i.type,
      sub: `${STATION_LABEL[i.stationId as 'bharati' | 'maitri']} · ${i.result.replace(/_/g, ' ')}`,
      to: '/compliance?tab=inspections&record=' + i.id,
    });
  }
  for (const e of getChain('hq').slice(-80).reverse()) {
    hits.push({
      kind: 'Audit',
      id: 'chain-' + e.seq,
      title: e.payloadSummary,
      sub: `#${e.seq} · ${e.transition} · ${shortHash(e.hash)}`,
      to: '/compliance?tab=audit&seq=' + e.seq,
    });
  }
  return hits;
}

const KIND_COLOR: Record<Hit['kind'], string> = {
  Action: 'var(--act-soft)',
  Resource: 'var(--ok-soft)',
  Obligation: 'var(--watch-soft)',
  Inspection: 'var(--watch-soft)',
  Audit: 'var(--text-3)',
  Page: 'var(--text-3)',
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const index = useMemo(() => (open ? buildIndex() : []), [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return index.filter((h) => h.kind === 'Page' || h.kind === 'Action').slice(0, 12);
    const terms = q.split(/\s+/);
    return index
      .map((hit) => {
        const hay = (hit.title + ' ' + hit.sub + ' ' + hit.kind).toLowerCase();
        const score = terms.reduce((s, t) => (hay.includes(t) ? s + (hit.title.toLowerCase().includes(t) ? 2 : 1) : s), 0);
        return { hit, score, matched: terms.every((t) => hay.includes(t)) };
      })
      .filter((r) => r.matched)
      .sort((a, b) => b.score - a.score)
      .slice(0, 14)
      .map((r) => r.hit);
  }, [index, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  if (!open) return null;

  const go = (hit: Hit) => { onClose(); navigate(hit.to); };

  return (
    <>
      <div className="fixed inset-0 z-[60]" style={{ backgroundColor: 'rgba(10,13,12,0.68)' }} onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-start justify-center pt-[12vh] px-4 pointer-events-none">
        <div
          className="w-full max-w-xl pointer-events-auto overflow-hidden"
          style={{
            backgroundColor: 'var(--panel-alt)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--r-card)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
          }}
          role="dialog"
          aria-label="Search assets, actions, records"
        >
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <Search size={15} style={{ color: 'var(--text-3)' }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.preventDefault(); onClose(); }
                if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
                if (e.key === 'Enter' && results[cursor]) { e.preventDefault(); go(results[cursor]); }
              }}
              placeholder="Search assets, actions, records"
              className="flex-1 bg-transparent outline-none text-[13px]"
              style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}
              aria-label="Search assets, actions, records"
            />
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ color: 'var(--text-4)', border: '1px solid var(--line)' }}>
              ESC
            </span>
          </div>

          <ul className="max-h-[52vh] overflow-y-auto py-1">
            {results.length === 0 && (
              <li className="px-4 py-6 text-center text-[12px]" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
                Nothing matches “{query}”. Search covers actions, resources, obligations, inspections and the audit log of both stations.
              </li>
            )}
            {results.map((hit, i) => (
              <li key={hit.kind + hit.id}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(hit)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-left"
                  style={{ backgroundColor: i === cursor ? 'var(--panel-raised)' : 'transparent' }}
                >
                  <span
                    className="font-mono text-[8.5px] tracking-[0.08em] w-16 shrink-0"
                    style={{ color: KIND_COLOR[hit.kind] }}
                  >
                    {hit.kind.toUpperCase()}
                  </span>
                  {hit.tier && <TierChip tier={hit.tier} />}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] truncate" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
                      {hit.title}
                    </span>
                    <span className="block font-mono text-[9.5px] truncate" style={{ color: 'var(--text-3)' }}>
                      {hit.sub}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
