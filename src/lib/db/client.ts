// Owner: A. The app's only database handle. It connects as trojanops_app via DATABASE_URL, so RLS
// applies (I2). The owner URL is for scripts/db-reset.ts only.
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const globalForDb = globalThis as unknown as { trojanopsDb?: Db };

/** Lazily connects on first use; one pool per process (survives Next.js dev reloads). */
export function getDb(): Db {
  if (!globalForDb.trojanopsDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set (copy .env.example to .env)');
    globalForDb.trojanopsDb = drizzle(postgres(url, { max: 10 }), { schema });
  }
  return globalForDb.trojanopsDb;
}
