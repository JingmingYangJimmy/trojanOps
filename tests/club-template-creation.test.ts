import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { ORG, USER } from '@db/seed/ids';
import { agentInstallations, agentTemplates, auditEvents } from '@/lib/db/schema';
import { canUse, effectiveAgent, myAgents } from '@/lib/distribution';
import { createClubTemplate } from '@/lib/distribution/create-template';
import { CLUB_AGENT_EXAMPLE } from '@/app/org/[orgId]/admin/create-agent';
import { NEW_TEMPLATE_MODELS } from '@/app/usg/templates/template-config';
import { actorFor, appSql, closeAppDb, inRolledBackApp } from './db';

const probe = await appSql();
await probe?.end();
afterAll(async () => { if (probe) await closeAppDb(); });

// The Create agent dialog's defaults on Manage club.
const draft = {
  name: CLUB_AGENT_EXAMPLE.name,
  version: {
    purpose: CLUB_AGENT_EXAMPLE.purpose, systemPrompt: CLUB_AGENT_EXAMPLE.systemPrompt,
    audience: 'members', usableBy: [], maxTier: 'members', sourceKinds: [...CLUB_AGENT_EXAMPLE.sourceKinds],
    tools: [], ...NEW_TEMPLATE_MODELS, changelog: 'First version.',
  },
};

describe.skipIf(!probe)('club template creation', () => {
  it('publishes a club-owned v1 and installs it for the club’s members at once', () => inRolledBackApp(async tx => {
    // Given
    const sam = await actorFor(USER.sam, ORG.startup);
    // When
    const { templateId, installationId } = await createClubTemplate(sam, ORG.startup, draft);
    // Then
    const [template] = await tx.select().from(agentTemplates).where(eq(agentTemplates.id, templateId));
    expect(template).toMatchObject({ publisherOrgId: ORG.startup, scope: 'org', distribution: 'optional', latestVersion: 1 });
    expect(await tx.select().from(agentInstallations).where(eq(agentInstallations.templateId, templateId)))
      .toMatchObject([{ id: installationId, orgId: ORG.startup, enabled: true, track: 'latest' }]);
    const agent = await effectiveAgent(installationId);
    expect(agent).toMatchObject({ audience: 'members', maxTier: 'members', modelClass: 'economy' });
    expect(await canUse(USER.casey, agent)).toMatchObject({ ok: true });
    expect(await canUse(USER.lee, agent)).toMatchObject({ ok: false });
    const casey = (await myAgents(USER.casey)).flatMap(club => club.agents).map(a => a.name);
    expect(casey).toContain(CLUB_AGENT_EXAMPLE.name);
    expect((await tx.select().from(auditEvents).where(eq(auditEvents.targetId, templateId))).map(e => e.action)).toEqual(['template.publish']);
    expect((await tx.select().from(auditEvents).where(eq(auditEvents.targetId, installationId))).map(e => e.action)).toEqual(['installation.update']);
  }));

  it('limits an officers agent to the positions the president names', () => inRolledBackApp(async () => {
    // Given
    const sam = await actorFor(USER.sam, ORG.startup);
    // When
    const { installationId } = await createClubTemplate(sam, ORG.startup, {
      ...draft, version: { ...draft.version, audience: 'positions', usableBy: ['treasurer'], maxTier: 'officers' },
    });
    // Then
    const agent = await effectiveAgent(installationId);
    expect(agent).toMatchObject({ audience: 'positions', usableBy: ['treasurer'], maxTier: 'officers' });
    expect(await canUse(USER.taylor, agent)).toMatchObject({ ok: true });
    expect(await canUse(USER.casey, agent)).toMatchObject({ ok: false });
  }));

  it('refuses anyone but the president acting in the club, and audits it', () => inRolledBackApp(async tx => {
    // Given
    const casey = await actorFor(USER.casey, ORG.startup);
    // When
    const result = createClubTemplate(casey, ORG.startup, draft);
    // Then
    await expect(result).rejects.toMatchObject({ error: { code: 'forbidden' } });
    expect(await tx.select().from(auditEvents).where(eq(auditEvents.actorUserId, USER.casey)))
      .toEqual(expect.arrayContaining([expect.objectContaining({ action: 'authz.denied', details: { action: 'template.publish' } })]));
  }));

  it.each([
    { ...draft, version: { ...draft.version, audience: 'public', maxTier: 'public' } },
    { ...draft, version: { ...draft.version, maxTier: 'usg_internal' } },
    { ...draft, version: { ...draft.version, audience: 'positions', usableBy: ['admiral'], maxTier: 'officers' } },
    { ...draft, name: ' ' },
  ])('rejects an invalid club agent without writing anything', input => inRolledBackApp(async tx => {
    // Given
    const sam = await actorFor(USER.sam, ORG.startup);
    const before = await tx.select({ id: agentTemplates.id }).from(agentTemplates);
    // When
    const result = createClubTemplate(sam, ORG.startup, input);
    // Then
    await expect(result).rejects.toMatchObject({ error: { code: 'invalid' } });
    expect(await tx.select({ id: agentTemplates.id }).from(agentTemplates)).toEqual(before);
  }));
});
