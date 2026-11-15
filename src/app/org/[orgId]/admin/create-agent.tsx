'use client';

import { useActionState, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ErrorNotice, selectClass } from '@/app/usg/templates/console-ui';
import { NEW_TEMPLATE_MODELS } from '@/app/usg/templates/template-config';
import { createClubAgentAction } from './create-agent-action';

/** The dialog starts from a members' agent most clubs could use as is. */
export const CLUB_AGENT_EXAMPLE = {
  name: 'Meeting recap',
  purpose: 'Answers members’ questions about recent meetings, decisions and upcoming events.',
  systemPrompt: 'You help members of this club keep up with what the club decided. Use the club’s meeting minutes and past events. For each decision, say what was decided, who owns it and when it is due, and cite the minutes it comes from. If the minutes do not say, say so and suggest asking an officer.',
  sourceKinds: ['minutes', 'archive', 'public'] as readonly string[],
} as const;

const SOURCES = [
  ['minutes', 'Meeting minutes'], ['archive', 'Past events'], ['public', 'Public club pages'], ['finance', 'Club finances'], ['rulebook', 'USG rulebook'],
] as const;

export function CreateClubAgent({ orgId, clubName, officerPositions }: {
  readonly orgId: string; readonly clubName: string; readonly officerPositions: ReadonlyArray<{ slug: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(createClubAgentAction.bind(null, orgId), { error: null });
  const [access, setAccess] = useState<'members' | 'positions'>('members');
  return <Dialog>
    <DialogTrigger asChild><Button><Plus className="size-4" aria-hidden="true" />Create agent</Button></DialogTrigger>
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Create a club agent</DialogTitle>
        <DialogDescription>An agent for {clubName}’s own members. It is turned on as soon as you create it.</DialogDescription>
      </DialogHeader>
      <form action={action} className="space-y-4" aria-busy={pending}>
        <ErrorNotice message={state.error} />
        <div><label htmlFor="club-agent-name" className="mb-1 block font-semibold">Name</label>
          <Input id="club-agent-name" name="name" maxLength={120} required defaultValue={CLUB_AGENT_EXAMPLE.name} /></div>
        <div><label htmlFor="club-agent-purpose" className="mb-1 block font-semibold">Description</label>
          <Input id="club-agent-purpose" name="purpose" required defaultValue={CLUB_AGENT_EXAMPLE.purpose} /></div>
        <div><label htmlFor="club-agent-prompt" className="mb-1 block font-semibold">System prompt</label>
          <Textarea id="club-agent-prompt" name="systemPrompt" rows={5} required defaultValue={CLUB_AGENT_EXAMPLE.systemPrompt} /></div>
        <fieldset><legend className="mb-2 font-semibold">Document sources</legend>
          <div className="grid grid-cols-2 gap-2">{SOURCES.map(([value, name]) => <label key={value} className="flex items-center gap-2">
            <input className="size-4 accent-primary" type="checkbox" name="sourceKinds" value={value} defaultChecked={CLUB_AGENT_EXAMPLE.sourceKinds.includes(value)} />{name}</label>)}</div>
        </fieldset>
        <div><label htmlFor="club-agent-access" className="mb-1 block font-semibold">Who can use it</label>
          <select id="club-agent-access" name="access" className={selectClass} value={access} onChange={e => setAccess(e.target.value as typeof access)}>
            <option value="members">All members — reads up to Members documents</option>
            <option value="positions" disabled={officerPositions.length === 0}>Chosen officers — reads up to Officers documents</option>
          </select></div>
        {access === 'positions' && <fieldset><legend className="mb-2 font-semibold">Officers</legend>
          <div className="grid grid-cols-2 gap-2">{officerPositions.map(p => <label key={p.slug} className="flex items-center gap-2">
            <input className="size-4 accent-primary" type="checkbox" name="usableBy" value={p.slug} defaultChecked={p.slug === 'president'} />{p.name}</label>)}</div>
        </fieldset>}
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">It offers {NEW_TEMPLATE_MODELS.modelIds.length} Economy models and uses <span className="font-mono text-xs text-foreground">{NEW_TEMPLATE_MODELS.defaultModelId}</span> by default. Members see it in My agents right away, and it bills the club’s monthly quota.</p>
        <DialogFooter><DialogClose asChild><Button type="button" variant="secondary" disabled={pending}>Cancel</Button></DialogClose>
          <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create agent'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
