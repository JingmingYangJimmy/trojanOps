// Owner: B. Mutable metadata is separate from immutable published version contents.
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '../api';
import { isUuid } from '../authz';
import { AppError, type Actor } from '../contracts';
import { getDb } from '../db/client';
import { agentTemplates, agentTemplateVersions, orgCohorts, orgs } from '../db/schema';
import { audit } from '../gateway/audit';
import { active, checkedWrite, invalid, lockTemplate, missing, president, usgAdmin, type Template } from './write-support';

async function mayManage(actor: Actor, template: Template) {
  if (template.scope === 'global') await usgAdmin(actor);
  else president(actor, template.publisherOrgId);
}
export async function getTemplate(actor: Actor, templateId: string) {
  requireUser(actor);
  try {
    if (!isUuid(templateId)) throw missing();
    const [template] = await getDb().select().from(agentTemplates).where(eq(agentTemplates.id, templateId));
    if (!template) throw missing();
    await mayManage(actor, template);
    const versions = await getDb().select().from(agentTemplateVersions).where(eq(agentTemplateVersions.templateId, templateId)).orderBy(desc(agentTemplateVersions.version));
    const clubs = await getDb().select({ id: orgs.id, name: orgs.name }).from(orgs).where(and(eq(orgs.kind, 'rso'), eq(orgs.status, 'active'))).orderBy(orgs.name);
    const cohort = await getDb().select().from(orgCohorts).where(eq(orgCohorts.cohortSlug, template.target));
    const targets = template.scope === 'org' ? clubs.filter(c => c.id === template.publisherOrgId) : clubs.filter(c => template.target === 'all' || cohort.some(m => m.orgId === c.id));
    return { template, versions, targets };
  } catch (err) {
    if (err instanceof AppError && err.error.code === 'forbidden') await audit('authz.denied', { actorUserId: actor.userId, actingOrgId: actor.activeOrgId, targetType: 'template', targetId: templateId, details: { action: 'template.read' } });
    throw err;
  }
}
export const templatePatchSchema = z.object({ name: z.string().trim().min(1).optional(),
  target: z.string().trim().min(1).optional(), distribution: z.enum(['required', 'default', 'optional']).optional(),
}).strict().refine(p => Object.keys(p).length > 0, 'Change at least one field.');
export async function updateTemplate(actor: Actor, templateId: string, input: z.infer<typeof templatePatchSchema>): Promise<void> {
  await checkedWrite(actor, 'template', templateId, () => getDb().transaction(async tx => {
    const template = await lockTemplate(tx, templateId); await mayManage(actor, template); active(template);
    const parsed = templatePatchSchema.safeParse(input); if (!parsed.success) throw invalid(parsed.error.issues[0].message);
    const patch = parsed.data;
    if (template.scope === 'org' && (patch.target !== undefined || patch.distribution !== undefined)) throw invalid('Club-owned templates can change their name here; distribution is managed by USG.');
    if (patch.target && patch.target !== 'all') {
      const [cohort] = await tx.select().from(orgCohorts).where(eq(orgCohorts.cohortSlug, patch.target)).limit(1);
      if (!cohort) throw invalid('Choose all clubs or an existing cohort.');
    }
    if (template.distributedAt && patch.distribution && patch.distribution !== template.distribution) throw invalid('A distributed template keeps its distribution type. Publish a separate template to change it.');
    await tx.update(agentTemplates).set(patch).where(eq(agentTemplates.id, templateId));
    // TODO(verify): request a metadata-specific AuditAction; frozen contracts currently expose
    // template.publish only. metadataOnly distinguishes this from publishing an immutable version.
    await audit('template.publish', { actorUserId: actor.userId, actingOrgId: actor.activeOrgId, targetType: 'template', targetId: templateId,
      details: { metadataOnly: true, fields: Object.keys(patch) } }, tx);
  }));
}
