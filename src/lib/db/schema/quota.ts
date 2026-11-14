// Owner: A. Spec: docs/architecture.md §5 and §11. Amounts in micro-USD. ai_usage is append-only (I8).
import { sql } from 'drizzle-orm';
import { bigint, boolean, check, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, ts } from './columns';
import { orgs, users } from './orgs';
import { agentInstallations } from './distribution';
import type { QuotaScope } from '../../contracts';

export const quotaLimits = pgTable('quota_limits', {
  id: id(),
  scope: text('scope').notNull().$type<QuotaScope>(),
  orgId: uuid('org_id').references(() => orgs.id),
  userId: uuid('user_id').references(() => users.id),
  installationId: uuid('installation_id').references(() => agentInstallations.id),
  limitMicro: bigint('limit_micro', { mode: 'number' }).notNull(),
  setBy: uuid('set_by').references(() => users.id),
  setAt: ts('set_at').notNull(),
  createdAt: createdAt(),
}, (t) => [
  check('quota_limits_scope_check', sql`${t.scope} in ('platform', 'org', 'member', 'installation', 'student_daily')`),
]);

// No FK to agent_runs: a hold can be written before the run row exists.
export const aiUsage = pgTable('ai_usage', {
  id: id(),
  runId: uuid('run_id').notNull(),
  billedOrgId: uuid('billed_org_id').notNull().references(() => orgs.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  installationId: uuid('installation_id').notNull().references(() => agentInstallations.id),
  isPublic: boolean('is_public').notNull(),
  model: text('model'),
  kind: text('kind').notNull().$type<'hold' | 'settle' | 'release'>(),
  amountMicro: bigint('amount_micro', { mode: 'number' }).notNull(),
  createdAt: createdAt(),
}, (t) => [check('ai_usage_kind_check', sql`${t.kind} in ('hold', 'settle', 'release')`)]);
