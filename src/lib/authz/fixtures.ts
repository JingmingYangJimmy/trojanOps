// Owner: A. STUB data until WP-3 reads memberships from the DB (real by H7). Mirrors §15.
import { ORG, USER } from '@db/seed/ids';

export const FIXTURE_ORG_NAMES: Record<string, string> = {
  [ORG.usg]: 'USG',
  [ORG.startup]: 'Startup Club',
  [ORG.archery]: 'Archery Club',
  [ORG.dance]: 'Dance Club',
};

export const FIXTURE_POSITION_NAMES: Record<string, string> = {
  admin: 'Admin',
  reviewer: 'Reviewer',
  president: 'President',
  treasurer: 'Treasurer',
  secretary: 'Secretary',
  member: 'Member',
};

export const FIXTURE_MEMBERSHIPS: Array<{ userId: string; orgId: string; position: string }> = [
  { userId: USER.avery, orgId: ORG.usg, position: 'admin' },
  { userId: USER.riley, orgId: ORG.usg, position: 'reviewer' },
  { userId: USER.sam, orgId: ORG.startup, position: 'president' },
  { userId: USER.taylor, orgId: ORG.startup, position: 'treasurer' },
  { userId: USER.taylor, orgId: ORG.startup, position: 'member' },
  { userId: USER.jordan, orgId: ORG.startup, position: 'member' },
  { userId: USER.casey, orgId: ORG.startup, position: 'member' },
  { userId: USER.morgan, orgId: ORG.archery, position: 'treasurer' },
  { userId: USER.morgan, orgId: ORG.startup, position: 'member' },
];

export const FIXTURE_PERSONAS: Array<{ userId: string; name: string; summary: string }> = [
  { userId: USER.avery, name: 'Avery', summary: 'USG admin' },
  { userId: USER.riley, name: 'Riley', summary: 'USG reviewer' },
  { userId: USER.sam, name: 'Sam', summary: 'Startup Club president' },
  { userId: USER.taylor, name: 'Taylor', summary: 'Startup Club treasurer and member' },
  { userId: USER.jordan, name: 'Jordan', summary: 'Startup Club member, incoming treasurer' },
  { userId: USER.casey, name: 'Casey', summary: 'Startup Club member' },
  { userId: USER.morgan, name: 'Morgan', summary: 'Archery Club treasurer, Startup Club member' },
  { userId: USER.lee, name: 'Lee', summary: 'No club' },
];
