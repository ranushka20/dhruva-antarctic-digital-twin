// OWNER: Dev B
// PAGE 10b — Settings & Parameters (/settings).
//
// THIS PAGE IS A CREDIBILITY FEATURE, NOT CONFIG.
//
// Most of the numbers behind this product's most impressive outputs — LSOD,
// autonomy, risk bands, SLA clocks, sync thresholds — rest on assumptions
// NCPOR has not confirmed. Burying them as constants would make every
// derived number unfalsifiable. Exposing them here, with value, unit, source
// and provenance, converts the biggest weakness into the honest claim:
// "the logic is real, the parameters are yours to set."

import { useCallback, useMemo, useState } from 'react';
import { Download, RotateCcw, AlertTriangle, Check } from 'lucide-react';
import type { Parameter } from '@/shared/contracts';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Modal } from '@/components/shared/Modal';
import {
  getParameters, setParamValue, resetParam, exportParametersJSON,
  unconfirmedParameters, withSandboxParams, ParamRangeError, type ParamScope,
} from '@/state/params';
import { getResources, getActiveVoyage, deriveResource } from '@/state/data';
import { downloadText } from '@/state/manifest';
import { reseed } from '@/state/bootstrap';
import { appendAudit, refreshChainStatus } from '@/lib/hashChain';
import { useStoreValue } from '@/state/useStore';
import { currentActor, useCan, DEMO_ACCOUNTS, ROLE_LABEL } from '@/state/auth';
import { formatShortIST } from '@/lib/time';
import { ActiveIndicator } from '@/components/shared/ActiveIndicator';
import { AsyncButton } from '@/components/shared/AsyncButton';

type Group = Parameter['group'];

const GROUPS: { id: Group; label: string }[] = [
  { id: 'logistics', label: 'Logistics' },
  { id: 'energy', label: 'Energy' },
  { id: 'thermal', label: 'Thermal' },
  { id: 'sync', label: 'Sync' },
  { id: 'sla', label: 'SLA' },
  { id: 'thresholds', label: 'Thresholds' },
  { id: 'stations', label: 'Stations' },
  { id: 'users', label: 'Users' },
  { id: 'sources', label: 'Data sources' },
];

const SCOPES: { id: ParamScope; label: string }[] = [
  { id: 'global', label: 'Global' },
  { id: 'bharati', label: 'Bharati' },
  { id: 'maitri', label: 'Maitri' },
];

