// Owner: D (WP-11). DELETE /api/orgs/:orgId/departments/:slug/members/:userId — the president takes
// someone off a department (§14).
import { requireUser, route } from '@/lib/api';
import { removeDepartmentMember } from '@/lib/directory/departments';

export const DELETE = route<{ orgId: string; slug: string; userId: string }>(async ({ actor, params }) => {
  requireUser(actor);
  return removeDepartmentMember(actor, params.orgId, params.slug, params.userId);
});
