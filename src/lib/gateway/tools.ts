// Owner: A (WP-4). Tool kinds for §7 step 7. Write tools never execute from a model call (I6): they
// become pending_actions that a human confirms. Read and draft tools run through gateway.tool() once
// real agents exist (WP-14). An unregistered tool counts as a write tool, so it can only ever wait
// for a human.
export type ToolKind = 'read' | 'draft' | 'write';

// TODO(WP-14): register read and draft tools here as they are built.
const KINDS: Record<string, ToolKind> = {};

export function toolKind(tool: string): ToolKind {
  return Object.hasOwn(KINDS, tool) ? KINDS[tool] : 'write';
}
