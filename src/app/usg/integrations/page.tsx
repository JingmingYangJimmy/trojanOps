import { LockKeyhole } from 'lucide-react';
import { PageHeader } from '@/components/shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppError } from '@/lib/contracts';
import { getConnectors, listConnectors } from '@/lib/connectors/registry';
import { getActor } from '@/lib/identity';
import { requireRosterAdmin } from '@/lib/lifecycle/import';
import { IntegrationPanel } from './integration-panel';
import type { RosterPreview } from './connector-details';

export default async function IntegrationsPage() {
  const actor = await getActor();
  try {
    await requireRosterAdmin(actor);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    if (error.error.code !== 'forbidden' && error.error.code !== 'unauthenticated') throw error;
    return <>
      <PageHeader title="Integrations" />
      <Alert>
        <LockKeyhole aria-hidden="true" />
        <div>
          <AlertTitle>USG administrator access required</AlertTitle>
          <AlertDescription>Sign in with a USG administrator account to review connectors and sync the roster. Contact a USG administrator if you need access.</AlertDescription>
        </div>
      </Alert>
    </>;
  }
  const connectors = await listConnectors();
  let rosterPreview: RosterPreview;
  try {
    // Authorize first. Preview only display fields from the source; never send external user IDs.
    const rows = await getConnectors().roster.fetch();
    rosterPreview = { status: 'ready', rows: rows.map(row => ({
      club: row.orgName, person: row.userDisplayName, position: row.position,
    })).sort((a, b) => a.club.localeCompare(b.club) || a.person.localeCompare(b.person) || a.position.localeCompare(b.position)) };
  } catch {
    // A source preview failure must not hide connector status or the existing Sync roster action.
    rosterPreview = { status: 'unavailable' };
  }
  return <>
    <PageHeader title="Integrations" description="Review platform-wide demo connectors and sync club memberships from the roster CSV." />
    <IntegrationPanel key={`${actor.userId}:${actor.activeOrgId}`} connectors={connectors.map((connector) => ({
      ...connector, lastSyncAt: connector.lastSyncAt?.toISOString() ?? null,
    }))} rosterPreview={rosterPreview} />
  </>;
}
