// Owner: C (WP-9, real by H10). STUB: builds the matrix from fixtures with explainAccess.
import { AppError, type Actor, type Grant, type PreviewMatrix } from '../contracts';
import { effectiveAgent } from '../distribution';
import { explainAccess } from './access';
import { FIXTURE_CLUB_POSITIONS, FIXTURE_DOCUMENTS } from './fixtures';
import { DOCUMENT } from '@db/seed/ids';

const POSITION_LABELS: Record<string, string> = {
  president: 'President', treasurer: 'Treasurer', secretary: 'Secretary', admin: 'Admin', reviewer: 'Reviewer',
};

/** Who could read what through this installation. President of the installation's club only. */
export async function previewAccess(viewer: Actor, installationId: string): Promise<PreviewMatrix> {
  const agent = await effectiveAgent(installationId);
  if (viewer.activeOrgId !== agent.orgId || !viewer.positions.includes('president')) {
    throw new AppError({ code: 'forbidden', message: 'Only the club president can preview agent access.' });
  }
  const org = agent.orgId;
  const subjects: Array<{ key: string; label: string; grants: Grant[] }> = [
    { key: 'student', label: 'Any signed-in student', grants: ['*'] },
    { key: 'member', label: 'Member', grants: ['*', `${org}:*`] },
    ...(FIXTURE_CLUB_POSITIONS[org] ?? []).map((p) => ({
      key: p,
      label: POSITION_LABELS[p] ?? p,
      grants: ['*', `${org}:*`, `${org}:${p}`] as Grant[],
    })),
  ];
  const docs = FIXTURE_DOCUMENTS.filter((d) => d.orgId === org || d.id === DOCUMENT.usgFundingRules);
  const cells: PreviewMatrix['cells'] = {};
  for (const s of subjects) {
    cells[s.key] = {};
    for (const d of docs) cells[s.key][d.id] = explainAccess(s.grants, agent, d);
  }
  return {
    subjects: subjects.map(({ key, label }) => ({ key, label })),
    documents: docs.map((d) => ({ id: d.id, title: d.title, tier: d.tier, source: d.sourceName })),
    cells,
  };
}
