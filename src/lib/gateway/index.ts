// Owner: A (WP-4: steps 1–3 and 5–8 by H9, quota by H11). Every agent run goes through runAgent (I5).
// STUB: runs §7 steps 1–3 and 5 on the other streams' stubs and answers like the mock runtime, but
// writes nothing to the DB and does not hold or settle quota yet.
import { randomUUID } from 'node:crypto';
import { AppError, type Actor, type RunResult } from '../contracts';
import { capGrants, grantLabels, grantsFor } from '../authz';
import { canUse, effectiveAgent } from '../distribution';
import { listAccessibleDocuments } from '../documents/access';
import { audit } from './audit';
import { remaining } from './quota';
import { ORG, SOURCE } from '@db/seed/ids';

const MOCK_COST_MICRO = 10_000; // flat $0.01 (§7)

// STUB names until WP-4 reads them from the DB.
const CLUB_NAMES: Record<string, string> = {
  [ORG.usg]: 'USG', [ORG.startup]: 'Startup Club', [ORG.archery]: 'Archery Club', [ORG.dance]: 'Dance Club',
};
const SOURCE_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(SOURCE).flatMap(([org, kinds]) =>
    Object.entries(kinds).map(([kind, id]) => [id, `${org === 'usg' ? 'USG' : CLUB_NAMES[ORG[org as keyof typeof ORG]]} · ${kind}`]),
  ),
);

const firstSentence = (text: string) => (text.match(/^.*?[.!?](\s|$)/)?.[0] ?? text).trim();

export async function runAgent(actor: Actor, installationId: string, input: string): Promise<RunResult> {
  void input; // run input is private to the user (I15) and never audited
  if (!actor.userId) throw new AppError({ code: 'unauthenticated', message: 'Choose a persona to run agents.' });

  // 1. Effective agent
  const agent = await effectiveAgent(installationId);
  if (agent.status === 'retired') throw new AppError({ code: 'forbidden', message: 'Retired by USG.' });
  if (agent.status === 'disabled') throw new AppError({ code: 'forbidden', message: `${agent.name} is turned off in ${CLUB_NAMES[agent.orgId]}.` });

  // 2. Audience
  const verdict = await canUse(actor.userId, agent);
  if (!verdict.ok) throw new AppError({ code: 'forbidden', message: `You are not in the audience for ${agent.name}.` });

  // 3. Grants, capped by max tier
  const runGrants = capGrants(await grantsFor(actor.userId, agent.orgId), agent.orgId, agent.maxTier);

  // 4. Quota: TODO(WP-4)

  // 5. Accessible documents
  const runId = randomUUID();
  const docs = await listAccessibleDocuments(runGrants, agent.sourceIds);

  // 6. Mock runtime (§7)
  const cited = docs.slice(0, 3);
  const lines = [
    'Demo runtime: placeholder answer.',
    docs.length ? `I can read ${docs.length} document${docs.length === 1 ? '' : 's'}: ${docs.map((d) => d.title).join(', ')}.` : 'I cannot read any documents for this run.',
  ];
  if (agent.rulePack) {
    const cap = (agent.rulePack.content as { annualCapUsd?: number }).annualCapUsd;
    lines.push(`${agent.rulePack.label} v${agent.rulePack.version} · annual cap $${cap?.toLocaleString('en-US')}`);
  }

  // 8. Audit
  const auditEventId = await audit('agent.run', {
    actorUserId: actor.userId,
    actingOrgId: actor.activeOrgId,
    runId,
    installationId,
    targetType: 'installation',
    targetId: installationId,
    details: { costMicro: MOCK_COST_MICRO, documentIds: docs.map((d) => d.id) },
  });

  const club = await remaining({ scope: 'org', orgId: agent.orgId });
  return {
    runId,
    reply: lines.join('\n\n'),
    citations: cited.map((d) => ({ documentId: d.id, quote: firstSentence(d.bodyMd) })),
    pendingActions: [],
    inspector: {
      runGrants: await grantLabels(runGrants),
      sources: agent.sourceIds.map((id) => ({ id, name: SOURCE_NAMES[id] ?? 'Source' })),
      permitted: docs.map(({ id, title, tier }) => ({ id, title, tier })),
      readInRun: cited.map(({ id, title }) => ({ id, title })),
      templateVersion: agent.templateVersion,
      rulePack: agent.rulePack ? { label: agent.rulePack.label, version: agent.rulePack.version } : undefined,
      billedClub: CLUB_NAMES[agent.orgId] ?? '',
      costMicro: MOCK_COST_MICRO,
      quotaRemainingMicro: { [CLUB_NAMES[agent.orgId] ?? 'club']: club.remainingMicro },
      auditEventId,
    },
  };
}

export const gateway = { runAgent };
