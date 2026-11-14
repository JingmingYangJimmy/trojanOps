// Owner: A (WP-3). Landing page: the DEMO_MODE persona picker and the active-club switch.
import { PageHeader } from '@/components/shell';
import { getActor, listPersonas } from '@/lib/identity';
import { personasEnabled } from '@/lib/identity/session';
import { PersonaPicker } from './persona-picker';

export default async function Home() {
  if (!personasEnabled()) {
    return (
      <PageHeader
        title="TrojanOps"
        description="Personas are available in demo mode only. Set DEMO_MODE=1 to choose one."
      />
    );
  }
  const [actor, personas] = await Promise.all([getActor(), listPersonas()]);
  return (
    <>
      <PageHeader
        title="Choose a persona"
        description="Personas are fictional demo identities with seeded club memberships. They exist in demo mode only."
      />
      <PersonaPicker
        personas={personas}
        currentUserId={actor.userId}
        activeOrgId={actor.activeOrgId}
      />
    </>
  );
}
