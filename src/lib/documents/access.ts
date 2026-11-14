// Owner: C (WP-8). listAccessibleDocuments is a STUB that filters fixtures the way the RLS policy
// does (real by H5, inside withActor). explainAccess is the §10 rule and stays pure.
import type { AccessCell, AccessibleDocument, Actor, EffectiveAgent, Grant, Tier } from '../contracts';
import { FIXTURE_DOCUMENTS } from './fixtures';

/** The documents a run may read: read_grants overlap runGrants and the source is one of the agent's
 * (gateway step 5). Real version: withActor(actor, { grants: runGrants, sourceIds }, …). */
export async function listAccessibleDocuments(
  actor: Actor,
  runGrants: Grant[],
  sourceIds: string[],
): Promise<AccessibleDocument[]> {
  void actor;
  return FIXTURE_DOCUMENTS
    .filter((d) => sourceIds.includes(d.sourceId) && d.readGrants.some((g) => runGrants.includes(g as Grant)))
    .map(({ id, title, tier, bodyMd }) => ({ id, title, tier, bodyMd }));
}

export interface AccessDocument {
  sourceId: string;
  tier: Tier;
  readGrants: string[];
}

const TIER_RANK: Record<Tier, number> = { public: 0, members: 1, officers: 2, usg_internal: 3 };

/** Why a subject can or can't read a document through an agent, checked in §10 order. */
export function explainAccess(
  subjectGrants: Grant[],
  agent: Pick<EffectiveAgent, 'sourceIds' | 'maxTier'>,
  doc: AccessDocument,
): AccessCell {
  if (!agent.sourceIds.includes(doc.sourceId)) return 'outside_sources';
  if (TIER_RANK[doc.tier] > TIER_RANK[agent.maxTier]) return 'above_max_tier';
  if (!doc.readGrants.some((g) => subjectGrants.includes(g as Grant))) return 'not_granted';
  return 'allowed';
}
