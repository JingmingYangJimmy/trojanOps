// Owner: A (WP-3). POST /api/session/persona { userId | null }: choose a persona (DEMO_MODE) or sign
// out. Choosing a persona resets the active org to the default; only ids go in cookies (I3).
import { cookies } from 'next/headers';
import { z } from 'zod';
import { parseBody, route } from '@/lib/api';
import { ACTIVE_ORG_COOKIE, PERSONA_COOKIE } from '@/lib/identity';
import { SESSION_COOKIE_OPTIONS } from '@/lib/identity/cookies';
import { choosePersona } from '@/lib/identity/session';

export const POST = route(async ({ req }) => {
  const body = await parseBody(req, z.object({ userId: z.string().nullable() }));
  const result = await choosePersona(body.userId);
  const jar = await cookies();
  jar.delete(ACTIVE_ORG_COOKIE);
  if (result.userId) jar.set(PERSONA_COOKIE, result.userId, SESSION_COOKIE_OPTIONS);
  else jar.delete(PERSONA_COOKIE);
  return result;
});
