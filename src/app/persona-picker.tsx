// Owner: A (WP-3). Persona table, "Acting in" club switch and sign out; posts to /api/session/*.
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Persona, PersonaClub } from '@/lib/identity';
import { cn } from '@/lib/utils';

interface Props {
  personas: Persona[];
  currentUserId: string | null;
  activeOrgId: string | null;
}

/** Posts JSON; returns null on success or the error message to show inline. */
async function post(url: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    return err?.message ?? `The request failed with status ${res.status}. Reload the page and try again.`;
  } catch {
    return 'Could not reach the server. Check that the dev server is running, then try again.';
  }
}

function clubLabel(club: PersonaClub): string {
  return `${club.orgName} · ${club.positionNames.join(', ')}`;
}

export function PersonaPicker({ personas, currentUserId, activeOrgId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pendingNote, setPendingNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const current = personas.find((p) => p.userId === currentUserId) ?? null;
  const busy = isPending ? pendingKey : null;

  function act(key: string, note: string, url: string, body: unknown) {
    if (isPending) return; // one switch at a time, so responses can't land out of order
    setPendingKey(key);
    setPendingNote(note);
    setError(null);
    startTransition(async () => {
      const message = await post(url, body);
      if (message) {
        setError(message);
        return;
      }
      startTransition(() => router.refresh());
    });
  }

  return (
    <div className="max-w-[960px]">
      <p className="sr-only" aria-live="polite">
        {busy ? pendingNote : ''}
      </p>

      <section
        aria-label="Session"
        className="mb-4 flex flex-wrap items-end justify-between gap-4 rounded-md border border-border bg-muted px-4 py-3"
      >
        {current ? (
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <div className="text-[12px] leading-4 text-muted-foreground">Signed in as</div>
              <div className="mt-1 text-[16px] font-semibold leading-6">{current.name}</div>
            </div>
            {current.clubs.length > 1 && (
              <div role="group" aria-labelledby="acting-in-label">
                <div id="acting-in-label" className="text-[12px] leading-4 text-muted-foreground">
                  Acting in
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {current.clubs.map((club) => {
                    const active = club.orgId === activeOrgId;
                    const key = `org:${club.orgId}`;
                    return (
                      <Button
                        key={club.orgId}
                        variant="secondary"
                        size="sm"
                        aria-pressed={active}
                        aria-busy={busy === key}
                        aria-disabled={isPending || undefined}
                        className={cn('font-normal', active && 'border-primary font-semibold hover:bg-background')}
                        onClick={() => {
                          if (!active) act(key, `Switching to ${club.orgName}`, '/api/session/active-org', { orgId: club.orgId });
                        }}
                      >
                        {active && <Check aria-hidden />}
                        {busy === key ? `Switching to ${club.orgName}…` : clubLabel(club)}
                        {active && <span className="sr-only">(current club)</span>}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[16px] leading-6">You’re signed out. Choose a persona to continue.</p>
        )}
        {current && (
          <Button
            variant="outline"
            aria-busy={busy === 'signout'}
            aria-disabled={isPending || undefined}
            onClick={() => act('signout', 'Signing out', '/api/session/persona', { userId: null })}
          >
            {busy === 'signout' ? 'Signing out…' : 'Sign out'}
          </Button>
        )}
      </section>

      {error && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-primary bg-background px-4 py-3 text-primary">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {personas.length === 0 ? (
        <p className="rounded-md border border-border px-4 py-3">
          No personas yet. Run <code className="font-mono">pnpm db:reset</code> to load the demo data.
        </p>
      ) : (
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <caption className="sr-only">Demo personas and their club positions</caption>
          <thead className="bg-muted">
            <tr className="h-[40px]">
              <th scope="col" className="px-3 font-semibold">Persona</th>
              <th scope="col" className="px-3 font-semibold">Clubs and positions</th>
              <th scope="col" className="w-[200px] px-3 font-semibold">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => {
              const isCurrent = p.userId === currentUserId;
              const key = `persona:${p.userId}`;
              return (
                <tr key={p.userId} aria-current={isCurrent ? 'true' : undefined} className="border-t border-border">
                  <td className={cn('h-[40px] px-3 py-2 align-middle', isCurrent && 'font-semibold')}>{p.name}</td>
                  <td className="px-3 py-2 align-middle">
                    {p.clubs.length === 0 ? (
                      <span className="text-muted-foreground">No club</span>
                    ) : (
                      <ul>
                        {p.clubs.map((c) => (
                          <li key={c.orgId}>{clubLabel(c)}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right align-middle">
                    {isCurrent ? (
                      <span className="inline-flex h-[32px] items-center gap-1 font-semibold">
                        <Check aria-hidden className="size-4" />
                        Current
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-busy={busy === key}
                        aria-disabled={isPending || undefined}
                        onClick={() => act(key, `Switching to ${p.name}`, '/api/session/persona', { userId: p.userId })}
                      >
                        {busy === key ? 'Switching…' : `Act as ${p.name}`}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
