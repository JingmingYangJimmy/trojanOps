// Owner: A, with one section per stream. WP-0: every cross-stream interface resolves at its real path
// with its final shape. When you make your function real, move its section into tests/<area>.test.ts
// with real assertions and delete it here.
import { describe, expect, it } from 'vitest';
import { capGrants, grantLabels, grantsFor } from '@/lib/authz';
import { now, resetClockForTests } from '@/lib/clock';
import { AppError } from '@/lib/contracts';
import { pgTextArray } from '@/lib/db/with-actor';
import { canUse, directory, effectiveAgent, myAgents, provisionOrg, publishToAllStudents } from '@/lib/distribution';
import { explainAccess, listAccessibleDocuments } from '@/lib/documents/access';
import { listLibraryDocuments } from '@/lib/documents/library';
import { previewAccess } from '@/lib/documents/preview';
import { runAgent } from '@/lib/gateway';
import { audit, listAudit } from '@/lib/gateway/audit';
import { remaining, setLimit } from '@/lib/gateway/quota';
import { getActor, PERSONA_COOKIE } from '@/lib/identity';
import { transferPosition } from '@/lib/lifecycle/transfer';
import { getConnectors, listConnectors } from '@/lib/connectors/registry';
import { parseRosterCsv } from '@/lib/connectors/roster/mock';
import { INSTALLATION, ORG, SOURCE, USER } from '@db/seed/ids';

const req = (userId: string) => new Request('http://localhost/', { headers: { cookie: `${PERSONA_COOKIE}=${userId}` } });

describe('A: platform core', () => {
  it('clock starts at DEMO_NOW in demo mode', () => {
    process.env.DEMO_MODE = '1';
    process.env.DEMO_NOW = '2026-11-15T10:00:00-08:00';
    resetClockForTests();
    const drift = now().getTime() - Date.parse('2026-11-15T18:00:00Z');
    delete process.env.DEMO_MODE;
    delete process.env.DEMO_NOW;
    resetClockForTests();
    expect(drift).toBeGreaterThanOrEqual(0);
    expect(drift).toBeLessThan(5_000);
  });

  it('capGrants follows the §5 table', () => {
    const user = ['*', `${ORG.startup}:*`, `${ORG.startup}:treasurer`] as const;
    expect(capGrants([...user], ORG.startup, 'public')).toEqual(['*']);
    expect(capGrants([...user], ORG.startup, 'members')).toEqual(['*', `${ORG.startup}:*`]);
    expect(capGrants([...user], ORG.startup, 'officers')).toEqual([...user]);
  });

  it('withActor encodes text[] settings', () => {
    expect(pgTextArray(['*', `${ORG.startup}:*`])).toBe(`{"*","${ORG.startup}:*"}`);
    expect(pgTextArray([])).toBe('{}');
  });

  it('identity, grants, audit and quota keep their shapes', async () => {
    const actor = await getActor(req(USER.taylor));
    expect(actor).toEqual({ userId: USER.taylor, activeOrgId: expect.any(String), positions: expect.any(Array), grants: expect.any(Array) });
    expect(await grantsFor(USER.lee, null)).toEqual(['*']);
    expect((await grantLabels(['*']))[0]).toEqual({ grant: '*', label: expect.any(String) });
    expect(await audit('quota.limit.set', { actorUserId: null, actingOrgId: null, targetType: 'org', targetId: ORG.startup, details: {} })).toEqual(expect.any(Number));
    expect(await listAudit(actor)).toEqual(expect.any(Array));
    await expect(setLimit(actor, { scope: 'member', orgId: ORG.startup, userId: USER.casey, limitMicro: 500_000 })).resolves.toBeUndefined();
    expect(await remaining({ scope: 'platform' })).toEqual({ scope: 'platform', limitMicro: expect.any(Number), spentMicro: expect.any(Number), remainingMicro: expect.any(Number) });
  });

  it('runAgent returns a RunResult and refuses with AppError', async () => {
    const taylor = await getActor(req(USER.taylor));
    const run = await runAgent(taylor, INSTALLATION.startupFundingPrecheck, 'Can we fund pitch night?');
    expect(Object.keys(run).sort()).toEqual(['citations', 'inspector', 'pendingActions', 'reply', 'runId']);
    expect(run.inspector.runGrants.length).toBeGreaterThan(0);
    await expect(runAgent({ ...taylor, userId: null }, INSTALLATION.startupHandoff, 'x')).rejects.toBeInstanceOf(AppError);
  });
});

describe('B: distribution', () => {
  it('keeps its shapes', async () => {
    const agent = await effectiveAgent(INSTALLATION.startupHandoff);
    expect(agent).toMatchObject({ installationId: INSTALLATION.startupHandoff, status: expect.any(String), sourceIds: expect.any(Array) });
    expect(await canUse(USER.casey, agent)).toHaveProperty('ok');
    await expect(effectiveAgent('nope')).rejects.toBeInstanceOf(AppError);
    expect(await directory()).toEqual(expect.any(Array));
    const clubs = await myAgents(USER.taylor);
    expect(clubs[0]).toEqual({ orgId: expect.any(String), orgName: expect.any(String), positionNames: expect.any(Array), agents: expect.any(Array) });
    expect(await provisionOrg(ORG.dance)).toHaveProperty('installed');
    const casey = await getActor(req(USER.casey));
    await expect(publishToAllStudents(casey, INSTALLATION.startupRecruitingQa)).rejects.toBeInstanceOf(AppError);
    expect(transferPosition).toHaveLength(4);
  });
});

describe('C: documents', () => {
  it('explainAccess checks in §10 order', () => {
    const agent = { sourceIds: [SOURCE.startup.public, SOURCE.startup.minutes], maxTier: 'members' as const };
    const member = ['*', `${ORG.startup}:*`] as const;
    expect(explainAccess([...member], agent, { sourceId: SOURCE.startup.finance, tier: 'public', readGrants: ['*'] })).toBe('outside_sources');
    expect(explainAccess([...member], agent, { sourceId: SOURCE.startup.minutes, tier: 'officers', readGrants: [`${ORG.startup}:president`] })).toBe('above_max_tier');
    expect(explainAccess(['*'], agent, { sourceId: SOURCE.startup.minutes, tier: 'members', readGrants: [`${ORG.startup}:*`] })).toBe('not_granted');
    expect(explainAccess([...member], agent, { sourceId: SOURCE.startup.minutes, tier: 'members', readGrants: [`${ORG.startup}:*`] })).toBe('allowed');
  });

  it('keeps its shapes', async () => {
    const sam = await getActor(req(USER.sam));
    const docs = await listAccessibleDocuments(sam, ['*'], [SOURCE.startup.public]);
    if (docs[0]) expect(Object.keys(docs[0]).sort()).toEqual(['bodyMd', 'id', 'tier', 'title']);
    expect(await listLibraryDocuments(sam, ORG.startup)).toEqual(expect.any(Array));
    const matrix = await previewAccess(sam, INSTALLATION.startupHandoff);
    expect(Object.keys(matrix).sort()).toEqual(['cells', 'documents', 'subjects']);
  });
});

describe('D: connectors', () => {
  it('keeps its shapes', async () => {
    expect(Object.keys(getConnectors()).sort()).toEqual(['applications', 'documents', 'identity', 'llm', 'roster']);
    expect((await listConnectors()).map((c) => c.kind).sort()).toEqual(['applications', 'documents', 'identity', 'llm', 'roster']);
    expect(await getConnectors().roster.fetch()).toEqual(expect.any(Array));
    expect(() => parseRosterCsv('bad,header\n')).toThrow();
  });
});
