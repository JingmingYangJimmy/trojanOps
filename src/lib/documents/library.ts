// Owner: C (WP-8, real by H6). STUB over fixtures. Real version reads under withActor with
// app.agent_sources = every source of the org plus USG public sources (§5).
import type { Actor, Grant, LibraryDocument } from '../contracts';
import { FIXTURE_DOCUMENTS, FIXTURE_LIBRARY_SOURCES, FIXTURE_UPLOADED_AT } from './fixtures';

/** The documents the actor can read in one club's library, newest first. */
export async function listLibraryDocuments(actor: Actor, orgId: string): Promise<LibraryDocument[]> {
  const sources = FIXTURE_LIBRARY_SOURCES[orgId] ?? [];
  return FIXTURE_DOCUMENTS
    .filter((d) => sources.includes(d.sourceId) && d.readGrants.some((g) => actor.grants.includes(g as Grant)))
    .map((d) => ({
      id: d.id, title: d.title, tier: d.tier, sourceId: d.sourceId, sourceName: d.sourceName,
      version: 1, createdAt: FIXTURE_UPLOADED_AT,
    }));
}
