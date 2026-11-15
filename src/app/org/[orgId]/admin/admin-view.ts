// Owner: B (WP-7). Pure view logic and copy for the club admin page: no I/O, so the page and the
// tests share one definition of what a budget row says (D5) and of what a succession promises
// before it is sent (D7).
// The imports stay type-only: the client tables and dialogs import this module, and a value
// imported from `@/lib/distribution` would pull its services — and their database and file reads —
// into the browser bundle. `transferCandidates` is therefore called on the server, in page.tsx,
// and its result arrives here as a row.
import type { CatalogEntry, ClubAdmin, ClubMember, ClubPosition } from '@/lib/distribution';
import { quotaMessage, usd } from '@/lib/gateway/quota-messages';
import { ATTENTION_PERCENT } from '../club-home-view';

/** Shared structural classes, so the page's sections and its client tables agree without one
 * importing React from the other. */
export const panel = 'rounded-md border border-border';
export const row = 'flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border px-3 py-2 last:border-b-0';
export const chip = 'inline-flex max-w-[200px] items-center gap-1 whitespace-nowrap rounded-sm border border-border px-2 text-xs';

/** micro-USD as the plain number a president types back into the limit field: no `$`, two decimals. */
export const dollars = (micro: number) => (micro / 1_000_000).toFixed(2);

export interface Meter {
  /** 0–100 for the bar's fill. A limit of $0.00 reads as full, because nothing is left. */
  percent: number;
  spent: string;
  limit: string;
  left: string;
  /** "80% used", once the spend is near the limit and not yet over it. */
  attention: string | null;
}

export function meter(spentMicro: number, limitMicro: number): Meter {
  const percent = limitMicro > 0 ? Math.min(100, Math.round((spentMicro / limitMicro) * 100)) : 100;
  const left = Math.max(0, limitMicro - spentMicro);
  return {
    percent,
    spent: usd(spentMicro),
    limit: usd(limitMicro),
    left: usd(left),
    attention: left > 0 && percent >= ATTENTION_PERCENT ? `${percent}% used` : null,
  };
}

export interface ClubBudget extends Meter {
  /** §11's club copy once the club's own quota is used up; null while it has room. */
  blocked: string | null;
}

/** The club's own monthly quota, for the page header. Only USG can raise it (§11). */
export function clubBudget(data: ClubAdmin): ClubBudget {
  const bar = meter(data.clubSpentMicro, data.clubLimitMicro);
  return {
    ...bar,
    blocked: data.clubSpentMicro >= data.clubLimitMicro
      ? quotaMessage('org', {
        club: data.org.name,
        agent: '',
        spentMicro: data.clubSpentMicro,
        limitMicro: data.clubLimitMicro,
      })
      : null,
  };
}

export interface MemberBudget extends Meter {
  /** The difference `inherited` makes, in words: "Inheriting $5.00" against "Set to $0.00". A
   * president has to be able to tell a member who is on the club's limit from one set to the same
   * figure, because only the second survives a change to the club's quota. */
  limitLabel: string;
  /** Never color alone: the row carries an icon and this word. */
  status: 'blocked' | 'attention' | 'ok';
  statusLabel: string;
}

/** What one member's budget row says (D5). */
export function memberBudget(member: ClubMember): MemberBudget {
  const bar = meter(member.spentMicro, member.limitMicro);
  const blocked = member.spentMicro >= member.limitMicro;
  return {
    ...bar,
    limitLabel: member.inherited ? `Inheriting ${bar.limit}` : `Set to ${bar.limit}`,
    status: blocked ? 'blocked' : bar.attention ? 'attention' : 'ok',
    statusLabel: blocked ? 'No budget left' : bar.attention ?? 'Within budget',
  };
}

/** The sentences above the limit field: where this member's limit comes from today, what they
 * have spent, and what the two edges of the field mean. */
export function budgetExplanation(member: ClubMember, data: ClubAdmin): string[] {
  const club = data.org.name;
  const clubLimit = usd(data.clubLimitMicro);
  return [
    member.inherited
      ? `${member.displayName} has no limit of their own in ${club}, so every month they may spend the club's whole quota of ${clubLimit}.`
      : `${member.displayName}'s own monthly limit in ${club} is ${usd(member.limitMicro)}.`,
    `They have spent ${usd(member.spentMicro)} this month.`,
    `A limit of $0.00 stops their runs before any agent is called. A limit cannot exceed ${club}'s monthly quota of ${clubLimit}.`,
  ];
}

