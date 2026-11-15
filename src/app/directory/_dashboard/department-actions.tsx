'use client';

// Owner: D (WP-11). The president's department actions on the directory dashboards: New department,
// Edit, Delete, Add member and Remove, each a dialog that writes through
// /api/orgs/[orgId]/departments/** and then refreshes the server-rendered page. The pages render
// these only when the service says the viewer is the club's president; the API checks again.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { DirectoryPerson } from '@/lib/directory/types';

const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

/** Blank lines separate paragraphs. */
const paragraphs = (text: string) => text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);

async function send(url: string, method: string, body?: unknown): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: unknown = await response.json().catch(() => null);
    if (response.ok) return { ok: true, data };
    const message = data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' && data.message.trim()
      ? data.message
      : `The change could not be saved (${response.status}). Try again in a moment.`;
    return { ok: false, message };
  } catch {
    return { ok: false, message: 'Could not reach the server. Check your connection and try again.' };
  }
}

function SaveError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" role="alert">
      <CircleAlert aria-hidden="true" />
      <div><AlertTitle>Could not save</AlertTitle><AlertDescription>{message}</AlertDescription></div>
    </Alert>
  );
}

/** One dialog's open state, pending write and error, reset each time it opens. */
function useDialogWrite() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return {
    open,
    pending,
    error,
    setError,
    onOpenChange(next: boolean) {
      if (pending) return;
      if (next) setError(null);
      setOpen(next);
    },
    run(url: string, method: string, body: unknown, then: (data: unknown) => void = () => router.refresh()) {
      setError(null);
      startTransition(async () => {
        const result = await send(url, method, body);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setOpen(false);
        then(result.data);
      });
    },
    router,
  };
}

const apiBase = (orgId: string) => `/api/orgs/${encodeURIComponent(orgId)}/departments`;

