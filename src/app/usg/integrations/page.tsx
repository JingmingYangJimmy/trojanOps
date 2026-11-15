import { LockKeyhole } from 'lucide-react';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppError } from '@/lib/contracts';
import { listConnectors } from '@/lib/connectors/registry';
import { getActor } from '@/lib/identity';
import { requireRosterAdmin } from '@/lib/lifecycle/import';
import { IntegrationPanel } from './integration-panel';
import { connectorKind, loadConnectorPreview } from '@/lib/connectors/preview';
import { ConnectorPreviewPanel } from './connector-preview';

export default async function IntegrationsPage({ searchParams }: {
  searchParams: Promise<{ connector?: string | string[] }>;
}) {
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
  const { connector } = await searchParams;
  if (connector !== undefined) {
    const kind = connectorKind(connector);
    if (!kind) notFound();
    return <ConnectorPreviewPanel preview={await loadConnectorPreview(actor, kind)} />;
  }
  const connectors = await listConnectors();
  return <>
    <PageHeader title="Integrations" description="Open each connector’s current data as a CSV table with a demo summary." />
    <IntegrationPanel key={`${actor.userId}:${actor.activeOrgId}`} connectors={connectors.map((connector) => ({
      ...connector, lastSyncAt: connector.lastSyncAt?.toISOString() ?? null,
    }))} />
  </>;
}
