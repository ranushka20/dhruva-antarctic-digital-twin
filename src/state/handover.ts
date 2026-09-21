// OWNER: Dev B
// handover — assembles the crew handover capsule from the platform's own
// records. Nothing is typed twice; §9 (outgoing crew notes) is the only
// free-text section.
//
// The goal in one line: the next crew inherits the station's operational
// memory instead of rebuilding it manually.

import type { HandoverSnapshot, SyncState } from '@/shared/contracts';
import { readStore, writeStore } from '@/lib/localStore';
import { appendAudit } from '@/lib/hashChain';
import { findSimilar, groupRecurring } from '@/engine/similarity';
import {
  getStationSummary, getActions, getResources, getObligations, getOutbox,
  type DerivedAction, type DerivedResource,
} from '@/state/data';
import { getLinkStats, getSyncInfo, type StationId } from '@/state/connectivity';
import { currentActor } from '@/state/auth';
import { getParamValue } from '@/state/params';
import { daysFromNow, formatDuration } from '@/lib/time';

export type SectionKey = HandoverSnapshot['sections'][number]['key'];

export const SECTION_TITLES: Record<SectionKey, string> = {
  state: 'Station state',
  actions: 'Open actions',
  recurring_faults: 'Recurring faults',
  incidents: 'Recent incidents',
  resources: 'Resource & autonomy',
  maintenance: 'Maintenance due',
  compliance: 'Pending compliance',
  comms: 'Comms & sync state',
  notes: 'Outgoing crew notes',
};

export const SECTION_ORDER: SectionKey[] = [
  'state', 'actions', 'recurring_faults', 'incidents', 'resources',
  'maintenance', 'compliance', 'comms', 'notes',
];

export interface Rotation {
  id: string;
  from: string;
  to: string;
  outgoingLead: string;
  incomingLead?: string;
}

export function getRotations(stationId: StationId): Rotation[] {
  const changeover = getParamValue<string>('stations.' + stationId + '.changeover');
  const end = new Date(changeover + 'T00:00:00.000Z');
  const start = new Date(end.getTime() - 180 * 86_400_000);
  const previousEnd = new Date(start.getTime() - 1 * 86_400_000);
  const previousStart = new Date(previousEnd.getTime() - 180 * 86_400_000);

  const leads: Record<StationId, [string, string]> = {
    bharati: ['R. Nair', 'P. Sharma'],
    maitri: ['V. Chandran', 'S. Banerjee'],
  };

  return [
    {
      id: stationId + '-current',
      from: start.toISOString(),
      to: end.toISOString(),
      outgoingLead: leads[stationId][0],
    },
    {
      id: stationId + '-previous',
      from: previousStart.toISOString(),
      to: previousEnd.toISOString(),
      outgoingLead: leads[stationId][1],
    },
  ];
}

export interface SectionPreview {
  key: SectionKey;
  title: string;
  itemCount: number;
  stale: boolean;
  lines: string[];
  /** Sections with zero items still appear — an empty section is information. */
  emptyNote?: string;
}

/**
 * FR-A2 — assembles every section from live platform data. A capsule
 * generated while the station is DARK still generates: sections built from
 * stale inputs are MARKED stale rather than omitted or silently trusted
 * (NFR-A2), and §8 states the gap.
 */
