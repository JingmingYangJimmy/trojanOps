// POST /api/orgs/:orgId/positions — the president creates a position (§14).
import { parseBody, requireUser, route } from '@/lib/api';
import { createPosition, createPositionSchema } from '@/lib/lifecycle/members';

export const POST = route<{ orgId: string }>(async ({ req, actor, params }) => {
  requireUser(actor);
  const body = await parseBody(req, createPositionSchema);
  return createPosition(actor, params.orgId, body);
});
