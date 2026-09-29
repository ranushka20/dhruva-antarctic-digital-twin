// OWNER: Dev B
// Reports — "Are reports filed on time?"
//
// One list, grouped by status, most urgent first: Overdue → Waiting for the
// link → Due in the next 30 days → Later → Filed (collapsed). Each group
// heading carries its own count; the page's summary lives in the question
// card above, so nothing else here counts.
//
// FR-2.6: a report filed at the station but still waiting for the satellite
// link is NOT overdue — the station did its part, the link did not. Those
// rows are amber with a dashed border and must never read as late.
// FR-2.4: an overdue report always has an action; a missing one is flagged.

import { useId, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { Obligation } from '@/shared/contracts';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusDot } from '@/components/shared/StatusDot';
import { STATION_LABEL } from '@/state/stationScope';

type Status = Obligation['status'];

const WAITING_HINT = 'Filed at the station; waiting for the satellite link to reach HQ. Not late.';
const NO_ACTION_HINT =
  'Every overdue report should have an action raised for it automatically. This one has none, so the records need checking.';

interface Group {
  status: Status;
  title: string;
  /** Sort inside the group: earliest due first, except Filed (latest first). */
  newestFirst?: boolean;
}

/** Most urgent first. Filed is last and collapsed by default. */
const GROUPS: Group[] = [
  { status: 'overdue', title: 'Overdue' },
  { status: 'queued_offline', title: 'Waiting for the link' },
  { status: 'due_soon', title: 'Due in the next 30 days' },
  { status: 'future', title: 'Later' },
  { status: 'submitted', title: 'Filed', newestFirst: true },
];

// ---------------------------------------------------------------------------
// Plain-language helpers

/** Category words from the register, made readable: "fuel-handling record" → "Fuel handling record". */
const CATEGORY_WORDS: Record<string, string> = {
  eia: 'Environmental impact assessment',
};

function categoryLabel(category: string): string {
  const known = CATEGORY_WORDS[category.trim().toLowerCase()];
  if (known) return known;
  const words = category.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Dates are compared as IST calendar days, so "3 days late" means the due
// date was three calendar days ago at HQ, regardless of the hour.
const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const istDayNumber = (t: number) => Math.floor((t + IST_OFFSET_MS) / DAY_MS);

function calendarDaysFromToday(iso: string, now: number): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return istDayNumber(t) - istDayNumber(now);
}

/** "14 Nov", or "14 Nov 2027" when it isn't this year. */
function shortDate(iso: string, now: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const d = new Date(t + IST_OFFSET_MS);
  const thisYear = new Date(now + IST_OFFSET_MS).getUTCFullYear();
  const base = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return d.getUTCFullYear() === thisYear ? base : `${base} ${d.getUTCFullYear()}`;
}

type Tone = 'act' | 'strong' | 'quiet';

/** Due date in words. `value` is the numeric part, rendered in mono. */
interface DueWords {
  before?: string;
  value?: string;
  after?: string;
  tone: Tone;
}

