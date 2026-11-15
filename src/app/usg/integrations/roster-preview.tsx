'use client';

import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RosterPreview } from '@/lib/connectors/roster/preview';

export function RosterPreviewTable({ preview }: { readonly preview?: RosterPreview }) {
  if (!preview || preview.status === 'unavailable') {
    return <Alert variant="destructive"><CircleAlert aria-hidden="true" /><div>
      <AlertTitle>Roster preview unavailable</AlertTitle>
      <AlertDescription>Could not read the current roster CSV. Reload this page to retry. Sync roster remains available and reports source errors separately.</AlertDescription>
    </div></Alert>;
  }
  if (preview.rows.length === 0) {
    return <p className="rounded-md border border-border bg-muted p-4 text-muted-foreground">The roster source returned no rows. Add club members to the CSV before syncing.</p>;
  }
  const { summary } = preview;
  return <div className="space-y-4">
    <section aria-labelledby="roster-summary-heading" className="space-y-2 rounded-md border border-border bg-muted p-4">
      <h3 id="roster-summary-heading" className="flex items-center gap-2 font-semibold">AI summary <Badge>Demo</Badge></h3>
      <p>This CSV contains {summary.assignmentCount} source rows for {summary.personCount} people across {summary.clubCount} clubs. Each row links a person to a club and a position.
        {summary.positions.length > 0 && ` Roles: ${summary.positions.map(position => `${position.name} (${position.count})`).join(', ')}.`}</p>
      <p className="text-sm text-muted-foreground">Demo summary based on this CSV.</p>
    </section>
    <p className="text-sm text-muted-foreground">Read-only snapshot of <span className="font-mono text-xs">db/seed/roster.csv</span>. This is the import source, not current memberships or a preview of sync changes.</p>
    <div className="overflow-x-auto rounded-md border border-border" tabIndex={0} role="region" aria-label="Roster CSV source rows">
      <Table>
        <TableCaption>Roster source rows ordered by club, person and position.</TableCaption>
        <TableHeader><TableRow><TableHead>Club</TableHead><TableHead>Person</TableHead><TableHead>Position</TableHead></TableRow></TableHeader>
        <TableBody>{preview.rows.map((row, index) => <TableRow key={index}>
          <TableHead scope="row">{row.club}</TableHead><TableCell>{row.person}</TableCell><TableCell>{row.position}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </div>
  </div>;
}
