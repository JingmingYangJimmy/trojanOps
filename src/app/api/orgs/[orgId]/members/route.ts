// POST /api/orgs/:orgId/members — the president adds an existing student to the club (§14).
import { parseBody, requireUser, route } from '@/lib/api';
import { addMember, addMemberSchema } from '@/lib/lifecycle/members';

export const POST = route<{ orgId: string }>(async ({ req, actor, params }) => {
  requireUser(actor);
  const body = await parseBody(req, addMemberSchema);
  return addMember(actor, params.orgId, body);
});
