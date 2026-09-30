// OWNER: Dev B
// Record history — answers "Are the records untouched?".
//
// Each record is sealed together with the one before it (the tamper-evident
// SHA-256 hash chain in lib/hashChain), so the check names the exact record
// that was changed. Nothing is ever hidden: replaced records stay, greyed.
// Fingerprints appear only inside a row's "Technical details"; the download
// and the demo control live in the collapsed "For auditors" section.

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronRight, Download, Search, WifiOff } from 'lucide-react';
import type { ChainEntry, ChainStatus } from '@/lib/hashChain';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusDot } from '@/components/shared/StatusDot';
import { AsyncButton } from '@/components/shared/AsyncButton';
import { ROLE_LABEL } from '@/state/auth';
import { getActions, getInspections, getObligations, getResources } from '@/state/data';
import { STATION_LABEL } from '@/state/stationScope';
import { formatDateIST, formatShortIST } from '@/lib/time';

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

type Show = 'all' | 'actions' | 'reports' | 'waste' | 'inspections' | 'other';

const SHOW_OPTIONS: { id: Show; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'actions', label: 'Actions' },
  { id: 'reports', label: 'Reports' },
  { id: 'waste', label: 'Waste' },
  { id: 'inspections', label: 'Inspections' },
  { id: 'other', label: 'Other' },
];

const TYPE_LABEL: Record<string, string> = {
  action: 'Action',
  obligation: 'Report',
  compliance_record: 'Report',
  report: 'Report',
  waste: 'Waste',
  waste_event: 'Waste',
  inspection: 'Inspection',
  resource: 'Stock',
  parameter: 'Setting',
  manifest: 'Cargo manifest',
  handover: 'Handover',
  sync_record: 'Station record',
};

const CATEGORY: Record<string, Show> = {
  action: 'actions',
  obligation: 'reports',
  compliance_record: 'reports',
  report: 'reports',
  waste: 'waste',
  waste_event: 'waste',
  inspection: 'inspections',
};

/** What happened, in words. Transitions "A -> B" read as their end state. */
const VERB: Record<string, string> = {
  RAISED: 'Raised',
  ACKNOWLEDGED: 'Acknowledged',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'Work started',
  RESOLVED: 'Resolved',
  DEFERRED: 'Deferred',
  SUBMITTED: 'Submitted',
  COMPLETED: 'Completed',
  RECORDED: 'Recorded',
  RECORDED_LOCALLY: 'Recorded at the station',
  CHANGED: 'Changed',
  GENERATED: 'Created',
  EVIDENCE_ATTACHED: 'Evidence added',
  PROMOTED: 'Priority raised',
  RECONCILED: 'Conflicting versions resolved',
};

const PAGE = 50;

const ACT_LINE = 'color-mix(in srgb, var(--act) 45%, transparent)';
const ACT_TINT = 'color-mix(in srgb, var(--act) 8%, transparent)';
const WATCH_TINT = 'color-mix(in srgb, var(--watch) 10%, transparent)';

const PANEL = {
  backgroundColor: 'var(--panel)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-card)',
} as const;

interface Row {
  entry: ChainEntry;
  verb: string;
  /** What the record is about — the action title, report name, etc. */
  subject: string;
  /** Extra words from the record itself, when they add something ("assigned to V. Chandran"). */
  note: string | null;
  station: string | null;
  typeLabel: string;
  category: Show;
  who: string;
  role: string;
  haystack: string;
}

/** The thing a record points at, looked up by id so every row can name it. */
type Lookup = (entry: ChainEntry) => { title?: string; stationId?: string };

