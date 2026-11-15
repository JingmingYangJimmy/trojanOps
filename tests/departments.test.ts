// Owner: D (WP-11). A club's departments as its president manages them: create, edit, archive and
// membership, through the services and the §14 routes. Who may write, that the path's club bounds
// every lookup, slug uniqueness, the audit rows, and that the directory reads what was written.
import { sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as departmentsRoute from '@/app/api/orgs/[orgId]/departments/route';
import * as departmentRoute from '@/app/api/orgs/[orgId]/departments/[slug]/route';
import * as membersRoute from '@/app/api/orgs/[orgId]/departments/[slug]/members/route';
import * as memberRoute from '@/app/api/orgs/[orgId]/departments/[slug]/members/[userId]/route';
import { resetClockForTests, setDemoNow } from '@/lib/clock';
import { AppError } from '@/lib/contracts';
import type { Tx } from '@/lib/db/client';
import {
  addDepartmentMember, archiveDepartment, createDepartment, departmentSlug, removeDepartmentMember, updateDepartment,
} from '@/lib/directory/departments';
import { clubDashboard, departmentDashboard, departmentLinks, departmentsDirectory } from '@/lib/directory/service';
import { ACTIVE_ORG_COOKIE, PERSONA_COOKIE } from '@/lib/identity';
import { DEPARTMENT, ORG, USER } from '@db/seed/ids';
import { actorFor, appSql, closeAppDb, inRolledBackApp } from './db';

const probe = await appSql();
await probe?.end();
afterAll(async () => {
  if (probe) await closeAppDb();
});

const demoMode = process.env.DEMO_MODE;
beforeEach(() => {
  process.env.DEMO_MODE = '1';
  setDemoNow(new Date('2026-11-15T10:00:00-08:00'));
});
afterEach(() => {
  if (demoMode === undefined) delete process.env.DEMO_MODE; else process.env.DEMO_MODE = demoMode;
  resetClockForTests();
});

const sam = () => actorFor(USER.sam, ORG.startup);
const code = (code: string) => (e: unknown) => e instanceof AppError && e.error.code === code;
const lastAuditId = async (tx: Tx) => Number((await tx.execute(sql`select coalesce(max(id), 0) as id from audit_events`))[0].id);
const auditSince = (tx: Tx, id: number) =>
  tx.execute<{ action: string; actor_user_id: string; acting_org_id: string; target_type: string; target_id: string; details: Record<string, unknown> }>(
    sql`select * from audit_events where id > ${id} order by id`);

type Handler<P> = (req: Request, ctx: { params: Promise<P> }) => Promise<Response>;
const call = <P extends Record<string, string>>(handler: Handler<P>, method: string, params: P, as: { user?: string; org?: string }, body?: unknown) =>
  handler(new Request('http://localhost/api', {
    method,
    headers: {
      cookie: [as.user && `${PERSONA_COOKIE}=${as.user}`, as.org && `${ACTIVE_ORG_COOKIE}=${as.org}`].filter(Boolean).join('; '),
      ...(body !== undefined && { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), { params: Promise.resolve(params) });

describe('departmentSlug', () => {
  it('derives a URL slug from the name', () => {
    expect(departmentSlug('Marketing and recruiting')).toBe('marketing-and-recruiting');
    expect(departmentSlug('  Café & Events!  ')).toBe('cafe-events');
    expect(departmentSlug('???')).toBe('');
  });
});

describe.skipIf(!probe)('departments · seed', () => {
  it('seeds the directory’s departments with their leads and members', async () => {
    const view = (await departmentsDirectory(await sam()))!;
    expect(view.departments.map((d) => [d.slug, d.lead?.name ?? null, d.memberCount])).toEqual([
      ['events', 'Casey', 2], ['finance', 'Taylor', 2], ['marketing', 'Morgan', 2],
    ]);
    expect(await departmentLinks(ORG.archery)).toEqual([{ slug: 'finance', name: 'Finance' }, { slug: 'range', name: 'Range operations' }]);
    expect(await departmentLinks(null)).toEqual([]);
  });
});

describe.skipIf(!probe)('departments · president writes', () => {
  it('creates a department, shows it in the directory and audits it', () => inRolledBackApp(async (tx) => {
    const from = await lastAuditId(tx);
    const created = await createDepartment(await sam(), ORG.startup, {
      name: 'Partnerships', purpose: 'Finds sponsors for Pitch night.', about: ['Partnerships keeps the sponsor list.', ''],
    });
    expect(created.slug).toBe('partnerships');

    const dashboard = (await departmentDashboard(await actorFor(USER.casey, ORG.startup), ORG.startup, 'partnerships'))!;
    expect(dashboard.department).toEqual({
      slug: 'partnerships', name: 'Partnerships', purpose: 'Finds sponsors for Pitch night.', about: ['Partnerships keeps the sponsor list.'],
    });
    expect(dashboard).toMatchObject({ lead: null, members: [], candidates: null });
    const club = (await clubDashboard(await actorFor(USER.casey, ORG.startup), ORG.startup))!;
    expect(club.departments?.map((d) => d.slug)).toEqual(['events', 'finance', 'marketing', 'partnerships']);
    // A new department has no budget lines yet; the president sees an empty one.
    const asSam = (await departmentsDirectory(await sam()))!;
    expect(asSam.departments.find((d) => d.slug === 'partnerships')?.budget).toEqual({ allocatedMicro: 0, committedMicro: 0 });

    const rows = await auditSince(tx, from);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'department.create', actor_user_id: USER.sam, acting_org_id: ORG.startup, target_type: 'department', target_id: created.id,
      details: { slug: 'partnerships' },
    });
  }));

  it('refuses a second department with the same name or slug, but reuses an archived slug', () => inRolledBackApp(async () => {
    const president = await sam();
    for (const name of ['Events', 'events', 'EVENTS!']) {
      await expect(createDepartment(president, ORG.startup, { name, purpose: '', about: [] })).rejects.toSatisfy(code('invalid'));
    }
    // Another club's slug is free.
    await expect(createDepartment(president, ORG.startup, { name: 'Range operations', purpose: '', about: [] }))
      .resolves.toMatchObject({ slug: 'range-operations' });
    await expect(createDepartment(president, ORG.startup, { name: '!!!', purpose: '', about: [] })).rejects.toSatisfy(code('invalid'));

    await archiveDepartment(president, ORG.startup, 'marketing');
    await expect(createDepartment(president, ORG.startup, { name: 'Marketing', purpose: 'Posters.', about: [] }))
      .resolves.toMatchObject({ slug: 'marketing' });
    const marketing = (await departmentDashboard(president, ORG.startup, 'marketing'))!;
    expect(marketing.department.name).toBe('Marketing');
    expect(marketing.members).toEqual([]);
  }));

  it('edits name, purpose, about and lead, keeping the slug', () => inRolledBackApp(async (tx) => {
    const president = await sam();
    const from = await lastAuditId(tx);
    await updateDepartment(president, ORG.startup, 'events', {
      name: 'Events and logistics', purpose: 'Rooms, catering and the run of show.', about: ['One paragraph.'], leadUserId: USER.jordan,
    });
    const events = (await departmentDashboard(president, ORG.startup, 'events'))!;
    expect(events.department).toMatchObject({ slug: 'events', name: 'Events and logistics', purpose: 'Rooms, catering and the run of show.', about: ['One paragraph.'] });
    expect(events.lead?.name).toBe('Jordan');
    // Events keeps its events and budget under the same slug.
    expect(events.events.map((e) => e.title)).toContain('Pitch night');
    expect(events.budget?.lines.map((l) => l.label)).toContain('Pitch night');

    await expect(updateDepartment(president, ORG.startup, 'events', { name: 'Finance' })).rejects.toSatisfy(code('invalid'));
    // The lead has to be on the department.
    await expect(updateDepartment(president, ORG.startup, 'events', { leadUserId: USER.taylor })).rejects.toSatisfy(code('invalid'));
    await updateDepartment(president, ORG.startup, 'events', { leadUserId: null });
    expect((await departmentDashboard(president, ORG.startup, 'events'))!.lead).toBeNull();

    const rows = await auditSince(tx, from);
    expect(rows.map((r) => r.action)).toEqual(['department.update', 'department.update']);
    expect(rows[0].details).toMatchObject({ slug: 'events', fields: ['name', 'purpose', 'about', 'leadUserId'], leadUserId: USER.jordan });
    expect(rows[0].target_id).toBe(DEPARTMENT.startup.events);
  }));

  it('archives a department: it leaves the directory, nav and events, and can’t be edited', () => inRolledBackApp(async (tx) => {
    const president = await sam();
    const from = await lastAuditId(tx);
    await archiveDepartment(president, ORG.startup, 'marketing');
    expect((await departmentsDirectory(president))!.departments.map((d) => d.slug)).toEqual(['events', 'finance']);
    expect((await departmentLinks(ORG.startup)).map((d) => d.slug)).toEqual(['events', 'finance']);
    expect(await departmentDashboard(president, ORG.startup, 'marketing')).toBeNull();
    const club = (await clubDashboard(president, ORG.startup))!;
    expect(club.events.find((e) => e.title === 'Fall info session')?.department).toBeNull();
    await expect(archiveDepartment(president, ORG.startup, 'marketing')).rejects.toSatisfy(code('not_found'));
    await expect(updateDepartment(president, ORG.startup, 'marketing', { name: 'X' })).rejects.toSatisfy(code('not_found'));
    const [row] = await auditSince(tx, from);
    expect(row).toMatchObject({ action: 'department.archive', target_id: DEPARTMENT.startup.marketing });
    const [stored] = await tx.execute(sql`select archived_at from departments where id = ${DEPARTMENT.startup.marketing}`);
    expect(stored.archived_at).not.toBeNull();
  }));

  it('adds and removes members; removing the lead opens the role', () => inRolledBackApp(async (tx) => {
    const president = await sam();
    const before = (await departmentDashboard(president, ORG.startup, 'finance'))!;
    expect(before.members.map((m) => m.name)).toEqual(['Jordan', 'Taylor']);
    expect(before.candidates?.map((m) => m.name)).toEqual(['Casey', 'Morgan', 'Sam']);

    const from = await lastAuditId(tx);
    expect(await addDepartmentMember(president, ORG.startup, 'finance', USER.casey)).toEqual({ added: true });
    expect(await addDepartmentMember(president, ORG.startup, 'finance', USER.casey)).toEqual({ added: false });
    expect(await removeDepartmentMember(president, ORG.startup, 'finance', USER.taylor)).toEqual({ removed: true });

    const after = (await departmentDashboard(president, ORG.startup, 'finance'))!;
    expect(after.members.map((m) => m.name)).toEqual(['Casey', 'Jordan']);
    expect(after.lead).toBeNull();
    expect(after.candidates?.map((m) => m.name)).toEqual(['Morgan', 'Sam', 'Taylor']);

    const rows = await auditSince(tx, from);
    expect(rows.map((r) => [r.action, r.details.userId, r.details.changed ?? r.details.wasLead])).toEqual([
      ['department.member.add', USER.casey, true],
      ['department.member.add', USER.casey, false],
      ['department.member.remove', USER.taylor, true],
    ]);

    // Only current members of the club; Lee and Avery are not in Startup.
    for (const outsider of [USER.lee, USER.avery]) {
      await expect(addDepartmentMember(president, ORG.startup, 'finance', outsider)).rejects.toSatisfy(code('invalid'));
    }
    await expect(removeDepartmentMember(president, ORG.startup, 'finance', USER.lee)).rejects.toSatisfy(code('not_found'));
  }));
});

describe.skipIf(!probe)('departments · authorization', () => {
  it('refuses everyone but the president acting in the club, and audits the refusal', () => inRolledBackApp(async (tx) => {
    const from = await lastAuditId(tx);
    const refused = [
      await actorFor(USER.taylor, ORG.startup), // treasurer
      await actorFor(USER.casey, ORG.startup), // member
      await actorFor(USER.avery, ORG.usg), // USG admin
      await actorFor(USER.sam, ORG.hacksc), // president, but acting in another club
    ];
    for (const actor of refused) {
      await expect(createDepartment(actor, ORG.startup, { name: 'Shadow', purpose: '', about: [] })).rejects.toSatisfy(code('forbidden'));
      await expect(updateDepartment(actor, ORG.startup, 'events', { name: 'Shadow' })).rejects.toSatisfy(code('forbidden'));
      await expect(archiveDepartment(actor, ORG.startup, 'events')).rejects.toSatisfy(code('forbidden'));
      await expect(addDepartmentMember(actor, ORG.startup, 'events', USER.taylor)).rejects.toSatisfy(code('forbidden'));
      await expect(removeDepartmentMember(actor, ORG.startup, 'events', USER.jordan)).rejects.toSatisfy(code('forbidden'));
    }
    const rows = await auditSince(tx, from);
    expect(rows).toHaveLength(refused.length * 5);
    expect(rows.every((r) => r.action === 'authz.denied' && r.target_type === 'org' && r.target_id === ORG.startup)).toBe(true);
    expect((await departmentDashboard(await sam(), ORG.startup, 'events'))!.department.name).toBe('Events');
  }));

  it('never reaches another club’s department through this club’s path', () => inRolledBackApp(async (tx) => {
    const president = await sam();
    // Range operations is Archery's; under Startup's path it does not exist.
    await expect(updateDepartment(president, ORG.startup, 'range', { name: 'Taken' })).rejects.toSatisfy(code('not_found'));
    await expect(archiveDepartment(president, ORG.startup, 'range')).rejects.toSatisfy(code('not_found'));
    // Sam is HackSC's president too; acting in Startup, HackSC's path is refused.
    await expect(updateDepartment(president, ORG.hacksc, 'events', { name: 'Taken' })).rejects.toSatisfy(code('forbidden'));
    await expect(archiveDepartment(president, ORG.archery, 'range')).rejects.toSatisfy(code('forbidden'));
    // Archiving Startup's Finance leaves Archery's and HackSC's Finance alone.
    await archiveDepartment(president, ORG.startup, 'finance');
    const live = await tx.execute(sql`select org_id from departments where slug = 'finance' and archived_at is null order by org_id`);
    expect(live.map((r) => r.org_id)).toEqual([ORG.archery, ORG.hacksc]);
  }));
});

describe.skipIf(!probe)('departments · routes', () => {
  const asSam = { user: USER.sam, org: ORG.startup };

  it('creates, edits, staffs and archives a department over HTTP', () => inRolledBackApp(async () => {
    let res = await call(departmentsRoute.POST, 'POST', { orgId: ORG.startup }, asSam, { name: 'Design', purpose: 'Decks and posters.' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ slug: 'design' });

    res = await call(membersRoute.POST, 'POST', { orgId: ORG.startup, slug: 'design' }, asSam, { userId: USER.casey });
    expect(await res.json()).toEqual({ added: true });

    res = await call(departmentRoute.PATCH, 'PATCH', { orgId: ORG.startup, slug: 'design' }, asSam, { leadUserId: USER.casey, about: ['Brand and print.'] });
    expect(res.status).toBe(200);
    const design = (await departmentDashboard(await sam(), ORG.startup, 'design'))!;
    expect(design).toMatchObject({ lead: { name: 'Casey' }, department: { about: ['Brand and print.'] } });

    res = await call(memberRoute.DELETE, 'DELETE', { orgId: ORG.startup, slug: 'design', userId: USER.casey }, asSam);
    expect(await res.json()).toEqual({ removed: true });

    res = await call(departmentRoute.DELETE, 'DELETE', { orgId: ORG.startup, slug: 'design' }, asSam);
    expect(res.status).toBe(200);
    expect(await departmentDashboard(await sam(), ORG.startup, 'design')).toBeNull();
  }));

  it('answers 401, 403, 404 and 400 as the service decides', () => inRolledBackApp(async () => {
    const create = (as: { user?: string; org?: string }, body: unknown) => call(departmentsRoute.POST, 'POST', { orgId: ORG.startup }, as, body);
    expect((await create({}, { name: 'X' })).status).toBe(401);
    const taylor = await create({ user: USER.taylor, org: ORG.startup }, { name: 'X' });
    expect(taylor.status).toBe(403);
    expect(await taylor.json()).toMatchObject({ code: 'forbidden' });
    expect((await create(asSam, { name: 'Events' })).status).toBe(400);
    expect((await create(asSam, { name: '' })).status).toBe(400);
    expect((await create(asSam, { name: 'X', slug: 'x' })).status).toBe(400); // unknown field
    expect((await call(departmentRoute.PATCH, 'PATCH', { orgId: ORG.startup, slug: 'range' }, asSam, { name: 'X' })).status).toBe(404);
    expect((await call(departmentRoute.PATCH, 'PATCH', { orgId: ORG.archery, slug: 'range' }, asSam, { name: 'X' })).status).toBe(403);
    expect((await call(membersRoute.POST, 'POST', { orgId: ORG.startup, slug: 'events' }, asSam, { userId: 'nope' })).status).toBe(400);
    expect((await call(memberRoute.DELETE, 'DELETE', { orgId: ORG.startup, slug: 'events', userId: 'nope' }, asSam)).status).toBe(404);
  }));
});
