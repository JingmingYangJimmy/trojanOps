// Owner: A (WP-3). The acting user comes from the identity connector (persona cookie in DEMO_MODE);
// the active org and grants come from the user's active memberships in the DB, on every request.
// Cookies hold only the user id and the org id, never grants (I3).
import type { Actor } from '../contracts';
import { activeMemberships, allActiveMemberships, grantsFromMemberships, type ActiveMembership } from '../authz';
import { getConnectors } from '../connectors/registry';
import { ACTIVE_ORG_COOKIE, readCookie } from './cookies';

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

/** Every user with their active clubs and positions, for the persona picker. */
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

export { ACTIVE_ORG_COOKIE, PERSONA_COOKIE } from './cookies';
