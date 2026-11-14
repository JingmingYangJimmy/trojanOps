// Owner: D (WP-2). The §15 personas and their memberships. Fictional people only (I13).
import { memberships, users } from '@/lib/db/schema';
import { now } from '@/lib/clock';
import type { SeedDb } from './index';
import { ORG, POSITION, USER } from './ids';

export async function seedPersonas(db: SeedDb): Promise<void> {
  const createdAt = now();
  await db.insert(users).values(
    (Object.keys(USER) as Array<keyof typeof USER>).map((key) => ({
      id: USER[key],
      externalId: key,
      displayName: key[0].toUpperCase() + key.slice(1),
      demoEmail: `${key}@demo.trojanops.test`,
      createdAt,
    })),
  );
  const m = (userId: string, orgId: string, positionId: string) => ({
    userId, orgId, positionId, source: 'roster' as const, startedAt: createdAt, createdAt,
  });
  await db.insert(memberships).values([
    m(USER.avery, ORG.usg, POSITION.usg.admin),
    m(USER.riley, ORG.usg, POSITION.usg.reviewer),
    m(USER.sam, ORG.startup, POSITION.startup.president),
    m(USER.taylor, ORG.startup, POSITION.startup.treasurer),
    m(USER.taylor, ORG.startup, POSITION.startup.member),
    m(USER.jordan, ORG.startup, POSITION.startup.member),
    m(USER.casey, ORG.startup, POSITION.startup.member),
    m(USER.morgan, ORG.archery, POSITION.archery.treasurer),
    m(USER.morgan, ORG.startup, POSITION.startup.member),
  ]);
}
