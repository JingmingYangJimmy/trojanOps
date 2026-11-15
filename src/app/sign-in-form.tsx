// Owner: A (WP-3). Demo sign-in form (DEMO_MODE): checks the sign-in ID and demo password in the
// browser, then posts the account's user id to /api/session/persona and opens its landing page.
'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Info, CircleHelp, ExternalLink } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import styles from './sign-in.module.css';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEMO_PASSWORD, DEMO_SIGN_IN_IDS, matchAccount, type DemoAccount } from '@/lib/identity/demo-accounts';

interface Props {
  accounts: DemoAccount[];
  /** The account a `/?account=N` link names: both fields start filled. */
  prefill: DemoAccount | null;
}

interface FieldErrors {
  id?: string;
  password?: string;
}

const NO_MATCH = "That sign-in ID and password don't match a demo account. Check both and try again.";

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

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="mt-1 flex items-start gap-1 text-primary">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

export function SignInForm({ accounts, prefill }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const idRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [signInId, setSignInId] = useState(prefill ? DEMO_SIGN_IN_IDS.get(prefill.netId) ?? prefill.signInId : '');
  const [password, setPassword] = useState(prefill ? DEMO_PASSWORD : '');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || isPending) return; // one sign-in at a time
    const next: FieldErrors = {
      id: signInId.trim() ? undefined : 'Enter your sign-in ID.',
      password: password ? undefined : 'Enter your password.',
    };
    setErrors(next);
    setFormError(null);
    if (next.id || next.password) {
      (next.id ? idRef : passwordRef).current?.focus();
      return;
    }
    const account = matchAccount(accounts, signInId, password);
    if (!account) {
      setFormError(NO_MATCH);
      return;
    }
    inFlight.current = true;
    startTransition(async () => {
      const message = await post('/api/session/persona', { userId: account.userId });
      if (message) {
        inFlight.current = false;
        setFormError(message);
        return;
      }
      startTransition(() => {
        router.replace(account.landing);
        router.refresh();
      });
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <p className="sr-only" aria-live="polite">
          {isPending ? 'Signing in' : ''}
        </p>

        <aside className={styles.notice}>
          <Info aria-hidden />
          <p><strong>Starting November 19, 2026,</strong> this Sign-in screen will change,
            requiring you to enter your Sign-in ID and Password on separate screens. Learn more about{' '}
            <a href="https://itservices.usc.edu/" target="_blank" rel="noreferrer">SSO Sign-in Updates <ExternalLink aria-hidden /></a>
          </p>
        </aside>
        <h1 className={styles.logo}>
          <Image src="/usc-primary-monogram.png" alt="USC" width={245} height={81} priority />
          <span className="sr-only">Demo sign-in</span>
        </h1>
        <section className={styles.card} aria-labelledby="sign-in-heading">
          <h2 id="sign-in-heading">Welcome! Please sign in to continue.</h2>

          {/* method="post": a submit before hydration must never put the password in the URL. */}
          <form method="post" noValidate onSubmit={submit} className={styles.form}>
            {formError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle aria-hidden />
                <p>{formError}</p>
              </Alert>
            )}

            <Label htmlFor="sign-in-id">Sign-in ID (netid@usc.edu) <span title="Use the demo sign-in ID provided by the presenter."><CircleHelp aria-label="Sign-in ID help" /></span></Label>
            <Input
              ref={idRef}
              id="sign-in-id"
              name="username"
              value={signInId}
              onChange={(e) => {
                setSignInId(e.target.value);
                if (errors.id && e.target.value.trim()) setErrors((prev) => ({ ...prev, id: undefined }));
              }}
              placeholder="e.g., tommy@usc.edu"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={errors.id ? true : undefined}
              aria-describedby={errors.id ? 'sign-in-id-error' : undefined}
            />
            {errors.id && <FieldError id="sign-in-id-error" message={errors.id} />}

            <Label htmlFor="sign-in-password" className={styles.passwordLabel}>
              Password
            </Label>
            <div className="relative">
              <Input
                ref={passwordRef}
                id="sign-in-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password && e.target.value) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                autoComplete="current-password"
                autoCapitalize="none"
                spellCheck={false}
                className="pr-11"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? 'sign-in-password-error' : undefined}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Show password"
                aria-pressed={showPassword}
                aria-controls="sign-in-password"
                onClick={() => setShowPassword((shown) => !shown)}
                className={styles.eye}
              >
                {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              </Button>
            </div>
            {errors.password && <FieldError id="sign-in-password-error" message={errors.password} />}

            <Button type="submit" aria-busy={isPending || undefined} className={styles.submit}>
              {isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </section>
        <nav className={styles.recovery} aria-label="Account recovery">
          <a href="https://netid.usc.edu/">Forgot NetID</a>
          <a href="https://netid.usc.edu/">Forgot password</a>
          <a href="https://netid.usc.edu/">Activate new account</a>
        </nav>
        <div className={styles.help}>
          <p>If you wish to sign out after logging in, close your web browser on Windows or quit your web browser on Mac. This step will prevent others from accessing your account when you are using a shared computer.</p>
          <h2>Need help?</h2>
          <a href="https://netid.usc.edu/">USC NetID Account Services <ExternalLink aria-hidden /></a>
          <a href="https://policy.usc.edu/privacy-notice/">Privacy Notice <ExternalLink aria-hidden /></a>
          <a href="https://eeotix.usc.edu/">Notice of Non-Discrimination <ExternalLink aria-hidden /></a>
          <a href="https://accessibility.usc.edu/">Digital Accessibility <ExternalLink aria-hidden /></a>
          <p className={styles.demo}>Demo sign-in. Use demo accounts only and never enter your real USC password. Ask the presenter for a sign-in link.</p>
        </div>
      </div>
    </div>
  );
}
