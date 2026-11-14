// Owner: A (WP-3, real by H7). grantsFor is a STUB over fixtures; capGrants is the §5 table.
import type { Grant, Tier } from '../contracts';
import { FIXTURE_MEMBERSHIPS, FIXTURE_ORG_NAMES, FIXTURE_POSITION_NAMES } from './fixtures';

/**
 * Org-qualified grants from the user's active memberships in `orgId` only (I3):
 * '*' for any signed-in user, '<orgId>:*' for a member, '<orgId>:<position>' per position held.
 * Recomputed on every request; never persisted.
 */
export async function grantsFor(userId: string | null, orgId: string | null): Promise<Grant[]> {
  if (!userId) return [];
  const grants: Grant[] = ['*'];
  if (!orgId) return grants;
  const held = FIXTURE_MEMBERSHIPS.filter((m) => m.userId === userId && m.orgId === orgId);
  if (held.length === 0) return grants;
  grants.push(`${orgId}:*`);
  for (const m of held) {
    const g: Grant = `${orgId}:${m.position}`;
    if (!grants.includes(g)) grants.push(g);
  }
  return grants;
}

/** Caps a user's grants by the agent's max tier (I4, §5 table). */
export function capGrants(userGrants: Grant[], orgId: string, maxTier: Tier): Grant[] {
  switch (maxTier) {
    case 'public':
      return ['*'];
    case 'members': {
      const keep = new Set<string>(['*', `${orgId}:*`]);
      return userGrants.filter((g) => keep.has(g));
    }
    case 'officers':
    case 'usg_internal':
      return [...userGrants];
  }
}

/** Display labels for grants, e.g. "Startup Club · Treasurer". STUB: fixture names until WP-3. */
export async function grantLabels(grants: Grant[]): Promise<Array<{ grant: Grant; label: string }>> {
  return grants.map((grant) => {
    if (grant === '*') return { grant, label: 'Any signed-in student' };
    const [orgId, position] = grant.split(':');
    const org = FIXTURE_ORG_NAMES[orgId] ?? 'Unknown club';
    const pos = position === '*' ? 'Member' : (FIXTURE_POSITION_NAMES[position] ?? position);
    return { grant, label: `${org} · ${pos}` };
  });
}
