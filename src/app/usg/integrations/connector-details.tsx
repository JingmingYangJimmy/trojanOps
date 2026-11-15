'use client';

import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ConnectorKind } from '@/lib/contracts';

export type RosterPreview =
  | { readonly status: 'ready'; readonly rows: readonly { readonly club: string; readonly person: string; readonly position: string }[] }
  | { readonly status: 'unavailable' };

const details: Record<ConnectorKind, { purpose: string; operation: string; limitation: string }> = {
  identity: {
    purpose: 'Identifies the signed-in person so the platform can recompute their club memberships, positions and grants on every request.',
    operation: 'The persona implementation uses the demo account chosen at sign-in or in the persona switcher. The active organization determines which club the person is acting in.',
    limitation: 'This is demo identity, not USC NetID SSO. It does not verify a USC account or connect to USC authentication services.',
  },
  roster: {
    purpose: 'Imports club memberships and officer positions, then provisions new clubs with their default sources, policy, quota and already distributed agents.',
    operation: 'The CSV implementation reads db/seed/roster.csv when you choose Sync roster. A position changes only when its imported roster entries change, so an unchanged CSV preserves a manual transfer.',
    limitation: 'This local CSV stands in for EngageSC. The preview shows source rows, not current database memberships or a prediction of changes. Viewing it does not sync anything.',
  },
  documents: {
    purpose: 'Provides the connection point for club document sources. Document permissions remain scoped to each club and to the person and agent reading them.',
    operation: 'The upload implementation uses manual uploads in each club’s Documents page. A president uploads into that club’s sources; agents read only documents permitted by their sources, max tier and the person’s grants.',
    limitation: 'No external document store is connected. This panel does not browse document bodies or combine content across clubs. An administrator role alone does not grant access to every club document.',
  },
  llm: {
    purpose: 'Provides the model connection used by an agent runtime. Access checks, quota and auditing are enforced by the platform gateway before and after a run.',
    operation: 'The mock runtime returns demo answers without calling a model. The selected mock language-model connector does not make external API requests.',
    limitation: 'This is not a live connection to Trojan AI Gateway or another model provider. This panel shows connector configuration, not all-user usage, prompts or responses. Review club quotas and audit metadata in their own views.',
  },
  applications: {
    purpose: 'Provides a destination for application submissions, such as a funding request, when an application tool is connected.',
    operation: 'The internal implementation is an in-memory demo submission sink, not EngageSC. Agent write actions require human confirmation on the run page.',
    limitation: 'Confirmation currently records the decision; no submission executor is connected. This panel is not an application approval queue and cannot approve funding. In-memory submissions are not durable across a server restart.',
  },
};

export function ConnectorDetails({ kind, label, implementation, isMock, rosterPreview }: {
  readonly kind: ConnectorKind;
  readonly label: string;
  readonly implementation: string;
  readonly isMock: boolean;
  readonly rosterPreview?: RosterPreview;
}) {
  const copy = details[kind];
  return <Sheet>
    <SheetTrigger asChild><Button type="button" variant="secondary" size="sm" aria-label={`View ${label.toLowerCase()} connector details`}>View details</Button></SheetTrigger>
    <SheetContent className="max-w-xl">
      <SheetHeader><SheetTitle>{label} connector</SheetTitle><SheetDescription>Platform-wide integration. These settings describe the shared connector, not one club’s configuration.</SheetDescription></SheetHeader>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border border-border bg-muted p-3">
        <dt className="font-semibold">Implementation</dt><dd>{implementation}</dd>
        <dt className="font-semibold">Mode</dt><dd>{isMock ? 'Mock · local demo' : 'Configured connector'}</dd>
      </dl>
      <section className="space-y-2"><h3 className="font-semibold">Purpose</h3><p>{copy.purpose}</p></section>
      <section className="space-y-2"><h3 className="font-semibold">How it works</h3><p>{copy.operation}</p></section>
      <section className="space-y-2"><h3 className="font-semibold">Current limits</h3><p>{copy.limitation}</p></section>
      {kind === 'roster' && <RosterSourcePreview preview={rosterPreview} />}
      <p className="border-t border-border pt-3 text-sm text-muted-foreground">Demo status reflects the stored connector state. It is not a live health check of an external service. Viewing details makes no connector changes.</p>
      <SheetFooter><SheetClose asChild><Button type="button" variant="secondary">Close details</Button></SheetClose></SheetFooter>
    </SheetContent>
  </Sheet>;
}

function RosterSourcePreview({ preview }: { readonly preview?: RosterPreview }) {
  return <section className="space-y-3" aria-labelledby="roster-preview-heading">
    <h3 id="roster-preview-heading" className="font-semibold">Current CSV preview</h3>
    {!preview || preview.status === 'unavailable'
      ? <Alert variant="destructive"><CircleAlert aria-hidden="true" /><div><AlertTitle>Roster preview unavailable</AlertTitle><AlertDescription>Could not read the current roster CSV. Reload this page to retry. Sync roster remains available and will report any source errors separately.</AlertDescription></div></Alert>
      : preview.rows.length === 0 ? <p className="text-muted-foreground">The roster source returned no rows. Add club members to the CSV before syncing.</p>
        : <><p className="text-sm text-muted-foreground">{preview.rows.length} source rows across {new Set(preview.rows.map(row => row.club)).size} clubs. A person can have more than one position.</p>
          <div className="overflow-x-auto rounded-md border border-border" tabIndex={0} role="region" aria-label="Roster source rows"><Table>
            <TableCaption>Read-only source rows, ordered by club, person and position.</TableCaption>
            <TableHeader><TableRow><TableHead>Club</TableHead><TableHead>Person</TableHead><TableHead>Position</TableHead></TableRow></TableHeader>
            <TableBody>{preview.rows.map((row, index) => <TableRow key={index}><TableHead scope="row">{row.club}</TableHead><TableCell>{row.person}</TableCell><TableCell>{row.position}</TableCell></TableRow>)}</TableBody>
          </Table></div></>}
  </section>;
}
