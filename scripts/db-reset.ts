// pnpm db:reset — CLI only. Drops the public and drizzle schemas, migrates and seeds as the owner.
// The only code that reads DATABASE_OWNER_URL (I2). The trojanops_app role survives a reset.
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';
import { seed } from '../db/seed';

async function main() {
  const url = process.env.DATABASE_OWNER_URL;
  if (!url) throw new Error('DATABASE_OWNER_URL is not set (copy .env.example to .env)');
  const client = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(client, { schema });
  try {
    await db.execute(sql`drop schema if exists drizzle cascade`);
    await db.execute(sql`drop schema if exists public cascade`);
    await db.execute(sql`create schema public`);
    await migrate(db, { migrationsFolder: 'db/migrations' });
    await seed(db);
    console.log('db:reset done: migrated and seeded');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
