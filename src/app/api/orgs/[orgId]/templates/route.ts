import { route, parseBody, requireUser } from '@/lib/api';
import { createClubTemplate, createClubTemplateSchema } from '@/lib/distribution/create-template';
export const POST = route<{ orgId: string }>(async ({ actor, req, params }) => { requireUser(actor); return createClubTemplate(actor, params.orgId, await parseBody(req, createClubTemplateSchema)); });
