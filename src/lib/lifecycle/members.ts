// Club roster edits by the club's president: add and remove members, create positions, and assign
// or unassign a position. Like transferPosition, every write is a `manual` membership change in one
// transaction, under the club's row lock, after re-reading the caller's presidency. roster_state is
// left alone, so a later sync of an unchanged roster does not undo it (§13). Grants are recomputed
// per request (I3), so each change takes effect on the next request.
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '../api';
import { isUuid } from '../authz';
import { now } from '../clock';
import { AppError, type Actor, type AuditAction, type AuditEvent } from '../contracts';
import { getDb, type Tx } from '../db/client';
import { memberships, orgs, positions, users } from '../db/schema';
import { audit } from '../gateway/audit';

export const addMemberSchema = z.object({
  userId: z.uuid().optional(),
  netId: z.string().trim().min(1).max(64).optional(),
  positionSlug: z.string().min(1).max(64).optional(),
}).strict().refine((b) => Boolean(b.userId) !== Boolean(b.netId), { message: 'Choose a student or enter a NetID.' });
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const createPositionSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name for the position.').max(60),
  isOfficer: z.boolean(),
}).strict();
export type CreatePositionInput = z.infer<typeof createPositionSchema>;

export const assignPositionSchema = z.object({ userId: z.uuid() }).strict();

const invalid = (message: string) => new AppError({ code: 'invalid', message });
const missing = (message: string) => new AppError({ code: 'not_found', message });
const forbidden = () => new AppError({ code: 'forbidden', message: 'Only the president acting in this club can change its members and positions.' });

/** "Events Lead" → "events-lead". Lowercase ASCII letters, digits and single hyphens. */
export function positionSlug(name: string): string {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');
}

type Position = typeof positions.$inferSelect;

/** Locks the club and re-reads the caller's presidency inside the transaction, so an Actor captured
 * before a presidential handoff cannot edit the roster afterwards. */
async function lockAsPresident(tx: Tx, orgId: string, userId: string): Promise<void> {
  const [club] = await tx.select().from(orgs).where(eq(orgs.id, orgId)).for('no key update');
  if (club?.kind !== 'rso' || club.status !== 'active') throw missing('This active club does not exist.');
  const [president] = await tx.select({ id: memberships.id }).from(memberships)
    .innerJoin(positions, and(eq(positions.id, memberships.positionId), eq(positions.orgId, memberships.orgId)))
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId),
      isNull(memberships.endedAt), eq(positions.slug, 'president'))).limit(1);
  if (!president) throw forbidden();
}

async function positionBySlug(tx: Tx, orgId: string, slug: string): Promise<Position> {
  const [position] = await tx.select().from(positions).where(and(eq(positions.orgId, orgId), eq(positions.slug, slug)));
  if (!position) throw missing('This position does not exist in this club.');
  return position;
}

/** The user's active memberships in the club, with each position's slug. */
async function held(tx: Tx, orgId: string, userId: string) {
  return tx.select({ id: memberships.id, positionId: memberships.positionId, slug: positions.slug }).from(memberships)
    .innerJoin(positions, and(eq(positions.id, memberships.positionId), eq(positions.orgId, memberships.orgId)))
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId), isNull(memberships.endedAt)));
}

/** How many people hold the club's presidency now. */
async function presidents(tx: Tx, orgId: string): Promise<number> {
  const rows = await tx.selectDistinct({ userId: memberships.userId }).from(memberships)
    .innerJoin(positions, and(eq(positions.id, memberships.positionId), eq(positions.orgId, memberships.orgId)))
    .where(and(eq(memberships.orgId, orgId), isNull(memberships.endedAt), eq(positions.slug, 'president')));
  return rows.length;
}

/** The checks, transaction and audit every roster edit shares. A refusal for lack of authority is
 * audited as authz.denied outside the rolled-back transaction; the change's own audit row commits
 * with it. */
