// OWNER: Dev A
// PAGE 8 — Research Sandbox (route /sandbox).
//
// Every other page is about OPERATING the station. This one is about
// understanding it: change a parameter, see the modelled consequence, and be
// unable to mistake the result for live data.
//
// Two things were wrong before and both are fixed here.
//
// 1. Half the controls were decorative. `crewSize` never left React state,
//    and `windKmh` is accepted by runCausalTrace but never read by it, so
//    dragging either moved nothing. Every lever now has one documented path
//    into the engine — see PARAMETERS in state/sandbox.ts.
// 2. The page was built in its own visual language (h-screen inside the
//    scrolling shell, arbitrary Tailwind colour classes, hand-rolled SVG
//    icons, mono everywhere). It now uses the same title row, cards, tokens,
//    lucide icons and casing contract as the rest of the app.
//
// Writes: none, ever (NFR-8.4). Scenario parameters go through
// withSandboxParams, which mutates a module-local override map for the
// duration of one synchronous call and persists nothing. Saving a SCENARIO
// is permitted and stores parameters only; saving a RESULT is not.

import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import {
  RotateCcw, Save, Download, FlaskConical, ChevronDown, ChevronRight, Trash2,
} from 'lucide-react';
import type { Risk } from '@/shared/contracts';
import { CausalTrace } from '@/components/shared/CausalTrace';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { StatusDot } from '@/components/shared/StatusDot';
import { Modal } from '@/components/shared/Modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { useStationScope, STATION_LABEL } from '@/state/stationScope';
import { useStoreValue } from '@/state/useStore';
import { downloadText } from '@/state/manifest';
import { sim, derived } from '@/lib/provenance';
import { formatClockIST, formatShortIST } from '@/lib/time';
import {
  PARAMETERS, GROUP_LABEL, baselineValues, baselineTrace, scenarioTrace, zoneImpacts,
  getSavedScenarios, saveScenario, deleteScenario,
  type ParamGroup, type ScenarioValues,
} from '@/state/sandbox';
import PRESETS from '@/mock/scenarios/presets.json';

const GROUPS: ParamGroup[] = ['environmental', 'energy', 'logistics', 'crew'];

const RISK_DOT: Record<Risk, 'ok' | 'watch' | 'warning' | 'critical'> = {
  ok: 'ok', watch: 'watch', warning: 'warning', critical: 'critical',
};

interface Preset {
  id: string; name: string; note: string;
  set: Record<string, number>;
  delta: Record<string, number>;
}

