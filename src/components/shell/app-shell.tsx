import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { orgs } from '@/lib/db/schema';
import { getActor, listPersonas } from '@/lib/identity';
import { personasEnabled } from '@/lib/identity/session';
import { departmentLinks } from '@/lib/directory/service';
import { myAgents } from '@/lib/distribution';
import { Footer } from './footer';
import { Masthead } from './masthead';
import { navigationFor } from './navigation';
import { ScopeSideNav } from './scope-side-nav';
import { ShellFrame } from './shell-frame';

export async function AppShell({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  const demoMode = personasEnabled();
  const personas = demoMode ? await listPersonas() : [];
  const current = personas.find((person) => person.userId === actor.userId);
  // myAgents() only runs when the persona list does not already supply the clubs.
  const sessionClubs = current?.clubs ?? (actor.userId ? await myAgents(actor.userId) : []);
  const [activeOrg] = actor.activeOrgId
    ? await getDb().select({ kind: orgs.kind }).from(orgs).where(eq(orgs.id, actor.activeOrgId))
    : [];
  const departments = activeOrg && activeOrg.kind !== 'usg' ? await departmentLinks(actor.activeOrgId) : [];
  const scopes = navigationFor(actor, sessionClubs, activeOrg?.kind === 'usg', departments);
  // Signed out, the masthead gets no personas: names appear only after someone signs in.
  return (
    <>
      <ShellFrame
        masthead={<Masthead key={`${actor.userId}:${actor.activeOrgId}`} scopes={scopes} signedIn={Boolean(actor.userId)}
          currentUserId={actor.userId} activeOrgId={actor.activeOrgId} demoMode={demoMode}
          personas={actor.userId ? personas : []} clubs={sessionClubs} />}
        sideNav={<ScopeSideNav scopes={scopes} />}
      >
        {children}
      </ShellFrame>
      <Footer />
    </>
  );
}
