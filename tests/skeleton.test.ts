// Owner: A. WP-0: every cross-stream interface resolves at its real path with its final shape, and
// the pure spec tables (capGrants §5, explainAccess §10) hold. Owners replace stubs, not these imports.
import { afterEach, describe, expect, it } from 'vitest';
import { capGrants, grantsFor } from '@/lib/authz';
import { now, resetClockForTests } from '@/lib/clock';
import { AppError } from '@/lib/contracts';
import { pgTextArray } from '@/lib/db/with-actor';
import { canUse, directory, effectiveAgent, myAgents, provisionOrg, publishToAllStudents } from '@/lib/distribution';
import { explainAccess, listAccessibleDocuments } from '@/lib/documents/access';
import { previewAccess } from '@/lib/documents/preview';
import { runAgent } from '@/lib/gateway';
import { audit, listAudit } from '@/lib/gateway/audit';
import { remaining, setLimit } from '@/lib/gateway/quota';
import { getActor, PERSONA_COOKIE } from '@/lib/identity';
import { transferPosition } from '@/lib/lifecycle/transfer';
import { getConnectors, listConnectors } from '@/lib/connectors/registry';
import { parseRosterCsv } from '@/lib/connectors/roster/mock';
import { DOCUMENT, INSTALLATION, ORG, SOURCE, USER } from '@db/seed/ids';

const req = (userId: string) => new Request('http://localhost/', { headers: { cookie: `${PERSONA_COOKIE}=${userId}` } });

describe('clock', () => {
  afterEach(() => {
    delete process.env.DEMO_MODE;
    delete process.env.DEMO_NOW;
    resetClockForTests();
  });

  it('starts at DEMO_NOW in demo mode', () => {
    process.env.DEMO_MODE = '1';
    process.env.DEMO_NOW = '2026-11-15T10:00:00-08:00';
    resetClockForTests();
    const t = now().getTime() - Date.parse('2026-11-15T18:00:00Z');
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThan(5_000);
  });
});

describe('capGrants (§5)', () => {
  const user = ['*', `${ORG.startup}:*`, `${ORG.startup}:treasurer`] as const;
  it('public keeps only *', () => expect(capGrants([...user], ORG.startup, 'public')).toEqual(['*']));
  it('members keeps * and <org>:*', () =>
    expect(capGrants([...user], ORG.startup, 'members')).toEqual(['*', `${ORG.startup}:*`]));
  it('officers keeps everything', () => expect(capGrants([...user], ORG.startup, 'officers')).toEqual([...user]));
});

describe('grantsFor and getActor (stubs)', () => {
  it('Morgan in Startup gets no Archery positions (I3)', async () => {
    expect(await grantsFor(USER.morgan, ORG.startup)).toEqual(['*', `${ORG.startup}:*`, `${ORG.startup}:member`]);
  });
  it('reads the persona cookie', async () => {
    const actor = await getActor(req(USER.taylor));
    expect(actor).toMatchObject({ userId: USER.taylor, activeOrgId: ORG.startup });
    expect(actor.positions.sort()).toEqual(['member', 'treasurer']);
  });
});

describe('explainAccess (§10 order)', () => {
  const agent = { sourceIds: [SOURCE.startup.public, SOURCE.startup.minutes], maxTier: 'members' as const };
  const memberGrants = ['*', `${ORG.startup}:*`] as const;
  it('outside_sources first', () =>
    expect(explainAccess([...memberGrants], agent, { sourceId: SOURCE.startup.finance, tier: 'public', readGrants: ['*'] })).toBe('outside_sources'));
  it('then above_max_tier', () =>
    expect(explainAccess([...memberGrants], agent, { sourceId: SOURCE.startup.minutes, tier: 'officers', readGrants: [`${ORG.startup}:president`] })).toBe('above_max_tier'));
  it('then not_granted', () =>
    expect(explainAccess(['*'], agent, { sourceId: SOURCE.startup.minutes, tier: 'members', readGrants: [`${ORG.startup}:*`] })).toBe('not_granted'));
  it('else allowed', () =>
    expect(explainAccess([...memberGrants], agent, { sourceId: SOURCE.startup.minutes, tier: 'members', readGrants: [`${ORG.startup}:*`] })).toBe('allowed'));
});

