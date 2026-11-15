// Owner: D (WP-11). A club's departments as its president manages them: create, edit, archive, and
// who is on each. Reads for the directory pages are in service.ts.
//
// Only the president acting in the club may write, and the club comes from the path: a department is
// always looked up by (club, slug), so another club's department can't be reached through this one.
// Authority is re-read from active memberships inside each write's transaction, so an actor captured
// before a presidential handoff can't keep managing the club. Every write and every refusal is audited.
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/api';
import { isUuid } from '@/lib/authz';
import { now } from '@/lib/clock';
import { AppError, type Actor, type AuditAction } from '@/lib/contracts';
import { getDb, type Tx } from '@/lib/db/client';
import { departmentMembers, departments, memberships, orgs, positions } from '@/lib/db/schema';
import { audit } from '@/lib/gateway/audit';

const text = (max: number) => z.string().trim().max(max);

export const departmentFields = {
  name: text(80).min(1, 'Enter a name.'),
  purpose: text(280),
  /** Paragraphs, in order; blank ones are dropped. */
  about: z.array(text(2000)).max(12).transform((paragraphs) => paragraphs.filter(Boolean)),
};

export const createDepartmentSchema = z.object({
  name: departmentFields.name,
  purpose: departmentFields.purpose.default(''),
  about: departmentFields.about.default([]),
}).strict();

export const updateDepartmentSchema = z.object({
  name: departmentFields.name.optional(),
  purpose: departmentFields.purpose.optional(),
  about: departmentFields.about.optional(),
  /** Must be on the department; null leaves the role open. */
  leadUserId: z.uuid().nullable().optional(),
}).strict();

export const addDepartmentMemberSchema = z.object({ userId: z.uuid() }).strict();

export type CreateDepartmentInput = z.input<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.input<typeof updateDepartmentSchema>;

/** "Marketing and recruiting" → "marketing-and-recruiting". Empty when the name has no letters or digits. */
export function departmentSlug(name: string): string {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');
}

type Department = typeof departments.$inferSelect;

const forbidden = () => new AppError({ code: 'forbidden', message: 'Only the president acting in this club can manage its departments.' });
const missingDepartment = () => new AppError({ code: 'not_found', message: 'This department does not exist in this club.' });
const invalid = (message: string) => new AppError({ code: 'invalid', message });

/** Create a department; its slug comes from the name and is fixed from then on. */
export async function createDepartment(actor: Actor, orgId: string, raw: CreateDepartmentInput): Promise<{ id: string; slug: string }> {
  const input = parse(createDepartmentSchema, raw);
  const slug = departmentSlug(input.name);
  if (!slug) throw invalid('Use letters or numbers in the department name.');
  return manage(actor, orgId, 'department.create', async (tx, club) => {
    await assertNameFree(tx, orgId, club.name, input.name, slug, null);
    const id = crypto.randomUUID();
    try {
      await tx.transaction((inner) => inner.insert(departments).values({
        id, orgId, slug, name: input.name, purpose: input.purpose, about: input.about, createdAt: now(),
      }));
    } catch (err) {
      if (uniqueViolation(err)) throw invalid(`${club.name} already has a department called ${input.name}.`);
      throw err;
    }
    return { result: { id, slug }, targetId: id, details: { slug } };
  });
}

/** Edit a department's name, purpose, about text or lead. The slug, and so its links, stay the same. */
export async function updateDepartment(actor: Actor, orgId: string, slug: string, raw: UpdateDepartmentInput): Promise<{ slug: string }> {
  const input = parse(updateDepartmentSchema, raw);
  return manage(actor, orgId, 'department.update', async (tx, club) => {
    const department = await liveDepartment(tx, orgId, slug);
    if (input.name !== undefined && input.name !== department.name) {
      await assertNameFree(tx, orgId, club.name, input.name, null, department.id);
    }
    if (input.leadUserId) {
      const [onTeam] = await tx.select({ userId: departmentMembers.userId }).from(departmentMembers)
        .where(and(eq(departmentMembers.departmentId, department.id), eq(departmentMembers.userId, input.leadUserId)));
      if (!onTeam || !(await isActiveMember(tx, orgId, input.leadUserId))) {
        throw invalid(`Choose the lead from the members of ${department.name}.`);
      }
    }
    const changes = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.purpose !== undefined && { purpose: input.purpose }),
      ...(input.about !== undefined && { about: input.about }),
      ...(input.leadUserId !== undefined && { leadUserId: input.leadUserId }),
    };
    if (Object.keys(changes).length > 0) await tx.update(departments).set(changes).where(eq(departments.id, department.id));
    return {
      result: { slug: department.slug },
      targetId: department.id,
      details: { slug: department.slug, fields: Object.keys(changes), leadUserId: input.leadUserId ?? null },
    };
  });
}

/** Archive a department: it leaves the directory and its slug can be used again. */
export async function archiveDepartment(actor: Actor, orgId: string, slug: string): Promise<void> {
  await manage(actor, orgId, 'department.archive', async (tx) => {
    const department = await liveDepartment(tx, orgId, slug);
    await tx.update(departments).set({ archivedAt: now() }).where(eq(departments.id, department.id));
    return { result: undefined, targetId: department.id, details: { slug: department.slug } };
  });
}

