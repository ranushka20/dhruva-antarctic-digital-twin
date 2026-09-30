// OWNER: Dev A
// ZoneTrace — "Why this matters" for one zone or room of the twin.
//
// CausalTrace answers a station question (how long does the fuel last?), so
// shown on every zone it told the same story everywhere. This panel asks the
// zone's or room's own question with the same engine: what does it cost the
// station in fuel, and what is its current fault costing on top? Every number
// comes from runZoneTrace() (src/engine/zoneTrace.ts), which runs
// runCausalTrace() underneath; this file only chooses words and order.
//
// Deliberately short: one sentence with the answer, one line of context, and
// the workings folded away. The place that holds the fuel tells the station
// fuel story instead, in the same shape.

import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { CausalTraceInput, Measurement, ZoneStatus } from '@/shared/contracts';
import { runZoneTrace, type ZoneTraceProfile } from '@/engine/zoneTrace';
import { ProvenanceBadge } from './ProvenanceBadge';

interface ZoneTraceProps {
  input: CausalTraceInput;
  subject: { status: ZoneStatus; trace?: ZoneTraceProfile };
  /** How the subject is referred to in the workings: "this zone" / "this room". */
  kind?: 'zone' | 'room';
  /** Omit the built-in "Why this matters" heading when the host already titles the section. Presentation only. */
  hideHeading?: boolean;
  className?: string;
}

const STATION_STEP_WORDS: Record<string, string> = {
  'AMBIENT': 'Outside temperature',
  '↓ HEATING': 'Heating needed',
  '↓ GEN LOAD': 'Load on the generators',
  '↓ FUEL BURN': 'Fuel burned',
};
const UNIT_WORDS: Record<string, string> = { HDD: 'degree-days', 'units/day': '/day' };

const fmt = (m: Measurement, digits = 1) =>
  typeof m.value === 'number' ? m.value.toFixed(digits) : String(m.value ?? '—');
const whole = (m: Measurement) => (typeof m.value === 'number' ? Math.round(m.value) : 0);

/** A number as the panel's reading line: mono, emphasised, with its badge. */
function Figure({ m, text, color = 'var(--text)', label }: { m: Measurement; text: string; color?: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-2 flex-wrap">
      <span className="font-mono text-title font-semibold tabular-nums whitespace-nowrap" style={{ color }}>
        {text}
      </span>
      <ProvenanceBadge measurement={m} label={label} abbreviated align="right" className="self-center" />
    </span>
  );
}

