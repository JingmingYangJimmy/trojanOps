// Owner: D. Spec: docs/architecture.md §5 and §9.
import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, ts } from './columns';
import type { ConnectorKind, ConnectorStatus } from '../../contracts';

export const connectors = pgTable('connectors', {
  kind: text('kind').primaryKey().$type<ConnectorKind>(),
  implementation: text('implementation').notNull(),
  status: text('status').notNull().$type<ConnectorStatus['status']>(),
  lastSyncAt: ts('last_sync_at'),
  details: jsonb('details').notNull().default({}),
  createdAt: createdAt(),
});
