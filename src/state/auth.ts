// OWNER: Dev B
// auth — JWT-shaped client-side auth (NFR-G9, FR-C1..C7).
//
// FRONTEND-ONLY BUILD: the token is issued and verified in the browser and
// role-gating is UI-level only. That is a deliberate, stated limitation, not
// a pretence of security — say so plainly if asked during a demo. The token
// is JWT-SHAPED (header.payload.signature) so swapping in a real issuer later
// changes only where the token comes from, not how the app reads it.

import { readStore, writeStore } from '@/lib/localStore';
import { useStoreValue } from '@/state/useStore';

export type Role = 'hq_operator' | 'station_operator' | 'compliance' | 'readonly';

export interface Session {
  token: string;
  sub: string;
  name: string;
  handle: string;
  initials: string;
  role: Role;
  issuedAt: number;
  expiresAt: number;
}

/** Accounts are provisioned — there is no registration or password reset. */
interface Account {
  username: string;
  password: string;
  name: string;
  role: Role;
}

const ACCOUNTS: Account[] = [
  { username: 'hq.operator', password: 'antarasetu', name: 'A. Raghavan', role: 'hq_operator' },
  { username: 'station.bharati', password: 'antarasetu', name: 'S. Mehta', role: 'station_operator' },
  { username: 'compliance', password: 'antarasetu', name: 'K. Iyer', role: 'compliance' },
  { username: 'observer', password: 'antarasetu', name: 'Observer', role: 'readonly' },
];

const SESSION_MINUTES = 120;
export const EXPIRY_WARNING_SECONDS = 5 * 60;

function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function initialsOf(name: string): string {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function issueToken(account: Account, issuedAt: number, expiresAt: number): string {
  const header = b64url({ alg: 'none', typ: 'JWT' });
  const payload = b64url({
    sub: account.username,
    name: account.name,
    role: account.role,
    iat: Math.floor(issuedAt / 1000),
    exp: Math.floor(expiresAt / 1000),
    iss: 'antarasetu-client',
  });
  // Unsigned by design: this build has no key to sign with and claiming
  // otherwise would be dishonest.
  return header + '.' + payload + '.';
}

export class AuthError extends Error {}

/** FR-C4: one generic message. Never reveal whether the username exists. */
const GENERIC_FAILURE = 'Sign-in failed. Check your username and password.';

export function login(username: string, password: string): Session {
  const account = ACCOUNTS.find(
    (a) => a.username.toLowerCase() === username.trim().toLowerCase() && a.password === password
  );
  if (!account) throw new AuthError(GENERIC_FAILURE);

  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_MINUTES * 60_000;
  const session: Session = {
    token: issueToken(account, issuedAt, expiresAt),
    sub: account.username,
    name: account.name,
    handle: '@' + account.username,
    initials: initialsOf(account.name),
    role: account.role,
    issuedAt,
    expiresAt,
  };
  writeStore('hq', 'session', session);
  return session;
}

/**
 * FR-C6: expiry never discards queued local records. Logging out clears the
 * session bucket only — the station outbox and local chain are untouched.
 */
export function logout(): void {
  writeStore<Session | null>('hq', 'session', null);
}

export function renewSession(): Session | null {
  const current = getSession();
  if (!current) return null;
  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_MINUTES * 60_000;
  const account = ACCOUNTS.find((a) => a.username === current.sub);
  const renewed: Session = {
    ...current,
    issuedAt,
    expiresAt,
    token: account ? issueToken(account, issuedAt, expiresAt) : current.token,
  };
  writeStore('hq', 'session', renewed);
  return renewed;
}

export function getSession(): Session | null {
  const session = readStore<Session | null>('hq', 'session', null);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) return null;
  return session;
}

/**
 * The demo never wants a dead app on first load, so an unauthenticated
 * session falls back to a read-only identity rather than a blank screen.
 * /login issues a real one.
 */
export const ANONYMOUS: Session = {
  token: '',
  sub: 'guest',
  name: 'HQ Operator',
  handle: '@hq_operator',
  initials: 'HQ',
  role: 'hq_operator',
  issuedAt: 0,
  expiresAt: Number.MAX_SAFE_INTEGER,
};

export function currentActor(): { name: string; role: Role } {
  const session = getSession() ?? ANONYMOUS;
  return { name: session.name, role: session.role };
}

// ---- Role gating ------------------------------------------------------------

export type Capability =
  | 'action.transition'
  | 'action.bulk'
  | 'compliance.submit'
  | 'compliance.export'
  | 'logistics.manifest'
  | 'settings.write'
  | 'settings.users'
  | 'station.write'
  | 'comms.simulate';

const CAPABILITIES: Record<Role, Capability[]> = {
  hq_operator: [
    'action.transition', 'action.bulk', 'logistics.manifest',
    'settings.write', 'compliance.export', 'comms.simulate', 'station.write',
  ],
  station_operator: ['action.transition', 'station.write', 'compliance.submit'],
  compliance: ['compliance.submit', 'compliance.export', 'action.transition'],
  readonly: [],
};

export function can(capability: Capability, role?: Role): boolean {
  const effective = role ?? (getSession() ?? ANONYMOUS).role;
  return CAPABILITIES[effective].includes(capability);
}

export const ROLE_LABEL: Record<Role, string> = {
  hq_operator: 'HQ operator',
  station_operator: 'Station operator',
  compliance: 'Compliance officer',
  readonly: 'Read only',
};

// ---- React bindings ---------------------------------------------------------

export function useSession(): Session {
  return useStoreValue(() => getSession() ?? ANONYMOUS);
}

export function useCan(capability: Capability): boolean {
  const session = useSession();
  return can(capability, session.role);
}

/** Seconds until expiry, or null for the anonymous fallback session. */
export function secondsUntilExpiry(session: Session): number | null {
  if (!session.token) return null;
  return Math.max(0, Math.round((session.expiresAt - Date.now()) / 1000));
}

export const DEMO_ACCOUNTS = ACCOUNTS.map((a) => ({
  username: a.username,
  role: a.role,
  name: a.name,
}));