export default function SandboxPage() {
  const stationId = useStationScope((s) => s.primary);
  const setPrimary = useStationScope((s) => s.setPrimary);

  // FR-1.3 / NFR-8.5: the fork is pinned when the station changes. Leaving
  // and returning remounts the page, which re-forks from then-current state.
  const [forkedAt, setForkedAt] = useState(() => new Date().toISOString());

  const baseline = useStoreValue(() => baselineValues(stationId));
  const [values, setValues] = useState<ScenarioValues>(baseline);
  const [openGroups, setOpenGroups] = useState<Set<ParamGroup>>(new Set(GROUPS));
  const [saveOpen, setSaveOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [saved, setSaved] = useState(getSavedScenarios);
  const [toast, setToast] = useState<string | null>(null);

  // FR-3.6 / NFR-8.1: recompute live, no Run button. The engine is pure and
  // synchronous so there is nothing to await; useDeferredValue just keeps the
  // slider thumb responsive while the results catch up on a busy frame.
  const applied = useDeferredValue(values);

  const reFork = useCallback((next: typeof stationId) => {
    setPrimary(next);
    setValues(baselineValues(next));   // FR-2.2 — re-fork resets parameters
    setForkedAt(new Date().toISOString());
  }, [setPrimary]);

  const reset = useCallback(() => setValues(baselineValues(stationId)), [stationId]);

  const base = useStoreValue(() => baselineTrace(stationId));
  const scenario = useMemo(() => scenarioTrace(stationId, applied), [stationId, applied]);
  const zones = useMemo(() => zoneImpacts(stationId, applied), [stationId, applied]);

  // Not memoised on purpose: `baseline` comes from useStoreValue, which
  // returns a fresh object every render, so a useMemo keyed on it would
  // recompute anyway while pretending not to. Ten comparisons is cheaper
  // than the lie.
  const changed = PARAMETERS.filter((param) => !nearlyEqual(values[param.key], baseline[param.key]));
  const changedKeys = new Set(changed.map((c) => c.key));

  const applyPreset = (preset: Preset) => {
    const next = { ...baseline };
    for (const [k, v] of Object.entries(preset.set)) if (k in next) next[k] = v;
    for (const [k, v] of Object.entries(preset.delta)) if (k in next) next[k] = next[k] + v;
    setValues(clampAll(next));
  };

  const onSave = () => {
    const name = scenarioName.trim();
    if (!name) return;
    saveScenario(name, stationId, values);
    setSaved(getSavedScenarios());
    setSaveOpen(false);
    setScenarioName('');
    flash(`Scenario "${name}" saved. Parameters only — no results are stored.`);
  };

  const onDelete = (id: string) => {
    deleteScenario(id);
    setSaved(getSavedScenarios());
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  // FR-7.5: every simulated value carries SIM in the export. Losing the class
  // is exactly how a simulated number escapes into a real report.
  const onExport = () => {
    const payload = {
      scenario: {
        forkedFrom: { stationId, at: forkedAt },
        exportedAt: new Date().toISOString(),
        parametersChanged: changed.length,
      },
      parameters: PARAMETERS.map((param) => ({
        key: param.key, label: param.label, unit: param.unit,
        baseline: baseline[param.key], value: values[param.key],
        changed: changedKeys.has(param.key),
        boundSource: param.boundSource, mechanism: param.mechanism,
      })),
      metrics: metrics(base.result, scenario.result).map((m) => ({
        key: m.key, label: m.label, unit: m.unit,
        before: { value: m.before, provenance: 'MODELED' },
        after: { value: m.after, provenance: 'SIM' },
        delta: m.after - m.before,
      })),
      disclosure:
        'SIM — sandbox what-if output. Projections are computed from the entered rates, '
        + 'not a prediction. No value in this file describes the real state of the station.',
    };
    downloadText(
      `antarasetu-scenario-${stationId}-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  };

  const diffMetrics = metrics(base.result, scenario.result);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- FR-1.1/1.2: sticky, undismissible, above the scroll container ---- */}
      {/* Same shape as ChainBanner and the session notice — 14% tint of the
          status colour, 1px border, icon in the full colour, body-font 12.5px
          in the -soft colour. Only the safety label itself stays mono and
          letter-spaced, the way ChainBanner sets its entry number in mono
          inside body text. Violet is the SIM provenance class, so it belongs
          here and on simulated values; it is not this page's accent. */}
      <div
        role="status"
        className="flex items-center gap-2.5 px-5 py-2 shrink-0 flex-wrap"
        style={{
          backgroundColor: 'rgba(155,132,196,0.14)',
          borderBottom: '1px solid var(--sim)',
        }}
      >
        <FlaskConical size={15} style={{ color: 'var(--sim)' }} aria-hidden />
        <span className="text-[12.5px]" style={{ color: 'var(--sim-soft)', fontFamily: 'var(--font-body)' }}>
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] font-semibold">
            Simulation — not live station data
          </span>
          {' · '}forked from {STATION_LABEL[stationId]} state at {formatShortIST(forkedAt)} IST.
          Nothing on this page is written to any record.
        </span>
      </div>

      {/* ---- Title row, same shape as every other page ---- */}
      <div
        className="flex items-center gap-3 h-[52px] px-6 shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <h1 className="text-[27px] font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          Research Sandbox
        </h1>

        <div className="flex items-center gap-1 ml-2 p-0.5 rounded-full" style={{ border: '1px solid var(--line)' }}>
          {(['bharati', 'maitri'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => reFork(id)}
              className="px-3 py-1.5 rounded-full text-[11.5px]"
              style={{
                backgroundColor: stationId === id ? 'var(--text)' : 'transparent',
                color: stationId === id ? 'var(--bg)' : 'var(--text-3)',
              }}
            >
              {STATION_LABEL[id]}
            </button>
          ))}
        </div>

        <span
          className="font-mono text-[9.5px] uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
          style={{
            border: `1px solid ${changed.length ? 'var(--line-strong)' : 'var(--line)'}`,
            color: changed.length ? 'var(--text-2)' : 'var(--text-4)',
          }}
        >
          {changed.length} of {PARAMETERS.length} parameters changed
        </span>

        <div className="flex-1" />

        <span className="font-mono text-[11px] tabular-nums" style={{ color: 'var(--text-2)' }}>
          {formatClockIST()}
        </span>

        <button
          type="button"
          onClick={reset}
          disabled={changed.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium"
          style={{ border: '1px solid var(--line)', color: 'var(--text-2)', opacity: changed.length ? 1 : 0.4 }}
        >
          <RotateCcw size={12} /> Reset
        </button>
        <button
          type="button"
          onClick={() => setSaveOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium"
          style={{ border: '1px solid var(--line)', color: 'var(--text-2)' }}
        >
          <Save size={12} /> Save scenario
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
        >
          <Download size={12} /> Export
        </button>
      </div>

      {toast && (
        <div
          className="px-6 py-2 shrink-0"
          role="status"
          style={{ backgroundColor: 'rgba(79,174,133,0.10)', borderBottom: '1px solid var(--ok)' }}
        >
          <span className="font-mono text-[10.5px]" style={{ color: 'var(--ok-soft)' }}>{toast}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        <div className="flex flex-col xl:flex-row gap-3.5 min-h-full">
          {/* ---- LEFT: parameters ---- */}
          <div className="flex flex-col gap-3.5 w-full xl:w-[340px] xl:shrink-0">
            <section
              className="p-4 w-full min-w-0"
              style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
              aria-label="Scenario parameters"
            >
              <h2 className="text-[13.5px] font-semibold mb-3" style={{ color: 'var(--text)' }}>
                Scenario parameters
              </h2>

              {GROUPS.map((group) => {
                const open = openGroups.has(group);
                const groupParams = PARAMETERS.filter((param) => param.group === group);
                const groupChanged = groupParams.filter((param) => changedKeys.has(param.key)).length;

                return (
                  <div key={group} style={{ borderTop: '1px solid var(--line)' }}>
                    <button
                      type="button"
                      onClick={() => setOpenGroups((s) => toggle(s, group))}
                      className="flex items-center gap-1.5 w-full py-2.5 text-left"
                      aria-expanded={open}
                    >
                      {open
                        ? <ChevronDown size={12} style={{ color: 'var(--text-4)' }} />
                        : <ChevronRight size={12} style={{ color: 'var(--text-4)' }} />}
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: 'var(--text-4)' }}>
                        {GROUP_LABEL[group]}
                      </span>
                      {groupChanged > 0 && (
                        <span className="font-mono text-[8.5px] ml-auto px-1.5 py-0.5 rounded"
                          style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}>
                          {groupChanged}
                        </span>
                      )}
                    </button>

                    {open && (
                      <div className="pb-3 space-y-4">
                        {groupParams.map((param) => (
                          <ParameterSlider
                            key={param.key}
                            param={param}
                            value={values[param.key]}
                            baseline={baseline[param.key]}
                            changed={changedKeys.has(param.key)}
                            onChange={(v) => setValues((s) => ({ ...s, [param.key]: v }))}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            {/* ---- Presets (FR-7.1/7.2) ---- */}
            <section
              className="p-4 w-full min-w-0"
              style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
              aria-label="Preset scenarios"
            >
              <h2 className="text-[13.5px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
                Presets
              </h2>
              <p className="font-mono text-[9px] mb-3" style={{ color: 'var(--text-4)' }}>
                Data rows in mock/scenarios/presets.json — adding one is not a code change.
              </p>
              <div className="space-y-1.5">
                {(PRESETS as unknown as Preset[]).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="w-full text-left p-2.5 rounded transition-colors hover:bg-[var(--panel-alt)]"
                    style={{ border: '1px solid var(--line)', backgroundColor: 'var(--panel-raised)' }}
                  >
                    <span className="block text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                      {preset.name}
                    </span>
                    <span className="block text-[10.5px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {preset.note}
                    </span>
                  </button>
                ))}
              </div>

              {saved.length > 0 && (
                <>
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] mt-4 mb-2" style={{ color: 'var(--text-4)' }}>
                    Saved
                  </p>
                  <div className="space-y-1.5">
                    {saved.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 p-2 rounded"
                        style={{ border: '1px solid var(--line)', backgroundColor: 'var(--panel-raised)' }}>
                        <button
                          type="button"
                          onClick={() => setValues(clampAll({ ...baseline, ...s.values }))}
                          className="flex-1 min-w-0 text-left"
                        >
                          <span className="block text-[12px] truncate" style={{ color: 'var(--text)' }}>{s.name}</span>
                          <span className="block font-mono text-[9px]" style={{ color: 'var(--text-4)' }}>
                            {STATION_LABEL[s.stationId]} · {formatShortIST(s.savedAt)}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(s.id)}
                          aria-label={`Delete scenario ${s.name}`}
                          className="shrink-0 p-1 rounded"
                          style={{ color: 'var(--text-4)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>

          {/* ---- RIGHT: results ---- */}
          <div className="flex flex-col gap-3.5 flex-1 min-w-0">
            {/* Diff cards (FR-4) */}
            <section
              className="p-4 w-full min-w-0"
              style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
              aria-label="Scenario impact"
            >
              <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
                <h2 className="text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>
                  Scenario impact
                </h2>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: 'var(--text-4)' }}>
                  Before is the live modelled state · after is SIM
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                {diffMetrics.map((m) => <DiffCard key={m.key} metric={m} />)}
              </div>
            </section>

            {/* Cause → effect (FR-6) — the panel that proves this is physics */}
            <section
              className="p-4 w-full min-w-0"
              style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
              aria-label="Cause and effect trace"
            >
              <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
                <h2 className="text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>
                  Cause → effect
                </h2>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: 'var(--text-4)' }}>
                  Same engine as the twin · hover a row for the formula
                </span>
              </div>
              <TraceDiff
                before={base.result.steps}
                after={scenario.result.steps}
              />
            </section>

            <div className="flex flex-col lg:flex-row gap-3.5">
              {/* Projection (FR-5) */}
              <section
                className="p-4 flex-1 min-w-0"
                style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
                aria-label="Autonomy projection"
              >
                <h2 className="text-[13.5px] font-semibold mb-3" style={{ color: 'var(--text)' }}>
                  Stock depletion
                </h2>
                <DepletionChart
                  baselineDays={base.result.autonomyDays}
                  baselineBand={base.result.autonomyBandDays}
                  scenarioDays={scenario.result.autonomyDays}
                  scenarioBand={scenario.result.autonomyBandDays}
                  shipWindow={scenario.input.shipWindow}
                  lsodBaseline={base.result.lsodDays}
                  lsodScenario={scenario.result.lsodDays}
                />
                <p className="font-mono text-[9px] mt-2.5" style={{ color: 'var(--text-4)' }}>
                  Projection from the entered rate — not a prediction. Both paths assume the burn
                  rate their own parameters produce, held constant.
                </p>
              </section>

              {/* Zone impact (FR-8) */}
              <section
                className="p-4 w-full lg:w-[300px] lg:shrink-0 min-w-0"
                style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
                aria-label="Zone impact"
              >
                <h2 className="text-[13.5px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
                  Zone impact
                </h2>
                <p className="font-mono text-[9px] mb-3" style={{ color: 'var(--text-4)' }}>
                  Each zone re-run with its own envelope penalty. Engine output, not a threshold on
                  the slider.
                </p>
                {zones.length === 0 ? (
                  <EmptyState reason="No zones reported for this station." />
                ) : (
                  <ul className="space-y-1.5">
                    {zones.map((z) => (
                      <li
                        key={z.zone.code}
                        className="flex items-center gap-2 p-2 rounded"
                        style={{
                          backgroundColor: 'var(--panel-raised)',
                          border: `1px ${z.worsened ? 'solid var(--line-strong)' : 'solid var(--line)'}`,
                        }}
                      >
                        <span className="font-mono text-[9px] uppercase tracking-[0.10em] w-6 shrink-0"
                          style={{ color: 'var(--text-3)' }}>
                          {z.zone.code}
                        </span>
                        <span className="text-[11.5px] flex-1 truncate" style={{ color: 'var(--text)' }}>
                          {z.zone.name}
                        </span>
                        <StatusDot status={RISK_DOT[z.before]} size={6} />
                        <span className="font-mono text-[9px]" style={{ color: 'var(--text-4)' }}>→</span>
                        <StatusDot status={RISK_DOT[z.after]} size={6} />
                        {z.worsened && (
                          <span className="font-mono text-[8px] uppercase px-1 py-0.5 rounded shrink-0"
                            style={{ border: '1px dashed var(--sim)', color: 'var(--sim-soft)' }}>
                            Sim
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Full scenario trace, for the formula detail */}
            <section
              className="p-4 w-full min-w-0"
              style={{
                backgroundColor: 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-card)',
              }}
              aria-label="Scenario causal trace"
            >
              <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
                <h2 className="text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>
                  Scenario trace
                </h2>
                <ProvenanceBadge
                  measurement={sim(scenario.result.autonomyDays, 'd', 'coupling engine, scenario inputs')}
                  label="Every value in this panel"
                />
              </div>
              <CausalTrace input={scenario.input} />
            </section>
          </div>
        </div>
      </div>

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Save scenario">
        <p className="text-[11.5px] mb-3" style={{ color: 'var(--text-3)' }}>
          Parameters are saved, results are not. A stored result is a simulated number waiting to be
          read as fact.
        </p>
        <input
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          placeholder="Scenario name"
          className="w-full px-3 mb-3 text-[12.5px] outline-none"
          style={{
            minHeight: 40, backgroundColor: 'var(--panel)',
            border: '1px solid var(--line)', borderRadius: 'var(--r-inner)', color: 'var(--text)',
          }}
        />
        <button
          type="button"
          onClick={onSave}
          disabled={!scenarioName.trim()}
          className="w-full py-2.5 rounded-full text-[12.5px] font-medium"
          style={{
            backgroundColor: 'var(--text)', color: 'var(--bg)',
            opacity: scenarioName.trim() ? 1 : 0.4,
          }}
        >
          Save {changed.length} changed parameter{changed.length === 1 ? '' : 's'}
        </button>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ParameterSlider({
  param, value, baseline, changed, onChange,
}: {
  param: typeof PARAMETERS[number];
  value: number; baseline: number; changed: boolean;
  onChange: (v: number) => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const pct = (n: number) => ((n - param.min) / (param.max - param.min)) * 100;
  const digits = param.precision ?? 0;

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <label className="text-[11.5px] flex-1 min-w-0 truncate" style={{ color: changed ? 'var(--text)' : 'var(--text-2)' }}>
          {param.label}
        </label>
        <span
          className="font-mono text-[11.5px] tabular-nums shrink-0"
          style={{ color: changed ? 'var(--text)' : 'var(--text-2)' }}
        >
          {value.toFixed(digits)} {param.unit}
        </span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={param.min} max={param.max} step={param.step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full"
          style={{ accentColor: changed ? 'var(--text-2)' : 'var(--text-4)' }}
          aria-label={`${param.label} in ${param.unit}`}
        />
        {/* FR-3.2 — baseline marked as a tick on the track */}
        <span
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            left: `calc(${clamp(pct(baseline), 0, 100)}% )`,
            bottom: -2, width: 1, height: 6,
            backgroundColor: 'var(--text-4)',
            transform: 'translateX(-0.5px)',
          }}
        />
      </div>

      <div className="flex items-center gap-2 mt-0.5">
        <span className="font-mono text-[8.5px]" style={{ color: 'var(--text-4)' }}>
          baseline {baseline.toFixed(digits)}
        </span>
        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          className="ml-auto font-mono text-[8.5px] underline shrink-0"
          style={{ color: 'var(--text-4)' }}
          aria-expanded={showWhy}
        >
          {showWhy ? 'hide' : 'what does this do?'}
        </button>
      </div>

      {showWhy && (
        <div className="mt-1.5 p-2 rounded" style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)' }}>
          <p className="text-[10.5px] mb-1" style={{ color: 'var(--text-2)' }}>{param.mechanism}</p>
          <p className="font-mono text-[9px]" style={{ color: 'var(--text-4)' }}>
            bounds: {param.boundSource}
          </p>
        </div>
      )}
    </div>
  );
}

interface Metric {
  key: string; label: string; unit: string;
  before: number; after: number;
  beforeBand?: number; afterBand?: number;
  /** true when a rise is bad (burn, demand); false when a fall is bad. */
  higherIsWorse: boolean;
  beforeRisk?: Risk; afterRisk?: Risk;
}

type TraceResult = ReturnType<typeof baselineTrace>['result'];

function metrics(before: TraceResult, after: TraceResult): Metric[] {
  const step = (r: TraceResult, label: string) =>
    Number(r.steps.find((s) => s.label.includes(label))?.value.value ?? 0);

  return [
    {
      key: 'autonomy', label: 'Fuel autonomy', unit: 'd',
      before: before.autonomyDays, after: after.autonomyDays,
      beforeBand: before.autonomyBandDays, afterBand: after.autonomyBandDays,
      higherIsWorse: false, beforeRisk: before.risk, afterRisk: after.risk,
    },
    {
      key: 'lsod', label: 'Last safe order date', unit: 'd',
      before: before.lsodDays ?? 0, after: after.lsodDays ?? 0,
      higherIsWorse: false, beforeRisk: before.risk, afterRisk: after.risk,
    },
    {
      key: 'demand', label: 'Energy demand', unit: 'kW',
      before: step(before, 'GEN LOAD'), after: step(after, 'GEN LOAD'),
      higherIsWorse: true,
    },
    {
      key: 'burn', label: 'Fuel burn', unit: 'kW-eq/d',
      before: step(before, 'FUEL BURN'), after: step(after, 'FUEL BURN'),
      higherIsWorse: true,
    },
    {
      key: 'hdd', label: 'Heating degree-days', unit: 'HDD',
      before: step(before, 'HEATING'), after: step(after, 'HEATING'),
      higherIsWorse: true,
    },
  ];
}

function DiffCard({ metric: m }: { metric: Metric }) {
  const delta = m.after - m.before;
  const worse = m.higherIsWorse ? delta > 0 : delta < 0;
  const deltaColor = nearlyEqual(delta, 0)
    ? 'var(--text-4)'
    : worse ? 'var(--act-soft)' : 'var(--ok-soft)';

  return (
    <div
      className="p-2.5 rounded-xl min-w-0 overflow-hidden"
      style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)' }}
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.10em] truncate mb-1.5" style={{ color: 'var(--text-3)' }}>
        {m.label}
      </p>

      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="font-mono text-[9px] uppercase w-10 shrink-0" style={{ color: 'var(--text-4)' }}>Before</span>
        <span className="font-mono text-[13px] tabular-nums" style={{ color: 'var(--text-2)' }}>
          {fmt(m.before)}{m.beforeBand ? ` ±${fmt(m.beforeBand)}` : ''}
        </span>
        <ProvenanceBadge
          measurement={derived(m.before, m.unit, 'coupling engine', 'live station state', [
            { name: 'station telemetry', provenance: 'SYNTH' },
          ])}
          abbreviated
          align="right"
          className="ml-auto shrink-0"
        />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[9px] uppercase w-10 shrink-0" style={{ color: 'var(--text-3)' }}>After</span>
        <span className="font-mono text-[15px] font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
          {fmt(m.after)}{m.afterBand ? ` ±${fmt(m.afterBand)}` : ''}
        </span>
        <ProvenanceBadge
          measurement={sim(m.after, m.unit, 'coupling engine, scenario inputs')}
          abbreviated
          align="right"
          className="ml-auto shrink-0"
        />
      </div>

      <div className="flex items-center gap-1.5 mt-1.5 pt-1.5" style={{ borderTop: '1px solid var(--line)' }}>
        <span className="font-mono text-[11px] tabular-nums" style={{ color: deltaColor }}>
          {delta > 0 ? '+' : delta < 0 ? '−' : ''}{fmt(Math.abs(delta))} {m.unit}
        </span>
        {m.afterRisk && (
          <span className="flex items-center gap-1 ml-auto shrink-0">
            <StatusDot status={RISK_DOT[m.beforeRisk ?? 'ok']} size={5} />
            <span className="font-mono text-[9px]" style={{ color: 'var(--text-4)' }}>→</span>
            <StatusDot status={RISK_DOT[m.afterRisk]} size={5} />
          </span>
        )}
      </div>
    </div>
  );
}

/** FR-6.2 — each engine link with baseline, scenario and delta side by side. */
function TraceDiff({
  before, after,
}: { before: TraceResult['steps']; after: TraceResult['steps'] }) {
  return (
    <ol className="space-y-1">
      {after.map((step, i) => {
        const b = Number(before[i]?.value.value ?? 0);
        const a = Number(step.value.value ?? 0);
        const delta = a - b;

        return (
          <li
            key={step.label}
            className="flex items-baseline gap-2 py-1.5 px-2 rounded flex-wrap"
            style={{ backgroundColor: i % 2 ? 'transparent' : 'var(--panel-raised)' }}
            title={step.formula}
          >
            <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] w-24 shrink-0" style={{ color: 'var(--text-3)' }}>
              {step.label.replace('↓ ', '')}
            </span>
            <span className="font-mono text-[11.5px] tabular-nums w-20 shrink-0 text-right" style={{ color: 'var(--text-3)' }}>
              {fmt(b)}
            </span>
            <span className="font-mono text-[9px] shrink-0" style={{ color: 'var(--text-4)' }}>→</span>
            <span className="font-mono text-[12.5px] tabular-nums w-20 shrink-0 text-right font-semibold" style={{ color: 'var(--text)' }}>
              {fmt(a)}
            </span>
            <span className="font-mono text-[9.5px] shrink-0" style={{ color: 'var(--text-4)' }}>
              {step.value.unit}
            </span>
            <span
              className="font-mono text-[10.5px] tabular-nums w-16 shrink-0 text-right"
              style={{ color: deltaColor(step.label, delta) }}
            >
              {nearlyEqual(delta, 0) ? '—' : `${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta))}`}
            </span>
            <span className="font-mono text-[9px] flex-1 min-w-0 truncate" style={{ color: 'var(--text-4)' }}>
              {step.formula}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * FR-5.1–5.3 — two depletion lines with their ± bands, the ship window as a
 * vertical band and an LSOD marker on each line. Built inline because the
 * shared TimeSeriesChart takes a single series and draws no bands.
 */
function DepletionChart({
  baselineDays, baselineBand, scenarioDays, scenarioBand, shipWindow, lsodBaseline, lsodScenario,
}: {
  baselineDays: number; baselineBand: number;
  scenarioDays: number; scenarioBand: number;
  shipWindow: { earliestDay: number; latestDay: number };
  lsodBaseline: number | null; lsodScenario: number | null;
}) {
  const W = 620, H = 190, PAD_L = 34, PAD_B = 22, PAD_T = 8, PAD_R = 8;

  const horizon = Math.max(
    30,
    Math.ceil(Math.max(baselineDays, scenarioDays, shipWindow.latestDay) * 1.1)
  );
  const x = (d: number) => PAD_L + (clamp(d, 0, horizon) / horizon) * (W - PAD_L - PAD_R);
  const y = (pct: number) => PAD_T + (1 - clamp(pct, 0, 1)) * (H - PAD_T - PAD_B);

  // Stock runs from 100% today to 0% at the autonomy day: a constant rate.
  const line = (days: number) => `M ${x(0)} ${y(1)} L ${x(days)} ${y(0)}`;
  const band = (days: number, bandDays: number) =>
    `M ${x(0)} ${y(1)} L ${x(Math.max(0, days - bandDays))} ${y(0)} L ${x(days + bandDays)} ${y(0)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Stock depletion, baseline against scenario, with the ship window and last safe order dates">
      {/* ship window */}
      <rect
        x={x(shipWindow.earliestDay)} y={PAD_T}
        width={Math.max(2, x(shipWindow.latestDay) - x(shipWindow.earliestDay))}
        height={H - PAD_T - PAD_B}
        fill="var(--ok)" opacity={0.10}
      />
      <text x={x(shipWindow.earliestDay) + 4} y={PAD_T + 10} fontFamily="var(--font-mono)" fontSize={8.5}
        fill="var(--ok-soft)" letterSpacing="0.6">SHIP WINDOW</text>

      {/* axes */}
      <line x1={PAD_L} y1={y(0)} x2={W - PAD_R} y2={y(0)} stroke="var(--line-strong)" strokeWidth={1} />
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={y(0)} stroke="var(--line-strong)" strokeWidth={1} />
      {[0, 0.5, 1].map((t) => (
        <text key={t} x={PAD_L - 5} y={y(t) + 3} textAnchor="end"
          fontFamily="var(--font-mono)" fontSize={8.5} fill="var(--text-4)">
          {Math.round(t * 100)}%
        </text>
      ))}

      {/* uncertainty bands */}
      <path d={band(baselineDays, baselineBand)} fill="var(--text-3)" opacity={0.12} />
      <path d={band(scenarioDays, scenarioBand)} fill="var(--sim)" opacity={0.18} />

      {/* FR-5.3 — colour AND line style differ */}
      <path d={line(baselineDays)} fill="none" stroke="var(--text-2)" strokeWidth={1.6} />
      <path d={line(scenarioDays)} fill="none" stroke="var(--sim)" strokeWidth={2} strokeDasharray="6 4" />

      {/* LSOD markers */}
      {lsodBaseline !== null && <LsodTick d={lsodBaseline} x={x} yTop={PAD_T} yBottom={y(0)} color="var(--text-3)" />}
      {lsodScenario !== null && <LsodTick d={lsodScenario} x={x} yTop={PAD_T} yBottom={y(0)} color="var(--sim-soft)" label />}

      <text x={W - PAD_R} y={H - 6} textAnchor="end" fontFamily="var(--font-mono)" fontSize={8.5} fill="var(--text-4)">
        {horizon} d
      </text>
      <text x={PAD_L} y={H - 6} fontFamily="var(--font-mono)" fontSize={8.5} fill="var(--text-4)">today</text>
    </svg>
  );
}

function LsodTick({
  d, x, yTop, yBottom, color, label,
}: {
  d: number; x: (d: number) => number; yTop: number; yBottom: number;
  color: string; label?: boolean;
}) {
  if (d < 0) return null;
  return (
    <g>
      <line x1={x(d)} y1={yTop} x2={x(d)} y2={yBottom} stroke={color} strokeWidth={1} strokeDasharray="2 3" />
      <circle cx={x(d)} cy={yBottom} r={3} fill={color} />
      {label && (
        <text x={x(d) + 4} y={yBottom - 5} fontFamily="var(--font-mono)" fontSize={8.5} fill={color}>
          LSOD {Math.round(d)} d
        </text>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------

/**
 * Deltas read the same here as everywhere else in the app: orange when the
 * scenario is worse, mint when it is better. Along the causal chain more is
 * worse at every link except autonomy, where more is the point. Ambient is
 * an input and carries no verdict.
 */
function deltaColor(label: string, delta: number): string {
  if (nearlyEqual(delta, 0)) return 'var(--text-4)';
  if (label.includes('AMBIENT')) return 'var(--text-2)';
  const worse = label.includes('AUTONOMY') ? delta < 0 : delta > 0;
  return worse ? 'var(--act-soft)' : 'var(--ok-soft)';
}

function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  const abs = Math.abs(n);
  return abs >= 100 ? n.toFixed(0) : abs >= 10 ? n.toFixed(1) : n.toFixed(2);
}

function nearlyEqual(a: number, b: number): boolean {
  if (!isFinite(a) || !isFinite(b)) return a === b;
  return Math.abs(a - b) < 1e-6;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function clampAll(values: ScenarioValues): ScenarioValues {
  const out = { ...values };
  for (const param of PARAMETERS) {
    if (typeof out[param.key] === 'number') {
      out[param.key] = clamp(out[param.key], param.min, param.max);
    }
  }
  return out;
}

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
}