export function AuditLog({
  chain, status, verifying, onVerify, onExport, onTamper, canTamper, focusSeq,
}: Props) {
  const [query, setQuery] = useState('');
  const [show, setShow] = useState<Show>('all');
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [techOpen, setTechOpen] = useState<Set<number>>(() => new Set());
  const [auditorsOpen, setAuditorsOpen] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(focusSeq ?? null);
  const [scrollTarget, setScrollTarget] = useState<{ seq: number; nonce: number } | null>(null);

  const statusRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /** Newest first. Derived once per chain change, not per keystroke. */
  const rows = useMemo(() => {
    const lookup = buildLookup();
    return chain.map((e) => toRow(e, lookup)).reverse();
  }, [chain]);

  const q = query.trim().toLowerCase();
  const filtersActive = q !== '' || show !== 'all' || offlineOnly;
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (show !== 'all' && r.category !== show) return false;
        if (offlineOnly && !r.entry.writtenOffline) return false;
        if (q && !r.haystack.includes(q)) return false;
        return true;
      }),
    [rows, q, show, offlineOnly]
  );
  const visible = filtered.slice(0, limit);

  // verifyFullChain reports an index; seq and index coincide, but read it off
  // the entry so the label always matches the row it points at.
  const isBroken = status?.ok === false;
  const brokenSeq =
    isBroken && status.brokenAt !== undefined
      ? chain[status.brokenAt]?.seq ?? status.brokenAt
      : null;

  const resetFilters = () => {
    setQuery('');
    setShow('all');
    setOfflineOnly(false);
  };

  /** Brings one record into the list (clearing filters if they hide it), highlights it and scrolls to it. */
  const goTo = (seq: number) => {
    const inAll = rows.findIndex((r) => r.entry.seq === seq);
    if (inAll === -1) return;
    let index = filtered.findIndex((r) => r.entry.seq === seq);
    if (index === -1) {
      resetFilters();
      index = inAll;
    }
    setLimit((l) => Math.max(l, Math.ceil((index + 1) / PAGE) * PAGE));
    setHighlight(seq);
    setScrollTarget({ seq, nonce: Date.now() });
  };

  const goToRef = useRef(goTo);
  useEffect(() => { goToRef.current = goTo; });

  useEffect(() => {
    if (focusSeq !== null && focusSeq !== undefined && Number.isFinite(focusSeq)) goToRef.current(focusSeq);
  }, [focusSeq]);

  useEffect(() => {
    if (!scrollTarget) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-seq="${scrollTarget.seq}"]`);
    if (!el) return; // not rendered yet — filters are still clearing; retry on the next render
    el.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    el.focus({ preventScroll: true });
    setScrollTarget(null);
  }, [scrollTarget, filtered, limit]);

  const toggleTech = (seq: number) =>
    setTechOpen((prev) => {
      const next = new Set(prev);
      if (next.has(seq)) next.delete(seq);
      else next.add(seq);
      return next;
    });

  // Demo target: the latest inspection or report, a record someone would
  // plausibly want to alter; otherwise the middle of the history.
  const demoTarget = useMemo(() => {
    const candidates = chain.filter(
      (e) => !e.superseded && (e.objectType === 'inspection' || CATEGORY[e.objectType] === 'reports')
    );
    return candidates[candidates.length - 1] ?? chain[Math.floor(chain.length / 2)] ?? null;
  }, [chain]);

  const runDemo = (seq: number) => {
    onTamper(seq);
    statusRef.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
  };

  return (
    <div className="@container flex flex-col gap-5">
      {/* ---- Are the records untouched? (FR-5.3) ---- */}
      <section
        ref={statusRef}
        className="@container px-5 py-4 scroll-mt-4"
        style={{ ...PANEL, border: `1px solid ${isBroken ? ACT_LINE : 'var(--line)'}` }}
      >
        <div className="flex flex-col gap-3 @min-[40rem]:flex-row @min-[40rem]:items-center @min-[40rem]:gap-5">
          <div className="flex-1 min-w-0">
            <p className="flex items-start gap-3 text-title font-semibold" aria-live="polite">
              <span className="flex items-center h-6 shrink-0">
                <StatusDot status={isBroken ? 'warning' : status?.ok ? 'ok' : 'unknown'} size={9} />
              </span>
              {isBroken ? (
                <span style={{ color: 'var(--act-soft)' }}>
                  {brokenSeq !== null ? (
                    <>Record <span className="font-mono tabular-nums">#{brokenSeq}</span> was changed after it was written</>
                  ) : (
                    'A record was changed after it was written'
                  )}
                </span>
              ) : status?.ok ? (
                <span style={{ color: 'var(--text)' }}>
                  Yes — all <span className="font-mono tabular-nums">{status.verified}</span> records are exactly as
                  they were written.
                </span>
              ) : (
                <span style={{ color: 'var(--text)' }}>Not checked yet</span>
              )}
            </p>
            {status && (
              <p className="text-body-sm mt-1 pl-[calc(9px+0.75rem)]" style={{ color: 'var(--text-3)' }}>
                Last checked <span className="font-mono tabular-nums">{formatShortIST(status.checkedAt)}</span>
                {status.ok && chain.length > status.verified && (
                  <>
                    {' · '}
                    <span className="font-mono tabular-nums">{chain.length - status.verified}</span> newer
                    record{chain.length - status.verified === 1 ? '' : 's'} not yet included
                  </>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {brokenSeq !== null && (
              <button
                type="button"
                onClick={() => goTo(brokenSeq)}
                className="px-4 min-h-10 rounded-full text-body-sm font-medium"
                style={{ border: '1px solid var(--act)', color: 'var(--act-soft)', fontFamily: 'var(--font-body)' }}
              >
                Show this record
              </button>
            )}
            <AsyncButton
              onClick={onVerify}
              pendingLabel="Checking…"
              doneLabel={isBroken ? null : 'Checked'}
              disabled={verifying}
              className="inline-flex items-center gap-2 px-4 min-h-10 rounded-full text-body-sm font-semibold hover:bg-[var(--panel-alt)]"
              style={{
                backgroundColor: 'var(--panel-raised)',
                border: '1px solid var(--line-strong)',
                color: 'var(--text)',
                fontFamily: 'var(--font-body)',
                opacity: verifying ? 0.6 : 1,
              }}
            >
              {verifying ? 'Checking…' : 'Check again'}
            </AsyncButton>
          </div>
        </div>

        <p className="text-body-sm mt-3 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
          Each record is sealed together with the one before it, so changing any old record breaks the seal from
          that point on.
        </p>
      </section>

      {/* ---- Every record, newest first (FR-5.1 / 5.2 / 5.5 / 5.6) ---- */}
      <section className="@container p-5" style={PANEL} aria-label="Record history">
        <h3 className="text-title font-semibold" style={{ color: 'var(--text)' }}>Every record, newest first</h3>

        <div className="flex items-center gap-3 flex-wrap mt-3">
          <label
            className="flex items-center gap-2.5 px-4 min-h-10 rounded-full flex-1 min-w-[14rem] max-w-md"
            style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line-strong)' }}
          >
            <Search size={16} style={{ color: 'var(--text-3)' }} aria-hidden />
            <span className="sr-only">Search record history</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by what happened or who"
              className="flex-1 bg-transparent outline-none text-body min-w-0"
              style={{ color: 'var(--text)' }}
            />
          </label>

          <label className="flex items-center gap-2.5 text-body-sm" style={{ color: 'var(--text-3)' }}>
            Show
            <select
              value={show}
              onChange={(e) => setShow(e.target.value as Show)}
              className="h-10 px-4 text-body-sm outline-none"
              style={{
                backgroundColor: 'var(--panel)',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--r-pill)',
                color: 'var(--text-2)',
              }}
            >
              {SHOW_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setOfflineOnly((v) => !v)}
            aria-pressed={offlineOnly}
            className="px-4 min-h-10 rounded-full text-body-sm font-medium"
            style={{
              border: `1px ${offlineOnly ? 'solid' : 'dashed'} ${offlineOnly ? 'var(--watch)' : 'var(--line-strong)'}`,
              color: offlineOnly ? 'var(--watch-soft)' : 'var(--text-3)',
              backgroundColor: offlineOnly ? WATCH_TINT : 'transparent',
              fontFamily: 'var(--font-body)',
            }}
          >
            Only written offline
          </button>

          {filtersActive && (
            <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>
              <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{filtered.length}</span>{' '}
              matching
            </span>
          )}
        </div>

        {chain.length === 0 ? (
          <EmptyState className="mt-4" reason="No records have been written yet." />
        ) : filtered.length === 0 ? (
          <EmptyState
            className="mt-4"
            reason="No records match this search."
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 min-h-10 rounded-full text-body-sm font-medium hover:bg-[var(--panel-alt)]"
                style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
              >
                Show all records
              </button>
            }
          />
        ) : (
          <div ref={listRef} className="flex flex-col gap-5 mt-5">
            {groupByDay(visible).map((group) => (
              <section key={group.key} aria-label={group.label}>
                <h3
                  className="text-body-sm font-semibold pb-2 mb-1"
                  style={{ color: 'var(--text-2)', borderBottom: '1px solid var(--line-strong)' }}
                >
                  {group.label}
                </h3>
                <ul className="flex flex-col">
                  {group.rows.map((row) => (
                    <HistoryRow
                      key={row.entry.seq}
                      row={row}
                      broken={row.entry.seq === brokenSeq}
                      highlighted={row.entry.seq === highlight}
                      techOpen={techOpen.has(row.entry.seq)}
                      onToggleTech={() => toggleTech(row.entry.seq)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {filtered.length > limit && (
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE)}
              className="px-5 min-h-10 rounded-full text-body-sm font-medium hover:bg-[var(--panel-alt)]"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
            >
              Show more{' '}
              <span style={{ color: 'var(--text-3)' }}>
                (<span className="font-mono tabular-nums">{filtered.length - limit}</span> left)
              </span>
            </button>
          </div>
        )}
      </section>

      {/* ---- For auditors (FR-5.7 + the demo affordance) ---- */}
      <section style={PANEL}>
        <button
          type="button"
          onClick={() => setAuditorsOpen((v) => !v)}
          aria-expanded={auditorsOpen}
          className="w-full flex items-center gap-3 px-5 min-h-12 text-left rounded-[var(--r-card)] hover:bg-[var(--panel-raised)]"
        >
          <ChevronRight
            size={18}
            aria-hidden
            className="shrink-0 transition-transform"
            style={{ color: 'var(--text-3)', transform: auditorsOpen ? 'rotate(90deg)' : 'none' }}
          />
          <span className="text-body font-semibold" style={{ color: 'var(--text)' }}>For auditors</span>
        </button>

        {auditorsOpen && (
          <div className="px-5 pb-5 flex flex-col gap-4">
            <p className="text-body-sm max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
              This record history is tamper-evident, not signed: any later change to a record would show, but records
              carry no digital signature proving who wrote them.
            </p>
            <div>
              <button
                type="button"
                onClick={onExport}
                className="inline-flex items-center gap-2 px-4 min-h-10 rounded-full text-body-sm font-medium text-left hover:bg-[var(--panel-alt)]"
                style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
              >
                <Download size={16} aria-hidden className="shrink-0" />
                Download full record history (JSON with fingerprints)
              </button>
            </div>

            {canTamper && demoTarget && (
              <div className="pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--line)' }}>
                <div>
                  <button
                    type="button"
                    onClick={() => runDemo(demoTarget.seq)}
                    disabled={isBroken}
                    className="px-4 min-h-10 rounded-full text-body-sm font-medium text-left hover:bg-[var(--panel-alt)]"
                    style={{
                      border: '1px dashed var(--line-strong)',
                      color: 'var(--text-2)',
                      fontFamily: 'var(--font-body)',
                      opacity: isBroken ? 0.5 : 1,
                    }}
                  >
                    Demo: change a record to show the check catching it
                  </button>
                </div>
                <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
                  {isBroken ? (
                    'A changed record is already showing above.'
                  ) : (
                    <>
                      Alters record <span className="font-mono tabular-nums">#{demoTarget.seq}</span> without
                      re-sealing it, then checks again.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function HistoryRow({
  row, broken, highlighted, techOpen, onToggleTech,
}: {
  row: Row;
  broken: boolean;
  highlighted: boolean;
  techOpen: boolean;
  onToggleTech: () => void;
}) {
  const { entry } = row;
  const techId = `record-tech-${entry.seq}`;
  // Only worth showing both times when the record really arrived later.
  const delayed = entry.writtenOffline && entry.atStation && formatShortIST(entry.atStation) !== formatShortIST(entry.at);

  return (
    <li
      data-seq={entry.seq}
      tabIndex={-1}
      className="@container outline-none scroll-mt-4"
      style={{
        borderBottom: '1px solid var(--line)',
        borderLeft: broken ? '3px solid var(--act)' : '3px solid transparent',
        backgroundColor: broken ? ACT_TINT : highlighted ? 'var(--panel-raised)' : 'transparent',
        opacity: entry.superseded ? 0.6 : 1,
      }}
    >
      {/* The whole row opens its technical details — one big target, no extra button row. */}
      <button
        type="button"
        onClick={onToggleTech}
        aria-expanded={techOpen}
        aria-controls={techId}
        className="group w-full flex items-start gap-x-4 px-3 py-3 text-left hover:bg-[var(--panel-raised)]"
        title={techOpen ? 'Hide technical details' : 'Show technical details'}
      >
        <time
          dateTime={entry.at}
          className="shrink-0 w-12 font-mono tabular-nums text-body-sm pt-0.5"
          style={{ color: 'var(--text-3)' }}
        >
          {timeIST(entry.at)}
        </time>

        <span className="flex-1 min-w-0">
          <span className="flex items-baseline gap-x-3 gap-y-0.5 flex-wrap">
            <span className="text-body font-medium break-words min-w-0" style={{ color: 'var(--text)' }}>
              {row.subject}
            </span>
            <span className="text-body-sm ml-auto shrink-0" style={{ color: 'var(--text-3)' }}>{row.typeLabel}</span>
          </span>

          <span className="block text-body-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            <span style={{ color: 'var(--text-2)' }}>{row.verb}</span> by{' '}
            <span style={{ color: 'var(--text-2)' }}>{row.who}</span>
            {row.role && <> ({row.role.toLowerCase()})</>}
            {row.station && <> · {row.station}</>}
            {row.note && <> · {row.note}</>}
          </span>

          {(entry.writtenOffline || broken || entry.superseded) && (
            <span className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-1 text-body-sm">
              {broken && (
                <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: 'var(--act-soft)' }}>
                  <AlertTriangle size={14} aria-hidden className="shrink-0" />
                  Changed after it was written
                </span>
              )}
              {entry.writtenOffline && (
                <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--watch-soft)' }}>
                  <WifiOff size={14} aria-hidden className="shrink-0" />
                  Written at the station while offline
                  {delayed && (
                    <span style={{ color: 'var(--text-3)' }}>
                      {' '}· reached HQ{' '}
                      <span className="font-mono tabular-nums">{formatShortIST(entry.at)}</span>
                    </span>
                  )}
                </span>
              )}
              {entry.superseded && (
                <span style={{ color: 'var(--text-3)' }}>Replaced by a later record — kept, never deleted</span>
              )}
            </span>
          )}
        </span>

        <ChevronRight
          size={16}
          aria-hidden
          className="shrink-0 mt-1 transition-transform"
          style={{ color: 'var(--text-3)', transform: techOpen ? 'rotate(90deg)' : 'none' }}
        />
      </button>

      {techOpen && (
        <dl
          id={techId}
          className="flex flex-col gap-2 mx-3 mb-3 ml-[4.75rem] px-4 py-3"
          style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)' }}
        >
          <Kv k="Record number" v={`#${entry.seq}`} />
          <Kv k="Record ID" v={entry.objectId} />
          <Kv k="Change as stored" v={entry.transition} />
          <Kv k="Fingerprint" v={entry.hash} />
          <Kv k="Previous fingerprint" v={entry.prevHash} />
          {entry.atStation && <Kv k="Written at station (UTC)" v={entry.atStation} />}
          <Kv k="Received at HQ (UTC)" v={entry.at} />
        </dl>
      )}
    </li>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-0.5 @min-[34rem]:flex-row @min-[34rem]:gap-4">
      <dt className="text-body-sm @min-[34rem]:w-48 shrink-0" style={{ color: 'var(--text-3)' }}>{k}</dt>
      <dd className="font-mono tabular-nums text-body-sm break-all min-w-0 flex-1" style={{ color: 'var(--text-2)' }}>
        {v}
      </dd>
    </div>
  );
}

