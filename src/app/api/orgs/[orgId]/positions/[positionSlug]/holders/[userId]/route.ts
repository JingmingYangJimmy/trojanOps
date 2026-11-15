// DELETE /api/orgs/:orgId/positions/:slug/holders/:userId — the president takes a position from a
// member who keeps another (§14).
import { requireUser, route } from '@/lib/api';
import { unassignPosition } from '@/lib/lifecycle/members';

export const DELETE = route<{ orgId: string; positionSlug: string; userId: string }>(async ({ actor, params }) => {
  requireUser(actor);
  await unassignPosition(actor, params.orgId, params.positionSlug, params.userId);
  return { ok: true };
});
