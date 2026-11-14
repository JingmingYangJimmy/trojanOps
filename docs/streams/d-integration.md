# Stream D: Integration and demo

**Owner:** TBD. You own the look and the front door: app shell and shared components, connectors
and the integration panel, the student pages (my agents, directory), seed people, and the demo
itself. Your paths are in `AGENTS.md`.

## Work packages

| WP | Hours | Done when (full text: `docs/architecture.md` §16) |
|---|---|---|
| WP-2 | H2–5 | Seed runner, orgs and personas; app shell; shadcn components restyled per `ui-designer.md` so the design greps pass |
| WP-10 | H5–9 | Connectors, registry, integration panel, roster sync with precedence; D1 |
| WP-11 | H9–12 | Directory, public-agent runs, my agents; D3, D4 |
| WP-12 | H12–20 | Clock control, rehearsed D1–D8, backup video, pitch |

## You provide

Stubs by H3.

| Interface | Real by |
|---|---|
| App shell, `src/components/ui/*` | H5 |
| Connector registry, `RosterSource` | H9 |

## You consume

- B: `directory`, `myAgents`, `provisionOrg` (real H7) and `transferPosition` (real H9).
- A: `gateway.runAgent` (real H9).
- C: `<Inspector />` (real H10).

## Demo beats

- D1: integration panel and roster sync.
- D3: directory and Lee's run.
- D4: my agents.
- You also run the whole demo script.

## Watch for

- The components the pages need ship with shadows and pills (DropdownMenu, Popover, Select, Dialog,
  Sheet, Switch, Progress, RadioGroup). Restyle them in WP-2 or every `pnpm check` fails.
- `roster.csv` mirrors the seed plus Robotics Club, and a sync right after a manual transfer changes
  nothing.
- "Open" on `/me/agents` switches the active club before opening the run page.
- Every connector shows "Mock" honestly.

## First prompt

> Read `AGENTS.md`, `.claude/agents/ui-designer.md`, `docs/architecture.md` §14–§16, and
> `docs/streams/d-integration.md`. Plan WP-2: seed runner and personas, the app shell, and the
> restyled shadcn components. Edit only stream D paths. Show me the plan first.
