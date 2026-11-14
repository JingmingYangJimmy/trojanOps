import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// DB integration tests read DATABASE_URL (app role) from .env.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  resolve: {
    alias: {
      '@/': fileURLToPath(new URL('./src/', import.meta.url)),
      '@db/': fileURLToPath(new URL('./db/', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
  },
});