export function buildCapsule(stationId: StationId, rotation: Rotation): SectionPreview[] {
  const summary = getStationSummary(stationId);
  const sync = getSyncInfo(stationId);
  const stale = sync.state !== 'LIVE';
  const actions = getActions(stationId);
  const resources = getResources(stationId);
  const obligations = getObligations(stationId);
  const outbox = getOutbox().filter((r) => r.stationId === stationId);
  const stats = getLinkStats(stationId, 168);

  const rotationEndsIn = daysFromNow(rotation.to);
  const incomingRotationDays = 180;

  const sections: SectionPreview[] = [];

  // §1 Station state
  sections.push({
    key: 'state',
    title: SECTION_TITLES.state,
    itemCount: summary.zones.length,
    stale,
    lines: [
      `Crew on station: ${summary.crew}`,
      `Sync at generation: ${sync.state}, last contact ${formatDuration(sync.ageSeconds)} ago`,
      `Infrastructure: ${summary.domains.infrastructure.status} — ${summary.domains.infrastructure.summary}`,
      `Energy: ${summary.domains.energy.status} — ${summary.domains.energy.summary}`,
      `Logistics: ${summary.domains.logistics.status} — ${summary.domains.logistics.summary}`,
      `Environment: ${summary.domains.environment.status} — ${summary.domains.environment.summary}`,
      ...summary.zones.map((z) => `${z.code} ${z.name}: ${z.status}${z.openActionCount ? ` (${z.openActionCount} open)` : ''}`),
    ],
  });

  // §2 Open actions — deferrals carry reason AND review date (FR-A4)
  const open = actions.filter((a) => a.state !== 'RESOLVED');
  sections.push({
    key: 'actions',
    title: SECTION_TITLES.actions,
    itemCount: open.length,
    stale,
    lines: open.map(describeAction),
    emptyNote: 'No unresolved actions at generation time.',
  });

  // §3 Recurring faults — grouped, with occurrence counts (FR-A5)
  const corpus = actions.map((a) => ({
    id: a.id,
    text: `${a.title} ${a.reason} ${a.trigger.metricName} ${a.assetId ?? ''} ${a.zoneCode ?? ''}`,
  }));
  const byId = new Map(actions.map((a) => [a.id, a]));
  const groups = groupRecurring(corpus).filter((g) => g.members.length > 1);
  sections.push({
    key: 'recurring_faults',
    title: SECTION_TITLES.recurring_faults,
    itemCount: groups.length,
    stale,
    lines: groups.map((g) => {
      const rep = byId.get(g.representative.id)!;
      const resolutions = g.members
        .map((id) => byId.get(id)?.resolution?.note)
        .filter(Boolean);
      return `${rep.title} — ${g.members.length} occurrences` +
        (resolutions.length ? ` · resolutions: ${resolutions.join('; ')}` : ' · no resolution recorded yet');
    }),
    emptyNote: 'No fault recurred on the same asset within this rotation.',
  });

  // §4 Recent incidents
  const incidents = actions
    .filter((a) => a.resolution || a.tier === 'T0' || a.tier === 'T1')
    .slice(0, 10);
  sections.push({
    key: 'incidents',
    title: SECTION_TITLES.incidents,
    itemCount: incidents.length,
    stale,
    lines: incidents.map((a) =>
      `${a.tier} ${a.title} — ${a.state}` +
      (a.resolution ? ` · resolved: ${a.resolution.note}` : '') +
      (a.evidence.length ? ` · ${a.evidence.length} evidence item(s)` : ' · no evidence attached')
    ),
    emptyNote: 'No incidents recorded in this rotation.',
  });

  // §5 Resource & autonomy — flag what crosses a threshold in the INCOMING
  // rotation, which is the thing the next crew actually needs (FR-A7)
  sections.push({
    key: 'resources',
    title: SECTION_TITLES.resources,
    itemCount: resources.length,
    stale,
    lines: resources.map((r) => describeResource(r, rotationEndsIn, incomingRotationDays)),
  });

  // §6 Maintenance due
  const maintenance = actions.filter((a) => a.assetId && a.state !== 'RESOLVED');
  const spares = resources.filter((r) => r.category === 'spares');
  sections.push({
    key: 'maintenance',
    title: SECTION_TITLES.maintenance,
    itemCount: maintenance.length,
    stale,
    lines: [
      ...maintenance.map((a) => `${a.assetId}: ${a.title} (${a.state})`),
      ...spares.map((r) =>
        `Parts on station — ${r.name}: ${r.stock.value} ${r.unit}` +
        (r.belowReorder ? ' — BELOW minimum holding' : '')
      ),
      'Service schedules come from the maintenance register, which is not connected — treat this section as incomplete.',
    ],
    emptyNote: 'No asset-linked work outstanding.',
  });

  // §7 Pending compliance
  const pending = obligations.filter((o) => o.status !== 'submitted' && o.status !== 'future');
  sections.push({
    key: 'compliance',
    title: SECTION_TITLES.compliance,
    itemCount: pending.length,
    stale,
    lines: pending.map((o) =>
      `${o.name} — ${o.status.replace('_', ' ')}, due ${new Date(o.dueDate).toISOString().slice(0, 10)}, owner ${o.owner}`
    ),
    emptyNote: 'Nothing outstanding and nothing queued offline.',
  });

  // §8 Comms & sync state — states the gap explicitly (NFR-A2)
  sections.push({
    key: 'comms',
    title: SECTION_TITLES.comms,
    itemCount: outbox.length,
    stale: false,
    lines: [
      `Link uptime over the last 7 days: ${stats.uptimePct.toFixed(1)}%`,
      `Longest single gap: ${stats.longestGapSeconds > 0 ? formatDuration(stats.longestGapSeconds) : 'none'}`,
      `Records still unsynced: ${outbox.length}`,
      stale
        ? `Generated while the station was ${sync.state}. Every section above marked stale was built from state last confirmed ${formatDuration(sync.ageSeconds)} ago.`
        : 'Generated while the link was up — all sections built from current state.',
    ],
  });

  // §9 Notes — the only free-text section
  sections.push({
    key: 'notes',
    title: SECTION_TITLES.notes,
    itemCount: 0,
    stale: false,
    lines: [],
    emptyNote: 'The only section that is typed rather than assembled.',
  });

  return sections;
}

