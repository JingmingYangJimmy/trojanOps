// Owner: B (WP-5, real by H7). STUB over fixtures.
import type { AgentListing } from '../contracts';
import { FIXTURE_AGENTS, FIXTURE_CLUB_NAMES } from './fixtures';

/** Every club's enabled installations whose effective audience is public. */
export async function directory(): Promise<AgentListing[]> {
  return Object.values(FIXTURE_AGENTS)
    .filter((a) => a.status === 'enabled' && a.audience === 'public')
    .map((a) => ({
      installationId: a.installationId,
      orgId: a.orgId,
      orgName: FIXTURE_CLUB_NAMES[a.orgId] ?? '',
      templateSlug: a.templateSlug,
      name: a.name,
      purpose: a.purpose,
      audience: a.audience,
      reasonLabel: 'All students',
      templateVersion: a.templateVersion,
    }));
}
