@AGENTS.md

## Claude Code

- Subagents in `.claude/agents/`:
  - `stream-a-platform`, `stream-b-distribution`, `stream-c-documents`, `stream-d-integration`:
    hand your stream's work package to its subagent.
  - `ui-designer`: any page, component, styling or UI copy.
  - `reviewer`: run on your branch before every PR.
- Start each task in plan mode. Approve the plan before any edit.
- One work-package slice per session; `/clear` between slices.
