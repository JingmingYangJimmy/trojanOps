// Owner: A. Spec: docs/architecture.md §5 and §12. Append-only (I8); details hold ids and numbers only.
import { bigserial, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { ts } from './columns';
import type { AuditAction } from '../../contracts';

// `ts` is this table's created_at.
export const auditEvents = pgTable('audit_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  ts: ts('ts').notNull(),
  actorUserId: uuid('actor_user_id'),
  actingOrgId: uuid('acting_org_id'),
  action: text('action').notNull().$type<AuditAction>(),
  runId: uuid('run_id'),
  installationId: uuid('installation_id'),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  details: jsonb('details').notNull().default({}),
});
