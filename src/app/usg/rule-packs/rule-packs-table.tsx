'use client';
import { useState, type FormEvent } from 'react';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { Check } from 'lucide-react';
import { DataTable } from '@/components/inspector/data-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { UsgPack, UsgPackVersion } from '@/lib/distribution/usg-view';
import { absoluteTime, ErrorNotice, Pagination, PendingButton, SearchBar, SuccessNotice, useConsoleMutation } from '../templates/console-ui';
const features = tableFeatures({}); const column = createColumnHelper<typeof features, UsgPack>();
const published = (pack: UsgPack) => pack.versions.find(v => v.status === 'published');
const cap = (version: UsgPackVersion | undefined) => typeof version?.content.annualCapUsd === 'number' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(version.content.annualCapUsd) : '—';

export function RulePacksTable({ packs }: { packs: UsgPack[] }) {
  const [query, setQuery] = useState(''); const [page, setPage] = useState(1);
  const found = packs.filter(p => `${p.slug} ${published(p)?.label ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const columns = column.columns([
    column.accessor('slug', { id: 'slug', header: 'Rule pack', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span> }),
    column.display({ id: 'label', header: 'Label', cell: ({ row }) => published(row.original)?.label ?? 'No published version' }),
    column.display({ id: 'version', header: 'Published version', cell: ({ row }) => published(row.original) ? <span className="inline-flex items-center gap-1"><Check className="size-3 text-success" aria-hidden="true" />v{published(row.original)?.version}</span> : 'None' }),
    column.display({ id: 'cap', header: 'Annual cap', cell: ({ row }) => cap(published(row.original)) }),
    column.display({ id: 'publishedAt', header: 'Published', cell: ({ row }) => absoluteTime(published(row.original)?.publishedAt ?? null) }),
    column.display({ id: 'actions', header: 'Actions', cell: ({ row }) => <RulePackEditor key={`${row.original.slug}:${row.original.versions[0]?.version}`} pack={row.original} /> }),
  ]);
  const table = useTable({ features, data: found.slice((page - 1) * 10, page * 10), columns, getRowId: row => row.slug });
  return <div className="space-y-4"><p className="rounded-md border border-border bg-gold-25 p-3">Demo values written for the AI@USC Hackathon. These are not official USG policy.</p>
    <SearchBar value={query} onChange={v => { setQuery(v); setPage(1); }} count={found.length} />
    <DataTable table={table} caption="USG rule packs" rowHeaderColumn="slug" sorted={{ id: 'slug', direction: 'asc' }} numericColumns={['version', 'cap']} monoColumns={['publishedAt']} minWidth={880} empty={packs.length ? 'No rule packs match your search. Clear filters to see all rule packs.' : 'No rule packs exist yet. Ask the platform team to seed the funding rule pack.'} />
    <Pagination page={page} setPage={setPage} total={found.length} /></div>;
}
function RulePackEditor({ pack }: { pack: UsgPack }) {
  const base = published(pack) ?? pack.versions[0]; const funding = pack.slug === 'usg-funding';
  const [open, setOpen] = useState(false); const [review, setReview] = useState(false); const [label, setLabel] = useState(base?.label ?? '');
  const [annualCap, setAnnualCap] = useState(String(base?.content.annualCapUsd ?? 8000));
  const [events, setEvents] = useState(String(base?.content.fundedEventsPerSemester ?? 4));
  const [weeks, setWeeks] = useState(String(base?.content.vendorLeadTimeInstructionalWeeks ?? 6));
  const [deadline, setDeadline] = useState(String(base?.content.deadline ?? 'Wednesday 11:59 PM PT'));
  const [json, setJson] = useState(JSON.stringify(base?.content ?? {}, null, 2)); const [content, setContent] = useState<Record<string, unknown>>(base?.content ?? {});
  const [error, setError] = useState<string | null>(null); const mutation = useConsoleMutation(); const next = Math.max(0, ...pack.versions.map(v => v.version)) + 1;
  function prepare(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (funding) {
      const capValue = Number(annualCap); const eventsValue = Number(events); const weeksValue = Number(weeks);
      if (![capValue, eventsValue, weeksValue].every(v => Number.isFinite(v) && v >= 0) || !Number.isSafeInteger(eventsValue) || !Number.isSafeInteger(weeksValue)) { setError('Enter a nonnegative annual cap and whole numbers for events and vendor lead time.'); return; }
      setContent({ ...base?.content, annualCapUsd: capValue, fundedEventsPerSemester: eventsValue, vendorLeadTimeInstructionalWeeks: weeksValue, deadline: deadline.trim() });
    } else {
      try { const parsed: unknown = JSON.parse(json); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); setContent(parsed as Record<string, unknown>); }
      catch { setError('Enter a valid JSON object for the rule content, then review again.'); return; }
    }
    setReview(true);
  }
  function publish() {
    mutation.run(async () => {
      const result = await mutation.request(`/api/usg/rule-packs/${encodeURIComponent(pack.slug)}/versions`, 'POST', { label: label.trim(), content }) as { version: number };
      return `${pack.slug} v${result.version} published. The next funding-agent run uses the new rules.`;
    }, () => setOpen(false));
  }
  return <><Dialog open={open} onOpenChange={v => { setOpen(v); setReview(false); setError(null); mutation.clear(); }}><DialogTrigger asChild><Button type="button" size="sm" variant="secondary">Publish version</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>{review ? `Publish ${pack.slug} v${next}?` : `New version · ${pack.slug}`}</DialogTitle><DialogDescription>Published versions cannot be edited. Every agent using this rule pack picks up the latest published version on its next run, including pinned templates.</DialogDescription></DialogHeader>
      {review ? <div className="space-y-4"><p><strong>{label}</strong> v{next}</p>{funding ? <dl className="grid grid-cols-2 gap-2"><dt>Annual cap</dt><dd className="text-right tabular-nums">{cap({ ...base, content })}</dd><dt>Events per semester</dt><dd className="text-right">{String(content.fundedEventsPerSemester)}</dd><dt>Vendor lead time</dt><dd className="text-right">{String(content.vendorLeadTimeInstructionalWeeks)} instructional weeks</dd><dt>Deadline</dt><dd className="text-right">{String(content.deadline)}</dd></dl> : <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted p-3 font-mono text-xs">{JSON.stringify(content, null, 2)}</pre>}
        <ErrorNotice message={mutation.error} /><DialogFooter><Button type="button" variant="ghost" onClick={() => setReview(false)}>Back to edit</Button><PendingButton pending={mutation.pending} onClick={publish}>Publish v{next}</PendingButton></DialogFooter></div>
        : <form onSubmit={prepare} className="space-y-4"><div><label htmlFor={`pack-label-${pack.slug}`} className="mb-1 block font-semibold">Label</label><Input id={`pack-label-${pack.slug}`} required value={label} onChange={e => setLabel(e.target.value)} /></div>
          {funding ? <><div><label htmlFor="annual-cap" className="mb-1 block font-semibold">Annual cap (USD)</label><Input id="annual-cap" type="number" min="0" step="1" value={annualCap} onChange={e => setAnnualCap(e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-4"><div><label htmlFor="funded-events" className="mb-1 block font-semibold">Events per semester</label><Input id="funded-events" type="number" min="0" step="1" value={events} onChange={e => setEvents(e.target.value)} required /></div><div><label htmlFor="vendor-weeks" className="mb-1 block font-semibold">Vendor lead weeks</label><Input id="vendor-weeks" type="number" min="0" step="1" value={weeks} onChange={e => setWeeks(e.target.value)} required /></div></div>
            <div><label htmlFor="funding-deadline" className="mb-1 block font-semibold">Deadline</label><Input id="funding-deadline" value={deadline} onChange={e => setDeadline(e.target.value)} required /></div></>
            : <div><label htmlFor={`pack-content-${pack.slug}`} className="mb-1 block font-semibold">Content (JSON)</label><Textarea id={`pack-content-${pack.slug}`} value={json} onChange={e => setJson(e.target.value)} rows={10} className="font-mono text-xs" required /></div>}
          <details><summary className="cursor-pointer text-primary">Version history ({pack.versions.length})</summary><ul className="mt-2 space-y-2">{pack.versions.map(v => <li key={v.version}>v{v.version} · {v.status} · {absoluteTime(v.publishedAt)}</li>)}</ul></details>
          <ErrorNotice message={error} /><DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Review v{next}</Button></DialogFooter></form>}
    </DialogContent></Dialog><SuccessNotice message={mutation.success} /></>;
}
