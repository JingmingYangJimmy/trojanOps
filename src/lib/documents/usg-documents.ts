// Read models for the USG console's documents pages: USG's own documents, their versions and the
// agents whose sources include them. Documents are read under the viewer's RLS (I1).
import { and, asc, eq } from 'drizzle-orm';
import type { Actor, LibraryDocument, Tier } from '../contracts';
import { getDb } from '../db/client';
import { agentTemplates, agentTemplateVersions, orgs, positions, sources } from '../db/schema';
import { requireConsole } from '../distribution/usg-view';
import { TIER_RANK } from './access';
import type { DocumentAccessEditor } from './document-page';
import { documentAudience } from './knowledge-library';
import { getLibraryDocument, listLibraryDocuments, managesLibrary, type ManagedDocument } from './library';

export interface UsgDocumentUser { templateId: string; name: string; global: boolean }
export interface UsgDocumentRow extends LibraryDocument { sourceKind: string; usedBy: UsgDocumentUser[] }
export interface UsgDocumentsView { orgId: string; documents: UsgDocumentRow[] }
export interface UsgDocumentView {
  orgId: string; document: ManagedDocument; usedBy: UsgDocumentUser[];
  /** "All students", "All members", position names, or "Reviewer, Admin". */
  whoCanRead: string;
  /** Set only for a USG admin acting in USG, who manages USG's library. */
  accessEditor: DocumentAccessEditor | null;
}

async function usgOrgId(): Promise<string | null> {
  const [usg] = await getDb().select({ id: orgs.id }).from(orgs).where(eq(orgs.kind, 'usg')).limit(1);
  return usg?.id ?? null;
}

/** Active templates whose latest version reads the document: its source kind is among the version's
 * (USG's kinds resolve to USG's own sources in every club, §8 clamps) and its tier is within the
 * version's max tier. */
async function usersOf(): Promise<(kind: string, tier: Tier) => UsgDocumentUser[]> {
  const rows = await getDb().select({
    templateId: agentTemplates.id, name: agentTemplates.name, scope: agentTemplates.scope,
    kinds: agentTemplateVersions.sourceKinds, maxTier: agentTemplateVersions.maxTier,
  })
    .from(agentTemplateVersions)
    .innerJoin(agentTemplates, and(eq(agentTemplates.id, agentTemplateVersions.templateId),
      eq(agentTemplates.latestVersion, agentTemplateVersions.version)))
    .where(eq(agentTemplates.status, 'active'))
    .orderBy(agentTemplates.name);
  return (kind, tier) => rows
    .filter((r) => r.kinds.includes(kind) && TIER_RANK[tier] <= TIER_RANK[r.maxTier])
    .map((r) => ({ templateId: r.templateId, name: r.name, global: r.scope === 'global' }));
}

export async function usgDocumentsView(actor: Actor): Promise<UsgDocumentsView | null> {
  await requireConsole(actor);
  const orgId = await usgOrgId();
  if (!orgId) return null;
  const [docs, kinds, users] = await Promise.all([
    listLibraryDocuments(actor, orgId),
    getDb().select({ id: sources.id, kind: sources.kind }).from(sources).where(eq(sources.orgId, orgId)),
    usersOf(),
  ]);
  const documents = docs.flatMap((d) => {
    const source = kinds.find((k) => k.id === d.sourceId);
    return source ? [{ ...d, sourceKind: source.kind, usedBy: users(source.kind, d.tier) }] : [];
  });
  return { orgId, documents };
}

export async function usgDocumentView(actor: Actor, documentId: string): Promise<UsgDocumentView | null> {
  await requireConsole(actor);
  const orgId = await usgOrgId();
  if (!orgId) return null;
  const document = await getLibraryDocument(actor, orgId, documentId);
  if (!document) return null;
  const [allPositions, canEdit, users] = await Promise.all([
    getDb().select({ slug: positions.slug, name: positions.name, isOfficer: positions.isOfficer }).from(positions)
      .where(eq(positions.orgId, orgId)).orderBy(asc(positions.name)),
    managesLibrary(actor, orgId),
    usersOf(),
  ]);
  const names = new Map(allPositions.map((p) => [p.slug, p.name]));
  return {
    orgId, document, usedBy: users(document.sourceKind, document.tier),
    whoCanRead: documentAudience(document.tier, document.allowedPositions, names),
    accessEditor: canEdit ? {
      access: { tier: document.tier, allowedPositions: document.allowedPositions },
      positions: allPositions.filter((p) => p.isOfficer).map(({ slug, name }) => ({ slug, name })),
    } : null,
  };
}