describe('stubs keep their final shapes', () => {
  it('distribution', async () => {
    const handoff = await effectiveAgent(INSTALLATION.startupHandoff);
    expect(handoff).toMatchObject({ orgId: ORG.startup, audience: 'members', maxTier: 'officers', status: 'enabled' });
    expect(await canUse(USER.casey, handoff)).toEqual({ ok: true, reason: 'members' });
    expect(await canUse(USER.lee, handoff)).toEqual({ ok: false });
    await expect(effectiveAgent('nope')).rejects.toBeInstanceOf(AppError);
    expect((await directory()).map((a) => a.templateSlug)).toEqual(['showcase-qa']);
    const taylor = await myAgents(USER.taylor);
    expect(taylor.map((c) => c.orgName)).toEqual(['Startup Club']);
    expect(taylor[0].agents.map((a) => a.reasonLabel).sort()).toEqual(['All members', 'Treasurer, President']);
    expect(await provisionOrg(ORG.dance)).toEqual({ installed: 0 });
    await expect(transferPosition(await getActor(req(USER.sam)), ORG.startup, 'treasurer', USER.jordan)).resolves.toBeUndefined();
  });

  it('documents', async () => {
    const casey = await listAccessibleDocuments(['*', `${ORG.startup}:*`], [SOURCE.startup.public, SOURCE.startup.minutes, SOURCE.startup.finance]);
    expect(casey.map((d) => d.id).sort()).toEqual([DOCUMENT.recruitingFaq, DOCUMENT.minutes20261008].sort());
    const sam = await getActor(req(USER.sam));
    const matrix = await previewAccess(sam, INSTALLATION.startupHandoff);
    expect(matrix.cells.member[DOCUMENT.minutes20261008]).toBe('allowed');
    expect(matrix.cells.member[DOCUMENT.spring2026Budget]).toBe('not_granted');
    expect(matrix.cells.treasurer[DOCUMENT.spring2026Budget]).toBe('allowed');
    expect(matrix.cells.student[DOCUMENT.usgFundingRules]).toBe('outside_sources');
  });

  it('gateway, audit, quota', async () => {
    const taylor = await getActor(req(USER.taylor));
    const run = await runAgent(taylor, INSTALLATION.startupFundingPrecheck, 'Can we fund pitch night?');
    expect(run.inspector.permitted.map((d) => d.id).sort()).toEqual(
      [DOCUMENT.usgFundingRules, DOCUMENT.spring2026Budget, DOCUMENT.sponsorContacts].sort());
    expect(run.reply).toContain('Demo rule pack v1 · annual cap $8,000');
    expect(run.inspector.runGrants.map((g) => g.label)).toContain('Startup Club · Treasurer');
    await expect(runAgent(taylor, INSTALLATION.startupRecruitingQa, 'hi')).rejects.toMatchObject({ status: 403 });
    const id = await audit('quota.limit.set', { actorUserId: USER.sam, actingOrgId: ORG.startup, targetType: 'user', targetId: USER.casey, details: { limitMicro: 0 } });
    expect(id).toBeGreaterThan(0);
    expect((await listAudit(taylor)).length).toBeGreaterThan(0);
    await setLimit(taylor, { scope: 'member', orgId: ORG.startup, userId: USER.casey, limitMicro: 0 });
    expect(await remaining({ scope: 'member', orgId: ORG.startup, userId: USER.casey })).toMatchObject({ limitMicro: 0, remainingMicro: 0 });
    expect(await remaining({ scope: 'student_daily', userId: USER.lee })).toMatchObject({ limitMicro: 50_000, spentMicro: 40_000 });
  });

  it('publish to all students', async () => {
    const sam = await getActor(req(USER.sam));
    const casey = await getActor(req(USER.casey));
    await expect(publishToAllStudents(casey, INSTALLATION.startupRecruitingQa)).rejects.toMatchObject({ status: 403 });
    const agent = await publishToAllStudents(sam, INSTALLATION.startupRecruitingQa);
    expect(agent).toMatchObject({ audience: 'public', maxTier: 'public', status: 'enabled' });
  });

  it('connectors', async () => {
    expect(Object.keys(getConnectors()).sort()).toEqual(['applications', 'documents', 'identity', 'llm', 'roster']);
    expect((await listConnectors()).every((c) => c.isMock)).toBe(true);
    const rows = await getConnectors().roster.fetch();
    expect(rows.some((r) => r.orgSlug === 'robotics')).toBe(true);
    expect(() => parseRosterCsv('bad,header\n')).toThrow();
  });

  it('withActor encodes text[] settings', () => {
    expect(pgTextArray(['*', `${ORG.startup}:*`])).toBe(`{"*","${ORG.startup}:*"}`);
    expect(pgTextArray([])).toBe('{}');
  });
});
