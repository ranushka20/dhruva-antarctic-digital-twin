// OWNER: Dev B
// PAGE 4 — Logistics & Resupply (/logistics).
//
// "Can each station sustain itself until the next feasible resupply, and if
// not, what do we load first?"
//
// The page leads with the ANSWER — how many resources need ordering, when the
// ship goes, how full the manifest is — and puts the instrument underneath.
// An earlier version stacked a full-width Gantt, a ten-column ledger, a
// voyage card and the whole ranked manifest list on one screen: four panels
// showing the same thirteen resources from four angles. That is a lot to
// read before you can act. Now it is one answer strip and one table, with
// the full manifest builder one click away on its own route.

import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Ship, Pencil, ArrowRight } from 'lucide-react';
import { ResupplyTable } from './ResupplyTable';
import { VoyageEditor } from './VoyageEditor';
import { useActionTransitions } from '@/shared/contracts';
import {
  getResources, getActiveVoyage, getSeasons, type DerivedResource,
} from '@/state/data';
import { buildCandidates, fillCapacity, manifestTotals } from '@/state/manifest';
import { useStoreValue, useTick } from '@/state/useStore';
import { getParamValue } from '@/state/params';
import { STATION_LABEL, type StationFilter } from '@/state/stationScope';
import { currentActor, useCan } from '@/state/auth';
import { formatDateIST, daysFromNow } from '@/lib/time';
import { ActiveIndicator } from '@/components/shared/ActiveIndicator';

const SCOPES: { id: StationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bharati', label: 'Bharati' },
  { id: 'maitri', label: 'Maitri' },
];

export default function LogisticsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [scope, setScope] = useState<StationFilter>('all');
  const [season, setSeason] = useState<string | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('resource'));
  const [editingVoyage, setEditingVoyage] = useState(false);

  useTick(60_000);

  const actor = currentActor();
  const canEditVoyage = useCan('logistics.manifest');
  const canRaise = useCan('action.transition');
  const transitions = useActionTransitions('hq', { name: actor.name, role: actor.role });

  const seasons = useStoreValue(getSeasons);
  const activeSeason = season ?? seasons[0];
  const voyage = useStoreValue(useCallback(() => getActiveVoyage(activeSeason), [activeSeason]));
  const resources = useStoreValue(useCallback(() => getResources(scope, activeSeason), [scope, activeSeason]));

  const horizonDays = getParamValue<number>('logistics.horizonDays');
  const warningDays = getParamValue<number>('logistics.lsodWarningDays');
  const capacityKg = getParamValue<number>('logistics.capacityMaxKg');

  const seed = useStoreValue(useCallback(() => buildCandidates(scope, activeSeason), [scope, activeSeason]));
  const seedKey = seed.map((c) => `${c.resourceId}:${c.massKg}`).join('|');
  const totals = useMemo(
    () => manifestTotals(fillCapacity(seed, capacityKg), capacityKg),
    // seedKey stands in for seed's contents — seed is a fresh array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seedKey, capacityKg]
  );

  // "Nothing is within 14 days of its order-by date" is true here and still
  // the wrong headline: two Maitri resources will not last until the ship
  // arrives at all. The tile leads with what is actually at risk and keeps
  // the order-by count as the supporting line.
  const atRisk = resources.filter((r) => r.risk === 'critical' || r.risk === 'warning').length;
  const orderSoon = resources.filter((r) => r.lsodDays !== null && r.lsodDays <= warningDays).length;
  const unreachable = resources.filter((r) => r.lsodUnavailableReason === 'stale').length;
  const departsInDays = voyage ? Math.round(daysFromNow(voyage.departureWindow.from)) : null;

  const selectResource = (id: string | null) => {
    setSelectedId(id);
    const params = new URLSearchParams(searchParams);
    if (id) params.set('resource', id); else params.delete('resource');
    setSearchParams(params, { replace: true });
  };

  /**
   * Touchpoint #6 — pre-fills the resource, the consequence and the LSOD,
   * then routes to the new action. Nothing is retyped, and the consequence
   * comes from the same engine the bar above it is drawn from.
   */
  const raiseAction = async (resource: DerivedResource) => {
    const tier = resource.lsodDays !== null && resource.lsodDays <= warningDays ? 'T1' : 'T2';
    const id = await transitions.raise({
      stationId: resource.stationId,
      tier,
      title: `${resource.name} — order before the last safe date`,
      reason:
        resource.lsodDays === null
          ? `${resource.name} cannot be given a Last Safe Order Date: ${STATION_LABEL[resource.stationId]} inputs are stale.`
          : `${resource.name} must be ordered within ${Math.round(resource.lsodDays)} days to arrive before depletion.`,
      trigger: {
        metricName: resource.name + ' stock',
        measurement: resource.stock,
        threshold: resource.reorderPoint !== undefined
          ? { value: resource.reorderPoint, unit: resource.unit ?? '', label: 'reorder point' }
          : undefined,
      },
      consequence: resource.lsodDays !== null
        ? {
            kind: 'lsod',
            before: Math.round(resource.autonomyDays),
            after: Math.round(resource.lsodDays),
            unit: 'd',
            label: `LSOD in ${Math.round(resource.lsodDays)} d`,
          }
        : undefined,
      resourceId: resource.id,
    } as Parameters<typeof transitions.raise>[0]);
    navigate('/actions/' + id);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- Header: title, scope, season. Nothing else. ---- */}
      <div className="flex items-center gap-x-5 gap-y-3 flex-wrap px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <h1 className="text-display font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          Logistics &amp; Resupply
        </h1>

        <div
          data-segmented
          role="group"
          aria-label="Which station to show"
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

        <label className="flex items-center gap-3 ml-auto">
          <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>
            Season
          </span>
          <select
            value={activeSeason ?? ''}
            onChange={(e) => setSeason(e.target.value)}
            className="px-4 min-h-9 font-mono text-body-sm outline-none"
            style={{
              backgroundColor: 'var(--panel)', border: '1px solid var(--line-strong)',
              borderRadius: 'var(--r-pill)', color: 'var(--text)',
            }}
          >
            {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-5 max-w-[100rem] mx-auto">

          {/* ---- The answer, in three cards ---- */}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Tile
              label="Resources at risk"
              value={String(atRisk)}
              unit={`of ${resources.length} tracked`}
              tone={atRisk > 0 ? 'act' : 'ok'}
              note={
                atRisk > 0
                  ? 'Even in the worst case, these will not last until the ship arrives — or they must be ordered soon.'
                  : 'Every resource lasts beyond the next resupply, even in the worst case.'
              }
              footer={[
                orderSoon > 0 ? `${orderSoon} must be ordered within ${warningDays} days` : null,
                unreachable > 0 ? `${unreachable} cannot be dated — the station has not reported recently` : null,
              ].filter((f): f is string => Boolean(f))}
            />

            <Tile
              label="Next resupply ship"
              value={voyage ? String(departsInDays) : '—'}
              unit={voyage ? 'days until departure' : 'no voyage planned'}
              tone="default"
              icon={<Ship size={16} />}
              note={voyage ? voyage.name : 'Days of supply still compute; there is just no ship date to measure against.'}
              meta={voyage ? `Departs ${formatDateIST(voyage.departureWindow.from)}` : undefined}
              action={
                voyage && canEditVoyage
                  ? { label: 'Edit arrival dates', icon: <Pencil size={14} />, onClick: () => setEditingVoyage(true) }
                  : undefined
              }
            />

            <Tile
              label="Cargo manifest"
              value={totals.totalMassKg.toLocaleString()}
              unit={`kg of ${capacityKg.toLocaleString()} kg`}
              tone={totals.deferredAtRisk > 0 ? 'act' : 'ok'}
              note={`${totals.carried.length} items loaded, ${totals.deferred.length} held for a later ship.`}
              footer={
                totals.deferredAtRisk > 0
                  ? [`${totals.deferredAtRisk} held item${totals.deferredAtRisk === 1 ? '' : 's'} will run out before the following ship.`]
                  : undefined
              }
              action={
                voyage
                  ? {
                      label: 'Open manifest builder',
                      icon: <ArrowRight size={14} />,
                      onClick: () => navigate('/logistics/manifest/' + voyage.id),
                    }
                  : undefined
              }
            />
          </div>

          {/* ---- The instrument ---- */}
          <ResupplyTable
            resources={resources}
            voyage={voyage}
            horizonDays={horizonDays}
            selectedId={selectedId}
            onSelect={selectResource}
            onRaiseAction={(r) => { void raiseAction(r); }}
            canRaise={canRaise}
          />
        </div>
      </div>

      {voyage && (
        <VoyageEditor
          open={editingVoyage}
          voyage={voyage}
          onClose={() => setEditingVoyage(false)}
          onSaved={() => setEditingVoyage(false)}
        />
      )}
    </div>
  );
}

