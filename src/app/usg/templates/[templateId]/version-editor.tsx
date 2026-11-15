'use client';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { UsgTemplateView } from '@/lib/distribution/usg-view';
import { ErrorNotice, label, PendingButton, Section, selectClass, SuccessNotice, useConsoleMutation } from '../console-ui';
const split = (value: string) => value.split(',').map(s => s.trim()).filter(Boolean);

export function VersionEditor({ data }: { data: UsgTemplateView }) {
  const latest = data.versions[0]; const [open, setOpen] = useState(false); const [error, setError] = useState<string | null>(null);
  const [purpose, setPurpose] = useState(latest?.purpose ?? ''); const [audience, setAudience] = useState(latest?.audience ?? 'members');
  const [usableBy, setUsableBy] = useState(latest?.usableBy.join(', ') ?? ''); const [maxTier, setMaxTier] = useState(latest?.maxTier ?? 'members');
  const [sourceKinds, setSourceKinds] = useState(latest?.sourceKinds.join(', ') ?? ''); const [tools, setTools] = useState(latest?.tools.join(', ') ?? '');
  const [modelClasses, setModelClasses] = useState(latest?.modelClasses ?? ['economy']); const [defaultModelClass, setDefaultModelClass] = useState(latest?.defaultModelClass ?? 'economy');
  const [systemPrompt, setSystemPrompt] = useState(latest?.systemPrompt ?? ''); const [rulePackSlug, setRulePackSlug] = useState(latest?.rulePackSlug ?? ''); const [changelog, setChangelog] = useState('');
  const mutation = useConsoleMutation();
  const draft = { purpose: purpose.trim(), audience, usableBy: audience === 'positions' ? split(usableBy) : [], maxTier: audience === 'public' ? 'public' : maxTier,
    sourceKinds: split(sourceKinds), tools: split(tools), modelClasses, defaultModelClass, systemPrompt, rulePackSlug: rulePackSlug.trim() || null, changelog };
  function review(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!modelClasses.length || !modelClasses.includes(defaultModelClass)) { setError('Allow at least one model class and choose an allowed default.'); return; }
    if (audience === 'positions' && !split(usableBy).length) { setError('Name at least one position for this audience.'); return; }
    if (split(sourceKinds).some(s => !['public', 'minutes', 'finance', 'archive', 'rulebook', 'usg_internal'].includes(s))) { setError('Use only the source kinds listed under Sources.'); return; }
    mutation.clear(); setOpen(true);
  }
  function publish() {
    mutation.run(async () => {
      const result = await mutation.request(`/api/templates/${data.template.id}/versions`, 'POST', draft) as { version: number };
      return `Version ${result.version} published. Latest installations now use it; pinned installations keep their version.`;
    }, () => setOpen(false));
  }
  return <Section title="Publish a version"><p className="text-muted-foreground">A new version is immutable. The next run of every installation tracking Latest uses it. Existing pins stay on their version.</p>
    <form onSubmit={review} className="max-w-[800px] space-y-4"><div><label htmlFor="version-purpose" className="mb-1 block font-semibold">Purpose</label><Input id="version-purpose" value={purpose} onChange={e => setPurpose(e.target.value)} required /></div>
      <div className="grid gap-4 md:grid-cols-2"><div><label htmlFor="version-audience" className="mb-1 block font-semibold">Audience</label><select id="version-audience" className={selectClass} value={audience} onChange={e => setAudience(e.target.value as typeof audience)}><option value="public">All students</option><option value="members">All members</option><option value="positions">Named positions</option></select></div>
        <div><label htmlFor="version-tier" className="mb-1 block font-semibold">Max tier</label><select id="version-tier" className={selectClass} value={audience === 'public' ? 'public' : maxTier} onChange={e => setMaxTier(e.target.value as typeof maxTier)} disabled={audience === 'public'}><option value="public">Public</option><option value="members">Members</option><option value="officers">Officers</option></select></div></div>
      {audience === 'positions' && <div><label htmlFor="version-positions" className="mb-1 block font-semibold">Position slugs</label><Input id="version-positions" value={usableBy} onChange={e => setUsableBy(e.target.value)} required /><p className="mt-1 text-muted-foreground">Comma separated, for example president, treasurer.</p></div>}
      <div><label htmlFor="version-sources" className="mb-1 block font-semibold">Sources</label><Input id="version-sources" value={sourceKinds} onChange={e => setSourceKinds(e.target.value)} /><p className="mt-1 text-muted-foreground">Comma separated: public, minutes, finance, archive, rulebook. Sources resolve within each club; rulebook resolves in USG.</p></div>
      <div><label htmlFor="version-tools" className="mb-1 block font-semibold">Tool slugs</label><Input id="version-tools" value={tools} onChange={e => setTools(e.target.value)} /><p className="mt-1 text-muted-foreground">Comma separated. Leave empty for no tools. Write tools still require human confirmation.</p></div>
      <div className="grid gap-4 md:grid-cols-2"><fieldset><legend className="mb-2 font-semibold">Model classes</legend><div className="flex flex-wrap gap-4">{(['economy', 'standard'] as const).map(model => <label key={model} className="flex items-center gap-2"><input type="checkbox" checked={modelClasses.includes(model)} onChange={e => setModelClasses(e.target.checked ? [...modelClasses, model] : modelClasses.filter(m => m !== model))} />{label(model)}</label>)}</div></fieldset>
        <div><label htmlFor="version-model" className="mb-1 block font-semibold">Default model</label><select id="version-model" className={selectClass} value={defaultModelClass} onChange={e => setDefaultModelClass(e.target.value as typeof defaultModelClass)}><option value="economy">Economy</option><option value="standard">Standard</option></select></div></div>
      <div><label htmlFor="version-prompt" className="mb-1 block font-semibold">System prompt</label><Textarea id="version-prompt" value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} required rows={5} /></div>
      <div><label htmlFor="version-rulepack" className="mb-1 block font-semibold">Rule pack</label><Input id="version-rulepack" value={rulePackSlug} onChange={e => setRulePackSlug(e.target.value)} /><p className="mt-1 text-muted-foreground">Optional slug, for example usg-funding. Runs use the latest published pack.</p></div>
      <div><label htmlFor="version-changes" className="mb-1 block font-semibold">Change note</label><Textarea id="version-changes" value={changelog} onChange={e => setChangelog(e.target.value)} rows={2} /></div>
      <ErrorNotice message={error} /><SuccessNotice message={mutation.success} /><Button type="submit">Review version {data.template.latestVersion + 1}</Button>
    </form>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Publish version {data.template.latestVersion + 1}?</DialogTitle><DialogDescription>Review who this version is published for before it reaches installations tracking Latest.</DialogDescription></DialogHeader>
      <p>{data.template.name} will be available to {audience === 'public' ? 'all signed-in students' : audience === 'members' ? 'all members of each club' : split(usableBy).map(label).join(', ')} where installed. It can read up to {label(draft.maxTier)} documents from its configured sources.</p>
      <p className="text-muted-foreground">Pinned installations keep their version. Publication is rejected if an existing Latest installation would violate the new version.</p><ErrorNotice message={mutation.error} /><DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><PendingButton pending={mutation.pending} onClick={publish}>Publish version</PendingButton></DialogFooter>
    </DialogContent></Dialog>
  </Section>;
}
