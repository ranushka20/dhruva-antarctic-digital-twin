// OWNER: Dev B
// manifest — candidate scoring and manifest generation for /logistics.
//
// Scoring is rule-based and inspectable: urgency x criticality, both from the
// shared engine and both configurable on /settings. There is no ML demand
// forecast here and no claim of one.

import {
  type Manifest, type ManifestItem, type Voyage,
  scoreManifestCandidate,
} from '@/shared/contracts';
import { readStore, writeStore } from '@/lib/localStore';
import { appendAudit } from '@/lib/hashChain';
import { getParamValue } from '@/state/params';
import {
  getResources, getActiveVoyage, getFollowingVoyage, shipWindowDays,
  type DerivedResource,
} from '@/state/data';
import { currentActor } from '@/state/auth';
import type { StationFilter } from '@/state/stationScope';

export interface Candidate extends ManifestItem {
  name: string;
  unit: string;
  lsodDays: number | null;
  risk: DerivedResource['risk'];
  /** True when this item's LSOD falls before the FOLLOWING voyage. */
  atRiskIfDeferred: boolean;
}

const num = (v: unknown, fallback = 0) => (typeof v === 'number' && isFinite(v) ? v : fallback);

/**
 * How much of each resource this run should carry: enough to restore the
 * configured cover, never more. A negative shortfall means the station is
 * already covered and the item does not become a candidate.
 */
export function buildCandidates(filter: StationFilter = 'all', season?: string): Candidate[] {
  const horizonDays = getParamValue<number>('logistics.horizonDays');
  const targetCoverDays = getParamValue<number>('logistics.targetCoverDays');
  const following = getFollowingVoyage(season);

  return getResources(filter, season)
    .map<Candidate | null>((r) => {
      const burn = num(r.burnRate.value);
      const stock = num(r.stock.value);
      const shortfall = burn * targetCoverDays - stock;
      if (shortfall <= 0) return null;

      const quantity = Math.ceil(shortfall);
      const massKg = quantity * (r.massPerUnitKg ?? 1);
      const category = r.category ?? 'spares';
      // A resource whose LSOD cannot be computed is scored at the horizon —
      // it ranks low rather than vanishing, and the row says why.
      const lsodForScore = r.lsodDays ?? horizonDays;
      const score = scoreManifestCandidate(horizonDays, lsodForScore, category);
      const criticality = score > 0 ? score / Math.min(1, Math.max(0, (horizonDays - lsodForScore) / horizonDays)) : 0;

      const followingWindow = following ? shipWindowDays(r.stationId, following) : null;
      const atRiskIfDeferred =
        r.lsodDays !== null && followingWindow !== null && r.lsodDays < followingWindow.earliestDay;

      return {
        resourceId: r.id,
        stationId: r.stationId,
        name: r.name,
        unit: r.unit ?? r.stock.unit,
        quantity,
        massKg: Math.round(massKg),
        urgency: Math.min(1, Math.max(0, (horizonDays - lsodForScore) / horizonDays)),
        criticality: Number.isFinite(criticality) ? criticality : 0,
        score,
        included: false,
        manualOverride: false,
        lsodDays: r.lsodDays,
        risk: r.risk,
        atRiskIfDeferred,
      };
    })
    .filter((c): c is Candidate => c !== null)
    .sort((a, b) => b.score - a.score);
}

/** Greedy fill by score. Manual overrides are respected, and marked. */
export function fillCapacity(candidates: Candidate[], capacityKg: number): Candidate[] {
  let used = candidates
    .filter((c) => c.manualOverride && c.included)
    .reduce((s, c) => s + c.massKg, 0);

  return candidates.map((c) => {
    if (c.manualOverride) return c;
    if (used + c.massKg <= capacityKg) {
      used += c.massKg;
      return { ...c, included: true };
    }
    return { ...c, included: false };
  });
}

export function manifestTotals(candidates: Candidate[], capacityKg: number) {
  const carried = candidates.filter((c) => c.included);
  const deferred = candidates.filter((c) => !c.included);
  const totalMassKg = carried.reduce((s, c) => s + c.massKg, 0);
  return {
    carried,
    deferred,
    totalMassKg,
    remainingKg: capacityKg - totalMassKg,
    deferredAtRisk: deferred.filter((c) => c.atRiskIfDeferred).length,
    byStation: {
      bharati: carried.filter((c) => c.stationId === 'bharati').reduce((s, c) => s + c.massKg, 0),
      maitri: carried.filter((c) => c.stationId === 'maitri').reduce((s, c) => s + c.massKg, 0),
    },
  };
}

