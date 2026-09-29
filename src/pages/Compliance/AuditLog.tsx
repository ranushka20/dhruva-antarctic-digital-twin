// OWNER: Dev B
// Audit log — the chain viewer, the verifier and the visual chain strip.
//
// The mechanism is a TAMPER-EVIDENT HASH CHAIN (SHA-256). It proves records
// have not been altered since they were written. It carries no signature and
// does not prove who wrote them beyond the recorded actor — it is
// tamper-evident, not non-repudiable, and the export says so in as many
// words. Superseded entries are greyed, never hidden: the log's whole value
// is that nothing disappears.

import { useMemo, useState, type ReactNode } from 'react';
import { Download, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
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
    border: '1px solid var(--line-strong)',
    borderRadius: 'var(--r-pill)',
    color: 'var(--text-2)',
  } as const;

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Verifier (FR-5.3/5.4/5.7/5.8) — one compact row + the strip ---- */}
      <section
        className="px-5 py-4"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
          {status?.ok === false ? (
            <ShieldAlert size={20} className="shrink-0" style={{ color: 'var(--act-soft)' }} aria-hidden />
          ) : (
            <ShieldCheck size={20} className="shrink-0" style={{ color: 'var(--ok-soft)' }} aria-hidden />
          )}
          <div className="min-w-0">
            <h3 className="text-body font-semibold" style={{ color: 'var(--text)' }}>
              Tamper-evident hash chain <span className="font-mono text-body-sm font-normal" style={{ color: 'var(--text-3)' }}>(SHA-256)</span>
            </h3>
            {status && (
              <p className="text-body-sm" style={{ color: status.ok ? 'var(--text-3)' : 'var(--act-soft)' }}>
                {status.ok ? (
                  <>All <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{status.verified}</span> records unaltered</>
                ) : (
                  <>Broken at entry <span className="font-mono tabular-nums">{status.brokenAt}</span> — records after it can no longer be proven unaltered</>
                )}
                <span style={{ color: 'var(--text-3)' }}>
                  {' '}· checked <span className="font-mono tabular-nums">{formatShortIST(status.checkedAt)}</span>
                </span>
              </p>
            )}
          </div>
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-full cursor-help"
            style={{ color: 'var(--text-3)', border: '1px solid var(--line)' }}
            tabIndex={0}
            aria-label="About this chain"
            title={
              'Every record is linked to the one before it by a SHA-256 hash, so any later edit breaks the chain at that point.\n\n'
              + 'Strip colours: green = recorded online, amber = written offline and synced later, grey = superseded, orange = broken link.\n\n'
              + 'Tamper-evident, not non-repudiable: it proves records were not altered after writing; it carries no digital signature.'
            }
          >
            <Info size={14} aria-hidden />
          </span>

          <div className="flex items-center gap-2.5 ml-auto flex-wrap">
            <AsyncButton
              onClick={onVerify}
              pendingLabel="Verifying…"
              doneLabel={status?.ok === false ? null : status ? `Verified in ${status.durationMs} ms` : 'Verified'}
              disabled={verifying}
              className="inline-flex items-center gap-2 px-4 min-h-9 rounded-full text-body-sm font-semibold hover:bg-[var(--panel-alt)]"
              style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line-strong)', color: 'var(--text)', fontFamily: 'var(--font-body)', opacity: verifying ? 0.5 : 1 }}
            >
              {verifying ? 'Verifying…' : 'Verify chain'}
            </AsyncButton>
            <button
              type="button"
              onClick={onExport}
              className="flex items-center gap-2 px-4 min-h-9 rounded-full text-body-sm font-medium hover:bg-[var(--panel-alt)]"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
            >
              <Download size={15} aria-hidden /> Export JSON
            </button>
          </div>
        </div>

        {/* Chain strip (FR-5.4): one block per entry, a break shows in orange at its exact position. */}
        <div
          className="flex items-center gap-[2px] flex-wrap mt-3.5"
          role="img"
          aria-label={status?.ok === false ? `Chain broken at entry ${status.brokenAt}` : 'Chain intact'}
        >
          {chain.map((entry) => {
            const broken = status && !status.ok && entry.seq === status.brokenAt;
            return (
              <button
                key={entry.seq}
                type="button"
                data-press="none"
                onClick={() => setExpanded(entry.seq)}
                title={`#${entry.seq} ${entry.transition} — ${entry.payloadSummary}${entry.writtenOffline ? ' (written offline)' : ''}${entry.superseded ? ' (superseded)' : ''}`}
                style={{
                  width: 8,
                  height: broken ? 18 : 14,
                  borderRadius: 2,
                  backgroundColor: broken
                    ? 'var(--act)'
                    : entry.superseded
                      ? 'var(--unknown)'
                      : entry.writtenOffline
                        ? 'var(--watch)'
                        : 'var(--ok)',
                  opacity: broken ? 1 : entry.superseded ? 0.35 : 0.7,
                }}
              />
            );
          })}
        </div>
      </section>

      {/* ---- Filters (FR-5.2) ---- */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>Show</span>
        <select value={objectType} onChange={(e) => setObjectType(e.target.value)}
          className="h-10 px-4 text-body-sm outline-none" style={select} aria-label="Filter by object type">
          {objectTypes.map((t) => <option key={t} value={t}>{t === 'all' ? 'All record types' : t}</option>)}
        </select>
        <select value={actor} onChange={(e) => setActor(e.target.value)}
          className="h-10 px-4 text-body-sm outline-none" style={select} aria-label="Filter by actor">
          {actors.map((a) => <option key={a} value={a}>{a === 'all' ? 'Everyone' : a}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setOfflineOnly((v) => !v)}
          aria-pressed={offlineOnly}
          className="px-4 min-h-10 rounded-full text-body-sm font-medium"
          style={{
            border: `1px ${offlineOnly ? 'solid' : 'dashed'} ${offlineOnly ? 'var(--watch)' : 'var(--line-strong)'}`,
            color: offlineOnly ? 'var(--watch-soft)' : 'var(--text-3)',
            backgroundColor: offlineOnly ? 'rgba(217,164,65,0.10)' : 'transparent',
            fontFamily: 'var(--font-body)',
          }}
        >
          Only written offline
        </button>
        <span className="text-body-sm ml-auto" style={{ color: 'var(--text-3)' }}>
          Showing <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{filtered.length}</span> of{' '}
          <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{chain.length}</span> entries
        </span>
      </div>

      {/* ---- Entries (FR-5.1) ---- */}
      <section
        className="p-5"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        {filtered.length === 0 ? (
          <EmptyState reason="No chain entries match these filters." />
        ) : (
          <ul className="flex flex-col gap-2 max-h-[40rem] overflow-y-auto">
            {filtered.slice().reverse().map((entry) => {
              const isBroken = status && !status.ok && entry.seq === status.brokenAt;
              const open = expanded === entry.seq;
              return (
                <li
                  key={entry.seq}
                  style={{
                    backgroundColor: open ? 'var(--panel-raised)' : 'transparent',
                    borderRadius: 'var(--r-inner)',
                    border: isBroken ? '1px solid var(--act)' : '1px solid var(--line)',
                    opacity: entry.superseded ? 0.55 : 1,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : entry.seq)}
                    aria-expanded={open}
                    className="w-full flex items-start gap-4 px-4 py-3 text-left rounded-[var(--r-inner)] hover:bg-[var(--panel-raised)]"
                  >
                    <span
                      className="shrink-0 min-w-[3rem] px-2 py-0.5 text-center rounded-full font-mono text-body-sm tabular-nums"
                      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text-3)' }}
                      title="Position in the chain"
                    >
                      #{entry.seq}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-body line-clamp-2" style={{ color: 'var(--text)' }}>
                        {entry.payloadSummary}
                      </span>
                      <span className="flex items-center gap-x-4 gap-y-1.5 flex-wrap mt-1.5 text-body-sm" style={{ color: 'var(--text-3)' }}>
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-md text-body-sm"
                          style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
                        >
                          {entry.objectType}
                        </span>
                        <span>by <span style={{ color: 'var(--text-2)' }}>{entry.actor}</span></span>
                        {entry.writtenOffline && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-body-sm"
                            style={{ border: '1px dashed var(--watch)', color: 'var(--watch-soft)' }}
                            title="Written at the station while the link was down, then synced">
                            Written offline
                          </span>
                        )}
                        {entry.superseded && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-body-sm"
                            style={{ border: '1px solid var(--line-strong)', color: 'var(--text-3)' }}
                            title="A later entry replaces this one. It stays in the chain — nothing disappears.">
                            Superseded
                          </span>
                        )}
                        <span className="font-mono text-caption" title={`Record fingerprint (SHA-256): ${entry.hash}`}>
                          {shortHash(entry.hash)}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-body-sm tabular-nums whitespace-nowrap mt-0.5" style={{ color: 'var(--text-2)' }}>
                      {formatShortIST(entry.at)}
                    </span>
                  </button>

                  {open && (
                    <div className="mx-4 mb-4 pt-3 flex flex-col gap-1.5" style={{ borderTop: '1px solid var(--line)' }}>
                      <Kv k="Transition" v={entry.transition} />
                      <Kv k="Object" v={entry.objectId} mono />
                      <Kv k="Recorded by" v={`${entry.actor} (${entry.actorRole})`} />
                      {entry.atStation && (
                        <Kv
                          k="Station time"
                          v={
                            <span className="flex items-center gap-x-4 gap-y-1 flex-wrap">
                              <span className="font-mono tabular-nums">{formatShortIST(entry.atStation)}</span>
                              <span>HQ receipt <span className="font-mono tabular-nums">{formatShortIST(entry.at)}</span></span>
                              <span>Clock skew <span className="font-mono tabular-nums">{formatDuration(Math.abs((Date.parse(entry.at) - Date.parse(entry.atStation)) / 1000))}</span></span>
                            </span>
                          }
                        />
                      )}
                      <Kv k="Hash" v={entry.hash} code />
                      <Kv k="Previous hash" v={entry.prevHash} code />
                      <Kv k="Payload" v={JSON.stringify(entry.payload)} code />
                      {canTamper && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => onTamper(entry.seq)}
                            className="text-body-sm font-medium px-4 min-h-9 rounded-full"
                            style={{ border: '1px dashed var(--sim)', color: 'var(--sim-soft)', fontFamily: 'var(--font-body)' }}
                            title="Demo affordance: edits the payload without updating the hash, so Verify chain catches it"
                          >
                            Tamper with this entry (demo)
                          </button>
                        </div>
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

function Kv({ k, v, mono, code }: { k: string; v: ReactNode; mono?: boolean; code?: boolean }) {
  return (
    <div className="flex gap-4 py-1 flex-wrap sm:flex-nowrap">
      <span className="text-body-sm w-32 shrink-0" style={{ color: 'var(--text-3)' }}>{k}</span>
      <span
        className={
          code
            ? 'font-mono text-caption break-all min-w-0 flex-1'
            : mono
              ? 'font-mono text-body-sm break-all min-w-0 flex-1'
              : 'text-body-sm min-w-0 flex-1'
        }
        style={{ color: code ? 'var(--text-3)' : 'var(--text-2)' }}
      >
        {v}
      </span>
    </div>
  );
}
