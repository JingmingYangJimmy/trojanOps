// Owner: A (WP-3 builds the persona switcher). Placeholder: the §15 personas.
import { PageHeader } from '@/components/shell';
import { FIXTURE_PERSONAS } from '@/lib/authz/fixtures';
import { getActor } from '@/lib/identity';

export default async function Home() {
  const actor = await getActor();
  return (
    <>
      <PageHeader title="Choose a persona" description="Demo identities. The persona switcher arrives with WP-3; until then you act as Sam." />
      <table className="w-full max-w-2xl border border-border">
        <thead className="bg-muted text-left">
          <tr><th className="h-10 px-3 font-semibold">Persona</th><th className="px-3 font-semibold">Role</th></tr>
        </thead>
        <tbody>
          {FIXTURE_PERSONAS.map((p) => (
            <tr key={p.userId} className="h-10 border-t border-border">
              <td className="px-3">{p.name}{p.userId === actor.userId && <span className="ml-2 text-muted-foreground">(current)</span>}</td>
              <td className="px-3">{p.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
