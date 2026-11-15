import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { ORG, USER } from '@db/seed/ids';
import { agentInstallations, agentTemplates, agentTemplateVersions, auditEvents } from '@/lib/db/schema';
import { canUse, distribute, effectiveAgent, myAgents, updateInstallation } from '@/lib/distribution';
import { agentTags } from '@/app/me/agents/agent-tags';
import { startersFor } from '@/lib/documents/fixtures';
import { NEW_TEMPLATE_EXAMPLE, NEW_TEMPLATE_MODELS } from '@/app/usg/templates/template-config';
import { createUsgTemplate } from '@/lib/distribution/create-template';
import { actorFor, appSql, closeAppDb, inRolledBackApp } from './db';

const probe = await appSql();
await probe?.end();
afterAll(async () => { if (probe) await closeAppDb(); });

const draft = {
  name: 'Meeting summary', target: 'pilot', distribution: 'default',
  version: {
    purpose: 'Summarize meeting decisions.', audience: 'members', usableBy: [], maxTier: 'members',
    sourceKinds: ['minutes', 'archive'], tools: [], modelIds: ['gpt-6-luna', 'claude-haiku-5-5'], defaultModelId: 'claude-haiku-5-5',
    systemPrompt: 'Summarize the supplied minutes with citations.', changelog: 'First version.',
  },
};

describe.skipIf(!probe)('USG template creation', () => {
  it('publishes an audited first version without exposing it to clubs when created', () => inRolledBackApp(async tx => {
    // Given
    const actor = await actorFor(USER.avery, ORG.usg);
    // When
    const created = await createUsgTemplate(actor, draft);
    // Then
    const [template] = await tx.select().from(agentTemplates).where(eq(agentTemplates.id, created.templateId));
    expect(template).toMatchObject({ publisherOrgId: ORG.usg, scope: 'global', latestVersion: 1, distributedAt: null });
    expect(await tx.select().from(agentTemplateVersions).where(eq(agentTemplateVersions.templateId, created.templateId)))
      .toMatchObject([{ version: 1, audience: 'members', maxTier: 'members', modelClasses: ['economy'], defaultModelClass: 'economy',
        modelIds: ['gpt-6-luna', 'claude-haiku-5-5'], defaultModelId: 'claude-haiku-5-5' }]);
    expect(await tx.select().from(agentInstallations).where(eq(agentInstallations.templateId, created.templateId))).toEqual([]);
    expect(await tx.select().from(auditEvents).where(eq(auditEvents.targetId, created.templateId)))
      .toMatchObject([{ action: 'template.publish', details: { version: 1, created: true } }]);
  }));

  it('refuses a club president and audits the denied creation', () => inRolledBackApp(async tx => {
    // Given
    const actor = await actorFor(USER.sam, ORG.startup);
    // When
    const result = createUsgTemplate(actor, draft);
    // Then
    await expect(result).rejects.toMatchObject({ error: { code: 'forbidden' } });
    expect(await tx.select().from(auditEvents).where(eq(auditEvents.actorUserId, USER.sam)))
      .toEqual(expect.arrayContaining([expect.objectContaining({ action: 'authz.denied', details: { action: 'template.publish' } })]));
  }));

  it.each([
    { ...draft, target: 'missing-cohort' },
    { ...draft, version: { ...draft.version, maxTier: 'usg_internal' } },
    { ...draft, version: { ...draft.version, audience: 'public' } },
    { ...draft, publisherOrgId: ORG.startup },
  ])('rejects invalid creation atomically', input => inRolledBackApp(async tx => {
    // Given
    const actor = await actorFor(USER.avery, ORG.usg);
    const before = await tx.select({ id: agentTemplates.id }).from(agentTemplates);
    // When
    const result = createUsgTemplate(actor, input);
    // Then
    await expect(result).rejects.toMatchObject({ error: { code: 'invalid' } });
    expect(await tx.select({ id: agentTemplates.id }).from(agentTemplates)).toEqual(before);
  }));

  it('uses normal audience checks and model clamps after the new template is distributed', () => inRolledBackApp(async tx => {
    // Given
    const actor = await actorFor(USER.avery, ORG.usg);
    const created = await createUsgTemplate(actor, draft);
    // When
    await distribute(actor, created.templateId);
    // Then
    const installed = await tx.select().from(agentInstallations).where(eq(agentInstallations.templateId, created.templateId));
    expect(installed.map(i => i.orgId).sort()).toEqual([ORG.startup, ORG.archery, ORG.hacksc].sort());
    const startup = installed.find(i => i.orgId === ORG.startup);
    if (!startup) throw new Error('Expected the new template in Startup Club.');
    const agent = await effectiveAgent(startup.id);
    expect(agent).toMatchObject({ templateVersion: 1, audience: 'members', maxTier: 'members', modelClass: 'economy' });
    expect(await canUse(USER.casey, agent)).toMatchObject({ ok: true });
    expect(await canUse(USER.lee, agent)).toMatchObject({ ok: false });
    await expect(updateInstallation(await actorFor(USER.sam, ORG.startup), startup.id, { modelClass: 'standard' }))
      .rejects.toMatchObject({ error: { code: 'clamp_violation', cap: { field: 'modelClass' } } });
  }));

  it('puts the dialog’s sponsorship example in treasurers’ My agents once distributed, with starters and tags', () => inRolledBackApp(async () => {
    // Given: the Create template dialog's defaults, for treasurers and presidents (the dialog's Officers option)
    const avery = await actorFor(USER.avery, ORG.usg);
    const { templateId } = await createUsgTemplate(avery, {
      name: NEW_TEMPLATE_EXAMPLE.name, target: 'all', distribution: 'default',
      version: {
        purpose: NEW_TEMPLATE_EXAMPLE.purpose, systemPrompt: NEW_TEMPLATE_EXAMPLE.systemPrompt,
        audience: 'positions', usableBy: ['treasurer', 'president'], maxTier: 'officers',
        sourceKinds: [...NEW_TEMPLATE_EXAMPLE.sourceKinds], tools: [], ...NEW_TEMPLATE_MODELS, changelog: 'First version.',
      },
    });
    const listed = async (userId: string) => (await myAgents(userId)).flatMap((club) => club.agents).filter((a) => a.name === NEW_TEMPLATE_EXAMPLE.name);
    expect(await listed(USER.taylor)).toEqual([]);
    // When
    await distribute(avery, templateId);
    // Then: Taylor (treasurer) sees it in each club; Casey (member only) does not.
    const taylor = await listed(USER.taylor);
    expect(taylor.length).toBeGreaterThan(0);
    expect(await listed(USER.casey)).toEqual([]);
    expect(startersFor(taylor[0].templateSlug)).toContain('Draft an outreach email to a returning sponsor.');
    expect(agentTags(taylor[0].templateSlug)).toEqual(['Sponsors', 'Budget']);
  }));
});
