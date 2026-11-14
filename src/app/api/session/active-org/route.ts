// Owner: A (WP-3). POST /api/session/active-org { orgId }: switch to one of the actor's active
// memberships. The cookie holds the org id only; grants are recomputed per request (I3).
import { cookies } from 'next/headers';
import { z } from 'zod';
import { parseBody, route } from '@/lib/api';
import { ACTIVE_ORG_COOKIE } from '@/lib/identity';
import { SESSION_COOKIE_OPTIONS } from '@/lib/identity/cookies';
import { chooseActiveOrg } from '@/lib/identity/session';

export const POST = route(async ({ req, actor }) => {
  const body = await parseBody(req, z.object({ orgId: z.string() }));
  const result = await chooseActiveOrg(actor, body.orgId);
  (await cookies()).set(ACTIVE_ORG_COOKIE, result.activeOrgId, SESSION_COOKIE_OPTIONS);
  return result;
});
