# TrojanOps

A platform for USC student government (USG) and student clubs. USG distributes agents, quotas and
document permissions to clubs; clubs expose agents to their members or to all students; the platform
gateway governs every agent run; Postgres row-level security decides which documents a run can
read. Built by four people for the AI@USC Hackathon (Nov 14–15, 2026). The platform runs on a mock
agent runtime; real agents (model, retrieval, tools) are built last.

| Read | When |
|---|---|
| `docs/streams/<your stream>.md` | before any task: your scope, interfaces, hours |
| `docs/architecture.md` | the spec: invariants §2, data model §5, contracts §6, gateway §7, routes and pages §14, work packages §16 |
| `docs/workflow.md` | branches, PRs, contract changes, working with agents |
| `docs/decisions.md` | decisions already made; don't reopen them without the team |
| `.claude/agents/ui-designer.md` | any page, component, styling or UI copy |

## Rules

1. **Stay in your stream's paths** (table below). A change elsewhere goes to its owner as a request
   in the PR description or team chat. Never copy another stream's logic into your own code.
2. **Contracts are frozen after H2:** `src/lib/contracts.ts`, `src/lib/db/schema/**`,
   `db/migrations/**`, and the routes in `docs/architecture.md` §14. A change needs a PR labelled
   `contract`, merged by stream A and announced to the team.
3. **Invariants are not negotiable** (`docs/architecture.md` §2). In particular:
   - read documents only inside `withActor`;
   - the app connects as `trojanops_app`;
   - grants are recomputed per request and capped by the agent's max tier;
   - every run goes through `gateway.runAgent`;
   - write tools wait for a human;
   - distribution never widens;
   - time comes from `clock.now()`;
   - run input and output are private to the user who ran them.
4. **Code against interfaces.** Until another stream's piece is real, import it from its final path,
   where its owner merged a stub by H3 (table below). Don't build a local substitute.
5. **No retrieval, RAG or model calls before WP-13/WP-14.**
6. **Prove it.** Every change ships with tests or a demo-beat check, and `pnpm check` passes before
   the PR. Mark guesses `TODO(verify):`.
7. **Secrets and local files stay out of git:** `.env`, credentials, `.idea/`.

## Commands

| Command | Does |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm db:up` | `docker compose up -d db` |
| `pnpm db:reset` | drop, migrate and seed (owner URL, CLI only) |
| `pnpm test` | Vitest, unit + DB integration |
| `pnpm check` | typecheck, lint, test, invariant greps and design greps |

## Streams and ownership

| Stream | Owner | Owns | Work packages |
|---|---|---|---|
| A Platform core | TBD | `src/lib/{contracts.ts,clock.ts}`, `src/lib/{db,identity,authz,gateway,runtime}/**` (schema files `index`, `orgs`, `runs`, `quota`, `audit`), `db/migrations/**`, `db/seed/quota.ts`, `src/app/page.tsx`, root config (`package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.*`, `drizzle.config.ts`, `docker-compose.yml`, `.env.example`) | WP-0 (lead), 1, 3, 4, 13 |
| B Distribution | TBD | `src/lib/distribution/**`, `src/lib/db/schema/distribution.ts`, `src/lib/lifecycle/transfer.ts`, `src/app/org/[orgId]/{page.tsx,catalog/**,admin/**}`, `src/app/usg/{templates,clubs,rule-packs}/**`, `db/seed/distribution.ts`, `rules/**` | WP-5, 7, 6 |
| C Documents and permissions | TBD | `src/lib/documents/**`, `src/lib/db/schema/documents.ts`, `src/components/inspector/**`, `src/app/org/[orgId]/{agents,documents,preview,audit}/**`, `src/app/usg/audit/**`, `db/seed/documents.ts`, `db/seed/docs/**` | WP-8, 9, 14 |
| D Integration and demo | TBD | `src/lib/connectors/**`, `src/lib/db/schema/connectors.ts`, `src/lib/lifecycle/import.ts`, `src/app/{layout.tsx,globals.css,fonts.ts}`, `src/components/{ui,shell}/**`, `src/app/{me,directory,demo}/**`, `src/app/usg/integrations/**`, `db/seed/{index,orgs,personas}.ts`, `db/seed/roster.csv` | WP-2, 10, 11, 12 |

- An API route under `src/app/api/**` belongs to the stream that owns the service it calls
  (`docs/architecture.md` §14).
- `tests/<area>.test.ts` belongs to the stream that owns the module it covers.
- Shared docs (`README.md`, `docs/**`, `AGENTS.md`, `CLAUDE.md`): any stream may edit them, in the
  same PR as the change they describe.

## Interfaces between streams

Every stub is merged by **H3** at its real path, with the same name and signature and fixture data.
The owner replaces its internals by the "real" hour. Consumers never change their imports.

| Interface | Owner | Used by | Real by |
|---|---|---|---|
| `contracts.ts`, `db/schema/*` | A, with each area owner | all | H2 (frozen) |
| `withActor`, `clock.now()` | A | all | H5 |
| `getActor()`, `grantsFor`, `capGrants` | A | B, C, D | H7 |
| `audit()` | A | all | H9 |
| `gateway.runAgent()` (stub returns a mock `RunResult`) | A | C (agent page), D (directory runs) | H9 |
| `quota.setLimit`, `quota.remaining` | A | B (club and USG pages) | H11 |
| `effectiveAgent()`, `canUse()` | B | A, C, D | H6 |
| `directory()`, `myAgents()`, `provisionOrg()`, `publishToAllStudents()` | B | D | H7 |
| `transferPosition()` | B | D (roster import) | H9 |
| `listAccessibleDocuments()`, `explainAccess()` | C | A (gateway step 5), C | H5 |
| `previewAccess()`, `<Inspector />` | C | D (run pages) | H10 |
| connector registry, `RosterSource` | D | A, B | H9 |
| app shell, `src/components/ui/*` | D | all pages | H5 |

## Git

Branch per work-package slice: `<stream>/<wp>-<topic>`, e.g. `b/wp5-distribute`. Rebase on `main`,
keep PRs small, squash-merge. Commit messages use Conventional Commits with the area as scope:
`feat(distribution): distribute templates to a cohort`. Details: `docs/workflow.md`.