export type DollarParse = { micro: number } | { error: string };

/**
 * Dollars as typed into the limit field, as micro-USD.
 *
 * `$0.00` is a limit a president means (D5 sets Casey to it), so an empty field is a mistake to
 * explain rather than a zero to assume. Each refusal says what to type instead.
 */
export function parseDollars(input: string, ceilingMicro?: number): DollarParse {
  const text = input.trim().replace(/^\$/, '').trim();
  if (text === '') {
    return { error: 'Enter an amount in dollars, such as 0.50. Enter 0.00 to stop this member from running agents.' };
  }
  if (text.startsWith('-')) {
    return { error: 'A limit cannot be negative. Enter 0.00 to stop this member from running agents.' };
  }
  if (/^\d*\.\d{3,}$/.test(text)) {
    return { error: 'Limits are set to the cent. Enter at most two decimal places, such as 0.50.' };
  }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return { error: 'Enter an amount in dollars and cents, such as 0.50.' };
  }
  const micro = Math.round(Number(text) * 1_000_000);
  // Past this the route answers with a raw schema message, which says nothing a president can act
  // on. The club's own quota is the real ceiling, and A re-checks it either way.
  if (!Number.isSafeInteger(micro)) {
    return { error: 'That is larger than any budget this club could have. Enter a smaller amount, such as 5.00.' };
  }
  if (ceilingMicro !== undefined && micro > ceilingMicro) {
    return { error: `A member's limit cannot be more than the club's monthly quota, ${usd(ceilingMicro)}.` };
  }
  return { micro };
}

/** What a saved limit says back, so the president can see the zero took. */
export function budgetSaved(member: ClubMember, data: ClubAdmin, limitMicro: number): string {
  return limitMicro === 0
    ? `${member.displayName}'s monthly limit in ${data.org.name} is $0.00. Their next agent run is blocked before the runtime is called.`
    : `${member.displayName}'s monthly limit in ${data.org.name} is ${usd(limitMicro)}.`;
}

export type TransferState =
  /** An officer position with one holder at most and someone to hand it to: D7's action. */
  | 'available'
  /** The shared member position: the service transfers offices, not the whole roster. */
  | 'shared'
  /** Everyone in the club already holds it. */
  | 'no-candidates'
  /** Two active memberships on one office: the service refuses until that is resolved. */
  | 'multiple';

/** One row of the positions table: the position and the members who could take it, which the page
 * works out with `transferCandidates` before it hands the roster to the client. */
export interface PositionRow {
  position: ClubPosition;
  candidates: ClubMember[];
}

export function transferState({ position, candidates }: PositionRow): TransferState {
  if (!position.isOfficer) return 'shared';
  if (position.holders.length > 1) return 'multiple';
  return candidates.length > 0 ? 'available' : 'no-candidates';
}

/** Why the action is missing from a row, rather than a button that could only fail. */
export const transferUnavailable: Record<Exclude<TransferState, 'available'>, string> = {
  shared: 'This is not an officer position, so it is not handed over one person at a time.',
  'no-candidates': 'Everyone in this club already holds it.',
  multiple: 'More than one person holds this office. Resolve its memberships before transferring it.',
};

/** Who holds a position now, for the roster row. */
export function holderLabel(position: ClubPosition): string {
  return position.holders.length > 0
    ? position.holders.map((holder) => holder.displayName).join(', ')
    : 'Vacant';
}

/** Enabled agents whose named-position audience includes this office. This is not the full
 * effect of a succession: losing a person's final position also removes their members-agent access. */
export function agentsForPosition(agents: CatalogEntry[], slug: string): CatalogEntry[] {
  return agents.filter(
    (agent) => agent.status === 'enabled' && agent.audience === 'positions' && agent.usableBy.includes(slug),
  );
}

export interface TransferConfirmation {
  title: string;
  /** Who takes the office, who leaves it, and which agents change hands with it. */
  points: string[];
  confirm: string;
}