export default function SettingsPage() {
  const [group, setGroup] = useState<Group>('logistics');
  const [scope, setScope] = useState<ParamScope>('global');
  const [unconfirmedOnly, setUnconfirmedOnly] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<
    { param: Parameter; next: number | string | boolean; changes: ImpactChange[] } | null
  >(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const actor = currentActor();
  const canWrite = useCan('settings.write');

  const all = useStoreValue(useCallback(() => getParameters(scope), [scope]));
  const unconfirmed = useStoreValue(useCallback(() => unconfirmedParameters(scope), [scope]));

  const rows = useMemo(
    () => all.filter((p) => p.group === group && (!unconfirmedOnly || p.provenance === 'SYNTH')),
    [all, group, unconfirmedOnly]
  );

  const dirty = Object.keys(drafts).length > 0;

  const commit = async (param: Parameter, raw: string | boolean) => {
    try {
      const next = typeof param.default === 'boolean' ? Boolean(raw) : raw;
      const { previous, next: applied } = setParamValue(param.key, scope, next as never, actor.name);
      // FR-B13: a parameter change is an operational decision, so it is traceable.
      await appendAudit({
        actor: actor.name,
        actorRole: actor.role,
        objectType: 'parameter',
        objectId: param.key,
        transition: 'CHANGED',
        payload: { scope, from: previous, to: applied, label: param.label },
        payloadSummary: `${param.label} ${previous} → ${applied}`,
      });
      setDrafts((d) => { const n = { ...d }; delete n[param.key]; return n; });
      setErrors((e) => { const n = { ...e }; delete n[param.key]; return n; });
      setPreview(null);
      setToast(`${param.label} saved and appended to the audit chain.`);
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      // NFR-B5: rejected with the valid range and its source. Never clamped.
      setErrors((cur) => ({
        ...cur,
        [param.key]: e instanceof ParamRangeError || e instanceof Error ? e.message : 'Invalid value',
      }));
    }
  };

  const groupLabel = GROUPS.find((g) => g.id === group)?.label ?? group;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- Title row ---- */}
      <div className="flex items-center gap-x-5 gap-y-3 flex-wrap px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <h1 className="text-display font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          Settings &amp; Parameters
        </h1>

        <div
          data-segmented
          role="group"
          aria-label="Parameter scope"
          className="relative isolate flex items-center gap-1 p-1 rounded-full"
          style={{ border: '1px solid var(--line-strong)' }}
        >
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              aria-pressed={scope === s.id}
              className="px-4 min-h-9 rounded-full text-body-sm font-medium"
              style={{
                color: scope === s.id ? 'var(--bg)' : 'var(--text-3)',
              }}
            >
              {s.label}
            </button>
          ))}
          <ActiveIndicator className="rounded-full" style={{ backgroundColor: 'var(--text)' }} />
        </div>

        <button
          type="button"
          onClick={() => setUnconfirmedOnly((v) => !v)}
          aria-pressed={unconfirmedOnly}
          className="inline-flex items-center gap-2 px-4 min-h-9 rounded-full text-body-sm font-medium"
          style={{
            border: `1px ${unconfirmedOnly ? 'solid' : 'dashed'} ${unconfirmedOnly ? 'var(--watch)' : 'var(--line-strong)'}`,
            color: unconfirmedOnly ? 'var(--watch-soft)' : 'var(--text-2)',
            backgroundColor: unconfirmedOnly ? 'rgba(217,164,65,0.10)' : 'transparent',
            fontFamily: 'var(--font-body)',
          }}
          title="Show only parameters still awaiting NCPOR confirmation (SYNTH)"
        >
          {unconfirmedOnly && <Check size={16} aria-hidden />}
          <span>
            <span className="font-mono tabular-nums">{unconfirmed.length}</span> of{' '}
            <span className="font-mono tabular-nums">{all.length}</span> not yet confirmed
          </span>
        </button>

        {dirty && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-body-sm"
            style={{ border: '1px dashed var(--watch)', color: 'var(--watch-soft)' }}>
            Unsaved changes
          </span>
        )}

        <button
          type="button"
          onClick={() => downloadText('antarasetu-parameters.json', exportParametersJSON(), 'application/json')}
          className="flex items-center gap-2 ml-auto px-4 min-h-9 rounded-full text-body-sm font-medium hover:bg-[var(--panel-alt)]"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
        >
          <Download size={16} aria-hidden /> Export JSON
        </button>
      </div>

      {toast && (
        <div key={toast} className="m-toast px-6 py-3 shrink-0" role="status"
          style={{ backgroundColor: 'rgba(79,174,133,0.10)', borderBottom: '1px solid var(--ok)' }}>
          <span className="text-body" style={{ color: 'var(--ok-soft)' }}>{toast}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-5 px-6 py-5">
        {/* ---- Section rail ---- */}
        <nav data-segmented className="relative isolate flex lg:flex-col gap-1 lg:w-[12rem] lg:shrink-0 overflow-x-auto" aria-label="Parameter groups">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroup(g.id)}
              aria-pressed={group === g.id}
              className="px-4 py-2 text-left text-body shrink-0 min-h-10 whitespace-nowrap"
              style={{
                border: '1px solid transparent',
                borderRadius: 'var(--r-inner)',
                color: group === g.id ? 'var(--text)' : 'var(--text-3)',
                fontWeight: group === g.id ? 500 : 400,
              }}
            >
              {g.label}
            </button>
          ))}
          <ActiveIndicator
            style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-inner)' }}
          />
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="flex items-center gap-2 px-4 py-2 lg:mt-4 text-left text-body-sm shrink-0 min-h-9 whitespace-nowrap hover:bg-[var(--panel-alt)]"
            style={{ border: '1px dashed var(--line-strong)', borderRadius: 'var(--r-inner)', color: 'var(--text-3)' }}
          >
            <RotateCcw size={16} aria-hidden /> Reset demo data
          </button>
        </nav>

        {/* ---- Parameter rows ---- */}
        <section
          className="flex-1 min-w-0 min-h-0 overflow-y-auto p-5"
          style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
        >
          <div key={group} className="m-panel">
          <div className="flex items-baseline gap-x-4 gap-y-1 flex-wrap mb-4">
            <h2 className="text-title font-semibold" style={{ color: 'var(--text)' }}>{groupLabel}</h2>
            {group !== 'users' && (
              <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
                Change a value and click away to save. Changes that move an order-by date show their impact first.
              </p>
            )}
          </div>
          {group === 'users' ? (
            <UsersGroup />
          ) : rows.length === 0 ? (
            <EmptyState reason="No parameters in this group match the filter." />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {rows.map((param) => (
                <ParameterRow
                  key={param.key}
                  param={param}
                  scope={scope}
                  canWrite={canWrite}
                  draft={drafts[param.key]}
                  error={errors[param.key]}
                  onDraft={(v) => setDrafts((d) => ({ ...d, [param.key]: v }))}
                  onPreview={(next) =>
                    setPreview({ param, next, changes: computeImpact(param.key, next) })
                  }
                  onCommit={(v) => { void commit(param, v); }}
                  onReset={() => {
                    resetParam(param.key, scope);
                    setDrafts((d) => { const n = { ...d }; delete n[param.key]; return n; });
                  }}
                />
              ))}
            </ul>
          )}
          </div>
        </section>
      </div>

      {/* ---- Live impact preview (FR-B12) ---- */}
      <ImpactPreview
        preview={preview}
        onCancel={() => setPreview(null)}
        onConfirm={() => { if (preview) void commit(preview.param, preview.next as never); }}
      />

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset demo data">
        <p className="text-body mb-5 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
          This rebuilds both local stores — actions, resources, outbox, waste ledger and the audit
          chain — from the seed. Your parameter overrides and your sign-in are kept. Anything you
          recorded during this session is discarded.
        </p>
        <AsyncButton
          onClick={async () => {
            await reseed();
            await refreshChainStatus('hq');
            setResetOpen(false);
            setToast('Demo data rebuilt and the chain re-verified.');
            setTimeout(() => setToast(null), 4000);
          }}
          pendingLabel="Rebuilding…"
          doneLabel={null}
          className="w-full inline-flex items-center justify-center py-2.5 rounded-full text-body font-semibold min-h-10"
          style={{ backgroundColor: 'var(--act)', color: 'var(--bg)' }}
        >
          Rebuild demo data
        </AsyncButton>
      </Modal>
    </div>
  );
}

