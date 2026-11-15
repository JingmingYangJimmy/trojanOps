// Owner: D (WP-11). POST /api/orgs/:orgId/departments — the president creates a department (§14).
import { parseBody, requireUser, route } from '@/lib/api';
import { createDepartment, createDepartmentSchema } from '@/lib/directory/departments';

export const POST = route<{ orgId: string }>(async ({ req, actor, params }) => {
  requireUser(actor);
  return createDepartment(actor, params.orgId, await parseBody(req, createDepartmentSchema));
});
