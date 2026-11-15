import { FileText } from 'lucide-react';

/** Deterministic summary shared by the demo directory and management views. */
export function DemoSummary({ children, source }: {
  readonly children: React.ReactNode;
  readonly source: string;
}) {
  return <section aria-label="AI summary" className="space-y-3 rounded-md border border-border bg-muted p-4">
    <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold leading-7">
      <FileText aria-hidden="true" className="size-5 text-primary" />AI summary
    </h2>
    <div className="space-y-2 text-base leading-6">{children}</div>
    <p className="text-xs leading-4 text-muted-foreground">Based on {source}.</p>
  </section>;
}