/**
 * The confirmation shown before a succession (D7).
 *
 * Succession changes who can use which agents, so the copy names them. An agent the incoming
 * holder can already run through another position is not a gain, and one the outgoing holder keeps
 * through another position is not a loss: naming either would be wrong on the clubs where the
 * president is also the treasurer.
 */
export function transferConfirmation(
  data: ClubAdmin, position: ClubPosition, to: ClubMember,
): TransferConfirmation {
  const names = (list: CatalogEntry[]) => list.map((agent) => agent.name).join(', ');
  const holder = position.holders[0] ?? null;
  const outgoing = holder ? data.members.find((m) => m.userId === holder.userId) ?? null : null;
  const unchanged = holder?.userId === to.userId;
  const incomingBefore = to.positions.map((held) => held.slug);
  const incomingAfter = unchanged ? incomingBefore : [...new Set([...incomingBefore, position.slug])];
  const outgoingBefore = outgoing?.positions.map((held) => held.slug) ?? [];
  const outgoingAfter = unchanged ? outgoingBefore : outgoingBefore.filter((slug) => slug !== position.slug);

  // Any active position makes a person a member (§5); no separate `member` row is guaranteed.
  // Compare the whole audience before and after, including members agents when the last position
  // ends. Public access is unchanged. This is only audience eligibility; the gateway still checks
  // grants, source scope, max tier and budgets on every run.
  const admitted = (agent: CatalogEntry, held: string[]) => {
    if (agent.status !== 'enabled') return false;
    if (agent.audience === 'public') return true;
    if (agent.audience === 'members') return held.length > 0;
    return held.some((slug) => agent.usableBy.includes(slug));
  };
  const gained = data.agents.filter(
    (agent) => !admitted(agent, incomingBefore) && admitted(agent, incomingAfter),
  );
  const lost = data.agents.filter(
    (agent) => admitted(agent, outgoingBefore) && !admitted(agent, outgoingAfter),
  );

  const points = [
    unchanged
      ? `${to.displayName} already holds ${position.name} of ${data.org.name}, so this assignment changes nothing.`
      : holder
        ? `${to.displayName} becomes ${position.name} of ${data.org.name}, and ${holder.displayName} stops holding it.`
        : `${to.displayName} becomes ${position.name} of ${data.org.name}. No one holds it today.`,
  ];
  points.push(gained.length > 0
    ? `${to.displayName} gains ${names(gained)}.`
    : `${to.displayName} gains no additional enabled agents.`);
  if (holder) {
    points.push(outgoing
      ? lost.length > 0
        ? `${holder.displayName} loses ${names(lost)}.`
        : `${holder.displayName} keeps access to the same enabled agents.`
      : `${holder.displayName}'s current agent access could not be compared. Refresh the roster before transferring.`);
  }
  // The office grant changes, not an unconditional right to every office document: a remaining
  // presidency or other position can still grant the same document, and an agent can read it only
  // within its own source scope and tier ceiling (§5, §10).
  points.push(unchanged
    ? `Position grants do not change. Other positions can still grant document access; each agent's sources and max tier still apply.`
    : `${to.displayName} gains the ${position.name} position grant in ${data.org.name}${holder ? `, and ${holder.displayName} loses that position grant` : ''}. Other positions can still grant document access; each agent's sources and max tier still apply.`);
  points.push('No document, installation or budget is edited.');
  if (position.slug === 'president' && !unchanged) {
    points.push(
      `You will no longer be able to manage ${data.org.name}. Only ${to.displayName} will be able to hand the presidency back.`,
    );
  }

  return {
    title: `Transfer ${position.name} to ${to.displayName}?`,
    points,
    confirm: `Transfer ${position.name}`,
  };
}

/** The `ApiError` message behind a refused write — a 422 `clamp_violation` already says what to do
 * — or a plain fallback when the response carries no message. */
export async function writeErrorMessage(response: Response, fallback: string): Promise<string> {
  const failure: unknown = await response.json().catch(() => null);
  if (failure !== null && typeof failure === 'object' && 'message' in failure
    && typeof failure.message === 'string' && failure.message.trim().length > 0) {
    return failure.message;
  }
  return `${fallback} (${response.status}) Try again in a moment.`;
}
