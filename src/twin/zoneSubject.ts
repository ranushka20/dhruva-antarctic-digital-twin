// OWNER: Dev A
// zoneSubject — which "Why this matters" story a zone tells.
//
// The twin's zone inspector and the Action Centre drawer both show a zone's
// story, and touchpoint #10 says they must show the same numbers for it. They
// can only do that if they ask the same question, so this is the one place
// that decides a zone's engine profile and status. Both pages then render
// <ZoneTrace input={causalTraceInput(stationId)} subject={zoneSubject(...)} />.

import type { ZoneStatus } from '@/shared/contracts';
import type { ZoneTraceProfile } from '@/engine/zoneTrace';
import { zoneTraceProfile } from '@/twin/roomProfiles';
import bharati from '@/mock/bharati.json';
import maitri from '@/mock/maitri.json';

export interface ZoneSubject {
  name: string;
  status: ZoneStatus;
  trace?: ZoneTraceProfile;
}

type MockZone = { code: string; name: string; status: string; trace?: ZoneTraceProfile };

export function zoneSubject(stationId: 'bharati' | 'maitri', zoneCode: string): ZoneSubject | undefined {
  const zones = (stationId === 'bharati' ? bharati.zones : maitri.zones) as MockZone[];
  const zone = zones.find((z) => z.code === zoneCode);
  if (!zone) return undefined;
  return {
    name: zone.name,
    status: zone.status as ZoneStatus,
    // Bharati's zones are the sum of their rooms in the 3D model; Maitri has
    // no room model, so its zones carry their own profile in mock/maitri.json.
    trace: stationId === 'bharati' ? zoneTraceProfile(zoneCode) : zone.trace,
  };
}