function ParameterRow({
  param, scope, canWrite, draft, error, onDraft, onPreview, onCommit, onReset,
}: {
  param: Parameter;
  scope: ParamScope;
  canWrite: boolean;
  draft: string | undefined;
  error: string | undefined;
  onDraft: (v: string) => void;
  onPreview: (next: number | string | boolean) => void;
  onCommit: (v: string | boolean) => void;
  onReset: () => void;
}) {
  const isBool = typeof param.default === 'boolean';
  const isNumber = typeof param.default === 'number';
  const value = draft ?? String(param.value);
  const changed = String(param.value) !== String(param.default);

  // A change that moves an engine input gets a preview before it is saved.
  const affectsEngine = param.usedBy.some((f) =>
    ['computeLSOD', 'computeAutonomy', 'computeFuelBurn', 'computeEnergyDemand', 'computeHDD', 'computeHeatLoss', 'computeRisk'].includes(f)
  );

  const inputId = 'param-' + param.key.replace(/\W+/g, '-');

  return (
    <li
      className="px-4 py-3"
      style={{
        backgroundColor: 'var(--panel-raised)',
        borderRadius: 'var(--r-inner)',
        borderLeft: param.overriddenFromGlobal ? '3px solid var(--watch)' : '3px solid transparent',
      }}
    >
      <div className="flex flex-col xl:flex-row xl:items-center gap-x-6 gap-y-3">
        {/* Plain label first; the code identifier is developer detail. */}
        <div className="min-w-0 flex-1">
          <label htmlFor={isBool ? undefined : inputId} className="block text-body font-medium" style={{ color: 'var(--text)' }}>
            {param.label}
          </label>

          <p className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-1 text-body-sm" style={{ color: 'var(--text-3)' }}>
            <span>Source: <span style={{ color: 'var(--text-2)' }}>{param.source}</span></span>
            <span>Default <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{String(param.default)}</span></span>
            {param.lastChangedBy && (
              <span>
                Last changed by <span style={{ color: 'var(--text-2)' }}>{param.lastChangedBy}</span>
                {param.lastChangedAt && (
                  <> <span className="font-mono tabular-nums">{formatShortIST(param.lastChangedAt)}</span></>
                )}
              </span>
            )}
            {param.overriddenFromGlobal && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-body-sm capitalize"
                style={{ border: '1px solid var(--watch)', color: 'var(--watch-soft)' }}>
                Overridden for {scope}
              </span>
            )}
          </p>

          <p className="font-mono text-caption mt-1 break-all" style={{ color: 'var(--text-3)' }}>
            {param.key}
            {param.usedBy.length > 0 && ' · used by ' + param.usedBy.join(', ')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          {isBool ? (
            <div
              data-segmented
              role="group"
              aria-label={param.label}
              className="relative isolate flex items-center p-1 rounded-full"
              style={{ border: '1px solid var(--line-strong)', opacity: canWrite ? 1 : 0.4 }}
            >
              <button
                type="button"
                disabled={!canWrite}
                aria-pressed={Boolean(param.value)}
                onClick={() => { if (!param.value) onCommit(!param.value); }}
                className="px-4 min-h-9 rounded-full text-body-sm font-medium"
                style={{ color: param.value ? 'var(--ok-soft)' : 'var(--text-3)' }}
              >
                On
              </button>
              <button
                type="button"
                disabled={!canWrite}
                aria-pressed={!param.value}
                onClick={() => { if (param.value) onCommit(!param.value); }}
                className="px-4 min-h-9 rounded-full text-body-sm font-medium"
                style={{ color: param.value ? 'var(--text-3)' : 'var(--text)' }}
              >
                Off
              </button>
              <ActiveIndicator
                className="rounded-full"
                style={{
                  backgroundColor: param.value ? 'rgba(79,174,133,0.16)' : 'var(--panel-alt)',
                  boxShadow: param.value ? 'inset 0 0 0 1px rgba(79,174,133,0.55)' : 'inset 0 0 0 1px var(--line-strong)',
                }}
              />
            </div>
          ) : (
            <input
              id={inputId}
              type={isNumber ? 'number' : 'text'}
              value={value}
              disabled={!canWrite}
              onChange={(e) => onDraft(e.target.value)}
              onBlur={() => {
                if (draft === undefined || draft === String(param.value)) return;
                if (affectsEngine && isNumber) onPreview(Number(draft));
                else onCommit(draft);
              }}
              className="w-32 h-10 px-3 font-mono text-body tabular-nums outline-none"
              style={{
                backgroundColor: 'var(--panel)', border: `1px solid ${error ? 'var(--act)' : 'var(--line-strong)'}`,
                borderRadius: 'var(--r-inner)', color: 'var(--text)', opacity: canWrite ? 1 : 0.5,
              }}
              aria-label={param.label}
            />
          )}

          <span className="font-mono text-body-sm min-w-[3rem]" style={{ color: 'var(--text-3)' }}>{param.unit ?? ''}</span>

          <ProvenanceBadge
            measurement={{
              value: typeof param.value === 'boolean' ? String(param.value) : param.value,
              unit: param.unit ?? '',
              timestamp: param.lastChangedAt ?? new Date().toISOString(),
              source: param.source,
              provenance: param.provenance,
              freshnessSeconds: 0,
              awaiting: param.provenance === 'SYNTH' ? 'NCPOR confirmation' : undefined,
            }}
            label={param.label}
          />

          {changed && (
            <button
              type="button"
              disabled={!canWrite}
              onClick={onReset}
              title={`Shipped default: ${String(param.default)}`}
              className="text-body-sm font-medium px-4 min-h-9 rounded-full hover:bg-[var(--panel-alt)]"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)', opacity: canWrite ? 1 : 0.4 }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-body-sm mt-2.5" style={{ color: 'var(--act-soft)' }} role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

interface ImpactChange {
  id: string;
  name: string;
  beforeLsod: number | null;
  afterLsod: number | null;
}

/**
 * FR-B12 / NFR-B3 — computed by the SAME pure engine the rest of the app
 * uses, on the raw resource facts, not an approximation. `withSandboxParams`
 * swaps the candidate value in memory only, so the preview can be trusted
 * before saving and leaves nothing behind for other views to see.
 */
export function computeImpact(paramKey: string, next: number | string | boolean): ImpactChange[] {
  const voyage = getActiveVoyage();
  const before = getResources('all');
  const after = withSandboxParams({ [paramKey]: next }, () =>
    before.map((r) => deriveResource(r, voyage))
  );
  return before
    .map((r, i) => ({
      id: r.id,
      name: r.name,
      beforeLsod: r.lsodDays,
      afterLsod: after[i]?.lsodDays ?? null,
    }))
    .filter((c) => Math.round(c.beforeLsod ?? -1) !== Math.round(c.afterLsod ?? -1));
}


function ImpactPreview({
  preview, onCancel, onConfirm,
}: {
  preview: { param: Parameter; next: number | string | boolean; changes: ImpactChange[] } | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!preview) return null;
  const changes = preview.changes;

  return (
    <Modal open onClose={onCancel} title={'Impact — ' + preview.param.label}>
      <p className="text-body mb-4 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
        Changing <span className="font-medium" style={{ color: 'var(--text)' }}>{preview.param.label}</span> from{' '}
        <span className="font-mono tabular-nums" style={{ color: 'var(--text)' }}>{String(preview.param.value)}</span> to{' '}
        <span className="font-mono tabular-nums" style={{ color: 'var(--text)' }}>{String(preview.next)}</span> changes the Last Safe Order Date
        for <span className="font-mono tabular-nums" style={{ color: 'var(--text)' }}>{changes.length}</span> resource
        {changes.length === 1 ? '' : 's'}.
      </p>

      {changes.length === 0 ? (
        <p className="text-body-sm mb-5 px-4 py-3" style={{ color: 'var(--text-3)', backgroundColor: 'var(--panel-raised)', borderRadius: 'var(--r-inner)' }}>
          No Last Safe Order Date moves by a whole day. The parameter still changes the underlying
          figures — this preview reports only whole-day deadline shifts.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3 px-4 pb-2 text-body-sm" style={{ color: 'var(--text-3)' }}>
            <span className="flex-1">Resource</span>
            <span>Days left to order: now → after</span>
          </div>
          <ul className="flex flex-col gap-1.5 mb-5 max-h-64 overflow-y-auto">
            {changes.map((change) => (
              <li key={change.id} className="flex items-center gap-3 px-4 py-2.5"
                style={{ backgroundColor: 'var(--panel-raised)', borderRadius: 'var(--r-inner)' }}>
                <span className="text-body flex-1 min-w-0" style={{ color: 'var(--text)' }}>
                  {change.name}
                </span>
                <span className="font-mono text-body tabular-nums" style={{ color: 'var(--text-3)' }}>
                  {change.beforeLsod === null ? '—' : Math.round(change.beforeLsod)}
                </span>
                <span style={{ color: 'var(--text-3)' }} aria-hidden>→</span>
                <span
                  className="font-mono text-body tabular-nums"
                  style={{
                    color: (change.afterLsod ?? 0) < (change.beforeLsod ?? 0) ? 'var(--act-soft)' : 'var(--ok-soft)',
                  }}
                >
                  {change.afterLsod === null ? '—' : Math.round(change.afterLsod)} d
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-full text-body font-medium min-h-10 hover:bg-[var(--panel-alt)]"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 py-2 rounded-full text-body font-semibold min-h-10"
          style={{ backgroundColor: 'var(--act)', color: 'var(--bg)' }}
        >
          Save and record
        </button>
      </div>
    </Modal>
  );
}

/** FR-B10 — users and roles. Accounts are provisioned; no self-service. */
function UsersGroup() {
  return (
    <div>
      <div className="flex items-start gap-3 px-4 py-3 mb-4"
        style={{ backgroundColor: 'rgba(217,164,65,0.10)', border: '1px solid rgba(217,164,65,0.35)', borderRadius: 'var(--r-inner)' }}>
        <AlertTriangle size={18} style={{ color: 'var(--watch)' }} className="mt-0.5 shrink-0" aria-hidden />
        <p className="text-body-sm max-w-[70ch]" style={{ color: 'var(--watch-soft)' }}>
          This build is frontend-only: the token is issued and verified in the browser and
          role-gating is UI-level. Accounts are provisioned here, not registered, and nothing
          below is a security boundary.
        </p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {DEMO_ACCOUNTS.map((a) => (
          <li key={a.username} className="flex items-center gap-x-4 gap-y-2 flex-wrap px-4 py-3"
            style={{ backgroundColor: 'var(--panel-raised)', borderRadius: 'var(--r-inner)' }}>
            <span className="flex-1 min-w-0">
              <span className="block text-body font-medium" style={{ color: 'var(--text)' }}>{a.name}</span>
              <span className="block font-mono text-body-sm mt-0.5" style={{ color: 'var(--text-3)' }}>@{a.username}</span>
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-body-sm"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}>
              {ROLE_LABEL[a.role]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