function describeAction(a: DerivedAction): string {
  const base = `${a.tier} ${a.title} — ${a.state}, ${formatDuration(a.ageSeconds)} old, owner ${a.assignee?.name ?? 'unassigned'}`;
  const consequence = a.consequenceLabel ? ` · ${a.consequenceLabel}` : '';
  const deferral = a.deferral
    ? ` · DEFERRED: ${a.deferral.reason} (review ${new Date(a.deferral.reviewDate).toISOString().slice(0, 10)})`
    : '';
  return base + consequence + deferral;
}

function describeResource(r: DerivedResource, rotationEndsInDays: number, incomingDays: number): string {
  const crossesIncoming =
    r.autonomyDays > rotationEndsInDays && r.autonomyDays <= rotationEndsInDays + incomingDays;
  return (
    `${r.name}: ${r.stock.value} ${r.unit}, burn ${r.burnRate.value}/day, ` +
    `autonomy ${Math.round(r.autonomyDays)} ±${Math.round(r.autonomyBandDays)} d, ` +
    `LSOD ${r.lsodDays === null ? 'cannot compute (stale or no voyage)' : Math.round(r.lsodDays) + ' d'}` +
    (crossesIncoming ? ' — CROSSES A THRESHOLD DURING THE INCOMING ROTATION' : '') +
    ' [SYNTH]'
  );
}

// ---------------------------------------------------------------------------
// Persistence — capsules are immutable, versioned and append-only (FR-A13)
// ---------------------------------------------------------------------------

export function getCapsules(stationId?: StationId): HandoverSnapshot[] {
  return readStore<HandoverSnapshot[]>('hq', 'capsules', [])
    .filter((c) => !stationId || c.stationId === stationId)
    .sort((a, b) => b.version - a.version);
}

export async function generateCapsule(
  stationId: StationId,
  rotation: Rotation,
  sections: SectionPreview[],
  included: Record<SectionKey, boolean>,
  notes: string
): Promise<HandoverSnapshot> {
  const all = readStore<HandoverSnapshot[]>('hq', 'capsules', []);
  const version = all.filter((c) => c.stationId === stationId).length + 1;
  const actor = currentActor();
  const sync = getSyncInfo(stationId);
  const id = `capsule-${stationId}-v${version}`;

  const entry = await appendAudit({
    actor: actor.name,
    actorRole: actor.role,
    objectType: 'handover',
    objectId: id,
    transition: 'GENERATED',
    payload: {
      stationId,
      rotation: rotation.id,
      version,
      sections: sections.filter((s) => included[s.key]).map((s) => s.key),
      syncState: sync.state,
    },
    payloadSummary: `Handover capsule v${version} — ${stationId}`,
  });

  const capsule: HandoverSnapshot = {
    id,
    version,
    stationId,
    rotation,
    generatedAt: entry.at,
    generatedBy: actor.name,
    syncStateAtGeneration: { state: sync.state as SyncState, lastSyncAt: sync.lastSyncAt },
    sections: sections.map((s) => ({
      key: s.key,
      included: included[s.key],
      itemCount: s.key === 'notes' ? (notes.trim() ? 1 : 0) : s.itemCount,
      stale: s.stale,
      items: s.key === 'notes' ? [notes] : s.lines,
    })),
    notes: notes.trim() ? { html: notes, attachments: [] } : undefined,
    auditHash: entry.hash,
    prevHash: entry.prevHash,
  };

  all.push(capsule);
  writeStore('hq', 'capsules', all);
  return capsule;
}

