'use client';
import Link from 'next/link';
import { useState } from 'react';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { Check, CircleSlash, Lock } from 'lucide-react';
import { DataTable } from '@/components/inspector/data-table';
import type { UsgTemplateRow, UsgTemplatesView } from '@/lib/distribution/usg-view';
import { absoluteTime, chipClass, label, Pagination, SearchBar } from './console-ui';
const features = tableFeatures({});
const column = createColumnHelper<typeof features, UsgTemplateRow>();

export function TemplatesTable({ data }: { data: UsgTemplatesView }) {
  const [query, setQuery] = useState(''); const [page, setPage] = useState(1);
  const found = data.templates.filter(t => `${t.name} ${t.slug}`.toLowerCase().includes(query.toLowerCase()));
  const columns = column.columns([
    column.accessor('name', { id: 'name', header: 'Template', cell: ({ row }) => <Link className="text-primary underline" href={`/usg/templates/${row.original.id}`}>{row.original.name}</Link> }),
    column.accessor('distribution', { header: 'Distribution', cell: ({ getValue }) => <span className={chipClass}>{getValue() === 'required' && <Lock className="size-3" aria-hidden="true" />}{label(getValue())}</span> }),
    column.accessor('target', { header: 'Target', cell: ({ getValue }) => data.targets.find(t => t.slug === getValue())?.name ?? getValue() }),
    column.accessor('targetCount', { header: 'Target clubs' }), column.accessor('installedCount', { header: 'Installed' }),
    column.accessor('latestVersion', { header: 'Version', cell: ({ getValue }) => `v${getValue()}` }),
    column.accessor('status', { header: 'Status', cell: ({ getValue }) => <span className={chipClass}>{getValue() === 'active' ? <Check aria-hidden="true" className="size-3 text-success" /> : <CircleSlash aria-hidden="true" className="size-3" />}{label(getValue())}</span> }),
    column.accessor('distributedAt', { header: 'Last distributed', cell: ({ getValue }) => getValue() ? absoluteTime(getValue()) : 'Not distributed' }),
  ]);
  const table = useTable({ features, data: found.slice((page - 1) * 10, page * 10), columns, getRowId: row => row.id });
  return <div className="space-y-4"><SearchBar value={query} onChange={v => { setQuery(v); setPage(1); }} count={found.length} />
    <DataTable table={table} caption="USG agent templates" rowHeaderColumn="name" sorted={{ id: 'name', direction: 'asc' }} numericColumns={['targetCount', 'installedCount', 'latestVersion']} monoColumns={['distributedAt']} minWidth={1024}
      empty={data.templates.length ? 'No templates match your search. Clear filters to see all templates.' : 'No global templates are published yet. Ask the platform team to seed the USG templates.'} />
    <Pagination page={page} setPage={setPage} total={found.length} /></div>;
}
