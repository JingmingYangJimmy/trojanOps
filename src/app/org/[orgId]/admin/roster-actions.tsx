'use client';

// Roster edits on the club admin page: add a member, edit a member's positions, remove a member,
// and create a position. Each one calls its §14 route and reports the server's own refusal.
import { useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ErrorNotice, PendingButton, selectClass, useConsoleMutation } from '@/app/usg/templates/console-ui';
import type { ClubAdmin, ClubMember } from '@/lib/distribution';

type Notify = (message: string) => void;

/** The club's shared member position, which Add member defaults to. */
const defaultPosition = (data: ClubAdmin) =>
  data.positions.find((p) => p.slug === 'member')?.slug ?? data.positions.find((p) => !p.isOfficer)?.slug ?? '';

export function AddMemberButton({ data, onDone }: { data: ClubAdmin; onDone: Notify }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'pick' | 'netid'>(data.nonMembers.length > 0 ? 'pick' : 'netid');
  const [userId, setUserId] = useState('');
  const [netId, setNetId] = useState('');
  const [positionSlug, setPositionSlug] = useState(defaultPosition(data));
  const [invalid, setInvalid] = useState<string | null>(null);
  const m = useConsoleMutation();

  function reset(next: boolean) {
    setOpen(next);
    if (next) { setUserId(''); setNetId(''); setPositionSlug(defaultPosition(data)); setInvalid(null); m.clear(); }
  }

  function submit() {
    const who = mode === 'pick' ? { userId } : { netId: netId.trim() };
    if (mode === 'pick' ? !userId : !netId.trim()) { setInvalid(mode === 'pick' ? 'Choose a student.' : 'Enter a NetID.'); return; }
    setInvalid(null);
    const name = mode === 'pick' ? data.nonMembers.find((u) => u.userId === userId)?.displayName ?? 'The student' : netId.trim();
    m.run(async () => {
      await m.request(`/api/orgs/${data.org.id}/members`, 'POST', { ...who, ...(positionSlug ? { positionSlug } : {}) });
      const message = `${name} joined ${data.org.name}.`;
      onDone(message);
      return message;
    }, () => setOpen(false));
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild><Button><Plus aria-hidden className="size-4" />Add member</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a member</DialogTitle>
          <DialogDescription>They see {data.org.name}&rsquo;s member agents right away.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ErrorNotice message={m.error} />
          <fieldset className="flex gap-4">
            <legend className="sr-only">Find the student by</legend>
            <label className="flex items-center gap-2"><input type="radio" className="accent-primary" checked={mode === 'pick'} onChange={() => setMode('pick')} disabled={data.nonMembers.length === 0} />Choose a student</label>
            <label className="flex items-center gap-2"><input type="radio" className="accent-primary" checked={mode === 'netid'} onChange={() => setMode('netid')} />Enter a NetID</label>
          </fieldset>
          {mode === 'pick' ? (
            <div>
              <label htmlFor="add-member-user" className="mb-1 block font-semibold">Student</label>
              <select id="add-member-user" className={selectClass} value={userId} onChange={(e) => { setUserId(e.target.value); setInvalid(null); }} aria-invalid={invalid ? true : undefined}>
                <option value="">Not chosen yet</option>
                {data.nonMembers.map((u) => <option key={u.userId} value={u.userId}>{u.displayName} · {u.netId}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="add-member-netid" className="mb-1 block font-semibold">NetID</label>
              <Input id="add-member-netid" value={netId} onChange={(e) => { setNetId(e.target.value); setInvalid(null); }} aria-invalid={invalid ? true : undefined} autoComplete="off" />
            </div>
          )}
          {invalid && <p className="text-primary">{invalid}</p>}
          <div>
            <label htmlFor="add-member-position" className="mb-1 block font-semibold">Position</label>
            <select id="add-member-position" className={selectClass} value={positionSlug} onChange={(e) => setPositionSlug(e.target.value)}>
              {data.positions.map((p) => <option key={p.slug} value={p.slug}>{p.name}{p.isOfficer ? ' (officer)' : ''}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
          <PendingButton pending={m.pending} onClick={submit}>Add member</PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "Edit positions" and "Remove from club" for one member row. */
export function MemberMenu({ data, member, onDone }: { data: ClubAdmin; member: ClubMember; onDone: Notify }) {
  const [dialog, setDialog] = useState<'positions' | 'remove' | null>(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label={`More actions for ${member.displayName}`}><MoreHorizontal aria-hidden className="size-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog('positions')}>Edit positions</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog('remove')}>Remove from club</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === 'positions' && <PositionsDialog data={data} member={member} onClose={() => setDialog(null)} onDone={onDone} />}
      {dialog === 'remove' && <RemoveDialog data={data} member={member} onClose={() => setDialog(null)} onDone={onDone} />}
    </>
  );
}

function PositionsDialog({ data, member, onClose, onDone }: { data: ClubAdmin; member: ClubMember; onClose: () => void; onDone: Notify }) {
  const before = new Set(member.positions.map((p) => p.slug));
  const [chosen, setChosen] = useState(() => new Set(before));
  const m = useConsoleMutation();
  const added = [...chosen].filter((slug) => !before.has(slug));
  const removed = [...before].filter((slug) => !chosen.has(slug));

  function save() {
    if (chosen.size === 0) { m.clear(); return; }
    m.run(async () => {
      const base = `/api/orgs/${data.org.id}/positions`;
      for (const slug of added) await m.request(`${base}/${slug}/holders`, 'POST', { userId: member.userId });
      for (const slug of removed) {
        const response = await fetch(`${base}/${slug}/holders/${member.userId}`, { method: 'DELETE' });
        if (!response.ok) {
          const failure = await response.json().catch(() => null);
          throw new Error(failure?.message ?? 'The server could not save this change. Refresh and try again.');
        }
      }
      const message = `${member.displayName}’s positions are saved.`;
      onDone(message);
      return message;
    }, onClose);
  }

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Positions for {member.displayName}</DialogTitle>
          <DialogDescription>Each position opens the agents and documents granted to it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ErrorNotice message={m.error} />
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="sr-only">Positions</legend>
            {data.positions.map((p) => (
              <label key={p.slug} className="flex items-center gap-2">
                <Checkbox
                  checked={chosen.has(p.slug)}
                  onChange={(e) => setChosen((current) => {
                    const next = new Set(current);
                    if (e.target.checked) next.add(p.slug); else next.delete(p.slug);
                    return next;
                  })}
                />
                {p.name}
              </label>
            ))}
          </fieldset>
          {chosen.size === 0 && <p className="text-primary">Keep at least one position, or remove {member.displayName} from the club.</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
          <PendingButton pending={m.pending} onClick={save} disabled={chosen.size === 0 || (added.length === 0 && removed.length === 0)}>Save positions</PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({ data, member, onClose, onDone }: { data: ClubAdmin; member: ClubMember; onClose: () => void; onDone: Notify }) {
  const m = useConsoleMutation();
  function remove() {
    m.run(async () => {
      const response = await fetch(`/api/orgs/${data.org.id}/members/${member.userId}`, { method: 'DELETE' });
      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        throw new Error(failure?.message ?? 'The server could not save this change. Refresh and try again.');
      }
      const message = `${member.displayName} was removed from ${data.org.name}.`;
      onDone(message);
      return message;
    }, onClose);
  }
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Remove {member.displayName}?</DialogTitle>
          <DialogDescription>
            They lose {data.org.name}&rsquo;s member agents and documents now
            {member.positions.length > 0 ? `, and stop holding ${member.positions.map((p) => p.name).join(', ')}` : ''}.
          </DialogDescription>
        </DialogHeader>
        <ErrorNotice message={m.error} />
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
          <PendingButton pending={m.pending} onClick={remove}>Remove member</PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreatePositionButton({ data, onDone }: { data: ClubAdmin; onDone: Notify }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isOfficer, setIsOfficer] = useState(true);
  const [invalid, setInvalid] = useState<string | null>(null);
  const m = useConsoleMutation();

  function submit() {
    if (!name.trim()) { setInvalid('Enter a name for the position.'); return; }
    setInvalid(null);
    m.run(async () => {
      await m.request(`/api/orgs/${data.org.id}/positions`, 'POST', { name: name.trim(), isOfficer });
      const message = `${name.trim()} was created.`;
      onDone(message);
      return message;
    }, () => setOpen(false));
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) { setName(''); setIsOfficer(true); setInvalid(null); m.clear(); } }}>
      <DialogTrigger asChild><Button variant="secondary"><Plus aria-hidden className="size-4" />Create position</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a position</DialogTitle>
          <DialogDescription>Assign it to members from the members table.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ErrorNotice message={m.error} />
          <div>
            <label htmlFor="position-name" className="mb-1 block font-semibold">Name</label>
            <Input id="position-name" value={name} maxLength={60} placeholder="Events lead" onChange={(e) => { setName(e.target.value); setInvalid(null); }} aria-invalid={invalid ? true : undefined} />
            {invalid && <p className="mt-1 text-primary">{invalid}</p>}
          </div>
          <label className="flex items-center gap-2">
            <Checkbox checked={isOfficer} onChange={(e) => setIsOfficer(e.target.checked)} />
            Officer position
          </label>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
          <PendingButton pending={m.pending} onClick={submit}>Create position</PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
