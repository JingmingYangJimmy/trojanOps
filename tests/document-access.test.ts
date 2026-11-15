// Changing who can read an existing document (updateDocumentAccess, PATCH …/access): the org's manager
// narrows or widens a document's tier and positions, the trigger recomputes read_grants, and library
// reads, explainAccess and agent runs follow on the next request. Every case runs in a rolled-back
// transaction as trojanops_app.
import { and, eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import * as accessRoute from '@/app/api/orgs/[orgId]/documents/[documentId]/access/route';
import { capGrants, grantsFor } from '@/lib/authz';
import type { Actor, Grant, Tier } from '@/lib/contracts';
import { auditEvents, documents } from '@/lib/db/schema';
import { withActor } from '@/lib/db/with-actor';
import { effectiveAgent } from '@/lib/distribution';
import { explainAccess, listAccessibleDocuments } from '@/lib/documents/access';
import { getDocumentPageData } from '@/lib/documents/document-page';
import { listLibraryDocuments, publishDocumentVersion, updateDocumentAccess } from '@/lib/documents/library';
import { usgDocumentView } from '@/lib/documents/usg-documents';
import { runAgent } from '@/lib/gateway';
import { ACTIVE_ORG_COOKIE, PERSONA_COOKIE } from '@/lib/identity';
import { DOCUMENT, INSTALLATION, ORG, SOURCE, USER } from '@db/seed/ids';
import { actorFor, appSql, closeAppDb, inRolledBackApp } from './db';

const probe = await appSql();
await probe?.end();
afterAll(async () => { if (probe) await closeAppDb(); });

const sam = () => actorFor(USER.sam, ORG.startup);
const avery = () => actorFor(USER.avery, ORG.usg);
const ALL_GRANTS: Grant[] = ['*', ...[ORG.startup, ORG.usg].flatMap((o): Grant[] => [`${o}:*`, `${o}:president`, `${o}:treasurer`, `${o}:secretary`, `${o}:admin`, `${o}:reviewer`])];

/** The stored row, read with every grant over its source (the trigger's output included). */
async function stored(id: string, sourceId: string) {
  const [row] = await withActor(await sam(), { grants: ALL_GRANTS, sourceIds: [sourceId] }, (tx) =>
    tx.select({ tier: documents.tier, allowedPositions: documents.allowedPositions, readGrants: documents.readGrants, version: documents.version, bodyMd: documents.bodyMd })
      .from(documents).where(eq(documents.id, id)));
  return row;
}

/** What a run by this user through this installation may read, built as gateway steps 3 and 5. */
async function runReadable(userId: string, installationId: string): Promise<Set<string>> {
  const agent = await effectiveAgent(installationId);
  const userGrants = await grantsFor(userId, agent.orgId);
  const actor: Actor = { userId, activeOrgId: agent.orgId, positions: [], grants: userGrants };
  return new Set((await listAccessibleDocuments(actor, capGrants(userGrants, agent.orgId, agent.maxTier), agent)).map((d) => d.id));
}

const libraryIds = async (actor: Actor, orgId: string) => (await listLibraryDocuments(actor, orgId)).map((d) => d.id);

describe.skipIf(!probe)('document access changes', () => {
  it('narrowing removes a document from a former reader’s library, explainAccess and agent runs', () => inRolledBackApp(async () => {
    const taylor = await actorFor(USER.taylor, ORG.startup);
    expect(await libraryIds(taylor, ORG.startup)).toContain(DOCUMENT.spring2026Budget);
    expect((await runReadable(USER.taylor, INSTALLATION.startupHandoff)).has(DOCUMENT.spring2026Budget)).toBe(true);

    expect(await updateDocumentAccess(await sam(), ORG.startup, DOCUMENT.spring2026Budget, { tier: 'officers', allowedPositions: [] }))
      .toEqual({ tier: 'officers', allowedPositions: [] });

    const row = await stored(DOCUMENT.spring2026Budget, SOURCE.startup.finance);
    expect(row).toMatchObject({ tier: 'officers', allowedPositions: [], readGrants: [`${ORG.startup}:president`] });
    expect(await libraryIds(taylor, ORG.startup)).not.toContain(DOCUMENT.spring2026Budget);
    const handoff = await effectiveAgent(INSTALLATION.startupHandoff);
    const taylorGrants = await grantsFor(USER.taylor, ORG.startup);
    expect(explainAccess(capGrants(taylorGrants, ORG.startup, handoff.maxTier), handoff,
      { sourceId: SOURCE.startup.finance, tier: row!.tier, readGrants: row!.readGrants })).toBe('not_granted');
    expect((await runReadable(USER.taylor, INSTALLATION.startupHandoff)).has(DOCUMENT.spring2026Budget)).toBe(false);
    const run = await runAgent(taylor, INSTALLATION.startupHandoff, 'What is in our spring budget?');
    expect(run.inspector.permitted.map((d) => d.id)).not.toContain(DOCUMENT.spring2026Budget);
    // The president still reads it.
    expect(await libraryIds(await sam(), ORG.startup)).toContain(DOCUMENT.spring2026Budget);
  }));

  it('widening grants access to people who could not read it before', () => inRolledBackApp(async () => {
    const casey = await actorFor(USER.casey, ORG.startup);
    expect(await libraryIds(casey, ORG.startup)).not.toContain(DOCUMENT.spring2026Budget);
    expect((await runReadable(USER.casey, INSTALLATION.startupHandoff)).has(DOCUMENT.spring2026Budget)).toBe(false);

    await updateDocumentAccess(await sam(), ORG.startup, DOCUMENT.spring2026Budget, { tier: 'members', allowedPositions: [] });
    expect(await stored(DOCUMENT.spring2026Budget, SOURCE.startup.finance)).toMatchObject({ tier: 'members', readGrants: [`${ORG.startup}:*`] });
    expect(await libraryIds(casey, ORG.startup)).toContain(DOCUMENT.spring2026Budget);
    expect((await runReadable(USER.casey, INSTALLATION.startupHandoff)).has(DOCUMENT.spring2026Budget)).toBe(true);

    // Adding a position widens Officers to that position only.
    await updateDocumentAccess(await sam(), ORG.startup, DOCUMENT.sponsorContacts, { tier: 'officers', allowedPositions: ['treasurer', 'secretary', 'treasurer'] });
    expect((await stored(DOCUMENT.sponsorContacts, SOURCE.startup.finance))?.readGrants.sort())
      .toEqual([`${ORG.startup}:president`, `${ORG.startup}:secretary`, `${ORG.startup}:treasurer`].sort());
  }));

  it('writes an audit row with the old and new access', () => inRolledBackApp(async (tx) => {
    await updateDocumentAccess(await sam(), ORG.startup, DOCUMENT.spring2026Budget, { tier: 'members', allowedPositions: [] });
    const [entry] = await tx.select().from(auditEvents)
      .where(and(eq(auditEvents.action, 'document.access'), eq(auditEvents.targetId, DOCUMENT.spring2026Budget)));
    expect(entry).toMatchObject({ actorUserId: USER.sam, actingOrgId: ORG.startup, targetType: 'document' });
    expect(entry?.details).toEqual({ version: 1, fromTier: 'officers', fromPositions: ['treasurer'], tier: 'members', allowedPositions: [] });
  }));

  it('refuses non-managers with 403 and leaves the document unchanged', () => inRolledBackApp(async () => {
    const before = await stored(DOCUMENT.spring2026Budget, SOURCE.startup.finance);
    const change = { tier: 'public' as Tier, allowedPositions: [] };
    for (const actor of [await actorFor(USER.taylor, ORG.startup), await actorFor(USER.casey, ORG.startup), await avery(), await actorFor(USER.lee, null)]) {
      await expect(updateDocumentAccess(actor, ORG.startup, DOCUMENT.spring2026Budget, change)).rejects.toMatchObject({ error: { code: 'forbidden' } });
    }
    const url = `http://localhost/api/orgs/${ORG.startup}/documents/${DOCUMENT.spring2026Budget}/access`;
    const ctx = { params: Promise.resolve({ orgId: ORG.startup, documentId: DOCUMENT.spring2026Budget }) };
    const patch = (userId: string, body: unknown) => accessRoute.PATCH(new Request(url, {
      method: 'PATCH', body: JSON.stringify(body),
      headers: { cookie: `${PERSONA_COOKIE}=${userId}; ${ACTIVE_ORG_COOKIE}=${ORG.startup}`, 'content-type': 'application/json' },
    }), ctx);
    expect((await patch(USER.taylor, change)).status).toBe(403);
    expect(await stored(DOCUMENT.spring2026Budget, SOURCE.startup.finance)).toEqual(before);
    // The manager's route validates the body, then saves.
    expect((await patch(USER.sam, { tier: 'everyone' })).status).toBe(400);
    expect((await patch(USER.sam, { tier: 'members', allowedPositions: [], extra: 1 })).status).toBe(400);
    const ok = await patch(USER.sam, { tier: 'members' });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ tier: 'members', allowedPositions: [] });
  }));

  it('cannot reach another org’s document through this org’s path', () => inRolledBackApp(async () => {
    const change = { tier: 'members' as Tier, allowedPositions: [] };
    const usgBefore = await stored(DOCUMENT.usgFundingRules, SOURCE.usg.rulebook);
    // Sam manages Startup; USG's guidelines appear in Startup's library but belong to USG.
    await expect(updateDocumentAccess(await sam(), ORG.startup, DOCUMENT.usgFundingRules, change)).rejects.toMatchObject({ error: { code: 'not_found' } });
    await expect(updateDocumentAccess(await sam(), ORG.startup, DOCUMENT.archeryBudget2026, change)).rejects.toMatchObject({ error: { code: 'not_found' } });
    // Naming the other org is refused: Sam doesn't manage it.
    await expect(updateDocumentAccess(await sam(), ORG.archery, DOCUMENT.archeryBudget2026, change)).rejects.toMatchObject({ error: { code: 'forbidden' } });
    await expect(updateDocumentAccess(await avery(), ORG.usg, DOCUMENT.spring2026Budget, change)).rejects.toMatchObject({ error: { code: 'not_found' } });
    expect(await stored(DOCUMENT.usgFundingRules, SOURCE.usg.rulebook)).toEqual(usgBefore);
    expect((await stored(DOCUMENT.spring2026Budget, SOURCE.startup.finance))?.tier).toBe('officers');
  }));

  it('validates tiers and positions against the org', () => inRolledBackApp(async () => {
    const actor = await sam();
    const attempt = (tier: Tier, allowedPositions: string[]) => updateDocumentAccess(actor, ORG.startup, DOCUMENT.spring2026Budget, { tier, allowedPositions });
    await expect(attempt('usg_internal', [])).rejects.toMatchObject({ error: { code: 'invalid' } });
    await expect(attempt('members', ['treasurer'])).rejects.toMatchObject({ error: { code: 'invalid' } });
    await expect(attempt('officers', ['member'])).rejects.toMatchObject({ error: { code: 'invalid' } });
    await expect(attempt('officers', ['treasurer'])).rejects.toMatchObject({ error: { code: 'invalid', message: expect.stringContaining('unchanged') } });
  }));

  it('applies to every version: the row is the document, and new versions keep the narrowed access', () => inRolledBackApp(async (tx) => {
    const actor = await avery();
    const precheck = () => runReadable(USER.taylor, INSTALLATION.startupFundingPrecheck);
    expect((await precheck()).has(DOCUMENT.usgFundingRules)).toBe(true);
    const v1 = await stored(DOCUMENT.usgFundingRules, SOURCE.usg.rulebook);
    await publishDocumentVersion(actor, ORG.usg, DOCUMENT.usgFundingRules, { bodyMd: `${v1!.bodyMd}\n\nAmended.`, baseVersion: 1 });

    await updateDocumentAccess(actor, ORG.usg, DOCUMENT.usgFundingRules, { tier: 'usg_internal', allowedPositions: [] });
    // One row per document: no earlier version is left behind with the old audience.
    const rows = await withActor(actor, { grants: ALL_GRANTS, sourceIds: [SOURCE.usg.rulebook] }, (t) =>
      t.select({ version: documents.version, tier: documents.tier }).from(documents).where(eq(documents.id, DOCUMENT.usgFundingRules)));
    expect(rows).toEqual([{ version: 2, tier: 'usg_internal' }]);
    expect((await precheck()).has(DOCUMENT.usgFundingRules)).toBe(false);
    expect(await libraryIds(await actorFor(USER.lee, null), ORG.startup)).not.toContain(DOCUMENT.usgFundingRules);

    // Publishing v3 keeps the narrowed access.
    await publishDocumentVersion(actor, ORG.usg, DOCUMENT.usgFundingRules, { bodyMd: 'Version three.', baseVersion: 2 });
    expect(await stored(DOCUMENT.usgFundingRules, SOURCE.usg.rulebook)).toMatchObject({ version: 3, tier: 'usg_internal' });
    const [entry] = await tx.select().from(auditEvents)
      .where(and(eq(auditEvents.action, 'document.access'), eq(auditEvents.targetId, DOCUMENT.usgFundingRules)));
    expect(entry?.details).toMatchObject({ version: 2, fromTier: 'public', tier: 'usg_internal' });
  }));

  it('offers Edit access only to the manager, and only for the org’s own documents', () => inRolledBackApp(async () => {
    const own = await getDocumentPageData(await sam(), ORG.startup, DOCUMENT.spring2026Budget);
    expect(own?.accessEditor).toMatchObject({ access: { tier: 'officers', allowedPositions: ['treasurer'] } });
    expect(own?.accessEditor?.positions.map((p) => p.slug)).toContain('treasurer');
    expect((await getDocumentPageData(await sam(), ORG.startup, DOCUMENT.usgFundingRules))?.accessEditor).toBeNull();
    expect((await getDocumentPageData(await actorFor(USER.taylor, ORG.startup), ORG.startup, DOCUMENT.spring2026Budget))?.accessEditor).toBeNull();
    const usg = await usgDocumentView(await avery(), DOCUMENT.reviewerNotes);
    expect(usg).toMatchObject({ whoCanRead: 'Reviewer, Admin', accessEditor: { access: { tier: 'usg_internal', allowedPositions: [] } } });
  }));
});
