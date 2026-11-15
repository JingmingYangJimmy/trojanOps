'use client';

// Turns one of the club's agents on or off. Required agents stay on (the server refuses it too);
// retired ones have no switch.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { CatalogEntry } from '@/lib/distribution';
import { writeErrorMessage } from './admin-view';

export function AgentSwitch({ agent, orgId }: { readonly agent: CatalogEntry; readonly orgId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);
  if (agent.status === 'retired') return null;
  const on = agent.status === 'enabled';
  const required = agent.distribution === 'required';
  const id = `agent-switch-${agent.installationId}`;

  // A disabled, checked switch would read as a Cardinal tint; a required agent shows a lock instead.
  if (required && on) {
    return (
      <p className="flex w-[200px] items-center gap-1 text-sm">
        <Lock aria-hidden className="size-3" />Required, always on
      </p>
    );
  }

  function toggle(enabled: boolean) {
    if (pending) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/orgs/${orgId}/installations/${agent.installationId}`, {
          method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled }),
        });
        if (!response.ok) {
          setMessage({ text: await writeErrorMessage(response, `Could not turn ${agent.name} ${enabled ? 'on' : 'off'}.`), failed: true });
          return;
        }
        setMessage({ text: enabled ? 'On for members.' : 'Off. Members no longer see it.', failed: false });
        router.refresh();
      } catch {
        setMessage({ text: 'Could not reach the server. Try again.', failed: true });
      }
    });
  }

  return (
    <div className="w-[200px] space-y-1">
      <div className="flex items-center gap-2">
        <Switch
          id={id}
          checked={on}
          disabled={pending}
          onCheckedChange={toggle}
          aria-label={`${agent.name} ${on ? 'on' : 'off'}`}
        />
        <label htmlFor={id} className="flex items-center gap-1 text-sm">
          {pending ? 'Saving…' : on ? 'On' : 'Off'}
        </label>
      </div>
      {message && (
        <p role={message.failed ? 'alert' : 'status'} className={`flex items-start gap-1 text-sm ${message.failed ? 'text-primary' : 'text-muted-foreground'}`}>
          {message.failed
            ? <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            : <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />}
          {message.text}
        </p>
      )}
    </div>
  );
}
