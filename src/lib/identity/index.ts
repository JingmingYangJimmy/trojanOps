// Owner: A (WP-3). The acting user comes from the identity connector (persona cookie in DEMO_MODE);
// the active org and grants come from the user's active memberships in the DB, on every request.
// Cookies hold only the user id and the org id, never grants (I3).
import type { Actor } from '../contracts';
import { activeMemberships, allActiveMemberships, grantsFromMemberships, type ActiveMembership } from '../authz';
import { getConnectors } from '../connectors/registry';
import { ACTIVE_ORG_COOKIE, readCookie } from './cookies';
import { DEMO_ACCOUNT_ORDER, type DemoAccount } from './demo-accounts';

const SIGNED_OUT: Actor = { userId: null, activeOrgId: null, positions: [], grants: [] };

async function currentRequest(): Promise<Request> {
  const { headers } = await import('next/headers');
  const h = await headers();
  return new Request('http://localhost/', { headers: { cookie: h.get('cookie') ?? '' } });
}

/** The active org: the wanted one if the user actively belongs to it, else their first club, else null. */
export function resolveActiveOrg(held: ActiveMembership[], wanted: string | null): string | null {
  if (wanted && held.some((m) => m.orgId === wanted)) return wanted;
  return held[0]?.orgId ?? null;
}

/** The acting user, their active org, positions there and grants. No persona, or a persona that
 * isn't a user, is signed out. Pass `req` in route handlers; server components may omit it. */
export async function getActor(req?: Request): Promise<Actor> {
  const request = req ?? (await currentRequest());
  const userId = await getConnectors().identity.currentUserId(request);
  if (!userId) return { ...SIGNED_OUT };
  const held = await activeMemberships(userId);
  if (!held) return { ...SIGNED_OUT };
  const activeOrgId = resolveActiveOrg(held, readCookie(request, ACTIVE_ORG_COOKIE));
  return {
    userId,
    activeOrgId,
    positions: held.filter((m) => m.orgId === activeOrgId).map((m) => m.positionSlug),
    grants: grantsFromMemberships(held, activeOrgId),
  };
}

export interface PersonaClub {
  orgId: string;
  orgName: string;
  positionNames: string[];
}

export interface Persona {
  userId: string;
  name: string;
  clubs: PersonaClub[];
}

/** Every user with their active clubs and positions, for the masthead persona switcher. */
export async function listPersonas(): Promise<Persona[]> {
  return (await allActiveMemberships()).map(({ userId, displayName, held }) => {
    const clubs: PersonaClub[] = [];
    for (const m of held) {
      let club = clubs.find((c) => c.orgId === m.orgId);
      if (!club) clubs.push((club = { orgId: m.orgId, orgName: m.orgName, positionNames: [] }));
      club.positionNames.push(m.positionName);
    }
    return { userId, name: displayName, clubs };
  });
}

/**
 * The page a user lands on for their active org: a USG admin on the USG admin pages, a club
 * president on the club home, any other member on My agents, a user with no club on the Directory.
 * Navigation only: every page still authorizes its own reads.
 */
export function landingPath(held: ActiveMembership[], activeOrgId: string | null): string {
  const orgId = resolveActiveOrg(held, activeOrgId);
  const inOrg = held.filter((m) => m.orgId === orgId);
  if (!orgId || inOrg.length === 0) return '/directory';
  const slugs = inOrg.map((m) => m.positionSlug);
  // TODO(verify): land USG admins on /usg/templates once stream B ships that page.
  if (inOrg[0].orgKind === 'usg') return slugs.includes('admin') ? '/usg/integrations' : '/me/agents';
  return slugs.includes('president') ? `/org/${orgId}` : '/me/agents';
}

/** Every user as a demo sign-in account: the seeded accounts first in DEMO_ACCOUNT_ORDER, then any
 * other user (e.g. from a roster import) by NetID. Landing assumes the default active org, which
 * choosing a persona resets to. No display names: the sign-in page never shows them. */
export async function listDemoAccounts(): Promise<DemoAccount[]> {
  const rank = (netId: string) => {
    const i = (DEMO_ACCOUNT_ORDER as readonly string[]).indexOf(netId);
    return i === -1 ? DEMO_ACCOUNT_ORDER.length : i;
  };
  const users = (await allActiveMemberships())
    .sort((a, b) => rank(a.netId) - rank(b.netId) || a.netId.localeCompare(b.netId));
  return users.map((u, i) => ({
    n: i + 1,
    userId: u.userId,
    netId: u.netId,
    signInId: u.demoEmail ?? u.netId,
    landing: landingPath(u.held, null),
  }));
}

export { ACTIVE_ORG_COOKIE, PERSONA_COOKIE } from './cookies';
export type { DemoAccount } from './demo-accounts';