interface TileAction { label: string; icon: React.ReactNode; onClick: () => void }

function Tile({
  label, value, unit, tone, note, meta, footer, icon, action,
}: {
  label: string;
  value: string;
  unit: string;
  tone: 'default' | 'ok' | 'act';
  note: string;
  meta?: string;
  footer?: string[];
  icon?: React.ReactNode;
  action?: TileAction;
}) {
  const valueColor = tone === 'act' ? 'var(--act-soft)' : 'var(--text)';

  return (
    <section
      className="flex flex-col p-5"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        {icon && <span style={{ color: 'var(--text-3)' }} aria-hidden>{icon}</span>}
        <h2 className="text-title font-medium" style={{ color: 'var(--text)' }}>
          {label}
        </h2>
      </div>

      <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap mb-3">
        <span
          className="font-mono text-display font-semibold leading-none tabular-nums"
          style={{ color: valueColor }}
        >
          {value}
        </span>
        <span className="text-body" style={{ color: 'var(--text-3)' }}>{unit}</span>
      </div>

      <p className="text-body-sm max-w-[60ch]" style={{ color: 'var(--text-2)' }}>{note}</p>

      {meta && (
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-3)' }}>{meta}</p>
      )}

      {footer && footer.length > 0 && (
        <ul className="flex flex-col gap-1 mt-2.5">
          {footer.map((f) => (
            <li key={f} className="text-body-sm" style={{ color: 'var(--act-soft)' }}>{f}</li>
          ))}
        </ul>
      )}

      {action && (
        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={action.onClick}
            className="w-full flex items-center justify-center gap-2 px-5 rounded-full text-body-sm font-medium min-h-10 hover:bg-[var(--panel-alt)]"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
          >
            {action.label} {action.icon}
          </button>
        </div>
      )}
    </section>
  );
}
