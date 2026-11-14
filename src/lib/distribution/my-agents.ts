// Owner: B (WP-5, real by H7). STUB over fixtures; membership is read through authz.grantsFor.
import type { AgentListing, MyAgentsClub } from '../contracts';
import { grantsFor } from '../authz';
import { canUse } from './effective-config';
import { FIXTURE_AGENTS, FIXTURE_CLUB_NAMES } from './fixtures';
import { positionName, reasonLabel } from './labels';

/** For each distinct club where the user is an active member: that club's enabled installations
 * that canUse admits, each with its reason label. */
export async function myAgents(userId: string): Promise<MyAgentsClub[]> {
  const clubs: MyAgentsClub[] = [];
  for (const orgId of Object.keys(FIXTURE_CLUB_NAMES)) {
    const grants = await grantsFor(userId, orgId);
    if (!grants.includes(`${orgId}:*`)) continue;
    const agents: AgentListing[] = [];
    for (const a of Object.values(FIXTURE_AGENTS)) {
      if (a.orgId !== orgId || a.status !== 'enabled') continue;
      const verdict = await canUse(userId, a);
      if (!verdict.ok) continue;
      agents.push({
        installationId: a.installationId,
        orgId,
        orgName: FIXTURE_CLUB_NAMES[orgId],
        templateSlug: a.templateSlug,
        name: a.name,
        purpose: a.purpose,
        audience: a.audience,
        reasonLabel: reasonLabel(verdict.reason, a.usableBy),
        templateVersion: a.templateVersion,
      });
    }
    const positionNames = grants
      .filter((g) => g.startsWith(`${orgId}:`) && g !== `${orgId}:*`)
      .map((g) => positionName(g.slice(orgId.length + 1)));
    clubs.push({ orgId, orgName: FIXTURE_CLUB_NAMES[orgId], positionNames, agents });
  }
  return clubs;
}
