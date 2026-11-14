// Owner: A. Helpers for DB integration tests. They connect as trojanops_app (DATABASE_URL), never as
// the owner. When the database is unreachable, DB suites are skipped with a notice instead of failing,
// so `pnpm check` still runs without Docker; CI and the H-sync runs keep Docker up.
import postgres from 'postgres';

export async function appSql(): Promise<postgres.Sql | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const sql = postgres(url, { max: 2, connect_timeout: 2, onnotice: () => {} });
  try {
    await sql`select 1`;
    return sql;
  } catch {
    await sql.end({ timeout: 1 });
    console.warn('DB integration tests skipped: database unreachable (run pnpm db:up && pnpm db:reset)');
    return null;
  }
}

/** Runs fn in a transaction that is always rolled back. */
export async function rolledBack(sql: postgres.Sql, fn: (tx: postgres.TransactionSql) => Promise<void>): Promise<void> {
  const rollback = new Error('rollback');
  await sql.begin(async (tx) => {
    await fn(tx);
    throw rollback;
  }).catch((err) => {
    if (err !== rollback) throw err;
  });
}
