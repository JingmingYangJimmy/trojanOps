// Owner: A (WP-3). Demo sign-in: account numbering, sign-in matching and the landing page.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import Home from '@/app/page';
import { SignInForm } from '@/app/sign-in-form';
import { landingPath, listDemoAccounts, PERSONA_COOKIE } from '@/lib/identity';
import {
  accountFromParam, DEMO_ACCOUNT_ORDER, DEMO_PASSWORD, matchAccount, type DemoAccount,
} from '@/lib/identity/demo-accounts';
import { USER } from '@db/seed/ids';
import { appSql, closeAppDb } from './db';

// The page reads the persona cookie through next/headers and leaves through redirect().
const session = vi.hoisted(() => ({ cookie: '' }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ cookie: session.cookie }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: () => {}, refresh: () => {} }),
  redirect: (path: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { path });
  },
}));

const fixture: DemoAccount[] = [
  { n: 1, userId: USER.avery, netId: 'avery', signInId: 'avery@demo.trojanops.test', landing: '/me/agents' },
  { n: 2, userId: USER.sam, netId: 'sam', signInId: 'sam@demo.trojanops.test', landing: '/me/agents' },
];

describe('landingPath', () => {
  it('sends every signed-in user to My agents', () => {
    expect(landingPath()).toBe('/me/agents');
  });
});

describe('matchAccount and accountFromParam', () => {
  it('matches the sign-in ID or NetID in any case, with the demo password only', () => {
    expect(matchAccount(fixture, ' Sam@Demo.TrojanOps.test ', DEMO_PASSWORD)?.userId).toBe(USER.sam);
    expect(matchAccount(fixture, 'sam', DEMO_PASSWORD)?.userId).toBe(USER.sam);
    expect(matchAccount(fixture, 'sam', 'wrong')).toBeNull();
    expect(matchAccount(fixture, 'sam', '')).toBeNull();
    expect(matchAccount(fixture, 'nobody', DEMO_PASSWORD)).toBeNull();
    expect(matchAccount(fixture, '   ', DEMO_PASSWORD)).toBeNull();
  });

  it('accepts each role alias with the shared demo password', () => {
    const aliases = ['admin', 'president', 'treasurer', 'successor', 'member', 'student', 'multi', 'reviewer'];
    const accounts = DEMO_ACCOUNT_ORDER.map((netId, i) => ({ n: i + 1, netId, userId: netId, signInId: `${netId}@demo.trojanops.test`, landing: '/me/agents' }));
    for (const [i, alias] of aliases.entries()) {
      expect(matchAccount(accounts, ` ${alias.toUpperCase()} `, 'fighton')?.netId).toBe(DEMO_ACCOUNT_ORDER[i]);
      expect(matchAccount(accounts, alias, 'wrong')).toBeNull();
    }
  });

  it('reads only a whole account number', () => {
    expect(accountFromParam(fixture, '2')?.netId).toBe('sam');
    for (const bad of [undefined, '', '0', '9', '2x', '-1', '1.0', ['1']]) {
      expect(accountFromParam(fixture, bad)).toBeNull();
    }
  });
});

