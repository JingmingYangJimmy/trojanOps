// Owner: B. Policy edits cannot invalidate any stored installation (I7).
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { now } from '../clock';
import { AppError, type Actor } from '../contracts';
import { isUuid } from '../authz';
import { getDb } from '../db/client';
import { agentInstallations, agentTemplates, agentTemplateVersions, orgs, positions, sources, usgClubPolicy } from '../db/schema';
import { audit } from '../gateway/audit';
import { clampInstallation } from './clamps';
import { checkedWrite, clubBudget, invalid, usgAdmin } from './write-support';

export const clubPolicySchema = z.object({ allowedModelClasses: z.array(z.enum(['standard', 'economy'])).min(1), allowPublicAgents: z.boolean() }).strict();
export async function setClubPolicy(actor: Actor, orgId: string, input: z.infer<typeof clubPolicySchema>): Promise<void> {
  await checkedWrite(actor, 'org', orgId, () => getDb().transaction(async tx => {
    await usgAdmin(actor);
    if (!isUuid(orgId)) throw invalid('Choose an active club.');
    const parsed = clubPolicySchema.safeParse(input); if (!parsed.success) throw invalid(parsed.error.issues[0].message);
    // Policy writes lock only the club, never templates: template writers take template→club.
    const [club] = await tx.select().from(orgs).where(eq(orgs.id, orgId)).for('no key update');
    if (club?.kind !== 'rso' || club.status !== 'active') throw invalid('Choose an active club.');
    const rows = await tx.select({ installation: agentInstallations, version: agentTemplateVersions }).from(agentInstallations)
      .innerJoin(agentTemplates, eq(agentTemplates.id, agentInstallations.templateId))
      .leftJoin(agentTemplateVersions, and(eq(agentTemplateVersions.templateId, agentTemplates.id),
        eq(agentTemplateVersions.version, sql`case when ${agentInstallations.track} = 'pinned' and ${agentInstallations.pinnedVersion} is not null then ${agentInstallations.pinnedVersion} else ${agentTemplates.latestVersion} end`)))
      .where(eq(agentInstallations.orgId, orgId));
    const held = await tx.select().from(positions).where(eq(positions.orgId, orgId));
    const owned = await tx.select().from(sources).where(eq(sources.orgId, orgId));
    for (const { installation, version } of rows) {
      if (!version) throw invalid('Repair this club’s unresolved installation version before changing policy.');
      const result = clampInstallation({ version, installation, club: { policy: parsed.data,
        quotaMicro: await clubBudget(tx, orgId), positionSlugs: held.map(p => p.slug), ownedSourceIds: owned.map(s => s.id) } });
      if (!result.ok) {
        const { field, allowed, message } = result.violation;
        throw new AppError({ code: 'clamp_violation', message: `Update the club’s affected installations first. ${message}`, cap: { scope: 'club_policy', field, allowed } });
      }
    }
    const policy = { ...parsed.data, allowedModelClasses: [...new Set(parsed.data.allowedModelClasses)] };
    await tx.insert(usgClubPolicy).values({ orgId, ...policy, createdAt: now() }).onConflictDoUpdate({ target: usgClubPolicy.orgId, set: policy });
    // TODO(verify): AuditAction has no policy-specific action. This changes installation ceilings;
    // retain the existing installation.update action with an explicit club_policy target.
    await audit('installation.update', { actorUserId: actor.userId, actingOrgId: actor.activeOrgId,
      targetType: 'org', targetId: orgId, details: { resource: 'club_policy', ...policy } }, tx);
  }));
}