export function ZoneTrace({ input, subject, kind = 'zone', hideHeading = false, className = '' }: ZoneTraceProps) {
  const card = (children: React.ReactNode) => (
    <section
      className={`rounded-xl p-4 flex flex-col gap-2 ${className}`}
      style={{ backgroundColor: 'var(--bg)', border: '1px solid color-mix(in srgb, var(--ok) 30%, transparent)' }}
    >
      {!hideHeading && (
        <h3 className="text-title font-medium" style={{ color: 'var(--text)' }}>Why this matters</h3>
      )}
      {children}
    </section>
  );

  if (!subject.trace) {
    return card(
      <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
        We don't have a model of this {kind}'s power and heat yet.
      </p>,
    );
  }

  const result = runZoneTrace(input, subject.trace);
  const { station, zone, condition } = result;

  // ---- The place that holds the fuel: the station fuel story, short ----
  if (subject.trace.story === 'fuel') {
    const autonomy = station.steps.find((s) => s.label === '↓ AUTONOMY')?.value;
    const ship = input.shipWindow;
    const runsOutFirst = ship.latestDay > 0 && station.autonomyDays < ship.earliestDay;
    const chain = station.steps.filter((s) => s.label !== '↓ AUTONOMY');
    return card(
      <>
        {autonomy && (
          <p className="text-body" style={{ color: 'var(--text)' }}>
            The station's fuel lasts about{' '}
            <Figure
              m={autonomy}
              text={`${Math.round(station.autonomyDays)} ±${Math.round(station.autonomyBandDays)} days`}
              color={runsOutFirst ? 'var(--act-soft)' : 'var(--text)'}
              label="Days of fuel left"
            />
          </p>
        )}
        <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
          {station.lsodDays !== null && (
            <>
              Order more within <span className="font-mono tabular-nums">{Math.round(station.lsodDays)}</span> days.{' '}
            </>
          )}
          {ship.latestDay > 0 && (
            <>
              Next ship in{' '}
              <span className="font-mono tabular-nums whitespace-nowrap">
                {ship.earliestDay}–{ship.latestDay}
              </span>{' '}
              days.
            </>
          )}
        </p>
        {runsOutFirst && (
          <p className="text-body-sm font-medium" style={{ color: 'var(--act-soft)' }}>
            At this rate the fuel runs out before the earliest ship can arrive.
          </p>
        )}
        <Workings>
          {chain.map((s) => (
            <Row
              key={s.label}
              label={STATION_STEP_WORDS[s.label] ?? s.label}
              m={s.value}
              unit={UNIT_WORDS[s.value.unit] ?? s.value.unit}
            />
          ))}
          <Note>Fuel in stock divided by the daily burn gives the days above.</Note>
        </Workings>
      </>,
    );
  }

  // ---- A zone or room: what it costs, and what its fault adds ----
  const stationBurn = station.steps.find((s) => s.label === '↓ FUEL BURN')?.value;
  const serious = subject.status === 'warning';
  const costDays = condition ? whole(condition.costDays) : 0;

  return card(
    <>
      {condition ? (
        <>
          <p className="text-body" style={{ color: 'var(--text)' }}>
            {condition.what} costs about{' '}
            <Figure
              m={condition.costDays}
              text={`${costDays < 1 ? '<1' : costDays} ${costDays === 1 ? 'day' : 'days'}`}
              color={serious ? 'var(--act-soft)' : 'var(--watch-soft)'}
              label="Days of fuel this fault costs"
            />{' '}
            of fuel.
          </p>
          <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
            Fuel lasts <span className="font-mono tabular-nums">{whole(condition.autonomyNow)}</span> days now,{' '}
            <span className="font-mono tabular-nums">{whole(condition.autonomyIfFixed)}</span> once fixed.
          </p>
        </>
      ) : (
        <>
          <p className="text-body" style={{ color: 'var(--text)' }}>
            Uses about{' '}
            <Figure m={zone.sharePct} text={`${whole(zone.sharePct)}%`} label="Share of the station's fuel" /> of the
            station's fuel.
          </p>
          <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
            {subject.status === 'unknown'
              ? "No readings from here, so we can't tell whether anything is wasting it."
              : 'Nothing here is adding to that right now.'}
          </p>
        </>
      )}
      <Workings>
        <Row label={`Heat lost from this ${kind}`} m={zone.heatLossKw} unit="kW" />
        <Row label="Equipment running here" m={zone.equipmentKw} unit="kW" />
        <Row label={`Fuel for this ${kind}`} m={zone.fuelBurn} unit="/day" />
        {condition && <Row label="Share of the station's fuel" m={zone.sharePct} unit="%" digits={0} />}
        {condition && <Row label="Extra, from the fault" m={condition.extraBurn} unit="/day" />}
        {stationBurn && <Row label="Whole station" m={stationBurn} unit="/day" />}
        <Note>
          Rooms aren't metered separately, so how power and heat split between them is our estimate.{' '}
          <Link to="/settings" className="underline underline-offset-2 hover:no-underline" style={{ color: 'var(--text-2)' }}>
            See the assumptions
          </Link>
        </Note>
      </Workings>
    </>,
  );
}

/** The folded-away workings. Closed by default so the answer stays short. */
function Workings({ children }: { children: React.ReactNode }) {
  return (
    <details className="group mt-1">
      <summary
        className="flex items-center gap-1.5 min-h-9 cursor-pointer list-none text-body-sm font-medium [&::-webkit-details-marker]:hidden"
        style={{ color: 'var(--text-2)' }}
      >
        <ChevronRight size={16} aria-hidden className="transition-transform group-open:rotate-90" />
        How we worked it out
      </summary>
      <div className="mt-2 flex flex-col gap-2 pl-5">{children}</div>
    </details>
  );
}

function Row({ label, m, unit, digits = 1 }: { label: string; m: Measurement; unit: string; digits?: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-body-sm" style={{ color: 'var(--text-2)' }}>{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-body-sm tabular-nums whitespace-nowrap" style={{ color: 'var(--text)' }} title={m.model}>
          {fmt(m, digits)} <span style={{ color: 'var(--text-3)' }}>{unit}</span>
        </span>
        <ProvenanceBadge measurement={m} label={label} abbreviated align="right" />
      </span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-2 text-body-sm" style={{ color: 'var(--text-3)', borderTop: '1px solid var(--line)' }}>
      {children}
    </p>
  );
}
