// CLI only. Initialize a NEW, empty cloud demo database without dropping any schema or data.
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';
import { seed } from '../db/seed';

const APP_ROLE = 'trojanops_app';

async function main() {
  const ownerUrl = process.env.DATABASE_OWNER_URL;
  const password = process.env.DATABASE_APP_PASSWORD;
  if (!ownerUrl || !password) throw new Error('Set DATABASE_OWNER_URL and DATABASE_APP_PASSWORD locally before db:init.');
  const owner = postgres(ownerUrl, { max: 1, onnotice: () => {} });
  let app: ReturnType<typeof postgres> | undefined;
  try {
    const [existing] = await owner<{ count: number }[]>`
      select count(*)::int as count from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in ('public', 'drizzle') and c.relkind in ('r', 'p')
    `;
    if (existing.count) throw new Error('Database is not empty. Initialization refused; existing data was not changed.');

    const [role] = await owner<{ rolsuper: boolean; rolbypassrls: boolean }[]>`
      select rolsuper, rolbypassrls from pg_roles where rolname = ${APP_ROLE}
    `;
    if (role?.rolsuper || role?.rolbypassrls) throw new Error('The existing app role has elevated privileges. Use a restricted app role.');
    if (!role) {
      if (password.length < 24) throw new Error('Use a randomly generated app password of at least 24 characters.');
      // CREATE ROLE cannot bind a password parameter. PostgreSQL quotes the literal for us.
      const [ddl] = await owner<{ statement: string }[]>`
        select format('create role trojanops_app login password %L nosuperuser nobypassrls', ${password}::text) as statement
      `;
      await owner.unsafe(ddl.statement);
      console.log('Created restricted app role.');
    }

    const appUrl = new URL(ownerUrl);
    appUrl.username = APP_ROLE;
    appUrl.password = password;
    app = postgres(appUrl.toString(), { max: 1, onnotice: () => {} });
    // Check credentials before changing the empty database. Never rotate an existing role here.
    const [actor] = await app<{ name: string }[]>`select current_user as name`;
    if (actor.name !== APP_ROLE) throw new Error('App connection did not use the expected restricted role.');

    const db = drizzle(owner, { schema });
    await migrate(db, { migrationsFolder: 'db/migrations' });
    await seed(db);
    const [visible] = await app<{ count: number }[]>`select count(*)::int as count from documents`;
    if (visible.count !== 0) throw new Error('App role document isolation verification failed.');
    console.log('db:init done: migrated, seeded, and verified restricted app access.');
  } finally {
    await app?.end();
    await owner.end();
  }
}

main().catch(error => {
  // Database driver errors can include SQL or credentials; report only our explicit setup errors.
  console.error(error instanceof Error && error.constructor === Error
    ? error.message : 'Database initialization failed. Check credentials, database privileges and connectivity.');
  process.exitCode = 1;
});
