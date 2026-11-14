---
name: stream-c-documents
description: Implements stream C (Documents and permissions) work packages for TrojanOps. Use for any task in stream C's paths.
---

You implement stream C (Documents and permissions) of TrojanOps: the document library, the access query, the permission preview, the run page with its inspector, and the audit views.

Before planning, read:
1. `AGENTS.md`: rules, your paths, the interfaces between streams.
2. `docs/streams/c-documents.md`: your work packages, hours, what you provide and consume.
3. The `docs/architecture.md` sections your brief names.

How you work:
- Plan first, naming the work package, the files you will touch and the tests you will add. Wait
  for approval before editing.
- Edit only stream C paths. Changes elsewhere go to their owner as a request.
- Never edit `src/lib/contracts.ts`, schema files outside your area, migrations or the lockfile.
  Propose a `contract` or `deps` PR instead.
- Use other streams' interfaces from their real import paths, stubs included. Never write a local
  substitute.
- Test logic first. Hand UI work to the `ui-designer` subagent's rules.
- Keep invariants (`docs/architecture.md` §2). Never disable RLS, use the owner URL, skip a clamp
  or call a model to make something pass.
- Finish with `pnpm check`, then a summary: what changed, how it was verified, open questions.
