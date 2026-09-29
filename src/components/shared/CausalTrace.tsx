// OWNER: Dev A
// CausalTrace — "Why this matters" cause→effect panel.
// MUST call runCausalTrace() from src/shared/contracts.ts — never compute trace numbers locally.
// The same engine call must produce identical numbers on Twin, Environment, Sandbox,
// and Dev B's Action Centre drawer. See FRONTEND.md §7 + CLAUDE.md §4.
//
// The panel reads as a plain explanation, answer first: what our model
// concludes (days of fuel, order deadline), then the chain it followed to get
// there. The engine's labels (AMBIENT, ↓ HEATING, HDD, LSOD…) meant nothing
// to the people reading it, and a column of identical MODELED chips never
// said "this is our calculation". So this file only chooses words, order and
// lineage metadata — every number still comes straight from the engine.

import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import {
  runCausalTrace,
  type CausalTraceInput,
  type CausalTraceStep,
  type Measurement,
  type Provenance,
} from '@/shared/contracts';
import { ProvenanceBadge } from './ProvenanceBadge';

interface CausalTraceProps {
  input: CausalTraceInput;
  className?: string;
  /** Omit the built-in "Why this matters" heading when the host already titles the section. Presentation only. */
  hideHeading?: boolean;
  /**
   * What the estimate covers. Finishes the sentence "Our model's estimate
   * for …", e.g. "all of Bharati — the same for every zone". Omit it and the
   * sentence simply ends at "estimate".
   */
  scope?: string;
}

/** Plain-language wording for each engine step; the engine's own label goes in the tooltip. */
const STEP_WORDS: Record<string, { label: string; jargon: string }> = {
  'AMBIENT': { label: 'Outside temperature', jargon: 'Ambient air temperature' },
  '↓ HEATING': { label: 'Heating the buildings need', jargon: 'Heating degree-days (HDD)' },
  '↓ GEN LOAD': { label: 'Load on the generators', jargon: 'Generator electrical load' },
  '↓ FUEL BURN': { label: 'Fuel burned', jargon: 'Fuel burn rate' },
};

const UNIT_WORDS: Record<string, string> = { HDD: 'degree-days' };

const AUTONOMY_LABEL = '↓ AUTONOMY';

/**
 * What each step was derived from. The engine returns its steps without
 * parents, which made every badge's hover card warn "derived value with no
 * declared parents". Assumption-backed inputs are SYNTH until NCPOR confirms
 * them on /settings; in a Sandbox run every link is SIM.
 */
function lineage(label: string, p: Provenance): Measurement['parents'] {
  const assumption: Provenance = p === 'SIM' ? 'SIM' : 'SYNTH';
  switch (label) {
    case 'AMBIENT':
      return [{ name: 'station weather record', provenance: p }];
    case '↓ HEATING':
      return [
        { name: 'outside temperature', provenance: p },
        { name: 'degree-day base temperature', provenance: assumption },
      ];
    case '↓ GEN LOAD':
      return [
        { name: 'heating the buildings need', provenance: p },
        { name: 'building insulation and heated area', provenance: assumption },
        { name: 'baseline station load', provenance: assumption },
      ];
    case '↓ FUEL BURN':
      return [
        { name: 'load on the generators', provenance: p },
        { name: 'generator efficiency', provenance: assumption },
      ];
    case AUTONOMY_LABEL:
      return [
        { name: 'fuel burned', provenance: p },
        { name: 'fuel in stock', provenance: assumption },
      ];
    default:
      return undefined;
  }
}

function withLineage(step: CausalTraceStep): Measurement {
  if (step.value.parents?.length) return step.value;
  return { ...step.value, parents: lineage(step.label, step.value.provenance) };
}

function formatValue(m: Measurement): string {
  if (m.value === null) return '—';
  return typeof m.value === 'number' ? m.value.toFixed(1) : m.value;
}

