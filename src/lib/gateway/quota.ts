// Owner: A (WP-4, real by H11). STUB: in-memory limits with the §15 seed values; nothing is spent
// except Lee's $0.04 of public-agent usage today. hold and settle are the gateway's §7 step 4 and
// step 8 hooks; they write nothing until slice 2 (ai_usage rows, quota.blocked).
import { AppError, type Actor, type EffectiveAgent, type QuotaRemaining, type QuotaTarget } from '../contracts';
import { MOCK_COST_MICRO } from '../runtime/mock';
import { INSTALLATION, ORG, USER } from '@db/seed/ids';

const key = (t: QuotaTarget) => [t.scope, t.orgId ?? '', t.userId ?? '', t.installationId ?? ''].join('|');

// On globalThis so route handlers and pages share the stub state.
const store = globalThis as unknown as { trojanopsQuotaStub?: { limits: Map<string, number>; spent: Map<string, number> } };
const initialLimits = () => new Map<string, number>([
  [key({ scope: 'platform' }), 50_000_000],
  ...[ORG.startup, ORG.archery, ORG.dance].map((orgId) => [key({ scope: 'org', orgId }), 5_000_000] as [string, number]),
  [key({ scope: 'member', orgId: ORG.startup, userId: USER.casey }), 500_000],
  [key({ scope: 'student_daily' }), 50_000],
  [key({ scope: 'installation', orgId: ORG.startup, installationId: INSTALLATION.startupRecruitingQa }), 2_500_000],
]);

store.trojanopsQuotaStub ??= {
  limits: initialLimits(),
  spent: new Map<string, number>([[key({ scope: 'student_daily', userId: USER.lee }), 40_000]]),
};
const { limits, spent } = store.trojanopsQuotaStub;

/** Sets a limit; a child above its parent is a clamp_violation naming the parent (§11). */
export async function setLimit(actor: Actor, input: QuotaTarget & { limitMicro: number }): Promise<void> {
  void actor; // TODO(WP-4): permission check, child ≤ parent, audit('quota.limit.set').
  if (input.limitMicro < 0) throw new AppError({ code: 'invalid', message: 'A limit cannot be negative.' });
  limits.set(key({ ...input, userId: input.scope === 'student_daily' ? undefined : input.userId }), input.limitMicro);
}

/** Limit, spent and remaining for one level, in micro-USD, for the current period. */
export async function remaining(target: QuotaTarget): Promise<QuotaRemaining> {
  const limitKey = key({ ...target, userId: target.scope === 'student_daily' ? undefined : target.userId });
  const limitMicro = limits.get(limitKey) ?? 0;
  const spentMicro = spent.get(key(target)) ?? 0;
  return { scope: target.scope, limitMicro, spentMicro, remainingMicro: Math.max(0, limitMicro - spentMicro) };
}

export interface QuotaHold {
  runId: string;
  holdMicro: number;
}

/** §7 step 4: holds the estimated cost at every level, or throws quota_exceeded. STUB: always holds
 * the mock's flat cost and writes nothing. TODO(WP-4 slice 2): ai_usage hold, quota.blocked, 429. */
export async function hold(agent: EffectiveAgent, userId: string, runId: string): Promise<QuotaHold> {
  void agent;
  void userId;
  return { runId, holdMicro: MOCK_COST_MICRO };
}

/** §7 step 8: settles a hold with the actual cost (0 for a failed run). STUB: writes nothing.
 * TODO(WP-4 slice 2): ai_usage settle row for actual − hold. */
export async function settle(held: QuotaHold, actualMicro: number): Promise<void> {
  void held;
  void actualMicro;
}

export const quota = { setLimit, remaining, hold, settle };
