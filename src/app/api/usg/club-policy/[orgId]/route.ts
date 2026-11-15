import { route, parseBody, requireUser } from '@/lib/api';
import { setClubPolicy, clubPolicySchema } from '@/lib/distribution/club-policy';
export const PUT = route<{ orgId: string }>(async ({ actor, req, params }) => { requireUser(actor); return setClubPolicy(actor, params.orgId, await parseBody(req, clubPolicySchema)); });
