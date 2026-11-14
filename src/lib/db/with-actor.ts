// Owner: A. Documents and runs are read only inside withActor (I1). WP-1 proves it with
// tests/rls.test.ts (§10 visibility contract).
import { sql } from 'drizzle-orm';
import type { Actor, Grant } from '../contracts';
import { getDb, type Tx } from './client';

export interface ActorScope {
  /** Grants to apply. Default: actor.grants. Agent runs pass capGrants(...) instead. */
  grants?: Grant[];
  /** app.agent_sources: the agent's sources for a run; for the document library, every source of
   * the active org plus USG public sources. Empty = no document is visible. */
  sourceIds?: string[];
}

/** Encodes a text[] literal for set_config: {"a","b"}. */
export function pgTextArray(values: readonly string[]): string {
  return `{${values.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')}}`;
}

/**
 * Runs fn in one transaction after setting the RLS settings with set_config(..., true) (local to the
 * transaction). app.manage_org is set to the active org only when the actor is its president.
 */
export async function withActor<T>(actor: Actor, scope: ActorScope, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const grants = scope.grants ?? actor.grants;
  const sources = scope.sourceIds ?? [];
  const manageOrg = actor.activeOrgId && actor.positions.includes('president') ? actor.activeOrgId : '';
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select
      set_config('app.user_id', ${actor.userId ?? ''}, true),
      set_config('app.grants', ${pgTextArray(grants)}, true),
      set_config('app.agent_sources', ${pgTextArray(sources)}, true),
      set_config('app.manage_org', ${manageOrg}, true)`);
    return fn(tx);
  });
}
