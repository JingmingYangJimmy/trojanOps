// Owner: C. PATCH /api/orgs/[orgId]/documents/[documentId]/access: the library's manager changes who
// can read a document (JSON body { tier, allowedPositions }).
import { parseBody, route } from '@/lib/api';
import { documentAccessInput, updateDocumentAccess } from '@/lib/documents/library';

export const PATCH = route<{ orgId: string; documentId: string }>(async ({ actor, req, params }) =>
  updateDocumentAccess(actor, params.orgId, params.documentId, await parseBody(req, documentAccessInput)));