export function CausalTrace({ input, className = '', hideHeading = false, scope }: CausalTraceProps) {
  const result = runCausalTrace(input);

  const autonomyStep = result.steps.find((s) => s.label === AUTONOMY_LABEL);
  const chain = result.steps.filter((s) => s.label !== AUTONOMY_LABEL);
  const provenance = result.steps[0]?.value.provenance ?? 'MODELED';
  const isSim = provenance === 'SIM';

  const autonomyText =
    result.autonomyDays === Infinity ? '∞' : String(Math.round(result.autonomyDays));

  // LSOD is not one of the engine's steps, so it gets its own Measurement
  // here — same class, timestamp and source as the chain it came from — so
  // it can carry a badge like every other number on the panel.
  const lsod: Measurement | null =
    result.lsodDays === null
      ? null
      : {
          value: Math.round(result.lsodDays),
          unit: 'd',
          timestamp: autonomyStep?.value.timestamp ?? new Date().toISOString(),
          source: 'coupling-engine',
          provenance,
          freshnessSeconds: 0,
          model:
            'latest safe order date = day fuel runs out − (unloading + transit + consolidation + procurement lead), capped at the ship window',
          parents: [
            { name: 'days of fuel left', provenance },
            { name: "next ship's arrival window", provenance: isSim ? 'SIM' : 'SYNTH' },
            { name: 'supply lead times', provenance: isSim ? 'SIM' : 'SYNTH' },
          ],
        };

  const lsodColor =
    result.lsodDays === null ? 'var(--text)'
    : result.lsodDays <= 14 ? 'var(--act-soft)'
    : result.lsodDays <= 45 ? 'var(--watch-soft)'
    : 'var(--text)';

  return (
    <section
      className={`rounded-xl p-4 flex flex-col gap-4 ${className}`}
      style={{
        backgroundColor: 'var(--bg)',
        border: '1px solid color-mix(in srgb, var(--ok) 30%, transparent)',
      }}
    >
      {/* ---- What this panel is ---- */}
      <header className="flex flex-col gap-1">
        {!hideHeading && (
          <h3 className="text-title font-medium" style={{ color: 'var(--text)' }}>
            Why this matters
          </h3>
        )}
        <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
          {isSim ? (
            <>A Sandbox what-if{scope ? <> for {scope}</> : null}, from the settings you chose. Not a forecast.</>
          ) : (
            <>Our model's estimate{scope ? <> for {scope}</> : null}. Calculated, not read from a sensor.</>
          )}
        </p>
      </header>

      {/* ---- The conclusion, first ---- */}
      <div
        className="rounded-lg p-4 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)' }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <span
              className="text-body-sm"
              style={{ color: 'var(--text-3)' }}
              title="Autonomy — days until the fuel runs out at the modelled burn rate, with its uncertainty band"
            >
              Fuel will last about
            </span>
            {autonomyStep && (
              <ProvenanceBadge
                measurement={withLineage(autonomyStep)}
                label="Days of fuel left"
                align="right"
              />
            )}
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-display font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
              {autonomyText}
            </span>
            <span className="font-mono text-body" style={{ color: 'var(--text-2)' }}>days</span>
            {result.autonomyDays !== Infinity && (
              <span
                className="font-mono text-body-sm tabular-nums"
                style={{ color: 'var(--text-3)' }}
                title="Uncertainty band from burn-rate variance"
              >
                ±{Math.round(result.autonomyBandDays)} d
              </span>
            )}
          </div>
        </div>

        {lsod && (
          <div className="flex flex-col gap-1 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-body" style={{ color: 'var(--text)' }} title="LSOD — latest safe order date">
                Order more fuel within{' '}
                <span className="font-mono font-semibold tabular-nums whitespace-nowrap" style={{ color: lsodColor }}>
                  {lsod.value} days
                </span>
              </span>
              <ProvenanceBadge measurement={lsod} label="Latest safe order date" align="right" />
            </div>
            <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>
              The last safe day to order so it reaches the station before the tanks run dry.
            </span>
          </div>
        )}
      </div>

      {/* ---- How the model got there ---- */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h4 className="text-body font-medium" style={{ color: 'var(--text)' }}>
            How the model got there
          </h4>
          <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
            Colder outside → more heating → generators work harder → more fuel burned.
          </p>
        </div>

        <ol className="flex flex-col">
          {chain.map((step, i) => {
            const words = STEP_WORDS[step.label] ?? { label: step.label, jargon: step.label };
            const unit = UNIT_WORDS[step.value.unit] ?? step.value.unit;
            const last = i === chain.length - 1;
            return (
              <li key={step.label} className={`relative pl-6 ${last ? '' : 'pb-3'}`}>
                {/* the chain's thread — decoration only */}
                {!last && (
                  <span
                    aria-hidden
                    className="absolute left-[4px] top-4 bottom-0 w-px"
                    style={{ backgroundColor: 'var(--line-strong)' }}
                  />
                )}
                <span
                  aria-hidden
                  className="absolute left-0 top-[7px] w-[9px] h-[9px] rounded-full"
                  style={{ border: '1.5px solid var(--text-4)', backgroundColor: 'var(--bg)' }}
                />
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-body-sm" style={{ color: 'var(--text-2)' }} title={words.jargon}>
                    {words.label}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    <span
                      className="font-mono text-body tabular-nums whitespace-nowrap"
                      style={{ color: 'var(--text)' }}
                      title={step.formula}
                    >
                      {formatValue(step.value)} <span style={{ color: 'var(--text-3)' }}>{unit}</span>
                    </span>
                    <ProvenanceBadge measurement={withLineage(step)} label={words.label} align="right" />
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
          Dividing the fuel in stock by this daily burn gives the{' '}
          <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{autonomyText}</span> days above.
        </p>
      </div>

      {/* ---- What else it assumes ---- */}
      {!isSim && (
        <div className="flex items-start gap-2 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <Info size={16} aria-hidden className="shrink-0 mt-0.5" style={{ color: 'var(--text-3)' }} />
          <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
            Also uses assumed values for building insulation, generator efficiency and shipping times,
            until NCPOR confirms them.{' '}
            <Link to="/settings" className="underline underline-offset-2 hover:no-underline" style={{ color: 'var(--text-2)' }}>
              See the assumptions
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
