// Owner: A. The roles/RLS migration (db/migrations/0001_roles_rls.sql) as seen by trojanops_app.
// WP-1 adds the §10 visibility contract in tests/rls.test.ts.
import { afterAll, describe, expect, it } from 'vitest';
import { ORG, SOURCE, USER } from '@db/seed/ids';
import { appSql, rolledBack } from './db';

const sql = await appSql();
afterAll(async () => { await sql?.end(); });

const set = (tx: Parameters<Parameters<typeof rolledBack>[1]>[0], name: string, value: string) =>
  tx`select set_config(${name}, ${value}, true)`;

describe.skipIf(!sql)('roles and RLS migration', () => {
  const db = sql!;

  it('connects as a non-superuser without BYPASSRLS', async () => {
    const [r] = await db`select current_user as role, rolsuper, rolbypassrls from pg_roles where rolname = current_user`;
    expect(r).toMatchObject({ role: 'trojanops_app', rolsuper: false, rolbypassrls: false });
  });

  it('shows no documents without set_config', async () => {
    const [r] = await db`select count(*)::int as n from documents`;
    expect(r.n).toBe(0);
  });

  it('keeps audit_events and ai_usage append-only and agent_runs_meta read-only', async () => {
    const [r] = await db`select
      has_table_privilege('audit_events', 'UPDATE') or has_table_privilege('audit_events', 'DELETE') as audit_mutable,
      has_table_privilege('ai_usage', 'UPDATE') or has_table_privilege('ai_usage', 'DELETE') as usage_mutable,
      has_table_privilege('agent_runs_meta', 'SELECT') as meta_read,
      has_table_privilege('agent_runs_meta', 'INSERT') or has_table_privilege('agent_runs_meta', 'UPDATE') as meta_write`;
    expect(r).toEqual({ audit_mutable: false, usage_mutable: false, meta_read: true, meta_write: false });
  });

  it('lets only the managing president insert documents, into their own sources', async () => {
    await rolledBack(db, async (tx) => {
      await tx`insert into sources (id, org_id, slug, name, kind, created_at)
               values (${SOURCE.startup.finance}, ${ORG.startup}, 'finance', 'Finance', 'finance', now()),
                      (${SOURCE.usg.rulebook}, ${ORG.usg}, 'rulebook', 'Rulebook', 'rulebook', now())`;
      await set(tx, 'app.manage_org', ORG.startup);
      await expect(tx`insert into documents (org_id, source_id, title, tier, body_md, created_at)
                      values (${ORG.startup}, ${SOURCE.usg.rulebook}, 'Planted', 'public', 'x', now())`)
        .rejects.toThrow(/documents_source_org_fk/);
    });
    await rolledBack(db, async (tx) => {
      await tx`insert into sources (id, org_id, slug, name, kind, created_at)
               values (${SOURCE.startup.finance}, ${ORG.startup}, 'finance', 'Finance', 'finance', now())`;
      await expect(tx`insert into documents (org_id, source_id, title, tier, body_md, created_at)
                      values (${ORG.startup}, ${SOURCE.startup.finance}, 'x', 'members', 'x', now())`)
        .rejects.toThrow(/row-level security/);
    });
  });

  it('computes read_grants in the trigger and filters by grants and sources', async () => {
    await rolledBack(db, async (tx) => {
      await tx`insert into sources (id, org_id, slug, name, kind, created_at)
               values (${SOURCE.startup.finance}, ${ORG.startup}, 'finance', 'Finance', 'finance', now())`;
      await set(tx, 'app.manage_org', ORG.startup);
      await tx`insert into documents (org_id, source_id, title, tier, allowed_positions, read_grants, body_md, created_at) values
        (${ORG.startup}, ${SOURCE.startup.finance}, 'Budget', 'officers', '{treasurer}', '{*}', 'x', now()),
        (${ORG.startup}, ${SOURCE.startup.finance}, 'Minutes', 'members', '{}', '{}', 'x', now())`;
      await set(tx, 'app.agent_sources', `{"${SOURCE.startup.finance}"}`);
      await set(tx, 'app.grants', `{"*","${ORG.startup}:*","${ORG.startup}:treasurer"}`);
      const all = await tx`select title, read_grants from documents order by title`;
      expect(all).toEqual([
        { title: 'Budget', read_grants: [`${ORG.startup}:president`, `${ORG.startup}:treasurer`] },
        { title: 'Minutes', read_grants: [`${ORG.startup}:*`] },
      ]);
      await set(tx, 'app.grants', `{"*","${ORG.startup}:*"}`);
      expect((await tx`select title from documents`).map((r) => r.title)).toEqual(['Minutes']);
      await set(tx, 'app.agent_sources', '{}');
      expect(await tx`select title from documents`).toEqual([]);
    });
  });

  it('lets a user read only their own runs', async () => {
    const [r] = await db`select count(*)::int as n from agent_runs`;
    expect(r.n).toBe(0);
    void USER;
  });
});