// ---- Plain-words derivation -------------------------------------------------

function toRow(entry: ChainEntry, lookup: Lookup): Row {
  const verb = verbOf(entry.transition);
  const detail = detailOf(entry, verb);
  const found = lookup(entry);
  const subject = found.title ?? detail ?? entry.objectId;
  // The record's own words, unless they only repeat the subject or the verb line.
  const note =
    detail &&
    detail.toLowerCase() !== subject.toLowerCase() &&
    !detail.toLowerCase().startsWith(verb.toLowerCase() + ' by')
      ? detail
      : null;
  const station = found.stationId ? STATION_LABEL[found.stationId as keyof typeof STATION_LABEL] ?? null : null;
  const typeLabel = TYPE_LABEL[entry.objectType] ?? sentence(entry.objectType);
  const who = sentence(entry.actor);
  const role = roleOf(entry.actorRole);
  return {
    entry,
    verb,
    subject,
    note,
    station,
    typeLabel,
    category: CATEGORY[entry.objectType] ?? 'other',
    who,
    role,
    haystack: [subject, verb, note, station, typeLabel, who, role, entry.objectId]
      .filter(Boolean).join(' ').toLowerCase(),
  };
}

/** One pass over the stores, so naming 500 records costs four reads, not 500. */
function buildLookup(): Lookup {
  const actions = new Map(getActions('all').map((a) => [a.id, a]));
  const reports = new Map(getObligations('all').map((o) => [o.id, o]));
  const inspections = new Map(getInspections('all').map((i) => [i.id, i]));
  const resources = new Map(getResources('all').map((r) => [r.id, r]));
  return (entry) => {
    const id = entry.objectId;
    const a = actions.get(id);
    if (a) return { title: a.title, stationId: a.stationId };
    const o = reports.get(id);
    if (o) return { title: o.name, stationId: o.stationId };
    const i = inspections.get(id);
    if (i) return { title: sentence(i.type) + ' inspection', stationId: i.stationId };
    const r = resources.get(id);
    if (r) return { title: r.name, stationId: r.stationId };
    return {};
  };
}

