// Owner: B. Creation publishes v1. A USG template reaches clubs later through distribute; a club's
// own template is installed in that club in the same transaction, so its members have it at once.
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { now } from '../clock';
import type { Actor } from '../contracts';
import { getDb } from '../db/client';
import { agentInstallations, agentTemplates, agentTemplateVersions, orgCohorts, orgs, positions } from '../db/schema';
import { audit } from '../gateway/audit';
import { versionDraftSchema, withModelClasses } from './versions';
import { checkedWrite, clampWrite, event, invalid, missing, president, usgAdmin } from './write-support';

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'agent';

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Enter a template name.').max(120),
  distribution: z.enum(['required', 'default', 'optional']),
  target: z.string().trim().min(1),
  version: versionDraftSchema,
}).strict();

export async function createUsgTemplate(actor: Actor, input: unknown): Promise<{ readonly templateId: string }> {
  const templateId = randomUUID();
  return checkedWrite(actor, 'template', templateId, () => getDb().transaction(async tx => {
    await usgAdmin(actor);
    const parsed = createTemplateSchema.safeParse(input);
    if (!parsed.success) throw invalid(parsed.error.issues[0].message);
    const { name, target, distribution, version } = parsed.data;
    const [publisher] = await tx.select().from(orgs).where(eq(orgs.id, actor.activeOrgId ?? ''));
    if (!publisher || publisher.kind !== 'usg' || publisher.status !== 'active') throw invalid('Choose an active USG organization.');
    if (version.maxTier === 'usg_internal') throw invalid('Club-distributed agents cannot read USG internal documents.');
    if (target !== 'all') {
      const [cohort] = await tx.select().from(orgCohorts).where(eq(orgCohorts.cohortSlug, target)).limit(1);
      if (!cohort) throw invalid('Choose all clubs or an existing cohort.');
    }
    const at = now();
    const slug = `${slugOf(name)}-${templateId}`;
    await tx.insert(agentTemplates).values({ id: templateId, slug, name, publisherOrgId: publisher.id,
      scope: 'global', distribution, target, status: 'active', latestVersion: 1, distributedAt: null, createdAt: at });
    await tx.insert(agentTemplateVersions).values({ ...withModelClasses(version), templateId, version: 1,
      publishedBy: actor.userId, publishedAt: at, createdAt: at });
    await audit('template.publish', { ...event(actor, 'template', templateId), details: { version: 1, created: true } }, tx);
    return { templateId };
  }), 'template.publish');
}

export const createClubTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Enter an agent name.').max(120),
  version: versionDraftSchema,
}).strict();

/**
 * A president's own agent for their club's members (§8 "Club → its members"). It publishes an
 * `org` template at version 1 and installs it in the club, switched on and following the latest
 * version. The audience stays inside the club: opening an agent to all students is the catalog's
 * publish action, which checks the club's policy and budget.
 */
export async function createClubTemplate(actor: Actor, orgId: string, input: unknown): Promise<{ readonly templateId: string; readonly installationId: string }> {
  const templateId = randomUUID();
  return checkedWrite(actor, 'template', templateId, () => getDb().transaction(async tx => {
    president(actor, orgId);
    const parsed = createClubTemplateSchema.safeParse(input);
    if (!parsed.success) throw invalid(parsed.error.issues[0].message);
    const { name, version } = parsed.data;
    const [club] = await tx.select().from(orgs).where(eq(orgs.id, orgId)).for('no key update');
    if (club?.kind !== 'rso' || club.status !== 'active') throw missing();
    if (version.audience === 'public') throw invalid('Create the agent for members first, then open it to all students from the catalog.');
    if (version.maxTier === 'usg_internal' || version.sourceKinds.includes('usg_internal')) throw invalid('Club agents cannot read USG internal documents.');
    const held = new Set((await tx.select({ slug: positions.slug }).from(positions).where(eq(positions.orgId, orgId))).map(p => p.slug));
    const unknown = version.usableBy.find(slug => !held.has(slug));
    if (unknown) throw invalid(`This club has no ${unknown} position.`);
    const draft = withModelClasses(version);
    await clampWrite(tx, orgId, draft, {});
    const at = now();
    await tx.insert(agentTemplates).values({ id: templateId, slug: `${slugOf(name)}-${templateId}`, name, publisherOrgId: orgId,
      scope: 'org', distribution: 'optional', target: 'all', status: 'active', latestVersion: 1, distributedAt: null, createdAt: at });
    await tx.insert(agentTemplateVersions).values({ ...draft, templateId, version: 1, publishedBy: actor.userId, publishedAt: at, createdAt: at });
    await audit('template.publish', { ...event(actor, 'template', templateId), details: { version: 1, created: true } }, tx);
    const installationId = randomUUID();
    await tx.insert(agentInstallations).values({ id: installationId, templateId, orgId,
      enabled: true, track: 'latest', installedBy: actor.userId, installedAt: at, createdAt: at });
    await audit('installation.update', { actorUserId: actor.userId, actingOrgId: orgId, installationId,
      targetType: 'installation', targetId: installationId, details: { installed: true, templateId } }, tx);
    return { templateId, installationId };
  }), 'template.publish');
}
