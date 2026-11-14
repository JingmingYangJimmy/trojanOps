// Owner: B (WP-5, real by H6). STUB: resolves from fixtures; canUse reads grants through
// authz.grantsFor in the agent's club, as the real one will.
import { AppError, type CanUse, type EffectiveAgent } from '../contracts';
import { grantsFor } from '../authz';
import { FIXTURE_AGENTS } from './fixtures';

/** The installation's effective configuration: template version (latest or pinned) plus the club's
 * overrides, clamped (§8). Throws not_found for an unknown installation. */
export async function effectiveAgent(installationId: string): Promise<EffectiveAgent> {
  const agent = FIXTURE_AGENTS[installationId];
  if (!agent) throw new AppError({ code: 'not_found', message: 'This agent does not exist.' });
  return structuredClone(agent);
}

/** Whether the user is in the agent's audience. Positions are read in agent.orgId, not in the
 * actor's active org. */
export const canUse: CanUse = async (userId, agent) => {
  if (agent.audience === 'public') return { ok: true, reason: 'public' };
  const grants = await grantsFor(userId, agent.orgId);
  if (agent.audience === 'members') {
    return grants.includes(`${agent.orgId}:*`) ? { ok: true, reason: 'members' } : { ok: false };
  }
  const position = agent.usableBy.find((p) => grants.includes(`${agent.orgId}:${p}`));
  return position ? { ok: true, reason: { position } } : { ok: false };
};
