'use client';

// Owner: C. "Edit access": the library's manager changes who can read an existing document, through
// PATCH /api/orgs/[orgId]/documents/[documentId]/access. Shown only to the org's manager.
import { useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Tier } from '@/lib/contracts';
import { AccessFields, checkedPositions } from './access-fields';

export interface EditAccessProps {
  readonly orgId: string;
  readonly orgKind: 'usg' | 'rso';
  readonly documentId: string;
  readonly title: string;
  readonly access: { readonly tier: Tier; readonly allowedPositions: readonly string[] };
  readonly positions: ReadonlyArray<{ slug: string; name: string }>;
}

export function EditAccessDialog({ orgId, orgKind, documentId, title, access, positions }: EditAccessProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<Tier>(access.tier);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const body = { tier, allowedPositions: checkedPositions(event.currentTarget, tier) };
    submitting.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/orgs/${orgId}/documents/${documentId}/access`, {
          method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
        });
        if (!response.ok) {
          const failure = await response.json().catch(() => null) as { message?: unknown } | null;
          setError(typeof failure?.message === 'string' && failure.message ? failure.message : `Could not save access (${response.status}). Reload the page and try again.`);
          return;
        }
        setOpen(false); setSaved(true); router.refresh();
      } catch (cause) {
        if (cause instanceof Error) setError('Could not reach the server. Check your connection and try again.');
        else throw cause;
      } finally { submitting.current = false; }
    });
  }

  return <div className="flex flex-col items-start gap-2">
    <Dialog open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); setError(null); if (value) { setTier(access.tier); setSaved(false); } } }}>
      <DialogTrigger asChild><Button type="button" variant="secondary">Edit access</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit access</DialogTitle><DialogDescription>Choose who can read {title}. Agents read it only for people in this audience, from their next run.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-4" aria-busy={pending}>
          <AccessFields orgKind={orgKind} tier={tier} onTierChange={setTier} positions={positions} defaultPositions={access.allowedPositions} disabled={pending} />
          {error && <p role="alert" className="flex items-start gap-2 text-primary"><AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />{error}</p>}
          <DialogFooter><Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save access'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <p role="status" className="flex items-center gap-2 text-sm text-success">{saved && <><Check aria-hidden className="size-4" />Access saved.</>}</p>
  </div>;
}
