// Owner: D (WP-10). The csv roster: db/seed/roster.csv stands in for the EngageSC directory.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { RosterRow, RosterSource } from '../../contracts';

const COLUMNS = ['orgSlug', 'orgName', 'externalUserId', 'userDisplayName', 'position'] as const;

export function parseRosterCsv(text: string): RosterRow[] {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  if (header.split(',').join(',') !== COLUMNS.join(',')) {
    throw new Error(`roster.csv header must be: ${COLUMNS.join(',')}`);
  }
  return lines.filter((l) => l.trim()).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    return Object.fromEntries(COLUMNS.map((c, i) => [c, cells[i] ?? ''])) as unknown as RosterRow;
  });
}

export const csvRoster: RosterSource = {
  async fetch() {
    return parseRosterCsv(await readFile(path.join(process.cwd(), 'db', 'seed', 'roster.csv'), 'utf8'));
  },
};
