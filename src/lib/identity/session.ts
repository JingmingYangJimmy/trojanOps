// Owner: A (WP-3). Session services behind POST /api/session/persona and /api/session/active-org
// (§14). They validate the choice; the route writes the cookie. Cookies hold ids only (I3).
import { AppError, type Actor } from '../contracts';
import { activeMemberships } from '../authz';
import { requireUser } from '../api';

/** Personas exist only in DEMO_MODE. */
export function personasEnabled(): boolean {
  return process.env.DEMO_MODE === '1';
}

/** Choose a persona (DEMO_MODE only). null signs out, in any mode. */
export async function choosePersona(userId: string | null): Promise<{ userId: string | null }> {
  if (userId === null) return { userId: null };
  if (!personasEnabled()) {
    throw new AppError({ code: 'forbidden', message: 'Personas are available in demo mode only.' });
  }
  if (!(await activeMemberships(userId))) {
    throw new AppError({ code: 'not_found', message: 'That persona does not exist.' });
  }
  return { userId };
}

/** Switch the active org to one of the actor's active memberships. */
export async function chooseActiveOrg(actor: Actor, orgId: string): Promise<{ activeOrgId: string }> {
  const userId = requireUser(actor);
  const held = (await activeMemberships(userId)) ?? [];
  if (!held.some((m) => m.orgId === orgId)) {
    throw new AppError({ code: 'forbidden', message: 'You are not an active member of that club.' });
  }
  return { activeOrgId: orgId };
}