const plural = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`;

function dueWords(o: Obligation, now: number): DueWords {
  const days = calendarDaysFromToday(o.dueDate, now);
  const date = shortDate(o.dueDate, now);
  const dated = (tone: Tone): DueWords =>
    days < 0 ? { before: 'Was due ', value: date, tone } : { before: 'Due ', value: date, tone };

  switch (o.status) {
    case 'overdue': {
      const late = -days;
      if (late < 1) return { before: 'Due today, now late', tone: 'act' };
      return { value: String(late), after: ` ${plural(late, 'day')} late`, tone: 'act' };
    }
    case 'due_soon':
      if (days === 0) return { before: 'Due today', tone: 'strong' };
      if (days === 1) return { before: 'Due tomorrow', tone: 'strong' };
      if (days > 1) return { before: 'Due in ', value: String(days), after: ' days', tone: 'strong' };
      return dated('strong');
    case 'future':
      return dated('strong');
    case 'queued_offline':
    case 'submitted':
    default:
      return dated('quiet');
  }
}

const TONE_COLOR: Record<Tone, string> = {
  act: 'var(--act-soft)',
  strong: 'var(--text)',
  quiet: 'var(--text-2)',
};

// ---------------------------------------------------------------------------

interface Props {
  obligations: Obligation[];
  onOpen: (id: string) => void;
  onOpenAction: (actionId: string) => void;
}

export function Obligations({ obligations, onOpen, onOpenAction }: Props) {
  const [showFiled, setShowFiled] = useState(false);
  const filedListId = useId();

  const groups = useMemo(() => {
    return GROUPS.map((g) => {
      const rows = obligations
        .filter((o) => o.status === g.status)
        .sort((a, b) => {
          const diff = Date.parse(a.dueDate) - Date.parse(b.dueDate);
          return g.newestFirst ? -diff : diff;
        });
      return { ...g, rows };
    }).filter((g) => g.rows.length > 0);
  }, [obligations]);

  const now = Date.now();

  return (
    <section
      className="@container p-5"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-labelledby="reports-heading"
    >
      <h2 id="reports-heading" className="text-title font-semibold" style={{ color: 'var(--text)' }}>
        Reports
      </h2>
      <p className="text-body mt-1 mb-5 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
        Most urgent first; select a report to see its full record.
      </p>

      {obligations.length === 0 ? (
        <EmptyState reason="No reports are registered for this station." />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => {
            const isFiled = g.status === 'submitted';

            if (isFiled && !showFiled) {
              return (
                <div key={g.status}>
                  <button
                    type="button"
                    onClick={() => setShowFiled(true)}
                    aria-expanded={false}
                    className="inline-flex items-center gap-2.5 rounded-full min-h-10 px-4 text-body font-medium cursor-pointer hover:bg-[var(--panel-raised)]"
                    style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
                  >
                    <StatusDot status="ok" size={9} />
                    <span>
                      Show <span className="font-mono tabular-nums">{g.rows.length}</span>{' '}
                      filed {plural(g.rows.length, 'report')}
                    </span>
                    <ChevronDown size={16} aria-hidden style={{ color: 'var(--text-3)' }} />
                  </button>
                </div>
              );
            }

            return (
              <div key={g.status} id={isFiled ? filedListId : undefined}>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-2 mb-3">
                  <h3 className="flex items-center gap-2.5 text-body font-semibold" style={{ color: 'var(--text)' }}>
                    <GroupMarker status={g.status} />
                    <span>{g.title}</span>
                    <span className="font-mono tabular-nums font-medium" style={{ color: 'var(--text-3)' }}>
                      {g.rows.length}
                    </span>
                    {g.status === 'queued_offline' && (
                      <span
                        role="img"
                        aria-label={WAITING_HINT}
                        title={WAITING_HINT}
                        className="inline-flex cursor-help"
                        style={{ color: 'var(--watch-soft)' }}
                      >
                        <Info size={16} aria-hidden />
                      </span>
                    )}
                  </h3>
                  {isFiled && (
                    <button
                      type="button"
                      onClick={() => setShowFiled(false)}
                      aria-expanded
                      aria-controls={filedListId}
                      className="ml-auto inline-flex items-center gap-2 rounded-full min-h-10 px-4 text-body-sm font-medium cursor-pointer hover:bg-[var(--panel-raised)]"
                      style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
                    >
                      Hide filed reports
                      <ChevronUp size={16} aria-hidden style={{ color: 'var(--text-3)' }} />
                    </button>
                  )}
                </div>

                <ul className="flex flex-col gap-2">
                  {g.rows.map((o) => (
                    <ReportRow key={o.id} o={o} now={now} onOpen={onOpen} onOpenAction={onOpenAction} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

/** Group marker: a status dot, or a dashed amber ring for "waiting for the link". */
function GroupMarker({ status }: { status: Status }) {
  if (status === 'queued_offline') {
    return (
      <span
        aria-hidden
        className="inline-block rounded-full shrink-0"
        style={{ width: 11, height: 11, border: '1.5px dashed var(--watch)' }}
      />
    );
  }
  const dot = status === 'overdue' ? 'warning' : status === 'due_soon' ? 'watch' : status === 'submitted' ? 'ok' : 'unknown';
  return <StatusDot status={dot} size={9} />;
}

function ReportRow({
  o, now, onOpen, onOpenAction,
}: { o: Obligation; now: number; onOpen: Props['onOpen']; onOpenAction: Props['onOpenAction'] }) {
  const waiting = o.status === 'queued_offline';
  const overdue = o.status === 'overdue';
  const due = dueWords(o, now);
  const station = STATION_LABEL[o.stationId] ?? o.stationId;

  return (
    <li
      className={
        'relative flex flex-col gap-x-5 gap-y-3 px-4 py-3.5 hover:bg-[var(--panel-raised)] ' +
        '@min-[40rem]:flex-row @min-[40rem]:items-center' +
        (waiting ? ' bg-[color-mix(in_srgb,var(--watch)_6%,transparent)]' : '')
      }
      style={{
        borderRadius: 'var(--r-inner)',
        border: waiting ? '1px dashed var(--watch)' : '1px solid var(--line)',
      }}
    >
      {/* The whole row opens the record: this button's ::after covers the row;
          the action button below sits above it. */}
      <button
        type="button"
        onClick={() => onOpen(o.id)}
        title={waiting ? WAITING_HINT : undefined}
        className="flex-1 min-w-0 text-left cursor-pointer after:absolute after:inset-0"
      >
        <span className="block text-body font-medium break-words" style={{ color: 'var(--text)' }}>
          {o.name}
        </span>
        <span className="block text-body-sm mt-1 break-words" style={{ color: 'var(--text-3)' }}>
          {station} · {categoryLabel(o.category)} · Owner: <span style={{ color: 'var(--text-2)' }}>{o.owner}</span>
        </span>
        {waiting && <span className="sr-only">. {WAITING_HINT}</span>}
      </button>

      <span
        className="text-body font-medium shrink-0 @min-[40rem]:text-right"
        style={{ color: TONE_COLOR[due.tone] }}
      >
        {due.before}
        {due.value && <span className="font-mono tabular-nums">{due.value}</span>}
        {due.after}
      </span>

      {o.linkedActionId ? (
        <button
          type="button"
          onClick={() => onOpenAction(o.linkedActionId!)}
          className="relative z-10 self-start @min-[40rem]:self-auto shrink-0 rounded-full min-h-10 px-4 text-body font-medium cursor-pointer hover:bg-[var(--panel-alt)]"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
        >
          Open action
        </button>
      ) : overdue ? (
        <span
          className="relative z-10 inline-flex items-center gap-2 shrink-0 text-body-sm font-medium"
          style={{ color: 'var(--act-soft)' }}
          title={NO_ACTION_HINT}
        >
          <AlertTriangle size={16} aria-hidden />
          No action raised — data error
        </span>
      ) : null}
    </li>
  );
}
