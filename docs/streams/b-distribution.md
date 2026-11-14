# Stream B: Distribution

**Owner:** TBD. You own how agents reach clubs and students: templates, versions, installations,
clamps, the directory and my agents, plus the club console and the USG templates console. Your paths
are in `AGENTS.md`.

## Work packages

| WP | Hours | Done when (full text: `docs/architecture.md` §16) |
|---|---|---|
| WP-5 | H2–7 | Publish, distribute, install, clamps, directory, `myAgents`, publish to all students, propagation, retire, `provisionOrg`; `myAgents` tests for Casey, Taylor, Morgan |
| WP-7 | H7–10 | Club home, catalog with "Publish to all students", members, transfer, quotas; D3, D5, D7 |
| WP-6 | H10–12 | Template list and detail, distribute, club quotas and policy, rule-pack publish; D2, D6 |

## You provide

Stubs by H3.

| Interface | Real by |
|---|---|
| `effectiveAgent()`, `canUse(userId, agent)` | H6 |
| `directory()`, `myAgents()`, `provisionOrg()`, `publishToAllStudents()` | H7 |
| `transferPosition()` | H9 |

## You consume

- A: `getActor`, `grantsFor` (real H7) and `quota.*` (real H11).
- A: `audit()` (real H9).

## Demo beats

- D2: distribute plus the rejected widening.
- D3: publish to all students.
- D6: rule-pack v2.
- D7: transfer.
- D5: the quota UI.

## Watch for

- `canUse` reads positions in the agent's club, not in the actor's active org.
- `myAgents` iterates distinct clubs.
- `provisionOrg` installs only distributed templates.
- A clamp violation returns `clamp_violation` and writes `installation.rejected`.
- A public installation needs an installation limit.

## First prompt

> Read `AGENTS.md`, `docs/architecture.md` §6, §8 and §16, and `docs/streams/b-distribution.md`.
> Plan WP-5 test-first: clamps, `distribute`, `myAgents` (Casey, Taylor, Morgan), `provisionOrg`,
> publish to all students. Edit only stream B paths. Show me the plan first.
