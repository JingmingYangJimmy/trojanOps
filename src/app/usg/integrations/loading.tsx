import { PageHeader } from '@/components/shell';
import { Skeleton } from '@/components/ui/skeleton';

export default function IntegrationsLoading() {
  return <>
    <PageHeader title="Integrations" />
    <div role="status" aria-label="Loading roster and connectors" className="space-y-2">
      <span className="sr-only">Loading roster and connectors</span>
      {[0, 1, 2, 3, 4, 5].map((row) => <Skeleton key={row} className="h-10 w-full" />)}
    </div>
  </>;
}
