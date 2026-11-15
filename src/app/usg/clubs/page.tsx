import { PageHeader } from '@/components/shell';
import { AppError } from '@/lib/contracts';
import { usgClubsView } from '@/lib/distribution/usg-view';
import { getActor } from '@/lib/identity';
import { ConsoleNav, DeniedConsole } from '../templates/console-ui';
import { ClubsTable } from './clubs-table';
export default async function ClubsPage() {
  const actor = await getActor(); let clubs;
  try { clubs = await usgClubsView(actor); }
  catch (error) {
    if (!(error instanceof AppError) || !['forbidden', 'unauthenticated'].includes(error.error.code)) throw error;
    return <><PageHeader title="Clubs" /><DeniedConsole /></>;
  }
  return <><PageHeader title="Clubs" description="Set monthly club quotas and the policy every agent installation must follow." /><ConsoleNav /><ClubsTable key={`${actor.userId}:${actor.activeOrgId}`} clubs={clubs} /></>;
}
