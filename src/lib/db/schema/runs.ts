// Owner: A. Spec: docs/architecture.md §5 "Runs, quota, audit". agent_runs has forced RLS: a user
// reads only their own runs (I15). Club and USG pages read agent_runs_meta instead.
import { sql } from 'drizzle-orm';
import { bigint, check, integer, jsonb, pgTable, pgView, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, ts } from './columns';
import { orgs, users } from './orgs';
import { agentInstallations } from './distribution';

export type RunStatus = 'running' | 'completed' | 'blocked' | 'failed';

export const agentRuns = pgTable('agent_runs', {
  id: id(),
  installationId: uuid('installation_id').notNull().references(() => agentInstallations.id),
  templateVersion: integer('template_version').notNull(),
  rulePackVersion: integer('rule_pack_version'),
  orgId: uuid('org_id').notNull().references(() => orgs.id),
  billedOrgId: uuid('billed_org_id').notNull().references(() => orgs.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  input: text('input').notNull(),
  output: jsonb('output'),
  accessibleDocumentIds: uuid('accessible_document_ids').array().notNull().default(sql`'{}'`),
  citedDocumentIds: uuid('cited_document_ids').array().notNull().default(sql`'{}'`),
  model: text('model'),
  costMicro: bigint('cost_micro', { mode: 'number' }).notNull().default(0),
  status: text('status').notNull().$type<RunStatus>(),
  startedAt: ts('started_at').notNull(),
  finishedAt: ts('finished_at'),
  createdAt: createdAt(),
});

// Defined in db/migrations/0001_roles_rls.sql: every agent_runs column except input and output.
export const agentRunsMeta = pgView('agent_runs_meta', {
  id: uuid('id').notNull(),
  installationId: uuid('installation_id').notNull(),
  templateVersion: integer('template_version').notNull(),
  rulePackVersion: integer('rule_pack_version'),
  orgId: uuid('org_id').notNull(),
  billedOrgId: uuid('billed_org_id').notNull(),
  userId: uuid('user_id').notNull(),
  accessibleDocumentIds: uuid('accessible_document_ids').array().notNull(),
  citedDocumentIds: uuid('cited_document_ids').array().notNull(),
  model: text('model'),
  costMicro: bigint('cost_micro', { mode: 'number' }).notNull(),
  status: text('status').notNull().$type<RunStatus>(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}).existing();

export const pendingActions = pgTable('pending_actions', {
  id: id(),
  runId: uuid('run_id').notNull().references(() => agentRuns.id),
  orgId: uuid('org_id').notNull().references(() => orgs.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  tool: text('tool').notNull(),
  args: jsonb('args').notNull(),
  status: text('status').notNull().default('pending').$type<'pending' | 'confirmed' | 'rejected'>(),
  confirmedBy: uuid('confirmed_by').references(() => users.id),
  confirmedAt: ts('confirmed_at'),
  createdAt: createdAt(),
}, (t) => [check('pending_actions_status_check', sql`${t.status} in ('pending', 'confirmed', 'rejected')`)]);
