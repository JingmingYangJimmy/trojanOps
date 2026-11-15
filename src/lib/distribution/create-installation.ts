// Owner: B. Optional installation never opens campus access; that requires the publish service.
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { isUuid } from '../authz';
import { now } from '../clock';
import type { Actor } from '../contracts';
import { getDb } from '../db/client';
import { agentInstallations, orgCohorts, orgs } from '../db/schema';
import { audit } from '../gateway/audit';
import { effectiveAgent } from './effective-config';
import { active, checkedWrite, clampWrite, clubBudget, ensurePublicBudget, invalid, lockTemplate, missing, president, versionFor } from './write-support';

export const createInstallationSchema = z.object({ templateId: z.uuid() }).strict();
export async function installTemplate(actor: Actor, orgId: string, input: z.infer<typeof createInstallationSchema>) {
  const id = await checkedWrite(actor, 'org', orgId, () => getDb().transaction(async tx => {
    president(actor, orgId);
    const parsed = createInstallationSchema.safeParse(input); if (!parsed.success) throw invalid(parsed.error.issues[0].message);
    if (!isUuid(orgId)) throw missing();
    const template = await lockTemplate(tx, parsed.data.templateId); active(template);
    const [club] = await tx.select().from(orgs).where(eq(orgs.id, orgId)).for('no key update');
    if (club?.kind !== 'rso' || club.status !== 'active') throw missing();
    if (template.scope === 'org') { if (template.publisherOrgId !== orgId) throw missing(); }
    else {
      if (template.distribution !== 'optional') throw invalid('USG distributes required and default templates. Choose an optional template.');
      if (template.target !== 'all') {
        const [cohort] = await tx.select().from(orgCohorts).where(and(eq(orgCohorts.orgId, orgId), eq(orgCohorts.cohortSlug, template.target)));
        if (!cohort) throw missing();
      }
    }
    const [existing] = await tx.select().from(agentInstallations).where(and(eq(agentInstallations.orgId, orgId), eq(agentInstallations.templateId, template.id)));
    if (existing) return existing.id;
    const version = await versionFor(tx, template);
    const effective = await clampWrite(tx, orgId, version, {});
    if (effective.audience === 'public' && Math.floor(await clubBudget(tx, orgId) / 2) <= 0) throw invalid('Ask USG to set a club quota before installing a public agent.');
    const installationId = randomUUID(); const at = now();
    await tx.insert(agentInstallations).values({ id: installationId, templateId: template.id, orgId,
      enabled: effective.audience !== 'public', track: 'latest', installedBy: actor.userId, installedAt: at, createdAt: at });
    if (effective.audience === 'public') await ensurePublicBudget(tx, actor, installationId, orgId);
    await audit('installation.update', { actorUserId: actor.userId, actingOrgId: orgId, installationId,
      targetType: 'installation', targetId: installationId, details: { installed: true, templateId: template.id } }, tx);
    return installationId;
  }));
  return effectiveAgent(id);
}