/** FR-A15 — the incoming lead marks the capsule received; that joins the chain. */
export async function acknowledgeCapsule(capsuleId: string, incomingLead: string): Promise<void> {
  const all = readStore<HandoverSnapshot[]>('hq', 'capsules', []);
  const capsule = all.find((c) => c.id === capsuleId);
  if (!capsule) return;
  const actor = currentActor();
  await appendAudit({
    actor: incomingLead,
    actorRole: actor.role,
    objectType: 'handover',
    objectId: capsuleId,
    transition: 'ACKNOWLEDGED',
    payload: { incomingLead, outgoingLead: capsule.rotation.outgoingLead },
    payloadSummary: `Capsule ${capsule.id} received by ${incomingLead}`,
  });
  capsule.acknowledgedAt = new Date().toISOString();
  capsule.acknowledgedBy = incomingLead;
  capsule.rotation = { ...capsule.rotation, incomingLead };
  writeStore('hq', 'capsules', all);
}

// ---------------------------------------------------------------------------
// Exports — every value keeps its provenance class (NFR-A3)
// ---------------------------------------------------------------------------

const PROVENANCE_PREAMBLE =
  'PROVENANCE NOTICE. Fuel, generator, inventory, maintenance and waste figures in this ' +
  'capsule are SYNTH — prototype placeholders awaiting station feeds that NCPOR has not ' +
  'shared. Environmental values are MODELED from the public station record (SCAR READER / ' +
  'AMRC / NCPOR NPDC). Autonomy, LSOD and margin are MODELED outputs of the documented ' +
  'coupling engine, computed from those inputs. No figure here is a confirmed station reading.';

export function capsuleMarkdown(capsule: HandoverSnapshot, sections: SectionPreview[]): string {
  const lines: string[] = [
    `# Handover capsule — ${capsule.stationId} v${capsule.version}`,
    '',
    `Generated ${capsule.generatedAt} by ${capsule.generatedBy}`,
    `Rotation ${capsule.rotation.from.slice(0, 10)} → ${capsule.rotation.to.slice(0, 10)}`,
    `Outgoing lead: ${capsule.rotation.outgoingLead}`,
    capsule.rotation.incomingLead ? `Incoming lead: ${capsule.rotation.incomingLead}` : '',
    `Sync at generation: ${capsule.syncStateAtGeneration.state}`,
    `Audit hash: ${capsule.auditHash}`,
    '',
    '> ' + PROVENANCE_PREAMBLE,
    '',
  ];

  capsule.sections.forEach((section, i) => {
    if (!section.included) return;
    const preview = sections.find((s) => s.key === section.key);
    lines.push(`## ${i + 1}. ${SECTION_TITLES[section.key]}${section.stale ? ' — STALE' : ''}`);
    lines.push('');
    if (section.itemCount === 0) {
      lines.push('_none_ — ' + (preview?.emptyNote ?? 'nothing recorded for this section.'));
    } else {
      (section.items as string[]).forEach((item) => lines.push('- ' + item));
    }
    lines.push('');
  });

  return lines.filter((l) => l !== undefined).join('\n');
}

export function capsuleJson(capsule: HandoverSnapshot): string {
  return JSON.stringify({ provenanceNotice: PROVENANCE_PREAMBLE, capsule }, null, 2);
}

export { findSimilar };