function DepartmentFields({ idPrefix, name, purpose, about }: { idPrefix: string; name?: string; purpose?: string; about?: readonly string[] }) {
  return <>
    <div>
      <label htmlFor={`${idPrefix}-name`} className="mb-1 block font-semibold">Name</label>
      <Input id={`${idPrefix}-name`} name="name" required maxLength={80} defaultValue={name} autoComplete="off" />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-purpose`} className="mb-1 block font-semibold">Purpose</label>
      <Input id={`${idPrefix}-purpose`} name="purpose" maxLength={280} defaultValue={purpose} aria-describedby={`${idPrefix}-purpose-hint`} />
      <p id={`${idPrefix}-purpose-hint`} className="mt-1 text-sm text-muted-foreground">One line, shown under the name in the department list.</p>
    </div>
    <div>
      <label htmlFor={`${idPrefix}-about`} className="mb-1 block font-semibold">About</label>
      <Textarea id={`${idPrefix}-about`} name="about" rows={5} defaultValue={about?.join('\n\n')} aria-describedby={`${idPrefix}-about-hint`} />
      <p id={`${idPrefix}-about-hint`} className="mt-1 text-sm text-muted-foreground">Leave a blank line between paragraphs.</p>
    </div>
  </>;
}

const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim();

/** "New department" on a club's department list. Opens the new department when it is created. */
export function NewDepartmentButton({ orgId, clubName, base }: {
  orgId: string;
  clubName: string;
  /** Department pages live at `${base}/[slug]`. */
  base: string;
}) {
  const write = useDialogWrite();
  return (
    <Dialog open={write.open} onOpenChange={write.onOpenChange}>
      <DialogTrigger asChild><Button><Plus aria-hidden="true" />New department</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New department</DialogTitle>
          <DialogDescription>Add a department to {clubName}. You can add members once it exists.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" aria-busy={write.pending} onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          write.run(apiBase(orgId), 'POST', { name: field(form, 'name'), purpose: field(form, 'purpose'), about: paragraphs(String(form.get('about') ?? '')) },
            (data) => {
              const slug = (data as { slug?: string } | null)?.slug;
              if (slug) write.router.push(`${base}/${slug}`);
              write.router.refresh();
            });
        }}>
          <SaveError message={write.error} />
          <DepartmentFields idPrefix="new-department" />
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={write.pending}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={write.pending}>{write.pending ? 'Creating…' : 'Create department'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "Edit" on a department's dashboard: name, purpose, about and lead. */
export function EditDepartmentButton({ orgId, department, leadId, members }: {
  orgId: string;
  department: { slug: string; name: string; purpose: string; about: readonly string[] };
  leadId: string | null;
  members: readonly DirectoryPerson[];
}) {
  const write = useDialogWrite();
  return (
    <Dialog open={write.open} onOpenChange={write.onOpenChange}>
      <DialogTrigger asChild><Button variant="secondary"><Pencil aria-hidden="true" />Edit</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {department.name}</DialogTitle>
          <DialogDescription>The department keeps its address, events and budget.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" aria-busy={write.pending} onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const lead = field(form, 'lead');
          write.run(`${apiBase(orgId)}/${encodeURIComponent(department.slug)}`, 'PATCH', {
            name: field(form, 'name'), purpose: field(form, 'purpose'), about: paragraphs(String(form.get('about') ?? '')), leadUserId: lead || null,
          });
        }}>
          <SaveError message={write.error} />
          <DepartmentFields idPrefix="edit-department" name={department.name} purpose={department.purpose} about={department.about} />
          <div>
            <label htmlFor="edit-department-lead" className="mb-1 block font-semibold">Lead</label>
            <select id="edit-department-lead" name="lead" defaultValue={leadId ?? ''} className={selectClass} aria-describedby="edit-department-lead-hint">
              <option value="">No lead</option>
              {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
            </select>
            <p id="edit-department-lead-hint" className="mt-1 text-sm text-muted-foreground">
              {members.length > 0 ? 'Choose from the department’s members.' : 'Add members first, then choose a lead.'}
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={write.pending}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={write.pending}>{write.pending ? 'Saving…' : 'Save changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "Delete" on a department's dashboard, with a confirmation. Returns to the department list. */
export function DeleteDepartmentButton({ orgId, slug, name, memberCount, listHref }: {
  orgId: string;
  slug: string;
  name: string;
  memberCount: number;
  listHref: string;
}) {
  const write = useDialogWrite();
  return (
    <Dialog open={write.open} onOpenChange={write.onOpenChange}>
      <DialogTrigger asChild><Button variant="outline"><Trash2 aria-hidden="true" />Delete</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>
            {name} leaves the club’s department list{memberCount > 0 ? ` and its ${memberCount === 1 ? 'member is' : `${memberCount} members are`} taken off it` : ''}. Its events and updates stay on the club’s pages.
          </DialogDescription>
        </DialogHeader>
        <SaveError message={write.error} />
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary" disabled={write.pending}>Cancel</Button></DialogClose>
          <Button disabled={write.pending} onClick={() => write.run(`${apiBase(orgId)}/${encodeURIComponent(slug)}`, 'DELETE', undefined, () => {
            write.router.push(listHref);
            write.router.refresh();
          })}>{write.pending ? 'Deleting…' : `Delete ${name}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "Add member" on a department's Members tab: one of the club's members not already on it. */
export function AddMemberButton({ orgId, slug, name, candidates }: {
  orgId: string;
  slug: string;
  name: string;
  candidates: readonly DirectoryPerson[];
}) {
  const write = useDialogWrite();
  const [userId, setUserId] = useState('');
  return (
    <Dialog open={write.open} onOpenChange={(next) => { if (next) setUserId(''); write.onOpenChange(next); }}>
      <DialogTrigger asChild><Button><UserPlus aria-hidden="true" />Add member</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a member to {name}</DialogTitle>
          <DialogDescription>Choose from the club’s current members.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" aria-busy={write.pending} onSubmit={(event) => {
          event.preventDefault();
          if (!userId) {
            write.setError('Choose the member to add.');
            return;
          }
          write.run(`${apiBase(orgId)}/${encodeURIComponent(slug)}/members`, 'POST', { userId });
        }}>
          <SaveError message={write.error} />
          {candidates.length > 0
            ? <div>
              <label htmlFor="add-department-member" className="mb-1 block font-semibold">Member</label>
              <select id="add-department-member" value={userId} onChange={(e) => setUserId(e.target.value)} className={selectClass}>
                <option value="">Not chosen yet</option>
                {candidates.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.name}{m.positions.length > 0 ? ` · ${m.positions.join(', ')}` : ''}</option>
                ))}
              </select>
            </div>
            : <p className="text-muted-foreground">Every member of the club is already on {name}.</p>}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={write.pending}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={write.pending || candidates.length === 0}>{write.pending ? 'Adding…' : 'Add member'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "Remove" on a row of a department's Members tab, with a confirmation. */
export function RemoveMemberButton({ orgId, slug, departmentName, person, lead }: {
  orgId: string;
  slug: string;
  departmentName: string;
  person: { userId: string; name: string };
  lead: boolean;
}) {
  const write = useDialogWrite();
  return (
    <Dialog open={write.open} onOpenChange={write.onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" aria-label={`Remove ${person.name} from ${departmentName}`}>Remove</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {person.name} from {departmentName}?</DialogTitle>
          <DialogDescription>
            {person.name} stays a member of the club.{lead ? ` ${departmentName} will have no lead until you choose one.` : ''}
          </DialogDescription>
        </DialogHeader>
        <SaveError message={write.error} />
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary" disabled={write.pending}>Cancel</Button></DialogClose>
          <Button disabled={write.pending} onClick={() => write.run(
            `${apiBase(orgId)}/${encodeURIComponent(slug)}/members/${encodeURIComponent(person.userId)}`, 'DELETE', undefined,
          )}>{write.pending ? 'Removing…' : 'Remove'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
