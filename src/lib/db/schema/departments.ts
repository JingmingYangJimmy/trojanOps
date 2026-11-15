// Spec: docs/architecture.md §5 "Departments". A club's departments and who is on each, managed by
// the club's president. Archived departments keep their rows (and their audit trail); a slug is
// unique among a club's live departments only, so an archived slug can be reused.
import { sql } from 'drizzle-orm';
import { pgTable, primaryKey, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, ts } from './columns';
import { orgs, users } from './orgs';

export const departments = pgTable('departments', {
  id: id(),
  orgId: uuid('org_id').notNull().references(() => orgs.id),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  purpose: text('purpose').notNull().default(''),
  about: text('about').array().notNull().default(sql`'{}'::text[]`),
  /** Must be on the department; cleared when they leave it. */
  leadUserId: uuid('lead_user_id').references(() => users.id),
  archivedAt: ts('archived_at'),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex('departments_org_slug_live_unique').on(t.orgId, t.slug).where(sql`${t.archivedAt} is null`),
]);

// Bookkeeping like roster_state: removing someone deletes the row; the audit log keeps the history.
export const departmentMembers = pgTable('department_members', {
  departmentId: uuid('department_id').notNull().references(() => departments.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.departmentId, t.userId] })]);
