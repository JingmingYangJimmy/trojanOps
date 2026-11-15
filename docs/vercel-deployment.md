# Vercel demo deployment

The website and API run on Vercel's Node.js runtime. PostgreSQL is a separate cloud database;
the website connects as `trojanops_app`, never its owner. This deploys the existing persona/mock
demo, including Management, the directory and knowledge pages.

## Initialize a new cloud database

Create a dedicated empty PostgreSQL database, for example on Neon. Keep the owner's direct
connection string local. In the local terminal, set `DATABASE_OWNER_URL` and a randomly generated
`DATABASE_APP_PASSWORD` of at least 24 characters, then run `pnpm db:init`.

`db:init` refuses a nonempty database without changing it. It creates the restricted app role if
needed, checks its credentials, runs the existing migrations, seeds the demo and verifies that an
unscoped app connection cannot read documents. Existing app-role passwords are not changed.
If the role already exists, supply its current password. The command never drops a schema.

Use the provider's connection string for `trojanops_app` as Vercel's `DATABASE_URL`, with TLS enabled.
Keep owner credentials and `DATABASE_APP_PASSWORD` out of the Vercel runtime and out of Git.
The existing `db:reset` command is destructive and is not part of deployment or builds.

## Build and deploy

- Framework: Next.js; repository root; Node.js 22.x.
- `vercel.json` invokes the pinned pnpm 12.18.0 through `npm exec` for installation and build.
  This avoids older Corepack shims expecting a JavaScript entry point that pnpm 12 no longer has.
- Copy the nonsecret variable names from `.env.vercel.example` into the appropriate Vercel
  environment, replacing only `DATABASE_URL` with the restricted cloud connection string.
- The CSV roster remains server-only and is explicitly included by `outputFileTracingIncludes`.
- A build never runs migrations, seed or reset commands.

After deploying, check sign-in, Management's five CSV views, Clubs and quotas, the org directory,
document permissions, and a mock agent run. Roster sync changes the database; use a dedicated demo
database for rehearsals and initialize preview deployments against a separate database branch.

## Demo state

Leave `DEMO_NOW` unset on Vercel to use the real clock. The demo time-jump control is process-local
and cannot synchronize separate function instances. The existing internal application queue is
also process-local and non-durable; it is not an application-approval service. Persistent clock
overrides or application submissions require a separate implementation and schema review.

`DEMO_MODE=1` intentionally permits persona switching and uses constructed club records. Real
SSO, model calls and production user onboarding remain outside this deployment.
