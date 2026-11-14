# Team workflow

Four people, each working with coding agents, one repository, two days. The rules below keep four
agents from editing the same lines and keep `main` runnable at every hour.

## Rhythm

| When | What |
|---|---|
| H0–H2 | All four together. A drives WP-0: repo skeleton, `contracts.ts`, every schema file (each area owner writes theirs), route list. Review it together, then freeze. |
| H2–H3 | Each owner merges the stubs for their interfaces (`AGENTS.md`). After H3 nobody waits on anybody. |
| Every 2 hours (H4, H6, …) | Sync point, 5 minutes in chat. Each person: merged, next, blocked, contract requests. Everyone rebases on `main` and runs `pnpm db:reset && pnpm check`. |
| H8 | Every page renders seed data; `main` is green. |
| H12 | Platform freeze: D1–D8 pass on the mock runtime. Tag `platform-freeze`. After this, only fixes and the real-agent work (WP-13, WP-14). |
| H14 | WP-13 floor in, or the demo stays on the mock runtime. |
| H18 | Three rehearsals done. Tag `demo`. Record the backup video. |

## Git

- `main` always runs. Work on short branches named `<stream>/<wp>-<topic>`, e.g.
  `c/wp9-preview-matrix`.
- Keep a PR to one work-package slice, roughly under 400 changed lines, and merge it within about
  two hours.
- `git pull --rebase` before opening the PR. Squash-merge. Never force-push `main`.
- Commit messages: Conventional Commits with the area as scope, e.g. `feat(gateway): block runs
  over the member limit`.
- **Migrations:** only stream A runs `drizzle-kit generate`. Others change their schema file in a
  `contract` PR, and A adds the migration.
- **Dependencies:** add them in a PR of their own, labelled `deps`. If `pnpm-lock.yaml` conflicts,
  take `main`'s version and run `pnpm install`.
- **Seed data:** each stream edits only its `db/seed/<area>.ts`.
- Never commit `.env`, credentials or editor folders.

## Contract changes

A contract is anything in `src/lib/contracts.ts`, `src/lib/db/schema/**`, `db/migrations/**`, or a
route in `docs/architecture.md` §14.

1. Open a PR labelled `contract` with the change, the reason, and every consumer it affects. Update
   `docs/architecture.md` in the same PR.
2. Post it in the team chat. Affected owners reply within 30 minutes.
3. A merges it; consumers update at the next sync point.

## Pull requests

Each PR has:
- the template filled in;
- `pnpm check` green;
- the `reviewer` subagent run on the diff, with its findings fixed or answered;
- one human review from another stream.

The author reads the whole diff before asking for review: you own what your agent wrote.

## Working with agents

- **One task, one session.** Give the agent your stream brief (`docs/streams/<x>.md`), the work
  package, its done-when, and the paths it may touch. Start in plan mode and approve the plan before
  edits. `/clear` between tasks.
- **Logic test-first.** Grants, clamps, quota, `myAgents`, `explainAccess` and roster precedence
  get tests before code.
- **UI through `ui-designer`.** Every page uses seed data and the states in that file.
- **Parallel sessions on one machine** use git worktrees:
  `git worktree add ../trojanops-b-wp6 -b b/wp6-usg-console`.
- **Stop the agent when it:**
  - edits outside your paths, a contract, the lockfile or a migration;
  - weakens an invariant to make a test pass (disables RLS, uses the owner URL, skips a clamp);
  - builds a local copy of another stream's function;
  - goes 15 minutes without progress. Write what you tried in the PR or chat and ask the owner.
- **Decisions:** if a task forces a decision that `docs/decisions.md` doesn't cover, add an entry
  in the same PR.

## Definition of done

- The work package's done-when (`docs/architecture.md` §16) holds.
- Its demo beat runs from a fresh `pnpm db:reset`.
- Tests cover the logic; `pnpm check` passes.
- Docs match the code: routes, tables, labels.