describe('SignInForm markup', () => {
  const NAMES = /\b(Avery|Riley|Sam|Taylor|Jordan|Casey|Morgan|Lee)\b/;

  it('labels both fields, states it is a demo, and shows no display names', () => {
    const html = renderToStaticMarkup(createElement(SignInForm, { accounts: fixture, prefill: null }));
    expect(html).toMatch(/<label[^>]*for="sign-in-id"[^>]*>Demo sign-in ID[\s\S]*?<\/label>/);
    expect(html).toMatch(/<label[^>]*for="sign-in-password"[^>]*>Demo password<\/label>/);
    expect(html).toContain('Demo sign-in.');
    expect(html).toContain('never enter your real USC password');
    expect(html).not.toMatch(NAMES);
    expect(html).not.toContain('value="sam@demo.trojanops.test"'); // only the placeholder, no value
    expect(html).toContain('placeholder="e.g., president"');
    expect(html).toMatch(/id="sign-in-id"[^>]*value="admin"/);
    expect(html).toMatch(/type="password"[^>]*value="fighton"/);
  });

  it('says plainly that it is a fake page and not a USC service, and imitates no USC chrome', () => {
    const html = renderToStaticMarkup(createElement(SignInForm, { accounts: fixture, prefill: null }));
    expect(html).toContain('This is a fake sign-in page.');
    expect(html).toContain('not affiliated with or endorsed by the University of Southern California');
    expect(html).toContain('Never type a real NetID or a real password here.');
    // No USC branding, no links that could pass for the real NetID service.
    expect(html).not.toContain('usc-primary-monogram');
    expect(html).not.toContain('netid.usc.edu');
    expect(html).not.toContain('itservices.usc.edu');
    expect(html).not.toContain('Forgot NetID');
  });

  it('prefills the sign-in ID and a masked password for a /?account=N link', () => {
    const html = renderToStaticMarkup(createElement(SignInForm, { accounts: fixture, prefill: fixture[1] }));
    expect(html).toMatch(/id="sign-in-id"[^>]*value="president"|value="president"[^>]*id="sign-in-id"/);
    expect(html).toMatch(/type="password"[^>]*value="fighton"|value="fighton"[^>]*type="password"/);
    expect(html).not.toMatch(NAMES);
  });
});

const probe = await appSql();
await probe?.end();
afterAll(async () => {
  if (probe) await closeAppDb();
});

describe.skipIf(!probe)('listDemoAccounts (seed)', () => {
  it('numbers the seeded accounts in demo-beat order, without display names', async () => {
    const accounts = await listDemoAccounts();
    const seeded = accounts.slice(0, DEMO_ACCOUNT_ORDER.length);
    expect(seeded.map((a) => [a.n, a.netId])).toEqual(DEMO_ACCOUNT_ORDER.map((netId, i) => [i + 1, netId]));
    expect(seeded.map((a) => a.signInId)).toEqual(DEMO_ACCOUNT_ORDER.map((netId) => `${netId}@demo.trojanops.test`));
    for (const a of accounts) expect(Object.keys(a).sort()).toEqual(['landing', 'n', 'netId', 'signInId', 'userId']);
  });

  it('lands each seeded persona on My agents', async () => {
    const accounts = await listDemoAccounts();
    expect(accounts.length).toBeGreaterThan(0);
    for (const a of accounts) expect(a.landing).toBe('/me/agents');
  });
});

describe.skipIf(!probe)('the / page', () => {
  const render = (params: Record<string, string>) => Home({ searchParams: Promise.resolve(params) });
  const signInAs = (userId: string | null) => {
    session.cookie = userId ? `${PERSONA_COOKIE}=${userId}` : '';
  };
  const demoMode = process.env.DEMO_MODE;
  afterEach(() => {
    signInAs(null);
    process.env.DEMO_MODE = demoMode;
  });

  it('sends a signed-in visit without ?account= to My agents', async () => {
    process.env.DEMO_MODE = '1';
    signInAs(USER.sam);
    await expect(render({})).rejects.toMatchObject({ path: '/me/agents' });
    signInAs(USER.lee);
    await expect(render({})).rejects.toMatchObject({ path: '/me/agents' });
  });

  it('shows the sign-in form for ?account=N even when signed in, prefilled for account N', async () => {
    process.env.DEMO_MODE = '1';
    signInAs(USER.sam);
    const html = renderToStaticMarkup(await render({ account: '5' }));
    expect(html).toContain('value="member"');
    signInAs(null);
    const empty = renderToStaticMarkup(await render({ account: '99' }));
    expect(empty).toContain('Sign in with a demo account');
    expect(empty).toContain('value="admin"');
    expect(empty).toContain('value="fighton"');
  });

  it('shows no form outside demo mode', async () => {
    delete process.env.DEMO_MODE;
    const html = renderToStaticMarkup(await render({}));
    expect(html).toContain('Set DEMO_MODE=1');
    expect(html).not.toContain('<form');
  });
});