/** Put a current member of the club on a department. Adding someone already on it changes nothing. */
export async function addDepartmentMember(actor: Actor, orgId: string, slug: string, userId: string): Promise<{ added: boolean }> {
  return manage(actor, orgId, 'department.member.add', async (tx, club) => {
    const department = await liveDepartment(tx, orgId, slug);
    if (!isUuid(userId) || !(await isActiveMember(tx, orgId, userId))) throw invalid(`Choose a current member of ${club.name}.`);
    const added = await tx.insert(departmentMembers).values({ departmentId: department.id, userId, createdAt: now() })
      .onConflictDoNothing().returning({ userId: departmentMembers.userId });
    return { result: { added: added.length > 0 }, targetId: department.id, details: { slug: department.slug, userId, changed: added.length > 0 } };
  });
}

/** Take someone off a department. Removing its lead leaves the lead role open. */
export async function removeDepartmentMember(actor: Actor, orgId: string, slug: string, userId: string): Promise<{ removed: boolean }> {
  return manage(actor, orgId, 'department.member.remove', async (tx) => {
    const department = await liveDepartment(tx, orgId, slug);
    if (!isUuid(userId)) throw new AppError({ code: 'not_found', message: `This person is not on ${department.name}.` });
    const removed = await tx.delete(departmentMembers)
      .where(and(eq(departmentMembers.departmentId, department.id), eq(departmentMembers.userId, userId)))
      .returning({ userId: departmentMembers.userId });
    if (removed.length === 0) throw new AppError({ code: 'not_found', message: `This person is not on ${department.name}.` });
    if (department.leadUserId === userId) {
      await tx.update(departments).set({ leadUserId: null }).where(eq(departments.id, department.id));
    }
    return { result: { removed: true }, targetId: department.id, details: { slug: department.slug, userId, wasLead: department.leadUserId === userId } };
  });
}

// ---------------------------------------------------------------- helpers

/** Services take the same shapes as the routes and normalize them the same way (trimmed text, no
 * blank paragraphs), whoever calls. */
function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  throw invalid(`${issue?.path.length ? `${issue.path.join('.')}: ` : ''}${issue?.message ?? 'Invalid request.'}`);
}

type Details = Record<string, string | number | boolean | null | string[]>;

/**
 * Runs one department write for the president acting in `orgId`: checks authority inside the
 * transaction, then writes the change and its audit row together. A refusal is audited as
 * `authz.denied` and rethrown.
 */
async function manage<T>(
  actor: Actor,
  orgId: string,
  action: AuditAction,
  write: (tx: Tx, club: { id: string; name: string }) => Promise<{ result: T; targetId: string; details: Details }>,
): Promise<T> {
  const userId = requireUser(actor);
  try {
    if (actor.activeOrgId !== orgId || !actor.positions.includes('president') || !isUuid(orgId)) throw forbidden();
    return await getDb().transaction(async (tx) => {
      // Serialize a club's department writes, and re-read authority after taking the lock.
      const [club] = await tx.select({ id: orgs.id, name: orgs.name, kind: orgs.kind, status: orgs.status })
        .from(orgs).where(eq(orgs.id, orgId)).for('no key update');
      if (club?.kind !== 'rso' || club.status !== 'active') throw forbidden();
      if (!(await holdsPresident(tx, orgId, userId))) throw forbidden();
      const { result, targetId, details } = await write(tx, club);
      await audit(action, { actorUserId: userId, actingOrgId: orgId, targetType: 'department', targetId, details }, tx);
      return result;
    });
  } catch (err) {
    if (err instanceof AppError && err.error.code === 'forbidden') {
      await audit('authz.denied', { actorUserId: userId, actingOrgId: actor.activeOrgId,
        targetType: 'org', targetId: orgId, details: { action } });
    }
    throw err;
  }
}

async function holdsPresident(tx: Tx, orgId: string, userId: string): Promise<boolean> {
  const [row] = await tx.select({ id: memberships.id }).from(memberships)
    .innerJoin(positions, and(eq(positions.id, memberships.positionId), eq(positions.orgId, memberships.orgId)))
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId), isNull(memberships.endedAt), eq(positions.slug, 'president')))
    .limit(1);
  return Boolean(row);
}

async function isActiveMember(tx: Tx, orgId: string, userId: string): Promise<boolean> {
  const [row] = await tx.select({ id: memberships.id }).from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId), isNull(memberships.endedAt))).limit(1);
  return Boolean(row);
}

async function liveDepartment(tx: Tx, orgId: string, slug: string): Promise<Department> {
  const [department] = await tx.select().from(departments)
    .where(and(eq(departments.orgId, orgId), eq(departments.slug, slug), isNull(departments.archivedAt)));
  if (!department) throw missingDepartment();
  return department;
}

/** Two live departments of one club may not share a name or a slug. */
async function assertNameFree(tx: Tx, orgId: string, clubName: string, name: string, slug: string | null, exceptId: string | null): Promise<void> {
  const [taken] = await tx.select({ id: departments.id }).from(departments).where(and(
    eq(departments.orgId, orgId),
    isNull(departments.archivedAt),
    slug ? sql`(lower(${departments.name}) = lower(${name}) or ${departments.slug} = ${slug})` : sql`lower(${departments.name}) = lower(${name})`,
    exceptId ? ne(departments.id, exceptId) : undefined,
  )).limit(1);
  if (taken) throw invalid(`${clubName} already has a department called ${name}.`);
}

function uniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
}
