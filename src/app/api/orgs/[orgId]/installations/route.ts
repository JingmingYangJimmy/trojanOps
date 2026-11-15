import { route, parseBody, requireUser } from '@/lib/api';
import { installTemplate, createInstallationSchema } from '@/lib/distribution/create-installation';
export const POST = route<{ orgId: string }>(async ({ actor, req, params }) => { requireUser(actor); return installTemplate(actor, params.orgId, await parseBody(req, createInstallationSchema)); });
