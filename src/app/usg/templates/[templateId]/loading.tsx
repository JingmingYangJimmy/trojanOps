import { PageHeader } from '@/components/shell';
import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return <><PageHeader title="Agent template" /><div role="status" aria-label="Loading template details" className="space-y-2"><span className="sr-only">Loading template details</span>{[0, 1, 2, 3, 4, 5].map(row => <Skeleton key={row} className="h-10 w-full" />)}</div></>;
}
