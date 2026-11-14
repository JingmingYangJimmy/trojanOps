// Owner: A (WP-4 grows this). Gateway behaviour that C's and D's run pages rely on.
import { describe, expect, it } from 'vitest';
import { runAgent } from '@/lib/gateway';
import { listAudit } from '@/lib/gateway/audit';
import { getActor, ACTIVE_ORG_COOKIE, PERSONA_COOKIE } from '@/lib/identity';
import { DOCUMENT, INSTALLATION, ORG, USER } from '@db/seed/ids';

const actorFor = (userId: string, orgId?: string) =>
  getActor(new Request('http://localhost/', {
    headers: { cookie: `${PERSONA_COOKIE}=${userId}${orgId ? `; ${ACTIVE_ORG_COOKIE}=${orgId}` : ''}` },
  }));

describe('runAgent (stub)', () => {
  it('runs funding-precheck for the treasurer with capped grants and the rule pack', async () => {
    const run = await runAgent(await actorFor(USER.taylor), INSTALLATION.startupFundingPrecheck, 'Can we fund pitch night?');
    expect(run.inspector.permitted.map((d) => d.id).sort()).toEqual(
      [DOCUMENT.usgFundingRules, DOCUMENT.spring2026Budget, DOCUMENT.sponsorContacts].sort());
    expect(run.reply).toContain('Demo rule pack v1 · annual cap $8,000');
    expect(run.inspector.runGrants.map((g) => g.label)).toContain('Startup Club · Treasurer');
  });

  it('writes run.access with document ids and agent.run with cost only', async () => {
    const actor = await actorFor(USER.casey);
    const run = await runAgent(actor, INSTALLATION.startupHandoff, 'What did we decide?');
    const rows = (await listAudit(actor, { limit: 1000 })).filter((e) => e.runId === run.runId);
    expect(rows.map((e) => e.action).sort()).toEqual(['agent.run', 'run.access']);
    expect(rows.find((e) => e.action === 'agent.run')?.details).toEqual({ runId: run.runId, costMicro: 10_000 });
    expect(rows.find((e) => e.action === 'run.access')?.details.documentIds).toEqual(
      expect.arrayContaining([DOCUMENT.recruitingFaq, DOCUMENT.minutes20261008]));
  });

  it('refuses a disabled installation, a non-audience user and an inactive club, auditing authz.denied', async () => {
    const before = (await listAudit(await actorFor(USER.sam), { action: 'authz.denied', limit: 1000 })).length;
    await expect(runAgent(await actorFor(USER.sam), INSTALLATION.startupRecruitingQa, 'x')).rejects.toMatchObject({ status: 403 });
    await expect(runAgent(await actorFor(USER.casey), INSTALLATION.startupFundingPrecheck, 'x')).rejects.toMatchObject({ status: 403 });
    await expect(runAgent(await actorFor(USER.morgan, ORG.archery), INSTALLATION.startupHandoff, 'x')).rejects.toMatchObject({ status: 403 });
    const after = (await listAudit(await actorFor(USER.sam), { action: 'authz.denied', limit: 1000 })).length;
    expect(after - before).toBe(3);
  });

  it('runs a public agent from any active club', async () => {
    const run = await runAgent(await actorFor(USER.morgan, ORG.archery), INSTALLATION.danceShowcaseQa, 'When is it?');
    expect(run.inspector.permitted.map((d) => d.id)).toEqual([DOCUMENT.springShowcaseInfo]);
  });
});
