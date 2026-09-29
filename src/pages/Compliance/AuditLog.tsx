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
    border: '1px solid var(--line-strong)',
    borderRadius: 'var(--r-pill)',
    color: 'var(--text-2)',
  } as const;

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Verifier ---- */}
      <section
        className="p-5"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-title font-semibold" style={{ color: 'var(--text)' }}>
            Tamper-evident hash chain
          </h3>
          <span className="font-mono text-body-sm" style={{ color: 'var(--text-3)' }}>SHA-256</span>
          {status && (
            <span
              className="flex items-center gap-2 text-body-sm font-medium px-4 py-1.5 rounded-full"
              style={{
                border: `1px solid ${status.ok ? 'var(--ok)' : 'var(--act)'}`,
                color: status.ok ? 'var(--ok-soft)' : 'var(--act-soft)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {status.ok ? <ShieldCheck size={16} aria-hidden /> : <ShieldAlert size={16} aria-hidden />}
              {status.ok ? (
                <span>Chain verified — <span className="font-mono tabular-nums">{status.verified}</span> entries</span>
              ) : (
                <span>Chain broken at entry <span className="font-mono tabular-nums">{status.brokenAt}</span></span>
              )}
            </span>
          )}
          <div className="flex items-center gap-2.5 ml-auto flex-wrap">
            <AsyncButton
              onClick={onVerify}
              pendingLabel="Verifying…"
              doneLabel={status?.ok === false ? null : 'Verified'}
              disabled={verifying}
              className="inline-flex items-center gap-2 px-5 min-h-10 rounded-full text-body-sm font-semibold hover:bg-[var(--panel-alt)]"
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
              <Download size={16} aria-hidden /> Export JSON
            </button>
          </div>
        </div>

        {status && (
          <p className="flex items-center gap-x-5 gap-y-1 flex-wrap mt-3 text-body-sm" style={{ color: 'var(--text-3)' }}>
            <span>
              Checked <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{status.verified}</span> entries
            </span>
            <span>
              in <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{status.durationMs}</span> ms
            </span>
            <span>
              Last check <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{formatShortIST(status.checkedAt)}</span>
            </span>
          </p>
        )}

        {/* ---- Chain strip (FR-5.4) ---- */}
        <div className="flex items-center gap-[3px] flex-wrap mt-5" role="img"
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
                  width: 10,
                  height: 20,
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

        {/* Strip legend — the blocks are never colour-alone. */}
        <ul className="flex items-center gap-x-5 gap-y-1.5 flex-wrap mt-3 text-body-sm" style={{ color: 'var(--text-3)' }}>
          <LegendSwatch color="var(--ok)" label="Recorded online" />
          <LegendSwatch color="var(--watch)" label="Written offline" />
          <LegendSwatch color="var(--unknown)" label="Superseded" faded />
          {status && !status.ok && <LegendSwatch color="var(--act)" label="Broken link" />}
        </ul>

        {status && !status.ok && (
          <p className="flex items-start gap-2 text-body mt-4" style={{ color: 'var(--act-soft)' }}>
            <Unlink size={18} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Severed link at position <span className="font-mono tabular-nums">{status.brokenAt}</span>. Everything
              after it is no longer provably unaltered.
            </span>
          </p>
        )}
        <p className="text-body-sm mt-4 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
          Tamper-evident, not non-repudiable: this chain proves records have not been altered since
          they were written. It carries no digital signature.
        </p>
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

function LegendSwatch({ color, label, faded }: { color: string; label: string; faded?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span className="shrink-0" style={{ width: 10, height: 16, borderRadius: 2, backgroundColor: color, opacity: faded ? 0.4 : 0.85 }} aria-hidden />
      {label}
    </li>
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
