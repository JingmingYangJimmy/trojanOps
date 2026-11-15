import { route, parseBody, requireUser } from '@/lib/api';
import { getTemplate, updateTemplate, templatePatchSchema } from '@/lib/distribution/template-admin';
export const GET = route<{ templateId: string }>(async ({ actor, params }) => getTemplate(actor, params.templateId));
export const PATCH = route<{ templateId: string }>(async ({ actor, req, params }) => { requireUser(actor); return updateTemplate(actor, params.templateId, await parseBody(req, templatePatchSchema)); });
