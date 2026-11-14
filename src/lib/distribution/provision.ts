// Owner: B (WP-5, real by H7). STUB: installs nothing.
import type { Actor } from '../contracts';

/** Installs every distributed template whose target includes the club (§8, §13). */
export async function provisionOrg(orgId: string, actor?: Actor): Promise<{ installed: number }> {
  void orgId;
  void actor;
  return { installed: 0 };
}
