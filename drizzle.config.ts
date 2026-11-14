import { defineConfig } from 'drizzle-kit';

// Migrate and seed CLI only: the owner URL never reaches app code (I2).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema/index.ts',
  out: './db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_OWNER_URL ?? 'postgres://postgres:postgres@localhost:5432/trojanops',
  },
});
