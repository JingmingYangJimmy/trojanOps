// Owner: D (WP-2). Seed runner, called by scripts/db-reset.ts with the owner connection.
// Each stream fills only its own db/seed/<area>.ts. Ids come from ./ids.
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '@/lib/db/schema';
import { seedOrgs } from './orgs';
import { seedPersonas } from './personas';
import { seedDistribution } from './distribution';
import { seedDocuments } from './documents';
import { seedQuota } from './quota';

export type SeedDb = PostgresJsDatabase<typeof schema>;

export async function seed(db: SeedDb): Promise<void> {
  await seedOrgs(db);        // D
  await seedPersonas(db);    // D
  await seedDistribution(db); // B
  await seedDocuments(db);   // C
  await seedQuota(db);       // A
}
