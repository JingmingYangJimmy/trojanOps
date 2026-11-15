// Owner: D (WP-11). POST /api/orgs/:orgId/departments/:slug/members — the president puts a current
// member of the club on a department (§14).
import { parseBody, requireUser, route } from '@/lib/api';
import { addDepartmentMember, addDepartmentMemberSchema } from '@/lib/directory/departments';

export const POST = route<{ orgId: string; slug: string }>(async ({ req, actor, params }) => {
  requireUser(actor);
  const { userId } = await parseBody(req, addDepartmentMemberSchema);
  return addDepartmentMember(actor, params.orgId, params.slug, userId);
});
