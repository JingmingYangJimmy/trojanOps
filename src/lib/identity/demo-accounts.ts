// Owner: A (WP-3). Demo sign-in accounts (DEMO_MODE): the account numbers behind `/?account=N`, the
// shared demo password and sign-in matching. Client-safe: no DB imports. The password is checked in
// the browser only; the server trusts DEMO_MODE and choosePersona, never this password.

/** Seeded NetIDs in the order of the demo beats; `/?account=1` is the first. */
export const DEMO_ACCOUNT_ORDER = ['avery', 'sam', 'taylor', 'jordan', 'casey', 'lee', 'morgan', 'riley'] as const;

/** The one password every demo account accepts. Not a secret: it ships to the browser. */
export const DEMO_PASSWORD = 'fighton';

/** Memorable sign-in aliases for the seeded demo roles. */
export const DEMO_SIGN_IN_IDS: ReadonlyMap<string, string> = new Map([
  ['avery', 'admin'],
  ['sam', 'president'],
  ['taylor', 'treasurer'],
  ['jordan', 'successor'],
  ['casey', 'member'],
  ['lee', 'student'],
  ['morgan', 'multi'],
  ['riley', 'reviewer'],
]);

export interface DemoAccount {
  /** Position in the `/?account=N` links, from 1. */
  n: number;
  userId: string;
  netId: string;
  /** What the account types in the Sign-in ID field: the seeded demo email, else the NetID. */
  signInId: string;
  /** Where the account lands after signing in. */
  landing: string;
}

/** The account a `?account=` value names, or null when it names none. */
export function accountFromParam(accounts: readonly DemoAccount[], param: string | string[] | undefined): DemoAccount | null {
  if (typeof param !== 'string' || !/^\d+$/.test(param)) return null;
  return accounts.find((a) => a.n === Number(param)) ?? null;
}

/** The account whose NetID or sign-in ID matches `id` (trimmed, any case) when `password` is the
 * demo password, else null. */
export function matchAccount(accounts: readonly DemoAccount[], id: string, password: string): DemoAccount | null {
  const wanted = id.trim().toLowerCase();
  if (!wanted || password !== DEMO_PASSWORD) return null;
  return accounts.find((account) =>
    account.netId.toLowerCase() === wanted ||
    account.signInId.toLowerCase() === wanted ||
    DEMO_SIGN_IN_IDS.get(account.netId) === wanted,
  ) ?? null;
}