// ---- Persistence ------------------------------------------------------------

export function getManifests(voyageId?: string): Manifest[] {
  return readStore<Manifest[]>('hq', 'manifests', [])
    .filter((m) => !voyageId || m.voyageId === voyageId)
    .sort((a, b) => b.version - a.version);
}

export function getManifest(id: string): Manifest | undefined {
  return readStore<Manifest[]>('hq', 'manifests', []).find((m) => m.id === id);
}

/**
 * NFR-4.4 — generation is versioned and idempotent in the sense that
 * regenerating never edits a prior version: it creates a new one. The audit
 * entry for the new version is what an auditor follows.
 */
export async function generateManifest(
  voyage: Voyage,
  candidates: Candidate[],
  capacityKg: number
): Promise<Manifest> {
  const all = readStore<Manifest[]>('hq', 'manifests', []);
  const version = all.filter((m) => m.voyageId === voyage.id).length + 1;
  const totals = manifestTotals(candidates, capacityKg);
  const actor = currentActor();

  const items: ManifestItem[] = candidates.map((c) => ({
    resourceId: c.resourceId,
    stationId: c.stationId,
    quantity: c.quantity,
    massKg: c.massKg,
    urgency: c.urgency,
    criticality: c.criticality,
    score: c.score,
    included: c.included,
    manualOverride: c.manualOverride,
  }));

  const id = `man-${voyage.id}-v${version}`;
  const entry = await appendAudit({
    actor: actor.name,
    actorRole: actor.role,
    objectType: 'manifest',
    objectId: id,
    transition: 'GENERATED',
    payload: {
      voyage: voyage.id,
      version,
      carried: totals.carried.length,
      deferred: totals.deferred.length,
      totalMassKg: totals.totalMassKg,
      capacityKg,
      deferredAtRisk: totals.deferredAtRisk,
    },
    payloadSummary: `Manifest v${version} for ${voyage.name}`,
  });

  const manifest: Manifest = {
    id,
    voyageId: voyage.id,
    version,
    items,
    totalMassKg: totals.totalMassKg,
    capacityKg,
    deferredAtRisk: totals.deferredAtRisk,
    generatedAt: entry.at,
    generatedBy: actor.name,
    auditHash: entry.hash,
  };

  all.push(manifest);
  writeStore('hq', 'manifests', all);
  return manifest;
}

/** FR-4.6 — CSV export. Provenance travels with the numbers, always. */
export function manifestCsv(manifest: Manifest, candidates: Candidate[]): string {
  const byId = new Map(candidates.map((c) => [c.resourceId + c.stationId, c]));
  const header = [
    'rank', 'resource_id', 'resource', 'station', 'quantity', 'unit', 'mass_kg',
    'urgency', 'criticality', 'score', 'carried', 'manual_override', 'lsod_days', 'provenance',
  ].join(',');

  const rows = manifest.items
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((item, i) => {
      const c = byId.get(item.resourceId + item.stationId);
      return [
        i + 1,
        item.resourceId,
        JSON.stringify(c?.name ?? item.resourceId),
        item.stationId,
        item.quantity,
        c?.unit ?? '',
        item.massKg,
        item.urgency.toFixed(3),
        item.criticality.toFixed(3),
        item.score.toFixed(3),
        item.included ? 'yes' : 'deferred',
        item.manualOverride ? 'yes' : 'no',
        c?.lsodDays === null || c?.lsodDays === undefined ? 'cannot compute' : Math.round(c.lsodDays),
        'SYNTH',
      ].join(',');
    });

  const footer = [
    '',
    `# Manifest ${manifest.id} v${manifest.version}`,
    `# Generated ${manifest.generatedAt} by ${manifest.generatedBy}`,
    `# Audit hash ${manifest.auditHash}`,
    `# Total ${manifest.totalMassKg} kg of ${manifest.capacityKg} kg capacity`,
    `# ${manifest.deferredAtRisk} deferred item(s) have an LSOD before the following voyage`,
    '# Quantities derive from SYNTH stock and burn-rate figures — no station inventory feed is connected.',
  ].join('\n');

  return [header, ...rows].join('\n') + '\n' + footer + '\n';
}

export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { getActiveVoyage };
