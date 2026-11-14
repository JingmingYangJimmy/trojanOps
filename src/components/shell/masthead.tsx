// Owner: D (WP-2, real by H5). 48px Cardinal masthead: wordmark, scope switcher, persona.
import Link from 'next/link';
import { getActor } from '@/lib/identity';
import { myAgents } from '@/lib/distribution';
import { ScopeLinks, type Scope } from './scope-links';

export async function Masthead() {
  const actor = await getActor();
  const clubs = actor.userId ? await myAgents(actor.userId) : [];
  const club = clubs.find((c) => c.orgId === actor.activeOrgId);
  const scopes: Scope[] = [
    { href: '/me/agents', label: 'My agents', match: '/me' },
    { href: '/directory', label: 'Directory', match: '/directory' },
    ...(club && club.orgName !== 'USG' ? [{ href: `/org/${club.orgId}`, label: `Club: ${club.orgName}`, match: '/org' }] : []),
    ...(club?.orgName === 'USG' ? [{ href: '/usg/templates', label: 'USG admin', match: '/usg' }] : []),
  ];
  return (
    <header className="flex h-12 items-stretch bg-primary text-primary-foreground">
      <Link href="/" className="flex items-center px-6 text-base font-bold tracking-tight">TrojanOps</Link>
      <ScopeLinks scopes={scopes} />
      <div className="ml-auto flex items-center px-6">
        {/* TODO(WP-3): persona switcher (DEMO_MODE) and account */}
        <Link href="/" className="hover:underline">Persona</Link>
      </div>
    </header>
  );
}
