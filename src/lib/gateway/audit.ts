// Owner: A (WP-4, real by H9). The only audit writer (§12). STUB: keeps events in memory.
// details hold ids and numbers only, never document text or run input/output (I8).
import type { Actor, AuditAction, AuditEntry, AuditEvent } from '../contracts';
import { now } from '../clock';

const events: AuditEntry[] = [];

/** Writes one audit row and returns its id. */
export async function audit(action: AuditAction, event: AuditEvent): Promise<number> {
  const entry: AuditEntry = { ...event, id: events.length + 1, ts: now(), action };
  events.push(entry);
  return entry.id;
}

/** Audit rows the viewer may see: USG admins all, presidents their club (metadata only). */
export async function listAudit(
  viewer: Actor,
  filter: { orgId?: string; action?: AuditAction; limit?: number } = {},
): Promise<AuditEntry[]> {
  void viewer; // TODO(WP-4): scope by viewer.
  return events
    .filter((e) => (!filter.orgId || e.actingOrgId === filter.orgId) && (!filter.action || e.action === filter.action))
    .slice(-(filter.limit ?? 100))
    .reverse();
}
