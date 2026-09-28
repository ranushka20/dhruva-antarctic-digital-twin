// OWNER: Dev B
// PAGE 10a — Crew Handover (/handover).
//
// Antarctic crews rotate, and the station's operational memory usually walks
// out of the door with them. This page assembles a capsule from the
// platform's own records rather than from memory.
//
// A zero-item section still appears, marked "none" — an empty section is
// information (FR-A12). And an exported capsule that presented SYNTH figures
// as fact would be the single most damaging output of this product, so every
// export carries the provenance notice (NFR-A3).

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Download, FileText } from 'lucide-react';
import { SyncPill } from '@/components/shared/SyncPill';
import { Modal } from '@/components/shared/Modal';
import {
  buildCapsule, generateCapsule, acknowledgeCapsule, getCapsules, getRotations,
  capsuleMarkdown, capsuleJson, SECTION_ORDER, SECTION_TITLES,
  type SectionKey, type Rotation,
} from '@/state/handover';
import { downloadText } from '@/state/manifest';
import { getSyncInfo, type StationId } from '@/state/connectivity';
import { useStoreValue } from '@/state/useStore';
import { STATION_LABEL } from '@/state/stationScope';
import { useCan } from '@/state/auth';
import { formatShortIST, formatDateIST } from '@/lib/time';
import { shortHash } from '@/lib/hashChain';
import { AsyncButton } from '@/components/shared/AsyncButton';
import { ActiveIndicator } from '@/components/shared/ActiveIndicator';

