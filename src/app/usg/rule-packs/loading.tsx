import { PageHeader } from '@/components/shell';
import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return <><PageHeader title="Rule packs" /><div role="status" aria-label="Loading rule packs" className="space-y-2"><span className="sr-only">Loading rule packs</span>{[0, 1, 2, 3, 4, 5].map(row => <Skeleton key={row} className="h-10 w-full" />)}</div></>;
}
