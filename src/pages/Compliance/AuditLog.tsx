// OWNER: Dev B
// Audit log — the chain viewer, the verifier and the visual chain strip.
//
// The mechanism is a TAMPER-EVIDENT HASH CHAIN (SHA-256). It proves records
// have not been altered since they were written. It carries no signature and
// does not prove who wrote them beyond the recorded actor — it is
// tamper-evident, not non-repudiable, and the export says so in as many
// words. Superseded entries are greyed, never hidden: the log's whole value
// is that nothing disappears.

import { useMemo, useState } from 'react';
import { Download, ShieldCheck, ShieldAlert, Unlink } from 'lucide-react';
import type { ChainEntry, ChainStatus } from '@/lib/hashChain';
import { shortHash } from '@/lib/hashChain';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatShortIST, formatDuration } from '@/lib/time';
import { AsyncButton } from '@/components/shared/AsyncButton';

interface Props {
  chain: ChainEntry[];
  status: ChainStatus | null;
  verifying: boolean;
  onVerify: () => Promise<void> | void;
  onExport: () => void;
  onTamper: (seq: number) => void;
  canTamper: boolean;
  focusSeq?: number | null;
}

export function AuditLog({
  chain, status, verifying, onVerify, onExport, onTamper, canTamper, focusSeq,
}: Props) {
  const [objectType, setObjectType] = useState<string>('all');
  const [actor, setActor] = useState<string>('all');
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(focusSeq ?? null);

  const objectTypes = useMemo(
    () => ['all', ...Array.from(new Set(chain.map((e) => e.objectType))).sort()],
    [chain]
  );
  const actors = useMemo(
    () => ['all', ...Array.from(new Set(chain.map((e) => e.actor))).sort()],
    [chain]
  );

  const filtered = useMemo(
    () =>
      chain.filter((e) => {
        if (objectType !== 'all' && e.objectType !== objectType) return false;
        if (actor !== 'all' && e.actor !== actor) return false;
        if (offlineOnly && !e.writtenOffline) return false;
        return true;
      }),
    [chain, objectType, actor, offlineOnly]
  );

  const select = {
    backgroundColor: 'var(--panel)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-pill)',
    color: 'var(--text-2)',
  } as const;

  return (
    <div className="space-y-3.5">
      {/* ---- Verifier ---- */}
      <section
        className="p-4"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
          <h3 className="text-title font-semibold" style={{ color: 'var(--text)' }}>
            Tamper-evident hash chain (SHA-256)
          </h3>
          {status && (
            <span
              className="flex items-center gap-1.5 text-body-sm font-medium px-2.5 py-1 rounded-full"
              style={{
                border: `1px solid ${status.ok ? 'var(--ok)' : 'var(--act)'}`,
                color: status.ok ? 'var(--ok-soft)' : 'var(--act-soft)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {status.ok ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
              {status.ok ? `Chain verified · ${status.verified}` : `Chain broken at entry ${status.brokenAt}`}
            </span>
          )}
          <AsyncButton
            onClick={onVerify}
            pendingLabel="Verifying…"
            doneLabel={status?.ok === false ? null : 'Verified'}
            disabled={verifying}
            className="px-3 py-1.5 rounded-full text-body-sm font-medium min-h-[36px]"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)', opacity: verifying ? 0.5 : 1 }}
          >
            {verifying ? 'Verifying…' : 'Verify chain'}
          </AsyncButton>
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-body-sm font-medium min-h-[36px]"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
          >
            <Download size={11} /> Export JSON
          </button>
          {status && (
            <span className="font-mono text-micro ml-auto" style={{ color: 'var(--text-4)' }}>
              {status.verified} entries in {status.durationMs} ms · checked {formatShortIST(status.checkedAt)}
            </span>
          )}
        </div>

        {/* ---- Chain strip (FR-5.4) ---- */}
        <div className="flex items-center gap-[2px] flex-wrap" role="img"
          aria-label={status?.ok ? 'Chain intact' : `Chain broken at entry ${status?.brokenAt}`}>
          {chain.map((entry) => {
            const broken = status && !status.ok && entry.seq === status.brokenAt;
            return (
              <button
                key={entry.seq}
                type="button"
                onClick={() => setExpanded(entry.seq)}
                title={`#${entry.seq} ${entry.transition} — ${entry.payloadSummary}`}
                style={{
                  width: 9,
                  height: 16,
                  borderRadius: 2,
                  backgroundColor: broken
                    ? 'var(--act)'
                    : entry.superseded
                      ? 'var(--unknown)'
                      : entry.writtenOffline
                        ? 'var(--watch)'
                        : 'var(--ok)',
                  opacity: entry.superseded ? 0.4 : 0.85,
                }}
              />
            );
          })}
        </div>
        {status && !status.ok && (
          <p className="flex items-center gap-1.5 font-mono text-caption mt-2" style={{ color: 'var(--act-soft)' }}>
            <Unlink size={11} /> Severed link at position {status.brokenAt}. Everything after it is
            no longer provably unaltered.
          </p>
        )}
        <p className="font-mono text-micro mt-2" style={{ color: 'var(--text-4)' }}>
          Tamper-evident, not non-repudiable: this chain proves records have not been altered since
          they were written. It carries no digital signature.
        </p>
      </section>

      {/* ---- Filters (FR-5.2) ---- */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={objectType} onChange={(e) => setObjectType(e.target.value)}
          className="px-2.5 py-1.5 font-mono text-caption outline-none" style={select} aria-label="Filter by object type">
          {objectTypes.map((t) => <option key={t} value={t}>{t === 'all' ? 'All object types' : t}</option>)}
        </select>
        <select value={actor} onChange={(e) => setActor(e.target.value)}
          className="px-2.5 py-1.5 font-mono text-caption outline-none" style={select} aria-label="Filter by actor">
          {actors.map((a) => <option key={a} value={a}>{a === 'all' ? 'All actors' : a}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setOfflineOnly((v) => !v)}
          aria-pressed={offlineOnly}
          className="px-3 py-1.5 rounded-full text-body-sm font-medium min-h-[34px]"
          style={{
            border: `1px solid ${offlineOnly ? 'var(--watch)' : 'var(--line)'}`,
            color: offlineOnly ? 'var(--watch-soft)' : 'var(--text-3)',
            fontFamily: 'var(--font-body)',
          }}
        >
          Written offline
        </button>
        <span className="font-mono text-caption ml-auto" style={{ color: 'var(--text-4)' }}>
          {filtered.length} of {chain.length} entries
        </span>
      </div>

      {/* ---- Entries (FR-5.1) ---- */}
      <section
        className="p-4"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        {filtered.length === 0 ? (
          <EmptyState reason="No chain entries match these filters." />
        ) : (
          <ul className="space-y-1 max-h-[520px] overflow-y-auto">
            {filtered.slice().reverse().map((entry) => {
              const isBroken = status && !status.ok && entry.seq === status.brokenAt;
              const open = expanded === entry.seq;
              return (
                <li
                  key={entry.seq}
                  className="px-2.5 py-2"
                  style={{
                    backgroundColor: open ? 'var(--panel-raised)' : 'transparent',
                    borderRadius: 'var(--r-inner)',
                    border: isBroken ? '1px solid var(--act)' : '1px solid transparent',
                    opacity: entry.superseded ? 0.55 : 1,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : entry.seq)}
                    className="w-full flex items-center gap-2 text-left flex-wrap"
                  >
                    <span className="font-mono text-micro w-10 shrink-0" style={{ color: 'var(--text-4)' }}>
                      #{entry.seq}
                    </span>
                    <span className="font-mono text-micro w-24 shrink-0" style={{ color: 'var(--text-3)' }}>
                      {formatShortIST(entry.at)}
                    </span>
                    <span className="font-mono text-micro w-24 shrink-0" style={{ color: 'var(--text-4)' }}>
                      {entry.objectType}
                    </span>
                    <span className="text-body-sm flex-1 min-w-0 truncate" style={{ color: 'var(--text-2)' }}>
                      {entry.payloadSummary}
                    </span>
                    <span className="text-caption shrink-0" style={{ color: 'var(--text-3)' }}>{entry.actor}</span>
                    {entry.writtenOffline && (
                      <span className="font-mono text-micro uppercase px-1 rounded shrink-0"
                        style={{ border: '1px dashed var(--watch)', color: 'var(--watch-soft)' }}>
                        Offline
                      </span>
                    )}
                    {entry.superseded && (
                      <span className="font-mono text-micro uppercase px-1 rounded shrink-0"
                        style={{ border: '1px solid var(--line-strong)', color: 'var(--text-4)' }}>
                        Superseded
                      </span>
                    )}
                    <span className="font-mono text-micro shrink-0" style={{ color: 'var(--text-4)' }}>
                      {shortHash(entry.hash)}
                    </span>
                  </button>

                  {open && (
                    <div className="mt-2 pl-10 space-y-1">
                      <Kv k="transition" v={entry.transition} />
                      <Kv k="object" v={entry.objectId} />
                      <Kv k="actor" v={`${entry.actor} (${entry.actorRole})`} />
                      {entry.atStation && (
                        <Kv
                          k="station time"
                          v={`${formatShortIST(entry.atStation)} · HQ receipt ${formatShortIST(entry.at)} · skew ${formatDuration(Math.abs((Date.parse(entry.at) - Date.parse(entry.atStation)) / 1000))}`}
                        />
                      )}
                      <Kv k="hash" v={entry.hash} mono />
                      <Kv k="prev" v={entry.prevHash} mono />
                      <Kv k="payload" v={JSON.stringify(entry.payload)} mono />
                      {canTamper && (
                        <button
                          type="button"
                          onClick={() => onTamper(entry.seq)}
                          className="mt-1.5 text-body-sm font-medium px-2.5 py-1 rounded min-h-[30px]"
                          style={{ border: '1px dashed var(--sim)', color: 'var(--sim-soft)', fontFamily: 'var(--font-body)' }}
                          title="Demo affordance: edits the payload without updating the hash, so Verify chain catches it"
                        >
                          Tamper with this entry (demo)
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kv({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <p className="flex gap-2">
      <span className="font-mono text-micro w-24 shrink-0" style={{ color: 'var(--text-4)' }}>{k}</span>
      <span
        className={mono ? 'font-mono text-micro break-all' : 'text-body-sm'}
        style={{ color: 'var(--text-3)' }}
      >
        {v}
      </span>
    </p>
  );
}
