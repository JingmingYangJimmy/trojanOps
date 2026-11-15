// POST /api/orgs/:orgId/positions/:slug/holders — the president gives a member a position (§14).
import { parseBody, requireUser, route } from '@/lib/api';
import { assignPosition, assignPositionSchema } from '@/lib/lifecycle/members';

export const POST = route<{ orgId: string; positionSlug: string }>(async ({ req, actor, params }) => {
  requireUser(actor);
  const { userId } = await parseBody(req, assignPositionSchema);
  return assignPosition(actor, params.orgId, params.positionSlug, userId);
});
