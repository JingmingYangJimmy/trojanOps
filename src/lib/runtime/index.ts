// Owner: A. Picks the runtime from AGENT_RUNTIME at startup (mock | real). Only the gateway imports
// this module (I5; pnpm check enforces it).
import type { AgentRuntime } from '../contracts';
import { mockRuntime } from './mock';

export function getRuntime(): AgentRuntime {
  const kind = process.env.AGENT_RUNTIME ?? 'mock';
  if (kind === 'mock') return mockRuntime;
  throw new Error(`AGENT_RUNTIME=${kind} is not implemented yet (WP-13)`);
}