async function rosterWrite<T extends { targetType: string; targetId: string; details: AuditEvent['details'] }>(
  actor: Actor, orgId: string, action: AuditAction, fn: (tx: Tx, userId: string) => Promise<T>,
): Promise<T> {
  const userId = requireUser(actor);
  try {
    if (actor.activeOrgId !== orgId || !actor.positions.includes('president')) throw forbidden();
    if (!isUuid(orgId)) throw missing('This active club does not exist.');
    return await getDb().transaction(async (tx) => {
      await lockAsPresident(tx, orgId, userId);
      const result = await fn(tx, userId);
      await audit(action, { actorUserId: userId, actingOrgId: orgId, targetType: result.targetType,
        targetId: result.targetId, details: result.details }, tx);
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

/** Adds an existing user to the club in a position: the club's shared member position unless one
 * is named. A user who is already a member gets a position through assignPosition instead. */
export async function addMember(actor: Actor, orgId: string, input: AddMemberInput): Promise<{ userId: string; positionSlug: string }> {
  const parsed = addMemberSchema.safeParse(input);
  if (!parsed.success) throw invalid(parsed.error.issues[0].message);
  const { userId: chosenId, netId, positionSlug: slug } = parsed.data;
  const result = await rosterWrite(actor, orgId, 'member.add', async (tx) => {
    const [user] = chosenId
      ? await tx.select({ id: users.id }).from(users).where(eq(users.id, chosenId))
      : await tx.select({ id: users.id }).from(users).where(eq(users.externalId, netId!.toLowerCase()));
    if (!user) throw missing(chosenId ? 'This student does not exist.' : `No student has the NetID ${netId}.`);
    if ((await held(tx, orgId, user.id)).length > 0) throw invalid('This student is already a member. Assign them a position instead.');
    let position: Position | undefined;
    if (slug) position = await positionBySlug(tx, orgId, slug);
    else {
      const shared = await tx.select().from(positions).where(and(eq(positions.orgId, orgId), eq(positions.isOfficer, false)));
      position = shared.find((p) => p.slug === 'member') ?? shared.sort((a, b) => a.slug.localeCompare(b.slug))[0];
      if (!position) throw invalid('This club has no member position. Create one first.');
    }
    const at = now();
    await tx.insert(memberships).values({ orgId, userId: user.id, positionId: position.id, source: 'manual', startedAt: at, createdAt: at });
    return { targetType: 'user', targetId: user.id, details: { positionId: position.id }, positionSlug: position.slug };
  });
  return { userId: result.targetId, positionSlug: result.positionSlug };
}

/** Ends every active membership the user holds in the club. The club's only president cannot be
 * removed: that would leave no one able to manage it. */
export async function removeMember(actor: Actor, orgId: string, memberId: string): Promise<{ endedPositions: string[] }> {
  const result = await rosterWrite(actor, orgId, 'member.remove', async (tx) => {
    if (!isUuid(memberId)) throw missing('This student is not a member of this club.');
    const current = await held(tx, orgId, memberId);
    if (current.length === 0) throw missing('This student is not a member of this club.');
    if (current.some((m) => m.slug === 'president') && await presidents(tx, orgId) <= 1) {
      throw invalid('The club’s only president cannot be removed. Transfer the presidency first.');
    }
    await tx.update(memberships).set({ endedAt: now() }).where(inArray(memberships.id, current.map((m) => m.id)));
    const ended = [...new Set(current.map((m) => m.slug))].sort();
    return { targetType: 'user', targetId: memberId, details: { positionIds: [...new Set(current.map((m) => m.positionId))].sort() }, ended };
  });
  return { endedPositions: result.ended };
}

/** Creates a position in the club. Its slug comes from the name and is unique within the club. */
export async function createPosition(actor: Actor, orgId: string, input: CreatePositionInput): Promise<{ slug: string; name: string; isOfficer: boolean }> {
  const parsed = createPositionSchema.safeParse(input);
  if (!parsed.success) throw invalid(parsed.error.issues[0].message);
  const { name, isOfficer } = parsed.data;
  const slug = positionSlug(name);
  if (!slug) throw invalid('Use letters or numbers in the position name.');
  await rosterWrite(actor, orgId, 'position.create', async (tx) => {
    const [taken] = await tx.select({ id: positions.id }).from(positions).where(and(eq(positions.orgId, orgId), eq(positions.slug, slug)));
    if (taken) throw invalid(`This club already has a position called ${name}.`);
    const [created] = await tx.insert(positions).values({ orgId, slug, name, isOfficer, createdAt: now() }).returning({ id: positions.id });
    return { targetType: 'position', targetId: created.id, details: { isOfficer } };
  });
  return { slug, name, isOfficer };
}

/** Gives a current member a position. Idempotent: a position they already hold changes nothing. */
export async function assignPosition(actor: Actor, orgId: string, slug: string, memberId: string): Promise<{ changed: boolean }> {
  const result = await rosterWrite(actor, orgId, 'position.assign', async (tx) => {
    const position = await positionBySlug(tx, orgId, slug);
    if (!isUuid(memberId)) throw missing('Choose a current member of this club.');
    const current = await held(tx, orgId, memberId);
    if (current.length === 0) throw missing('Choose a current member of this club.');
    const changed = !current.some((m) => m.positionId === position.id);
    if (changed) {
      const at = now();
      await tx.insert(memberships).values({ orgId, userId: memberId, positionId: position.id, source: 'manual', startedAt: at, createdAt: at });
    }
    return { targetType: 'position', targetId: position.id, details: { userId: memberId, changed }, changed };
  });
  return { changed: result.changed };
}

/** Takes a position from a member who keeps at least one other. Their last position is removal
 * from the club, which is removeMember's job; the club's only president keeps the presidency. */
export async function unassignPosition(actor: Actor, orgId: string, slug: string, memberId: string): Promise<void> {
  await rosterWrite(actor, orgId, 'position.unassign', async (tx) => {
    const position = await positionBySlug(tx, orgId, slug);
    if (!isUuid(memberId)) throw missing('This member does not hold this position.');
    const current = await held(tx, orgId, memberId);
    const ending = current.filter((m) => m.positionId === position.id);
    if (ending.length === 0) throw missing('This member does not hold this position.');
    if (position.slug === 'president' && await presidents(tx, orgId) <= 1) {
      throw invalid('The club’s only president keeps the presidency. Transfer it instead.');
    }
    if (ending.length === current.length) throw invalid('This is their only position. Remove them from the club instead.');
    await tx.update(memberships).set({ endedAt: now() }).where(inArray(memberships.id, ending.map((m) => m.id)));
    return { targetType: 'position', targetId: position.id, details: { userId: memberId } };
  });
}
