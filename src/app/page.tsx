// Owner: A (WP-3). Landing page: the DEMO_MODE sign-in. A signed-in visit without `?account=` goes
// to My agents; `/?account=N` always shows the form, prefilled for account N.
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shell';
import { getActor, landingPath, listDemoAccounts } from '@/lib/identity';
import { accountFromParam } from '@/lib/identity/demo-accounts';
import { personasEnabled } from '@/lib/identity/session';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = { title: 'Sign in · TrojanOps' };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { account } = await searchParams;
  if (account === undefined) {
    const actor = await getActor();
    if (actor.userId) redirect(landingPath());
  }
  if (!personasEnabled()) {
    return (
      <PageHeader
        title="Sign in"
        description="NetID sign-in isn't available in this build. Set DEMO_MODE=1 to use the demo sign-in."
      />
    );
  }
  const accounts = await listDemoAccounts();
  if (accounts.length === 0) {
    return (
      <PageHeader
        title="Sign in"
        description="No demo accounts yet. Run pnpm db:reset to seed the personas, then reload this page."
      />
    );
  }
  const prefill = accountFromParam(accounts, account);
  return <SignInForm key={prefill?.n ?? 0} accounts={accounts} prefill={prefill} />;
}
