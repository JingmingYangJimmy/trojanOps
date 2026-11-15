// Owner: D (WP-11). The clubs' departments and who is on each (§15). People are seed `externalId`s;
// the semester budgets stay with the directory content (src/lib/directory/content.ts), keyed by slug.
import { departmentMembers, departments } from '@/lib/db/schema';
import { now } from '@/lib/clock';
import type { SeedDb } from './index';
import { DEPARTMENT, ORG, USER } from './ids';

type Person = keyof typeof USER;

interface DepartmentSeed {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  purpose: string;
  about: string[];
  lead: Person | null;
  members: Person[];
}

export const DEPARTMENT_SEEDS: readonly DepartmentSeed[] = [
  {
    id: DEPARTMENT.startup.events, orgId: ORG.startup, slug: 'events', name: 'Events',
    purpose: 'Plans Pitch night, the speaker series and Demo day: rooms, catering and the run of show.',
    about: [
      'Events books rooms at least four weeks ahead, runs check-in and keeps the timer on pitch nights.',
      'Catering needs a named officer on site to receive the order, so every event lists one in its run of show.',
    ],
    lead: 'casey', members: ['casey', 'jordan'],
  },
  {
    id: DEPARTMENT.startup.finance, orgId: ORG.startup, slug: 'finance', name: 'Finance',
    purpose: 'Keeps the budget, files USG funding requests and settles invoices after each event.',
    about: [
      'Finance drafts each USG funding request and runs it through Funding pre-check before the Wednesday deadline.',
      'Receipts and final invoices go to the treasurer within three business days of each event.',
    ],
    lead: 'taylor', members: ['taylor', 'jordan'],
  },
  {
    id: DEPARTMENT.startup.marketing, orgId: ORG.startup, slug: 'marketing', name: 'Marketing and recruiting',
    purpose: 'Runs info sessions, the interest form and the posters for every event.',
    about: [
      'Marketing and recruiting runs the info sessions in the first three weeks of each semester and keeps the interest form open between them.',
    ],
    lead: 'morgan', members: ['morgan', 'casey'],
  },
  {
    id: DEPARTMENT.archery.range, orgId: ORG.archery, slug: 'range', name: 'Range operations',
    purpose: 'Books range time, keeps the equipment log and runs the safety briefing.',
    about: ['Range operations runs the safety briefing at the start of every session and checks out club bows.'],
    lead: null, members: [],
  },
  {
    id: DEPARTMENT.archery.finance, orgId: ORG.archery, slug: 'finance', name: 'Finance',
    purpose: 'Keeps the budget and pays range fees.',
    about: ['Finance pays range fees for the year up front and tracks equipment purchases.'],
    lead: 'morgan', members: ['morgan'],
  },
  {
    id: DEPARTMENT.dance.choreography, orgId: ORG.dance, slug: 'choreography', name: 'Choreography',
    purpose: 'Sets the pieces and runs rehearsals for the showcase.',
    about: ['Choreography sets each showcase piece and runs the weekly rehearsals.'],
    lead: null, members: [],
  },
  {
    id: DEPARTMENT.dance.production, orgId: ORG.dance, slug: 'production', name: 'Production',
    purpose: 'Lighting, sound, costumes and the showcase run of show.',
    about: ['Production works with the venue on lighting and sound and keeps the costume inventory.'],
    lead: null, members: [],
  },
  {
    id: DEPARTMENT.hacksc.events, orgId: ORG.hacksc, slug: 'events', name: 'Events',
    purpose: 'Owns venue reservations, the organizer checklist and the event run of show.',
    about: ['Events turns the previous team’s handoff into a reservation checklist, named owners and a rehearsal before doors open.'],
    lead: 'sam', members: ['sam', 'jordan'],
  },
  {
    id: DEPARTMENT.hacksc.finance, orgId: ORG.hacksc, slug: 'finance', name: 'Finance',
    purpose: 'Tracks approvals and expenses; financial documents remain limited to authorized officers.',
    about: ['Finance prepares funding requests and reconciles receipts. Department membership alone does not grant access to financial documents.'],
    lead: 'taylor', members: ['taylor'],
  },
  {
    id: DEPARTMENT.hacksc.participantExperience, orgId: ORG.hacksc, slug: 'participant-experience', name: 'Participant experience',
    purpose: 'Coordinates registration, check-in volunteers and separate help queues.',
    about: ['Participant experience practices the arrival flow with Events and documents issues for the next team.'],
    lead: 'casey', members: ['casey', 'jordan'],
  },
];

const departmentRows = (createdAt: Date) => DEPARTMENT_SEEDS.map((d) => ({
  id: d.id, orgId: d.orgId, slug: d.slug, name: d.name, purpose: d.purpose, about: d.about,
  leadUserId: d.lead ? USER[d.lead] : null, createdAt,
}));
const memberRows = (createdAt: Date) => DEPARTMENT_SEEDS.flatMap((d) =>
  d.members.map((person) => ({ departmentId: d.id, userId: USER[person], createdAt })));

export async function seedDepartments(db: SeedDb): Promise<void> {
  const createdAt = now();
  await db.insert(departments).values(departmentRows(createdAt));
  await db.insert(departmentMembers).values(memberRows(createdAt));
}

/** Owner CLI only (scripts/demo-setup.ts): adds the seed departments to a database that predates
 * them. Rows that already exist are kept. */
export async function seedMissingDepartments(db: SeedDb): Promise<void> {
  const createdAt = now();
  await db.insert(departments).values(departmentRows(createdAt)).onConflictDoNothing();
  await db.insert(departmentMembers).values(memberRows(createdAt)).onConflictDoNothing();
}