export default function HandoverPage() {
  const [searchParams] = useSearchParams();
  const [stationId, setStationId] = useState<StationId>(
    (searchParams.get('station') as StationId) ?? 'bharati'
  );
  const [rotationId, setRotationId] = useState<string | null>(null);
  const [included, setIncluded] = useState<Record<SectionKey, boolean>>(() =>
    Object.fromEntries(SECTION_ORDER.map((k) => [k, k !== 'notes'])) as Record<SectionKey, boolean>
  );
  const [notes, setNotes] = useState('');
  const [ackOpen, setAckOpen] = useState(false);
  const [incomingLead, setIncomingLead] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const canGenerate = useCan('compliance.export');

  const rotations = useMemo(() => getRotations(stationId), [stationId]);
  const rotation: Rotation = rotations.find((r) => r.id === rotationId) ?? rotations[0];
  const sync = useStoreValue(useCallback(() => getSyncInfo(stationId), [stationId]));
  const sections = useStoreValue(useCallback(() => buildCapsule(stationId, rotation), [stationId, rotation]));
  const capsules = useStoreValue(useCallback(() => getCapsules(stationId), [stationId]));
  const latest = capsules[0];

  const onGenerate = async () => {
    const capsule = await generateCapsule(stationId, rotation, sections, included, notes);
    setToast(`Capsule v${capsule.version} generated and appended to the audit chain.`);
    setTimeout(() => setToast(null), 6000);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- Title row ---- */}
      <div className="flex items-center gap-3 flex-wrap px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <h1 className="text-display font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          Crew Handover
        </h1>

        <div data-segmented className="relative isolate flex items-center gap-1 ml-2 p-0.5 rounded-full" style={{ border: '1px solid var(--line)' }}>
          {(['bharati', 'maitri'] as StationId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setStationId(id)}
              aria-pressed={stationId === id}
              className="px-3 py-1.5 rounded-full text-body-sm"
              style={{
                color: stationId === id ? 'var(--bg)' : 'var(--text-3)',
              }}
            >
              {STATION_LABEL[id]}
            </button>
          ))}
          <ActiveIndicator className="rounded-full" style={{ backgroundColor: 'var(--text)' }} />
        </div>

        <label className="flex items-center gap-2">
          <span className="font-mono text-micro uppercase tracking-label" style={{ color: 'var(--text-4)' }}>
            Rotation
          </span>
          <select
            value={rotation.id}
            onChange={(e) => setRotationId(e.target.value)}
            className="px-2.5 py-1.5 font-mono text-caption outline-none"
            style={{
              backgroundColor: 'var(--panel)', border: '1px solid var(--line)',
              borderRadius: 'var(--r-pill)', color: 'var(--text-2)',
            }}
          >
            {rotations.map((r) => (
              <option key={r.id} value={r.id}>
                {formatDateIST(r.from)} → {formatDateIST(r.to)}
              </option>
            ))}
          </select>
        </label>

        <SyncPill state={sync.state} ageSeconds={sync.ageSeconds} />

        <AsyncButton
          onClick={onGenerate}
          disabled={!canGenerate}
          pendingLabel="Sealing capsule…"
          doneLabel="Capsule sealed"
          className="ml-auto px-4 py-2 rounded-full text-body font-medium min-h-[40px]"
          style={{ backgroundColor: 'var(--act)', color: 'var(--bg)', opacity: canGenerate ? 1 : 0.4 }}
        >
          Generate capsule
        </AsyncButton>
      </div>

      {toast && (
        <div key={toast} className="m-toast px-6 py-2 shrink-0" role="status"
          style={{ backgroundColor: 'rgba(79,174,133,0.10)', borderBottom: '1px solid var(--ok)' }}>
          <span className="font-mono text-caption" style={{ color: 'var(--ok-soft)' }}>{toast}</span>
        </div>
      )}

      {sync.state !== 'LIVE' && (
        <div className="px-6 py-2 shrink-0" role="status"
          style={{ backgroundColor: 'rgba(217,164,65,0.10)', borderBottom: '1px solid var(--watch)' }}>
          <span className="text-body" style={{ color: 'var(--watch-soft)' }}>
            {STATION_LABEL[stationId]} is {sync.state}. The capsule still generates from last-known
            state — every affected section is marked stale and §8 states the gap.
          </span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        <div className="flex flex-col lg:flex-row gap-3.5">
          {/* ---- Capsule preview ---- */}
          <div className="flex-1 min-w-0">
            <section
              className="p-5"
              style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
            >
              <h2 className="text-headline font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                {STATION_LABEL[stationId]} — rotation capsule
              </h2>
              <p className="font-mono text-caption mb-4" style={{ color: 'var(--text-3)' }}>
                {formatDateIST(rotation.from)} → {formatDateIST(rotation.to)} · outgoing lead{' '}
                {rotation.outgoingLead}
              </p>

              <ol className="space-y-4">
                {sections.filter((s) => included[s.key]).map((section, i) => (
                  <li key={section.key}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-caption" style={{ color: 'var(--text-4)' }}>
                        {i + 1}
                      </span>
                      <h3 className="text-body font-semibold" style={{ color: 'var(--text)' }}>
                        {section.title}
                      </h3>
                      {section.stale && (
                        <span className="font-mono text-micro uppercase px-1.5 py-0.5 rounded"
                          style={{ border: '1px dashed var(--watch)', color: 'var(--watch-soft)' }}>
                          Stale
                        </span>
                      )}
                      <span className="font-mono text-micro ml-auto" style={{ color: 'var(--text-4)' }}>
                        {section.key === 'notes' ? (notes.trim() ? 1 : 0) : section.itemCount}
                      </span>
                    </div>

                    {section.key === 'notes' ? (
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        placeholder="The only section that is typed rather than assembled. Anything the next crew cannot read out of the records."
                        className="w-full px-3 py-2 text-body outline-none"
                        style={{
                          backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)',
                          borderRadius: 'var(--r-inner)', color: 'var(--text)',
                        }}
                      />
                    ) : section.itemCount === 0 ? (
                      <p className="text-body-sm px-3 py-2"
                        style={{ color: 'var(--text-4)', backgroundColor: 'var(--panel-raised)', borderRadius: 'var(--r-inner)' }}>
                        none — {section.emptyNote}
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {section.lines.map((line, j) => (
                          <li
                            key={j}
                            className="text-body-sm px-3 py-1.5"
                            style={{
                              color: line.includes('CROSSES A THRESHOLD') || line.includes('DEFERRED:')
                                ? 'var(--act-soft)'
                                : 'var(--text-2)',
                              backgroundColor: 'var(--panel-raised)',
                              borderRadius: 'var(--r-inner)',
                            }}
                          >
                            {line}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* ---- Contents checklist ---- */}
          <aside className="w-full lg:w-[360px] lg:shrink-0 flex flex-col gap-3.5">
            <section
              className="p-4"
              style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
            >
              <h2 className="text-title font-semibold mb-3" style={{ color: 'var(--text)' }}>Contents</h2>
              <ul className="space-y-1">
                {sections.map((section) => (
                  <li key={section.key}>
                    <label className="flex items-center gap-2.5 px-2 py-2 cursor-pointer rounded"
                      style={{ backgroundColor: included[section.key] ? 'var(--panel-raised)' : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={included[section.key]}
                        onChange={() => setIncluded((cur) => ({ ...cur, [section.key]: !cur[section.key] }))}
                      />
                      <span className="text-body flex-1" style={{ color: 'var(--text-2)' }}>
                        {SECTION_TITLES[section.key]}
                      </span>
                      <span className="font-mono text-caption tabular-nums" style={{ color: 'var(--text-3)' }}>
                        {section.key === 'notes'
                          ? (notes.trim() ? 1 : '—')
                          : section.itemCount === 0 ? '—' : section.itemCount}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                <ExportButton
                  label="Markdown"
                  disabled={!latest}
                  onClick={() =>
                    latest && downloadText(latest.id + '.md', capsuleMarkdown(latest, sections), 'text/markdown')
                  }
                />
                <ExportButton
                  label="JSON"
                  disabled={!latest}
                  onClick={() => latest && downloadText(latest.id + '.json', capsuleJson(latest), 'application/json')}
                />
                <ExportButton
                  label="Print / PDF"
                  disabled={!latest}
                  onClick={() => window.print()}
                />
              </div>
              <p className="font-mono text-micro mt-2" style={{ color: 'var(--text-4)' }}>
                Every export carries the provenance notice. A capsule presenting SYNTH figures as
                fact is the most damaging thing this page could produce.
              </p>
            </section>

            {/* ---- Versions + acknowledgement ---- */}
            <section
              className="p-4"
              style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
            >
              <h2 className="text-title font-semibold mb-3" style={{ color: 'var(--text)' }}>Versions</h2>
              {capsules.length === 0 ? (
                <p className="text-body-sm" style={{ color: 'var(--text-4)' }}>
                  None generated yet. A capsule is immutable once generated — regenerating creates a
                  new version and never overwrites one.
                </p>
              ) : (
                <ul className="space-y-2">
                  {capsules.map((c) => (
                    <li key={c.id} className="px-3 py-2"
                      style={{ backgroundColor: 'var(--panel-raised)', borderRadius: 'var(--r-inner)' }}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-body-sm" style={{ color: 'var(--text)' }}>v{c.version}</span>
                        <span className="font-mono text-micro" style={{ color: 'var(--text-4)' }}>
                          {formatShortIST(c.generatedAt)}
                        </span>
                        <span className="font-mono text-micro ml-auto" style={{ color: 'var(--text-4)' }}>
                          {c.syncStateAtGeneration.state}
                        </span>
                      </div>
                      <p className="font-mono text-micro mt-1" style={{ color: 'var(--text-4)' }}>
                        {c.generatedBy} · {shortHash(c.auditHash)}
                      </p>
                      {c.acknowledgedBy ? (
                        <p className="flex items-center gap-1.5 font-mono text-micro mt-1" style={{ color: 'var(--ok-soft)' }}>
                          <Check size={10} /> received by {c.acknowledgedBy} · {formatShortIST(c.acknowledgedAt!)}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setAckOpen(true); setIncomingLead(''); }}
                          className="mt-1.5 text-body-sm font-medium px-2.5 py-1 rounded min-h-[30px]"
                          style={{ border: '1px solid var(--line)', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
                        >
                          Mark received
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>

      <Modal open={ackOpen} onClose={() => setAckOpen(false)} title="Acknowledge capsule">
        <p className="text-body-sm mb-3" style={{ color: 'var(--text-3)' }}>
          The incoming crew lead marks the capsule received. The acknowledgement is appended to the
          audit chain and the capsule then shows both parties.
        </p>
        <input
          value={incomingLead}
          onChange={(e) => setIncomingLead(e.target.value)}
          placeholder="Incoming crew lead"
          className="w-full px-3 py-2 text-body outline-none mb-3"
          style={{
            backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)',
            borderRadius: 'var(--r-inner)', color: 'var(--text)',
          }}
        />
        <AsyncButton
          disabled={!incomingLead.trim() || !latest}
          onClick={async () => {
            if (latest) await acknowledgeCapsule(latest.id, incomingLead);
            setAckOpen(false);
          }}
          pendingLabel="Recording…"
          doneLabel={null}
          className="w-full inline-flex justify-center py-2.5 rounded-full text-body font-medium min-h-[44px]"
          style={{
            backgroundColor: incomingLead.trim() ? 'var(--act)' : 'var(--panel-raised)',
            color: incomingLead.trim() ? 'var(--bg)' : 'var(--text-4)',
          }}
        >
          Record acknowledgement
        </AsyncButton>
      </Modal>
    </div>
  );
}

function ExportButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-body-sm font-medium min-h-[38px]"
      style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)', opacity: disabled ? 0.4 : 1 }}
    >
      {label === 'Print / PDF' ? <FileText size={11} /> : <Download size={11} />}
      {label}
    </button>
  );
}
