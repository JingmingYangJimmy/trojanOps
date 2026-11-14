// Owner: A. Spec: docs/architecture.md §5 "Orgs and people".
import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, primaryKey, text, unique, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, ts } from './columns';

export const orgs = pgTable('orgs', {
  id: id(),
  kind: text('kind').notNull().$type<'usg' | 'rso'>(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  status: text('status').notNull().default('active').$type<'active' | 'inactive'>(),
  createdAt: createdAt(),
}, (t) => [
  check('orgs_kind_check', sql`${t.kind} in ('usg', 'rso')`),
  check('orgs_status_check', sql`${t.status} in ('active', 'inactive')`),
]);

export const orgCohorts = pgTable('org_cohorts', {
  cohortSlug: text('cohort_slug').notNull(),
  orgId: uuid('org_id').notNull().references(() => orgs.id),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.cohortSlug, t.orgId] })]);

export const users = pgTable('users', {
  id: id(),
  externalId: text('external_id').notNull().unique(),
  displayName: text('display_name').notNull(),
  demoEmail: text('demo_email'),
  createdAt: createdAt(),
});

export const positions = pgTable('positions', {
  id: id(),
  orgId: uuid('org_id').notNull().references(() => orgs.id),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  isOfficer: boolean('is_officer').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [unique('positions_org_slug_unique').on(t.orgId, t.slug)]);

// Active = ended_at is null.
export const memberships = pgTable('memberships', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id),
  orgId: uuid('org_id').notNull().references(() => orgs.id),
  positionId: uuid('position_id').notNull().references(() => positions.id),
  source: text('source').notNull().$type<'roster' | 'manual'>(),
  startedAt: ts('started_at').notNull(),
  endedAt: ts('ended_at'),
  createdAt: createdAt(),
}, (t) => [check('memberships_source_check', sql`${t.source} in ('roster', 'manual')`)]);

// The holders of each position as last imported from the roster (§13 precedence). Several rows per
// position when it has several holders (e.g. member).
export const rosterState = pgTable('roster_state', {
  orgId: uuid('org_id').notNull().references(() => orgs.id),
  positionSlug: text('position_slug').notNull(),
  externalUserId: text('external_user_id').notNull(),
  importedAt: ts('imported_at').notNull(),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.orgId, t.positionSlug, t.externalUserId] })]);
