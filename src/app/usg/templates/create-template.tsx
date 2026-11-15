'use client';

import { useActionState, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { UsgTarget } from '@/lib/distribution/usg-view';
import { ErrorNotice, selectClass } from './console-ui';
import { NEW_TEMPLATE_EXAMPLE, NEW_TEMPLATE_MODELS } from './template-config';
import { createTemplateAction } from './create-action';

export function CreateTemplate({ targets }: { readonly targets: readonly UsgTarget[] }) {
  const [state, action, pending] = useActionState(createTemplateAction, { error: null });
  const [distribution, setDistribution] = useState('default');
  const [access, setAccess] = useState<'officers' | 'members'>('officers');
  return <Dialog>
    <DialogTrigger asChild><Button><Plus className="size-4" aria-hidden="true" />Create template</Button></DialogTrigger>
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Create agent template</DialogTitle>
        <DialogDescription>Publish version 1 and, for a default template, distribute it to the target clubs.</DialogDescription>
      </DialogHeader>
      <form action={action} className="space-y-4" aria-busy={pending}>
        <ErrorNotice message={state.error} />
        <div><label htmlFor="new-template-name" className="mb-1 block font-semibold">Name</label>
          <Input id="new-template-name" name="name" maxLength={120} required defaultValue={NEW_TEMPLATE_EXAMPLE.name} /></div>
        <div><label htmlFor="new-template-purpose" className="mb-1 block font-semibold">Description</label>
          <Input id="new-template-purpose" name="purpose" required defaultValue={NEW_TEMPLATE_EXAMPLE.purpose} /></div>
        <div><label htmlFor="new-template-instructions" className="mb-1 block font-semibold">System prompt</label>
          <Textarea id="new-template-instructions" name="systemPrompt" rows={5} required defaultValue={NEW_TEMPLATE_EXAMPLE.systemPrompt} /></div>
        <fieldset><legend className="mb-2 font-semibold">Document sources</legend>
          <div className="grid grid-cols-2 gap-2">{[
            ['finance', 'Club finances'], ['rulebook', 'USG guidelines'], ['minutes', 'Meeting minutes'], ['archive', 'Club archive'], ['public', 'Public club documents'],
          ].map(([value, name]) => <label key={value} className="flex items-center gap-2"><input className="size-4 accent-primary" type="checkbox" name="sourceKinds" value={value} defaultChecked={NEW_TEMPLATE_EXAMPLE.sourceKinds.includes(value)} />{name}</label>)}</div>
        </fieldset>
        <div><label htmlFor="new-template-access" className="mb-1 block font-semibold">Who can use it</label>
          <select id="new-template-access" name="access" className={selectClass} value={access} onChange={e => setAccess(e.target.value as typeof access)}>
            <option value="officers">Treasurers and presidents — reads up to Officers documents</option>
            <option value="members">All members — reads up to Members documents</option>
          </select></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label htmlFor="new-template-distribution" className="mb-1 block font-semibold">Distribution</label>
            <select id="new-template-distribution" name="distribution" className={selectClass} value={distribution} onChange={e => setDistribution(e.target.value)}>
              <option value="default">Default — clubs may disable</option><option value="required">Required — always enabled</option><option value="optional">Optional — clubs install</option>
            </select></div>
          <div><label htmlFor="new-template-target" className="mb-1 block font-semibold">Target</label>
            <select id="new-template-target" name="target" className={selectClass} defaultValue="all">{targets.map(target => <option key={target.slug} value={target.slug}>{target.name} ({target.clubs.length})</option>)}</select></div>
        </div>
        {distribution === 'default'
          ? <label className="flex items-start gap-2"><input className="mt-0.5 size-4 accent-primary" type="checkbox" name="distributeNow" defaultChecked />
            <span><span className="font-semibold">Distribute to the target clubs now</span><span className="block text-sm text-muted-foreground">{access === 'officers' ? 'Treasurers and presidents' : 'Members'} in each club see it in My agents right away. Clubs may turn it off.</span></span></label>
          : <p className="text-sm text-muted-foreground">{distribution === 'required' ? 'Distribute a required template from its page, where you confirm the rollout.' : 'Clubs install optional templates from their catalog.'}</p>}
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">It offers {NEW_TEMPLATE_MODELS.modelIds.length} Economy models and uses <span className="font-mono text-xs text-foreground">{NEW_TEMPLATE_MODELS.defaultModelId}</span> by default in chat. You can change any setting on the template page and publish a new version.</p>
        <DialogFooter><DialogClose asChild><Button type="button" variant="secondary" disabled={pending}>Cancel</Button></DialogClose>
          <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create template'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
