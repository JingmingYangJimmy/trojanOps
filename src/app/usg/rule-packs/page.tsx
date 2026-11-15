import { PageHeader } from '@/components/shell';
import { AppError } from '@/lib/contracts';
import { usgRulePacksView } from '@/lib/distribution/usg-view';
import { getActor } from '@/lib/identity';
import { ConsoleNav, DeniedConsole } from '../templates/console-ui';
import { RulePacksTable } from './rule-packs-table';
export default async function RulePacksPage() {
  const actor = await getActor(); let packs;
  try { packs = await usgRulePacksView(actor); }
  catch (error) {
    if (!(error instanceof AppError) || !['forbidden', 'unauthenticated'].includes(error.error.code)) throw error;
    return <><PageHeader title="Rule packs" /><DeniedConsole /></>;
  }
  return <><PageHeader title="Rule packs" description="Publish immutable rule versions. Funding agents use the latest published pack on their next run." /><ConsoleNav />
    <RulePacksTable key={`${actor.userId}:${actor.activeOrgId}`} packs={packs} /></>;
}
