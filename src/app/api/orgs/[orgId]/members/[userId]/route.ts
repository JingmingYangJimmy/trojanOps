// DELETE /api/orgs/:orgId/members/:userId — the president ends every membership the student holds
// in the club (§14).
import { requireUser, route } from '@/lib/api';
import { removeMember } from '@/lib/lifecycle/members';

export const DELETE = route<{ orgId: string; userId: string }>(async ({ actor, params }) => {
  requireUser(actor);
  return removeMember(actor, params.orgId, params.userId);
});
