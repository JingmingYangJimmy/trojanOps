// Owner: B. Audience labels used on My agents and the directory (ui-designer.md "Writing").
import type { CanUseResult } from '../contracts';

const POSITION_NAMES: Record<string, string> = {
  president: 'President', treasurer: 'Treasurer', secretary: 'Secretary', member: 'Member',
  admin: 'Admin', reviewer: 'Reviewer',
};

export const positionName = (slug: string) => POSITION_NAMES[slug] ?? slug;

export function reasonLabel(reason: Extract<CanUseResult, { ok: true }>['reason'], usableBy: string[]): string {
  if (reason === 'public') return 'All students';
  if (reason === 'members') return 'All members';
  return usableBy.map(positionName).join(', ');
}
