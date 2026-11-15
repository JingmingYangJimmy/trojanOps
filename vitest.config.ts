import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// DB integration tests read DATABASE_URL (app role) from .env.
if (existsSync('.env')) process.loadEnvFile('.env');

// Forward slashes on every OS: Windows paths with backslashes break the alias replacement.
const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url)).replaceAll('\\', '/');

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: dir('./src/') },
      { find: /^@db\//, replacement: dir('./db/') },
    ],
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
  },
});