/** Rows are newest first; consecutive rows of one IST day share a heading. */
function groupByDay(rows: Row[]): { key: string; label: string; rows: Row[] }[] {
  const today = formatDateIST(new Date());
  const yesterday = formatDateIST(new Date(Date.now() - 86_400_000));
  const groups: { key: string; label: string; rows: Row[] }[] = [];
  for (const row of rows) {
    const key = formatDateIST(row.entry.at);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const label = key === today ? `Today · ${key}` : key === yesterday ? `Yesterday · ${key}` : key;
      group = { key, label, rows: [] };
      groups.push(group);
    }
    group.rows.push(row);
  }
  return groups;
}

/** "14:22" — the day is already in the group heading. */
function timeIST(iso: string): string {
  return formatShortIST(iso).split(' · ')[1] ?? formatShortIST(iso);
}

/** "RAISED -> ACKNOWLEDGED" → "Acknowledged"; "DEFERRED -> RAISED" → "Reopened". */
function verbOf(transition: string): string {
  const parts = transition.split('->').map((p) => p.trim().toUpperCase());
  const to = parts[parts.length - 1] ?? '';
  if (parts.length > 1 && to === 'RAISED') return 'Reopened';
  return VERB[to] ?? sentence(to.toLowerCase());
}

/** The summary line, unless it only repeats the transition. */
function detailOf(entry: ChainEntry, verb: string): string | null {
  const summary = entry.payloadSummary?.trim();
  if (!summary) return null;
  const norm = (s: string) => s.replace(/[_\s]+/g, ' ').replace(/\s*->\s*/g, ' -> ').trim().toUpperCase();
  const s = norm(summary);
  const transition = norm(entry.transition);
  const to = transition.split(' -> ').pop() ?? transition;
  if (s === transition || s === to || s === norm(verb)) return null;
  return summary;
}

function roleOf(role: string): string {
  if (!role) return '';
  if (role === 'system') return 'Automatic';
  return (ROLE_LABEL as Record<string, string>)[role] ?? sentence(role);
}

function sentence(s: string): string {
  const t = s.replace(/_/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '—';
}

function scrollBehavior(): ScrollBehavior {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
}
