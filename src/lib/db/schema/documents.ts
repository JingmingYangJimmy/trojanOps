// Owner: C. Spec: docs/architecture.md §5 "Documents". RLS and the read_grants trigger live in
// db/migrations/0001_roles_rls.sql; code never writes read_grants.
import { sql } from 'drizzle-orm';
import { check, foreignKey, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './columns';
import { orgs, users } from './orgs';
import type { Tier } from '../../contracts';

export type SourceKind = 'public' | 'minutes' | 'finance' | 'archive' | 'rulebook' | 'usg_internal';

export const sources = pgTable('sources', {
  id: id(),
  orgId: uuid('org_id').notNull().references(() => orgs.id),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  kind: text('kind').notNull().$type<SourceKind>(),
  createdAt: createdAt(),
}, (t) => [
  unique('sources_org_slug_unique').on(t.orgId, t.slug),
  unique('sources_id_org_unique').on(t.id, t.orgId),          // target of documents' composite FK
  check('sources_kind_check', sql`${t.kind} in ('public', 'minutes', 'finance', 'archive', 'rulebook', 'usg_internal')`),
]);

export const documents = pgTable('documents', {
  id: id(),
  orgId: uuid('org_id').notNull().references(() => orgs.id),
  sourceId: uuid('source_id').notNull(),                      // must be a source of org_id (FK below)
  title: text('title').notNull(),
  tier: text('tier').notNull().$type<Tier>(),
  allowedPositions: text('allowed_positions').array().notNull().default(sql`'{}'`),
  readGrants: text('read_grants').array().notNull().default(sql`'{}'`),   // set by trigger
  version: integer('version').notNull().default(1),
  bodyMd: text('body_md').notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: createdAt(),
}, (t) => [
  check('documents_tier_check', sql`${t.tier} in ('public', 'members', 'officers', 'usg_internal')`),
  foreignKey({ name: 'documents_source_org_fk', columns: [t.sourceId, t.orgId], foreignColumns: [sources.id, sources.orgId] }),
]);
