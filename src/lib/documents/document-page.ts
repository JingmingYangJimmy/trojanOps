import { eq } from 'drizzle-orm';
import type { Actor, Tier } from '../contracts';
import { grantsFor } from '../authz';
import { documents, users } from '../db/schema';
import { withActor } from '../db/with-actor';
import { demoChunks, type DemoChunk } from './fixtures';
import { getKnowledgeLibrary } from './knowledge-library';
import { managesLibrary } from './library';

export interface DocumentAccessEditor {
  readonly access: { tier: Tier; allowedPositions: string[] };
  readonly positions: Array<{ slug: string; name: string }>;
}

export async function getDocumentPageData(actor: Actor, orgId: string, documentId: string) {
  const library = await getKnowledgeLibrary(actor, orgId);
  if (!library) return null;
  const document = library.documents.find((d) => d.id === documentId);
  const restricted = { org: library.org, document: null, chunks: [] satisfies DemoChunk[], bodyMd: '', uploadedBy: null, canTestRetrieval: false, subjects: [] satisfies Array<{ key: string; label: string }>, accessEditor: null };
  if (!document) return restricted;
  const grants = await grantsFor(actor.userId, orgId);
  const [row] = await withActor(actor, { grants, sourceIds: [document.sourceId] }, (tx) =>
    tx.select({ bodyMd: documents.bodyMd, uploadedBy: users.displayName, orgId: documents.orgId, tier: documents.tier, allowedPositions: documents.allowedPositions })
      .from(documents).leftJoin(users, eq(users.id, documents.uploadedBy)).where(eq(documents.id, documentId)));
  if (!row) return restricted;
  // Only the org's own documents: a USG document shown in a club library is edited from USG.
  const accessEditor: DocumentAccessEditor | null = row.orgId === orgId && await managesLibrary(actor, orgId)
    ? { access: { tier: row.tier, allowedPositions: row.allowedPositions }, positions: library.positions }
    : null;
  return { org: library.org, document, chunks: demoChunks(row.bodyMd), bodyMd: row.bodyMd, uploadedBy: row.uploadedBy, canTestRetrieval: library.canUpload, subjects: library.subjects, accessEditor };
}
