// Owner: B (WP-5, real by H7). STUB: flips the fixture in memory, so D3 can be clicked through
// before the DB version exists.
import { AppError, type Actor, type EffectiveAgent } from '../contracts';
import { FIXTURE_AGENTS } from './fixtures';

/** Sets the installation's audience to public and enables it (§8). Needs the club policy, max tier
 * public and an installation limit (default: half the club's monthly quota). */
export async function publishToAllStudents(
  actor: Actor,
  installationId: string,
  input: { limitMicro?: number } = {},
): Promise<EffectiveAgent> {
  void input;
  const agent = FIXTURE_AGENTS[installationId];
  if (!agent) throw new AppError({ code: 'not_found', message: 'This agent does not exist.' });
  if (actor.activeOrgId !== agent.orgId || !actor.positions.includes('president')) {
    throw new AppError({ code: 'forbidden', message: 'Only the club president can publish agents to all students.' });
  }
  agent.audience = 'public';
  agent.maxTier = 'public';
  agent.status = 'enabled';
  return structuredClone(agent);
}
