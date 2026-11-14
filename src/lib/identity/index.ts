// Owner: A (WP-3, real by H7). STUB: identity comes from the identity connector (persona cookie);
// memberships come from fixtures. Until WP-3, a request without a persona acts as Sam.
import type { Actor } from '../contracts';
import { grantsFor } from '../authz';
import { FIXTURE_MEMBERSHIPS } from '../authz/fixtures';
import { getConnectors } from '../connectors/registry';
import { USER } from '@db/seed/ids';
import { ACTIVE_ORG_COOKIE, readCookie } from './cookies';

const STUB_DEFAULT_USER = USER.sam; // TODO(WP-3): no persona means signed out.

async function currentRequest(): Promise<Request> {
  const { headers } = await import('next/headers');
  const h = await headers();
  return new Request('http://localhost/', { headers: { cookie: h.get('cookie') ?? '' } });
}

/** The acting user, their active org, positions there and grants. Pass `req` in route handlers;
 * server components may omit it. */
export async function getActor(req?: Request): Promise<Actor> {
  const request = req ?? (await currentRequest());
  const userId = (await getConnectors().identity.currentUserId(request)) ?? STUB_DEFAULT_USER;
  const memberships = FIXTURE_MEMBERSHIPS.filter((m) => m.userId === userId);
  const orgIds = [...new Set(memberships.map((m) => m.orgId))];
  const wanted = readCookie(request, ACTIVE_ORG_COOKIE);
  const activeOrgId = wanted && orgIds.includes(wanted) ? wanted : (orgIds[0] ?? null);
  return {
    userId,
    activeOrgId,
    positions: memberships.filter((m) => m.orgId === activeOrgId).map((m) => m.position),
    grants: await grantsFor(userId, activeOrgId),
  };
}

export { ACTIVE_ORG_COOKIE, PERSONA_COOKIE } from './cookies';
