// Owner: D (WP-11). PATCH edits a department (name, purpose, about, lead); DELETE archives it (§14).
// The president acting in the club only.
import { parseBody, requireUser, route } from '@/lib/api';
import { archiveDepartment, updateDepartment, updateDepartmentSchema } from '@/lib/directory/departments';

type Params = { orgId: string; slug: string };

export const PATCH = route<Params>(async ({ req, actor, params }) => {
  requireUser(actor);
  return updateDepartment(actor, params.orgId, params.slug, await parseBody(req, updateDepartmentSchema));
});

export const DELETE = route<Params>(async ({ actor, params }) => {
  requireUser(actor);
  await archiveDepartment(actor, params.orgId, params.slug);
  return { ok: true };
});
