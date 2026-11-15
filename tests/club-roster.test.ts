// Club admin roster edits: add and remove members, create and assign positions, and turning an
// agent on or off. Real memberships, so grants and My agents change on the next call (I3).
import { sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { grantsFor } from '@/lib/authz';
import { AppError } from '@/lib/contracts';
import type { Tx } from '@/lib/db/client';
import { clubAdmin, myAgents, updateInstallation } from '@/lib/distribution';
import { addMember, assignPosition, createPosition, positionSlug, removeMember, unassignPosition } from '@/lib/lifecycle/members';
import { ACTIVE_ORG_COOKIE, PERSONA_COOKIE } from '@/lib/identity';
import * as membersRoute from '@/app/api/orgs/[orgId]/members/route';
import * as memberRoute from '@/app/api/orgs/[orgId]/members/[userId]/route';
import * as positionsRoute from '@/app/api/orgs/[orgId]/positions/route';
import * as holdersRoute from '@/app/api/orgs/[orgId]/positions/[positionSlug]/holders/route';
import * as holderRoute from '@/app/api/orgs/[orgId]/positions/[positionSlug]/holders/[userId]/route';
import { INSTALLATION, ORG, USER } from '@db/seed/ids';
import { actorFor, appSql, closeAppDb, inRolledBackApp } from './db';

const probe = await appSql(); await probe?.end();
afterAll(async () => { if (probe) await closeAppDb(); });

const sam = () => actorFor(USER.sam, ORG.startup);
const lastAudit = async (tx: Tx) => Number((await tx.execute(sql`select coalesce(max(id), 0) as id from audit_events`))[0].id);
const auditsSince = (tx: Tx, id: number) => tx.execute<{ action: string; target_type: string; target_id: string; actor_user_id: string; acting_org_id: string; details: Record<string, unknown> }>(
  sql`select * from audit_events where id > ${id} order by id`);
const slugsIn = async (userId: string, orgId: string) =>
  (await myAgents(userId)).find((c) => c.orgId === orgId)?.agents.map((a) => a.templateSlug) ?? [];
const activeRows = (tx: Tx, userId: string) => tx.execute<{ source: string; ended_at: Date | null; slug: string }>(sql`
  select m.source, m.ended_at, p.slug from memberships m join positions p on p.id = m.position_id
  where m.org_id = ${ORG.startup} and m.user_id = ${userId} order by p.slug, m.started_at`);
const code = async (p: Promise<unknown>) => {
  try { await p; } catch (err) { if (err instanceof AppError) return err.error.code; throw err; }
  throw new Error('expected an AppError');
};

describe('positionSlug', () => {
  it('derives a lowercase hyphenated slug from the name', () => {
    expect(positionSlug('Events Lead')).toBe('events-lead');
    expect(positionSlug('  Vice-President (Ops) ')).toBe('vice-president-ops');
    expect(positionSlug('Café Chair')).toBe('cafe-chair');
    expect(positionSlug('!!!')).toBe('');
  });
});

describe.skipIf(!probe)('addMember and removeMember', () => {
  it('adds Lee as a member, who then sees Startup’s member agents; removing him takes them away', () => inRolledBackApp(async (tx) => {
    expect(await myAgents(USER.lee)).toEqual([]);
    const from = await lastAudit(tx);
    const added = await addMember(await sam(), ORG.startup, { userId: USER.lee });
    expect(added).toEqual({ userId: USER.lee, positionSlug: 'member' });
    expect(await activeRows(tx, USER.lee)).toMatchObject([{ source: 'manual', ended_at: null, slug: 'member' }]);
    expect(await grantsFor(USER.lee, ORG.startup)).toEqual(['*', `${ORG.startup}:*`, `${ORG.startup}:member`]);
    expect(await slugsIn(USER.lee, ORG.startup)).toContain('handoff');
    expect(await slugsIn(USER.lee, ORG.startup)).not.toContain('funding-precheck');

    const removed = await removeMember(await sam(), ORG.startup, USER.lee);
    expect(removed.endedPositions).toEqual(['member']);
    expect((await activeRows(tx, USER.lee)).every((r) => r.ended_at !== null)).toBe(true);
    expect(await myAgents(USER.lee)).toEqual([]);
    expect(await grantsFor(USER.lee, ORG.startup)).toEqual(['*']);

    const events = await auditsSince(tx, from);
    expect(events.map((e) => e.action)).toEqual(['member.add', 'member.remove']);
    expect(events[0]).toMatchObject({ actor_user_id: USER.sam, acting_org_id: ORG.startup, target_type: 'user', target_id: USER.lee });
  }));

  it('finds a student by NetID and puts them in a named position', () => inRolledBackApp(async (tx) => {
    await addMember(await sam(), ORG.startup, { netId: 'LEE', positionSlug: 'secretary' });
    expect(await activeRows(tx, USER.lee)).toMatchObject([{ slug: 'secretary', ended_at: null }]);
    expect(await code(addMember(await sam(), ORG.startup, { netId: 'nobody' }))).toBe('not_found');
  }));

  it('refuses a student who is already a member and an unknown position', () => inRolledBackApp(async () => {
    expect(await code(addMember(await sam(), ORG.startup, { userId: USER.jordan }))).toBe('invalid');
    expect(await code(addMember(await sam(), ORG.startup, { userId: USER.lee, positionSlug: 'nope' }))).toBe('not_found');
  }));

  it('ends every position a member holds, and keeps their other clubs', () => inRolledBackApp(async (tx) => {
    await removeMember(await sam(), ORG.startup, USER.taylor);
    expect((await activeRows(tx, USER.taylor)).filter((r) => r.ended_at === null)).toEqual([]);
    expect(await grantsFor(USER.taylor, ORG.startup)).toEqual(['*']);
    await removeMember(await sam(), ORG.startup, USER.morgan);
    expect(await grantsFor(USER.morgan, ORG.archery)).toContain(`${ORG.archery}:treasurer`);
  }));

  it('will not remove the club’s only president, but will once there is another', () => inRolledBackApp(async () => {
    const actor = await sam();
    expect(await code(removeMember(actor, ORG.startup, USER.sam))).toBe('invalid');
    await assignPosition(actor, ORG.startup, 'president', USER.jordan);
    await removeMember(actor, ORG.startup, USER.sam);
    expect(await grantsFor(USER.sam, ORG.startup)).toEqual(['*']);
  }));

  it('refuses anyone but the president acting in the club, and audits the refusal', () => inRolledBackApp(async (tx) => {
    const from = await lastAudit(tx);
    expect(await code(addMember(await actorFor(USER.taylor, ORG.startup), ORG.startup, { userId: USER.lee }))).toBe('forbidden');
    expect(await code(removeMember(await actorFor(USER.jordan, ORG.startup), ORG.startup, USER.casey))).toBe('forbidden');
    expect(await code(addMember(await actorFor(USER.morgan, ORG.archery), ORG.startup, { userId: USER.lee }))).toBe('forbidden');
    expect(await code(addMember(await actorFor(USER.sam, ORG.hacksc), ORG.startup, { userId: USER.lee }))).toBe('forbidden');
    const events = await auditsSince(tx, from);
    expect(events.map((e) => e.action)).toEqual(['authz.denied', 'authz.denied', 'authz.denied', 'authz.denied']);
    expect(events[0].details).toMatchObject({ action: 'member.add' });
    expect(await activeRows(tx, USER.lee)).toEqual([]);
  }));

  it('re-reads the presidency, so an actor captured before a handoff can no longer edit', () => inRolledBackApp(async () => {
    const stale = await sam();
    await assignPosition(stale, ORG.startup, 'president', USER.jordan);
    await removeMember(await actorFor(USER.jordan, ORG.startup), ORG.startup, USER.sam);
    expect(await code(addMember(stale, ORG.startup, { userId: USER.lee }))).toBe('forbidden');
  }));
});

describe.skipIf(!probe)('createPosition, assignPosition and unassignPosition', () => {
  it('creates a position with a derived slug, assigns it and takes it back, auditing each', () => inRolledBackApp(async (tx) => {
    const actor = await sam();
    const from = await lastAudit(tx);
    expect(await createPosition(actor, ORG.startup, { name: 'Events Lead', isOfficer: true }))
      .toEqual({ slug: 'events-lead', name: 'Events Lead', isOfficer: true });
    expect(await assignPosition(actor, ORG.startup, 'events-lead', USER.casey)).toEqual({ changed: true });
    expect(await assignPosition(actor, ORG.startup, 'events-lead', USER.casey)).toEqual({ changed: false });
    expect(await grantsFor(USER.casey, ORG.startup)).toContain(`${ORG.startup}:events-lead`);
    const admin = await clubAdmin(actor, ORG.startup);
    expect(admin!.positions.find((p) => p.slug === 'events-lead')).toMatchObject({ isOfficer: true, holders: [{ userId: USER.casey }] });

    await unassignPosition(actor, ORG.startup, 'events-lead', USER.casey);
    expect(await grantsFor(USER.casey, ORG.startup)).not.toContain(`${ORG.startup}:events-lead`);
    expect(await grantsFor(USER.casey, ORG.startup)).toContain(`${ORG.startup}:*`);

    const events = await auditsSince(tx, from);
    expect(events.map((e) => e.action)).toEqual(['position.create', 'position.assign', 'position.assign', 'position.unassign']);
    expect(events[1].details).toMatchObject({ userId: USER.casey, changed: true });
    expect(events.every((e) => e.target_type === 'position')).toBe(true);
  }));

  it('refuses a duplicate name and a name with no letters or numbers', () => inRolledBackApp(async () => {
    const actor = await sam();
    expect(await code(createPosition(actor, ORG.startup, { name: 'Treasurer', isOfficer: true }))).toBe('invalid');
    await createPosition(actor, ORG.startup, { name: 'Events Lead', isOfficer: false });
    expect(await code(createPosition(actor, ORG.startup, { name: 'events  lead', isOfficer: false }))).toBe('invalid');
    expect(await code(createPosition(actor, ORG.startup, { name: '***', isOfficer: false }))).toBe('invalid');
  }));

  it('assigning a funding position opens the treasurer agent; unassigning closes it', () => inRolledBackApp(async () => {
    const actor = await sam();
    expect(await slugsIn(USER.jordan, ORG.startup)).not.toContain('funding-precheck');
    await assignPosition(actor, ORG.startup, 'treasurer', USER.jordan);
    expect(await slugsIn(USER.jordan, ORG.startup)).toContain('funding-precheck');
    await unassignPosition(actor, ORG.startup, 'treasurer', USER.jordan);
    expect(await slugsIn(USER.jordan, ORG.startup)).not.toContain('funding-precheck');
  }));

  it('refuses taking a member’s last position, the only presidency, and non-members', () => inRolledBackApp(async () => {
    const actor = await sam();
    expect(await code(unassignPosition(actor, ORG.startup, 'member', USER.jordan))).toBe('invalid');
    expect(await code(unassignPosition(actor, ORG.startup, 'president', USER.sam))).toBe('invalid');
    expect(await code(unassignPosition(actor, ORG.startup, 'treasurer', USER.jordan))).toBe('not_found');
    expect(await code(assignPosition(actor, ORG.startup, 'treasurer', USER.lee))).toBe('not_found');
    expect(await code(assignPosition(actor, ORG.startup, 'nope', USER.jordan))).toBe('not_found');
  }));

  it('refuses a non-president', () => inRolledBackApp(async () => {
    const taylor = await actorFor(USER.taylor, ORG.startup);
    expect(await code(createPosition(taylor, ORG.startup, { name: 'Events Lead', isOfficer: true }))).toBe('forbidden');
    expect(await code(assignPosition(taylor, ORG.startup, 'treasurer', USER.jordan))).toBe('forbidden');
    expect(await code(unassignPosition(taylor, ORG.startup, 'member', USER.taylor))).toBe('forbidden');
  }));
});

describe.skipIf(!probe)('turning an agent on or off', () => {
  it('hides a disabled agent from members’ My agents and shows it again when turned on', () => inRolledBackApp(async () => {
    const actor = await sam();
    expect(await slugsIn(USER.jordan, ORG.startup)).toContain('handoff');
    await updateInstallation(actor, INSTALLATION.startupHandoff, { enabled: false }, ORG.startup);
    expect(await slugsIn(USER.jordan, ORG.startup)).not.toContain('handoff');
    expect((await clubAdmin(actor, ORG.startup))!.agents.find((a) => a.installationId === INSTALLATION.startupHandoff)?.status).toBe('disabled');
    await updateInstallation(actor, INSTALLATION.startupHandoff, { enabled: true }, ORG.startup);
    expect(await slugsIn(USER.jordan, ORG.startup)).toContain('handoff');
  }));

  it('keeps a required agent on and refuses a non-president', () => inRolledBackApp(async () => {
    expect(await code(updateInstallation(await sam(), INSTALLATION.startupFundingPrecheck, { enabled: false }, ORG.startup))).toBe('clamp_violation');
    expect(await code(updateInstallation(await actorFor(USER.taylor, ORG.startup), INSTALLATION.startupHandoff, { enabled: false }, ORG.startup))).toBe('forbidden');
  }));
});

// The HTTP layer: who may call, JSON only, and the status codes the dialogs show.
const cookie = (userId: string, orgId: string) => `${PERSONA_COOKIE}=${userId}; ${ACTIVE_ORG_COOKIE}=${orgId}`;
type Handler<P> = (req: Request, ctx: { params: Promise<P> }) => Promise<Response>;
const call = <P,>(handler: Handler<P>, params: P, method: string, userId: string, body?: unknown, type = 'application/json') =>
  handler(new Request('http://localhost/api', {
    method, headers: { cookie: cookie(userId, ORG.startup), ...(body === undefined ? {} : { 'content-type': type }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), { params: Promise.resolve(params) });

describe.skipIf(!probe)('roster routes', () => {
  it('add, assign, unassign and remove through the routes', () => inRolledBackApp(async () => {
    const org = { orgId: ORG.startup };
    expect((await call(membersRoute.POST, org, 'POST', USER.sam, { userId: USER.lee })).status).toBe(200);
    const created = await call(positionsRoute.POST, org, 'POST', USER.sam, { name: 'Events Lead', isOfficer: true });
    expect(await created.json()).toEqual({ slug: 'events-lead', name: 'Events Lead', isOfficer: true });
    expect((await call(holdersRoute.POST, { ...org, positionSlug: 'events-lead' }, 'POST', USER.sam, { userId: USER.lee })).status).toBe(200);
    expect((await call(holderRoute.DELETE, { ...org, positionSlug: 'events-lead', userId: USER.lee }, 'DELETE', USER.sam)).status).toBe(200);
    const removed = await call(memberRoute.DELETE, { ...org, userId: USER.lee }, 'DELETE', USER.sam);
    expect(await removed.json()).toEqual({ endedPositions: ['member'] });
  }));

  it('answers 403 to a non-president, 400 to a bad body and to the last president, 404 to a non-member', () => inRolledBackApp(async () => {
    const org = { orgId: ORG.startup };
    const denied = await call(membersRoute.POST, org, 'POST', USER.taylor, { userId: USER.lee });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ code: 'forbidden' });
    expect((await call(positionsRoute.POST, org, 'POST', USER.sam, { name: 'X', isOfficer: true }, 'text/plain')).status).toBe(400);
    expect((await call(membersRoute.POST, org, 'POST', USER.sam, { userId: USER.lee, netId: 'lee' })).status).toBe(400);
    const last = await call(memberRoute.DELETE, { ...org, userId: USER.sam }, 'DELETE', USER.sam);
    expect(last.status).toBe(400);
    expect((await last.json()).message).toMatch(/only president/);
    expect((await call(memberRoute.DELETE, { ...org, userId: USER.lee }, 'DELETE', USER.sam)).status).toBe(404);
  }));
});
